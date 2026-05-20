import { exportZip } from "./exporter.js";
import {
  loadImageFromSrc,
  readImageFile,
  serializeImageForStorage,
} from "./image-utils.js";
import {
  loadProductCatalog,
  loadProductConfig,
  resolveProductId,
} from "./product-loader.js";
import { createRenderer } from "./renderer.js";
import {
  clamp,
  createComposerState,
  getDefaultTexts,
  getScaleBounds,
  getSafeAreaRect,
  getStorageKey,
  getTextInputLimit,
  hasTextContent,
  resetOverlayState,
} from "./state.js";
import {
  applyProductContent,
  buildControls,
  syncTextInputs,
  updateAllRanges,
  updateConfirmUI,
  updateFileStatus,
} from "./ui.js";

const elements = {
  page: document.querySelector(".page"),
  title: document.querySelector("#productTitle"),
  titleLabel: document.querySelector("#productTitleLabel"),
  controls: document.querySelector("#controlsPanel"),
  canvas: document.querySelector("#stageCanvas"),
  canvasShell: document.querySelector(".canvas-shell"),
  stageNote: document.querySelector("#stageNote"),
};

let state;
let renderer;
let controlRefs;
const activePointers = new Map();
let dragPointerId = null;
let gestureState = null;

const ROTATION_SNAP_POINTS = [-180, -135, -95, -90, -45, 0, 45, 90, 95, 135, 180];
const ROTATION_SNAP_THRESHOLD = 1;

function getExportFormat() {
  return controlRefs?.exportFormatInput?.value === "jpeg" ? "jpeg" : "png";
}

function normalizeRotation(value, shouldSnap = true) {
  const roundedValue = Math.round(clamp(value, -180, 180));
  if (!shouldSnap) return roundedValue;

  const snapPoint = ROTATION_SNAP_POINTS.find(
    (point) => Math.abs(roundedValue - point) <= ROTATION_SNAP_THRESHOLD,
  );

  return snapPoint ?? roundedValue;
}

function markDesignDirty() {
  if (!state.isDesignConfirmed) return;
  state.isDesignConfirmed = false;
  updateConfirmUI(controlRefs, state.isDesignConfirmed);
}

function syncControlsFromState() {
  const bounds = getScaleBounds(state.product);
  state.overlay.scale = clamp(state.overlay.scale, bounds.min, bounds.max);
  state.overlay.rotation = normalizeRotation(state.overlay.rotation, false);
  updateAllRanges(controlRefs, state);
}

function saveProjectState() {
  try {
    const payload = {
      overlayStorageUrl: state.overlayStorageUrl,
      overlayFileName: state.overlayFileName,
      exportFormat: getExportFormat(),
      texts: state.texts,
      overlay: state.overlayImage
        ? {
            xRatio: elements.canvas.width > 0 ? state.overlay.x / elements.canvas.width : 0.5,
            yRatio: elements.canvas.height > 0 ? state.overlay.y / elements.canvas.height : 0.5,
            widthRatio:
              elements.canvas.width > 0
                ? (state.overlayImage.width * state.overlay.scale) / elements.canvas.width
                : 0,
            rotation: state.overlay.rotation,
          }
        : null,
    };

    localStorage.setItem(getStorageKey(state.product), JSON.stringify(payload));
  } catch (error) {
    console.warn("保存に失敗しました。画像が大きすぎる可能性があります。", error);
  }
}

async function restoreProjectState() {
  const raw = localStorage.getItem(getStorageKey(state.product));
  if (!raw) {
    syncTextInputs(controlRefs, state);
    return;
  }

  try {
    const saved = JSON.parse(raw);

    if (controlRefs.exportFormatInput) {
      controlRefs.exportFormatInput.value = saved.exportFormat === "jpeg" ? "jpeg" : "png";
    }

    const defaultTexts = getDefaultTexts(state.product);
    const savedTexts = saved.texts && typeof saved.texts === "object" ? saved.texts : {};
    state.texts = { ...defaultTexts };

    for (const [layerId, value] of Object.entries(savedTexts)) {
      if (typeof value === "string" && value.length > 0) {
        state.texts[layerId] = value;
      }
    }

    if (saved.overlayStorageUrl) {
      state.overlayStorageUrl = saved.overlayStorageUrl;
      state.overlayFileName = saved.overlayFileName || "前回の画像";
      state.overlayImage = await loadImageFromSrc(saved.overlayStorageUrl);

      if (saved.overlay) {
        const savedXRatio = Number(saved.overlay.xRatio);
        const savedYRatio = Number(saved.overlay.yRatio);
        const savedWidthRatio = Number(saved.overlay.widthRatio);
        const savedRotation = Number(saved.overlay.rotation);

        state.overlay.x =
          elements.canvas.width * (Number.isFinite(savedXRatio) ? savedXRatio : 0.5);
        state.overlay.y =
          elements.canvas.height * (Number.isFinite(savedYRatio) ? savedYRatio : 0.5);
        state.overlay.scale =
          Number.isFinite(savedWidthRatio) && state.overlayImage.width > 0
            ? (elements.canvas.width * savedWidthRatio) / state.overlayImage.width
            : 1;
        state.overlay.rotation = Number.isFinite(savedRotation) ? savedRotation : 0;
      } else {
        fitOverlayToLabel();
      }
    }

    syncControlsFromState();
    syncTextInputs(controlRefs, state);
    updateFileStatus(controlRefs, state);
    renderer.render();
  } catch (error) {
    console.warn("保存済みデータの復元に失敗しました。", error);
    localStorage.removeItem(getStorageKey(state.product));
  }
}

async function loadProductImages() {
  state.baseImage = await loadImageFromSrc(state.product.assets.base);
  state.maskImage = state.product.assets.mask
    ? await loadImageFromSrc(state.product.assets.mask)
    : null;
  state.boundaryImage = state.product.assets.boundary
    ? await loadImageFromSrc(state.product.assets.boundary)
    : null;
  renderer.setCanvasSize(state.product.canvas.width, state.product.canvas.height);
}

function fitOverlayToLabel() {
  if (!state.overlayImage) return;

  const bounds = getSafeAreaRect(state.product);
  state.overlay.x = bounds.x + bounds.width / 2;
  state.overlay.y = bounds.y + bounds.height / 2;

  const baseScale = Math.max(
    bounds.width / state.overlayImage.width,
    bounds.height / state.overlayImage.height,
  );

  state.overlay.scale = Number.isFinite(baseScale) && baseScale > 0 ? baseScale : 1;
  state.overlay.rotation = 0;
  markDesignDirty();
  syncControlsFromState();
  renderer.render();
  saveProjectState();
}

async function handleOverlayUpload(event) {
  const [file] = event.target.files ?? [];
  if (!file) return;

  state.overlayImage = await readImageFile(file);
  state.overlayOriginalData = new Uint8Array(await file.arrayBuffer());
  state.overlayStorageUrl = serializeImageForStorage(state.overlayImage, file.type);
  state.overlayFileName = file.name;
  state.isDesignConfirmed = false;
  updateFileStatus(controlRefs, state);
  updateConfirmUI(controlRefs, state.isDesignConfirmed);
  fitOverlayToLabel();
}

function applyCommittedTextValue(layer, value) {
  state.texts[layer.id] = value.slice(0, getTextInputLimit(layer, value));
  markDesignDirty();
  renderer.render();
  saveProjectState();
  return state.texts[layer.id];
}

function syncDraftTextValue(layer, value) {
  state.texts[layer.id] = value;
  markDesignDirty();
  renderer.render();
}

function confirmDesign() {
  if (!state.overlayImage && !hasTextContent(state)) {
    window.alert("先に画像を読み込むか、テキストを入力してください。");
    return;
  }

  state.isDesignConfirmed = true;
  updateConfirmUI(controlRefs, state.isDesignConfirmed);
  controlRefs.downloadPanel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function clearProjectState() {
  localStorage.removeItem(getStorageKey(state.product));
  state.overlayImage = null;
  state.overlayOriginalData = null;
  state.overlayStorageUrl = null;
  state.overlayFileName = "";
  state.texts = getDefaultTexts(state.product);
  state.dragging = false;
  state.isDesignConfirmed = false;
  resetOverlayState(state);

  if (controlRefs.exportFormatInput) {
    controlRefs.exportFormatInput.value = "png";
  }
  if (controlRefs.overlayInput) {
    controlRefs.overlayInput.value = "";
  }

  syncTextInputs(controlRefs, state);
  updateFileStatus(controlRefs, state);
  updateConfirmUI(controlRefs, state.isDesignConfirmed);
  syncControlsFromState();
  renderer.render();
}

function getCanvasPoint(event) {
  const rect = elements.canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * elements.canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * elements.canvas.height,
  };
}

function getPointerDistance(pointA, pointB) {
  return Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y);
}

function getPointerAngle(pointA, pointB) {
  return Math.atan2(pointB.y - pointA.y, pointB.x - pointA.x);
}

function getPointerMidpoint(pointA, pointB) {
  return {
    x: (pointA.x + pointB.x) / 2,
    y: (pointA.y + pointB.y) / 2,
  };
}

function normalizeAngleDeltaDegrees(degrees) {
  let normalized = degrees;
  while (normalized > 180) normalized -= 360;
  while (normalized < -180) normalized += 360;
  return normalized;
}

function startDrag(pointerId, point) {
  dragPointerId = pointerId;
  state.dragging = true;
  state.dragOffsetX = point.x - state.overlay.x;
  state.dragOffsetY = point.y - state.overlay.y;
  elements.canvas.classList.add("dragging");
}

function stopDrag() {
  dragPointerId = null;
  state.dragging = false;
  elements.canvas.classList.remove("dragging");
}

function startGesture() {
  if (activePointers.size < 2) return;

  const [pointA, pointB] = Array.from(activePointers.values());
  const midpoint = getPointerMidpoint(pointA, pointB);
  const distance = getPointerDistance(pointA, pointB);
  const angle = getPointerAngle(pointA, pointB);

  gestureState = {
    midpoint,
    distance: Math.max(distance, 1),
    angle,
    overlayX: state.overlay.x,
    overlayY: state.overlay.y,
    overlayScale: state.overlay.scale,
    overlayRotation: state.overlay.rotation,
  };

  stopDrag();
}

function continueGesture() {
  if (!gestureState || activePointers.size < 2) return;

  const [pointA, pointB] = Array.from(activePointers.values());
  const midpoint = getPointerMidpoint(pointA, pointB);
  const distance = Math.max(getPointerDistance(pointA, pointB), 1);
  const angle = getPointerAngle(pointA, pointB);
  const angleDeltaDegrees = normalizeAngleDeltaDegrees(
    ((angle - gestureState.angle) * 180) / Math.PI,
  );

  state.overlay.x = gestureState.overlayX + (midpoint.x - gestureState.midpoint.x);
  state.overlay.y = gestureState.overlayY + (midpoint.y - gestureState.midpoint.y);
  state.overlay.scale = gestureState.overlayScale * (distance / gestureState.distance);
  state.overlay.rotation = gestureState.overlayRotation + angleDeltaDegrees;

  markDesignDirty();
  syncControlsFromState();
  renderer.render();
}

function isPointInsideOverlay(point) {
  if (!state.overlayImage) return false;

  const dx = point.x - state.overlay.x;
  const dy = point.y - state.overlay.y;
  const angle = (-state.overlay.rotation * Math.PI) / 180;
  const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle);
  const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle);

  const halfWidth = (state.overlayImage.width * state.overlay.scale) / 2;
  const halfHeight = (state.overlayImage.height * state.overlay.scale) / 2;

  return (
    rotatedX >= -halfWidth &&
    rotatedX <= halfWidth &&
    rotatedY >= -halfHeight &&
    rotatedY <= halfHeight
  );
}

function handlePointerDown(event) {
  const point = getCanvasPoint(event);
  if (!isPointInsideOverlay(point)) return;

  activePointers.set(event.pointerId, point);

  if (elements.canvas.setPointerCapture) {
    elements.canvas.setPointerCapture(event.pointerId);
  }

  if (activePointers.size === 1) {
    startDrag(event.pointerId, point);
    return;
  }

  if (activePointers.size === 2) {
    startGesture();
  }
}

function handlePointerMove(event) {
  const point = getCanvasPoint(event);
  if (activePointers.has(event.pointerId)) {
    activePointers.set(event.pointerId, point);
  }

  if (gestureState && activePointers.size >= 2) {
    continueGesture();
    return;
  }

  if (!state.dragging || dragPointerId !== event.pointerId) return;

  state.overlay.x = point.x - state.dragOffsetX;
  state.overlay.y = point.y - state.dragOffsetY;
  markDesignDirty();
  renderer.render();
}

function handlePointerUp(event) {
  const hadInteraction = state.dragging || Boolean(gestureState);

  activePointers.delete(event.pointerId);

  if (elements.canvas.releasePointerCapture && elements.canvas.hasPointerCapture?.(event.pointerId)) {
    elements.canvas.releasePointerCapture(event.pointerId);
  }

  if (gestureState && activePointers.size >= 2) {
    continueGesture();
    return;
  }

  if (gestureState) {
    gestureState = null;

    if (activePointers.size === 1) {
      const [remainingPointerId, remainingPoint] = Array.from(activePointers.entries())[0];
      startDrag(remainingPointerId, remainingPoint);
    } else {
      stopDrag();
    }
  } else if (dragPointerId === event.pointerId || activePointers.size === 0) {
    stopDrag();
  }

  if (hadInteraction) {
    saveProjectState();
  }
}

function bindCanvasEvents() {
  elements.canvas.addEventListener("pointerdown", handlePointerDown);
  elements.canvas.addEventListener("pointermove", handlePointerMove);
  elements.canvas.addEventListener("pointerup", handlePointerUp);
  elements.canvas.addEventListener("pointercancel", handlePointerUp);
  elements.canvas.addEventListener("pointerleave", handlePointerUp);
}

function handleAction(action) {
  if (action === "fitOverlay" || action === "resetOverlay") {
    fitOverlayToLabel();
  }
}

function handleRangeChange(id, value, options = {}) {
  if (id === "scale") {
    state.overlay.scale = value;
  }
  if (id === "rotation") {
    state.overlay.rotation = normalizeRotation(value, options.snap !== false);
  }

  markDesignDirty();
  syncControlsFromState();
  renderer.render();
  saveProjectState();
}

function handleRangeStep(id, delta) {
  const input = controlRefs.ranges[id];
  if (!input) return;

  const min = Number(input.min);
  const max = Number(input.max);
  const current = id === "rotation" ? state.overlay.rotation : Number(input.value);
  const nextValue = clamp(
    current + delta,
    Number.isFinite(min) ? min : -Infinity,
    Number.isFinite(max) ? max : Infinity,
  );

  handleRangeChange(id, nextValue, { snap: false });
}

async function initializeApp() {
  const catalog = await loadProductCatalog();
  const productId = resolveProductId(catalog);
  const product = await loadProductConfig(catalog, productId);

  applyProductContent(product, elements);
  state = createComposerState(product);
  renderer = createRenderer({
    canvas: elements.canvas,
    canvasShell: elements.canvasShell,
    state,
  });

  controlRefs = buildControls(elements.controls, product, {
    onAction: handleAction,
    onClearAll: clearProjectState,
    onConfirm: confirmDesign,
    onDownload: () => exportZip({ state, renderer, exportFormat: getExportFormat() }),
    onExportFormatChange: saveProjectState,
    onFileChange: (event) => {
      handleOverlayUpload(event).catch((error) => {
        console.error(error);
        window.alert("画像の読み込みに失敗しました。");
      });
    },
    onRangeChange: handleRangeChange,
    onRangeStep: handleRangeStep,
    onTextCommit: applyCommittedTextValue,
    onTextDraft: syncDraftTextValue,
  });

  resetOverlayState(state);
  syncControlsFromState();
  syncTextInputs(controlRefs, state);
  updateConfirmUI(controlRefs, state.isDesignConfirmed);
  renderer.setCanvasSize(product.canvas.width, product.canvas.height);
  renderer.drawPlaceholder();
  await loadProductImages();
  await restoreProjectState();
  updateFileStatus(controlRefs, state);
  renderer.render();
  bindCanvasEvents();
}

initializeApp().catch((error) => {
  console.error(error);
  window.alert("商品の読み込みに失敗しました。ローカル確認時は簡易サーバーから開いてください。");
});
