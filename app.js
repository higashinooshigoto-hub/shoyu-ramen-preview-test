const canvas = document.querySelector("#stageCanvas");
const ctx = canvas.getContext("2d");
const canvasShell = document.querySelector(".canvas-shell");

const overlayInput = document.querySelector("#overlayInput");
const scaleInput = document.querySelector("#scaleInput");
const rotationInput = document.querySelector("#rotationInput");
const exportFormatInput = document.querySelector("#exportFormatInput");
const confirmButton = document.querySelector("#confirmButton");
const downloadButton = document.querySelector("#downloadButton");
const downloadPanel = document.querySelector("#downloadPanel");
const confirmStatus = document.querySelector("#confirmStatus");
const fitButton = document.querySelector("#fitButton");
const resetButton = document.querySelector("#resetButton");
const clearAllButton = document.querySelector("#clearAllButton");

const scaleOutput = document.querySelector("#scaleOutput");
const rotationOutput = document.querySelector("#rotationOutput");
const overlayStatus = document.querySelector("#overlayStatus");
const textFieldsSection = document.querySelector("#textFieldsSection");
const textFields = document.querySelector("#textFields");

const MIN_SCALE = 0.1;
const MAX_SCALE = 8;
const STORAGE_IMAGE_MAX_SIZE = 1600;
const DEFAULT_TEMPLATE_PREVIEW_STROKE = "rgba(0, 0, 0, 0.5)";

const productTemplates = window.PRODUCT_TEMPLATES || {};
const pageTemplateId = document.body?.dataset?.templateId;

function resolveTemplate(identifier) {
  if (!identifier) return null;

  if (productTemplates[identifier]) {
    return productTemplates[identifier];
  }

  return Object.values(productTemplates).find((template) => template.id === identifier) || null;
}

const activeTemplate =
  resolveTemplate(pageTemplateId) ||
  resolveTemplate(window.DEFAULT_PRODUCT_TEMPLATE_ID) ||
  Object.values(productTemplates)[0];

if (!activeTemplate) {
  throw new Error("商品テンプレートが見つかりません。");
}

const state = {
  template: activeTemplate,
  baseImage: null,
  maskImage: null,
  overlayImage: null,
  overlayOriginalData: null,
  overlayStorageUrl: null,
  overlayFileName: "",
  dragging: false,
  dragOffsetX: 0,
  dragOffsetY: 0,
  overlay: {
    x: activeTemplate.baseWidth / 2,
    y: activeTemplate.baseHeight / 2,
    scale: Number(scaleInput.value),
    rotation: 0,
  },
  texts: {},
  isDesignConfirmed: false,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getStorageKey() {
  return `product-composer-state:${state.template.id}`;
}

function getLabelRect() {
  return state.template.labelRect;
}

function getSafeAreaRect() {
  const { labelRect, safeArea } = state.template;
  const insetX = safeArea?.insetX ?? 0;
  const insetY = safeArea?.insetY ?? 0;

  return {
    x: labelRect.x + insetX,
    y: labelRect.y + insetY,
    width: Math.max(1, labelRect.width - insetX * 2),
    height: Math.max(1, labelRect.height - insetY * 2),
    borderRadius: Math.max(0, labelRect.borderRadius - Math.max(insetX, insetY)),
  };
}

function getLabelCenter() {
  const rect = getLabelRect();
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

function getMaskRect() {
  return state.template.maskRect || getLabelRect();
}

function getTextLayers() {
  return state.template.textLayers || [];
}

function getTextLayerValue(layerId) {
  return state.texts[layerId] || "";
}

function getTextLayerDisplayValue(layer) {
  const text = getTextLayerValue(layer.id);
  return text.length > 0 ? text : layer.defaultText || "";
}

function hasTextContent() {
  return getTextLayers().some((layer) => getTextLayerValue(layer.id).length > 0);
}

function isHalfWidthAlphaNumericText(value) {
  return /^[A-Za-z0-9 ]+$/.test(value);
}

function getTextInputLimit(layer, value) {
  if (value && layer.halfWidthMaxLength && isHalfWidthAlphaNumericText(value)) {
    return layer.halfWidthMaxLength;
  }

  return layer.maxLength || value.length;
}

function updateOutputs() {
  scaleOutput.value = `${Math.round(state.overlay.scale * 100)}%`;
  rotationOutput.value = `${Math.round(state.overlay.rotation)}°`;
}

function updateFileStatus() {
  overlayStatus.textContent = state.overlayFileName
    ? `現在表示中: ${state.overlayFileName}`
    : "";
}

function buildTextFont(layer, fontSize) {
  return `${layer.fontWeight || 700} ${fontSize}px ${layer.fontFamily || '"Hiragino Sans", "Yu Gothic", sans-serif'}`;
}

function fitTextFontSize(targetCtx, layer, text, scale = 1) {
  const maxWidth = (layer.maxWidth || state.template.baseWidth) * scale;
  const minFontSize = (layer.minFontSize || 12) * scale;
  let fontSize = (layer.fontSize || 48) * scale;

  while (fontSize > minFontSize) {
    targetCtx.font = buildTextFont(layer, fontSize);
    if (targetCtx.measureText(text).width <= maxWidth) {
      return fontSize;
    }
    fontSize -= Math.max(1, scale);
  }

  return Math.max(minFontSize, fontSize);
}

function drawTextLayers(targetCtx, scaleX, scaleY) {
  const layers = getTextLayers();
  if (!layers.length) return;

  const scale = Math.min(scaleX, scaleY);
  targetCtx.save();

  for (const layer of layers) {
    const rawText = getTextLayerDisplayValue(layer);
    if (!rawText.length) continue;

    const fontSize = fitTextFontSize(targetCtx, layer, rawText, scale);
    targetCtx.font = buildTextFont(layer, fontSize);
    targetCtx.textAlign = "center";
    targetCtx.textBaseline = layer.textBaseline || "middle";
    targetCtx.lineJoin = layer.lineJoin || "round";
    targetCtx.lineCap = "round";

    const x = (layer.centerX || layer.x) * scaleX;
    const y = layer.y * scaleY;

    if (layer.paintOrder === "stroke-fill" && layer.strokeStyle && layer.lineWidth) {
      targetCtx.strokeStyle = layer.strokeStyle;
      targetCtx.lineWidth = layer.lineWidth * scale;
      targetCtx.strokeText(rawText, x, y);
    }

    targetCtx.fillStyle = layer.fillStyle || "#ffffff";
    targetCtx.fillText(rawText, x, y);

    if (layer.paintOrder !== "stroke-fill" && layer.strokeStyle && layer.lineWidth) {
      targetCtx.strokeStyle = layer.strokeStyle;
      targetCtx.lineWidth = layer.lineWidth * scale;
      targetCtx.strokeText(rawText, x, y);
    }
  }

  targetCtx.restore();
}

function applyCommittedTextValue(layer, value) {
  state.texts[layer.id] = value.slice(0, getTextInputLimit(layer, value));
  markDesignDirty();
  render();
  saveProjectState();
}

function syncDraftTextValue(layer, value) {
  state.texts[layer.id] = value;
  markDesignDirty();
  render();
}

function initializeTextControls() {
  if (!textFieldsSection || !textFields) return;

  const layers = getTextLayers();
  textFields.replaceChildren();
  textFieldsSection.hidden = !layers.length;

  for (const layer of layers) {
    const field = document.createElement("label");
    field.className = "field";

    const title = document.createElement("span");
    title.textContent = layer.label;
    field.append(title);

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = layer.placeholder || "";
    input.value = getTextLayerValue(layer.id);
    let isComposing = false;

    input.addEventListener("compositionstart", () => {
      isComposing = true;
    });

    input.addEventListener("compositionend", () => {
      isComposing = false;
      applyCommittedTextValue(layer, input.value);
      if (input.value !== getTextLayerValue(layer.id)) {
        input.value = getTextLayerValue(layer.id);
      }
    });

    input.addEventListener("input", () => {
      if (isComposing) {
        syncDraftTextValue(layer, input.value);
        return;
      }

      applyCommittedTextValue(layer, input.value);
      if (input.value !== getTextLayerValue(layer.id)) {
        input.value = getTextLayerValue(layer.id);
      }
    });

    input.addEventListener("blur", () => {
      applyCommittedTextValue(layer, input.value);
      if (input.value !== getTextLayerValue(layer.id)) {
        input.value = getTextLayerValue(layer.id);
      }
    });
    field.append(input);

    if (layer.hint) {
      const hint = document.createElement("p");
      hint.className = "field-hint";
      hint.textContent = layer.hint;
      field.append(hint);
    }

    textFields.append(field);
  }
}

function updateConfirmUI() {
  downloadPanel.hidden = !state.isDesignConfirmed;
  confirmStatus.textContent = state.isDesignConfirmed
    ? "デザインを確定しました。元画像と完成イメージを ZIP でダウンロードできます。"
    : "調整が終わったら、このデザインで確定してダウンロードへ進みます。";
}

function markDesignDirty() {
  if (!state.isDesignConfirmed) return;
  state.isDesignConfirmed = false;
  updateConfirmUI();
}

function confirmDesign() {
  if (!state.overlayImage && !hasTextContent()) {
    window.alert("先に画像を読み込むか、テキストを入力してください。");
    return;
  }

  state.isDesignConfirmed = true;
  updateConfirmUI();
  downloadPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function syncControlsFromState() {
  state.overlay.scale = clamp(state.overlay.scale, MIN_SCALE, MAX_SCALE);
  state.overlay.rotation = clamp(state.overlay.rotation, -180, 180);
  scaleInput.value = String(state.overlay.scale);
  rotationInput.value = String(state.overlay.rotation);
  updateOutputs();
}

function setCanvasSize(width, height) {
  canvas.width = width;
  canvas.height = height;
  canvasShell.style.setProperty("--stage-aspect-ratio", `${width} / ${height}`);
}

function traceRoundedRect(targetCtx, rect, scaleX = 1, scaleY = 1) {
  const x = rect.x * scaleX;
  const y = rect.y * scaleY;
  const width = rect.width * scaleX;
  const height = rect.height * scaleY;
  const radius = Math.min(rect.borderRadius * Math.min(scaleX, scaleY), width / 2, height / 2);

  targetCtx.beginPath();
  targetCtx.moveTo(x + radius, y);
  targetCtx.lineTo(x + width - radius, y);
  targetCtx.quadraticCurveTo(x + width, y, x + width, y + radius);
  targetCtx.lineTo(x + width, y + height - radius);
  targetCtx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  targetCtx.lineTo(x + radius, y + height);
  targetCtx.quadraticCurveTo(x, y + height, x, y + height - radius);
  targetCtx.lineTo(x, y + radius);
  targetCtx.quadraticCurveTo(x, y, x + radius, y);
  targetCtx.closePath();
}

function tracePolygon(targetCtx, points, scaleX = 1, scaleY = 1) {
  if (!points?.length) return;

  targetCtx.beginPath();
  targetCtx.moveTo(points[0].x * scaleX, points[0].y * scaleY);

  for (let index = 1; index < points.length; index += 1) {
    targetCtx.lineTo(points[index].x * scaleX, points[index].y * scaleY);
  }

  targetCtx.closePath();
}

function getLabelShape() {
  if (state.template.clipShape) {
    return state.template.clipShape;
  }

  return {
    type: "roundedRect",
    rect: getLabelRect(),
  };
}

function traceShape(targetCtx, shape, scaleX = 1, scaleY = 1) {
  if (!shape) return;

  if (shape.type === "polygon") {
    tracePolygon(targetCtx, shape.points, scaleX, scaleY);
    return;
  }

  traceRoundedRect(targetCtx, shape.rect || getLabelRect(), scaleX, scaleY);
}

function drawPlaceholder() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#edf4ed";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  traceShape(ctx, getLabelShape());
  ctx.fill();

  ctx.fillStyle = "#35503a";
  ctx.textAlign = "center";
  ctx.font = '700 28px "Hiragino Sans", "Yu Gothic", sans-serif';
  ctx.fillText(`${state.template.name}のベース画像を読み込み中です`, canvas.width / 2, 72);
  ctx.font = '400 18px "Hiragino Sans", "Yu Gothic", sans-serif';
  ctx.fillText("次にラベル画像を読み込むと位置やサイズを調整できます", canvas.width / 2, 108);
}

function loadImageFromSrc(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      loadImageFromSrc(reader.result).then(resolve).catch(reject);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function serializeImageForStorage(image, mimeType = "image/png") {
  const exportType = mimeType === "image/jpeg" ? "image/jpeg" : "image/png";
  const longest = Math.max(image.width, image.height);
  const ratio = longest > STORAGE_IMAGE_MAX_SIZE ? STORAGE_IMAGE_MAX_SIZE / longest : 1;

  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  tempCanvas.width = Math.max(1, Math.round(image.width * ratio));
  tempCanvas.height = Math.max(1, Math.round(image.height * ratio));
  tempCtx.drawImage(image, 0, 0, tempCanvas.width, tempCanvas.height);

  return exportType === "image/jpeg"
    ? tempCanvas.toDataURL(exportType, 0.92)
    : tempCanvas.toDataURL(exportType);
}

function dataUrlToUint8Array(dataUrl) {
  const [, base64] = dataUrl.split(",", 2);
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function buildCompositeImageData() {
  const exportType = exportFormatInput.value === "jpeg" ? "image/jpeg" : "image/png";
  const extension = exportType === "image/jpeg" ? "jpg" : "png";
  const exportScale = state.template.exportScale || 1;
  const exportCanvas = document.createElement("canvas");
  const exportCtx = exportCanvas.getContext("2d");
  exportCanvas.width = Math.round(state.template.baseWidth * exportScale);
  exportCanvas.height = Math.round(state.template.baseHeight * exportScale);

  if (exportType === "image/jpeg") {
    exportCtx.fillStyle = "#ffffff";
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  }

  drawScene(exportCtx, {
    width: exportCanvas.width,
    height: exportCanvas.height,
    showGuide: false,
    clear: exportType !== "image/jpeg",
  });

  const dataUrl =
    exportType === "image/jpeg"
      ? exportCanvas.toDataURL(exportType, 0.92)
      : exportCanvas.toDataURL(exportType);

  return {
    bytes: dataUrlToUint8Array(dataUrl),
    extension,
  };
}

function buildOriginalUploadData() {
  if (state.overlayOriginalData) {
    return {
      name: state.overlayFileName || "uploaded-image.png",
      bytes: state.overlayOriginalData,
    };
  }

  if (state.overlayStorageUrl) {
    return {
      name: state.overlayFileName || "uploaded-image.png",
      bytes: dataUrlToUint8Array(state.overlayStorageUrl),
    };
  }

  return null;
}

function resetOverlayState() {
  const center = getLabelCenter();
  state.overlay.x = center.x;
  state.overlay.y = center.y;
  state.overlay.scale = 1;
  state.overlay.rotation = 0;
}

function saveProjectState() {
  try {
    const payload = {
      overlayStorageUrl: state.overlayStorageUrl,
      overlayFileName: state.overlayFileName,
      exportFormat: exportFormatInput.value,
      texts: state.texts,
      overlay: state.overlayImage
        ? {
            xRatio: canvas.width > 0 ? state.overlay.x / canvas.width : 0.5,
            yRatio: canvas.height > 0 ? state.overlay.y / canvas.height : 0.5,
            widthRatio:
              canvas.width > 0
                ? (state.overlayImage.width * state.overlay.scale) / canvas.width
                : 0,
            rotation: state.overlay.rotation,
          }
        : null,
    };

    localStorage.setItem(getStorageKey(), JSON.stringify(payload));
  } catch (error) {
    console.warn("保存に失敗しました。画像が大きすぎる可能性があります。", error);
  }
}

async function restoreProjectState() {
  const raw = localStorage.getItem(getStorageKey());
  if (!raw) return;

  try {
    const saved = JSON.parse(raw);
    exportFormatInput.value = saved.exportFormat === "jpeg" ? "jpeg" : "png";
    state.texts = saved.texts && typeof saved.texts === "object" ? saved.texts : {};

    if (saved.overlayStorageUrl) {
      state.overlayStorageUrl = saved.overlayStorageUrl;
      state.overlayFileName = saved.overlayFileName || "前回のラベル画像";
      state.overlayImage = await loadImageFromSrc(saved.overlayStorageUrl);

      if (saved.overlay) {
        const savedXRatio = Number(saved.overlay.xRatio);
        const savedYRatio = Number(saved.overlay.yRatio);
        const savedWidthRatio = Number(saved.overlay.widthRatio);
        const savedRotation = Number(saved.overlay.rotation);

        state.overlay.x = canvas.width * (Number.isFinite(savedXRatio) ? savedXRatio : 0.5);
        state.overlay.y = canvas.height * (Number.isFinite(savedYRatio) ? savedYRatio : 0.5);
        state.overlay.scale = clamp(
          Number.isFinite(savedWidthRatio) && state.overlayImage.width > 0
            ? (canvas.width * savedWidthRatio) / state.overlayImage.width
            : 1,
          MIN_SCALE,
          MAX_SCALE,
        );
        state.overlay.rotation = clamp(
          Number.isFinite(savedRotation) ? savedRotation : 0,
          -180,
          180,
        );
      } else {
        fitOverlayToLabel();
      }
    }

    syncControlsFromState();
    initializeTextControls();
    updateFileStatus();
    render();
  } catch (error) {
    console.warn("保存済みデータの復元に失敗しました。", error);
    localStorage.removeItem(getStorageKey());
  }
}

async function loadTemplateBaseImage() {
  state.baseImage = await loadImageFromSrc(state.template.baseImageSrc);
  state.maskImage = state.template.maskImageSrc
    ? await loadImageFromSrc(state.template.maskImageSrc)
    : null;
  setCanvasSize(state.template.baseWidth || state.baseImage.width, state.template.baseHeight || state.baseImage.height);
}

function fitOverlayToLabel() {
  if (!state.overlayImage) return;

  const bounds = getSafeAreaRect();
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
  render();
  saveProjectState();
}

function drawGuide(targetCtx, scaleX, scaleY) {
  targetCtx.save();
  targetCtx.strokeStyle = "rgba(90, 142, 99, 0.85)";
  targetCtx.lineWidth = Math.max(1.5, 2 * Math.min(scaleX, scaleY));
  targetCtx.setLineDash([10 * scaleX, 8 * scaleX]);
  traceShape(targetCtx, getLabelShape(), scaleX, scaleY);
  targetCtx.stroke();

  targetCtx.strokeStyle = "rgba(63, 109, 71, 0.55)";
  targetCtx.setLineDash([6 * scaleX, 6 * scaleX]);
  traceRoundedRect(targetCtx, getSafeAreaRect(), scaleX, scaleY);
  targetCtx.stroke();
  targetCtx.restore();
}

function drawOverlayBounds(targetCtx, scaleX, scaleY) {
  if (!state.overlayImage) return;

  const previewWidth = state.overlayImage.width * state.overlay.scale * scaleX;
  const previewHeight = state.overlayImage.height * state.overlay.scale * scaleY;

  targetCtx.save();
  targetCtx.translate(state.overlay.x * scaleX, state.overlay.y * scaleY);
  targetCtx.rotate((state.overlay.rotation * Math.PI) / 180);
  targetCtx.strokeStyle = "rgba(90, 142, 99, 0.95)";
  targetCtx.lineWidth = Math.max(1.5, 2 * Math.min(scaleX, scaleY));
  targetCtx.setLineDash([]);
  targetCtx.strokeRect(-previewWidth / 2, -previewHeight / 2, previewWidth, previewHeight);
  targetCtx.restore();
}

function drawEmptyOverlayPreview(targetCtx, scaleX, scaleY) {
  targetCtx.save();
  targetCtx.strokeStyle = DEFAULT_TEMPLATE_PREVIEW_STROKE;
  targetCtx.lineWidth = Math.max(1.5, 2 * Math.min(scaleX, scaleY));
  targetCtx.setLineDash([18 * scaleX, 14 * scaleX]);
  traceShape(targetCtx, getLabelShape(), scaleX, scaleY);
  targetCtx.stroke();
  targetCtx.restore();
}

function drawTemplatePreviewFill(targetCtx, scaleX, scaleY) {
  if (!scaleX || !scaleY) return;
  if (state.template.showPrintAreaGuide === false) return;
  drawEmptyOverlayPreview(targetCtx, scaleX, scaleY);
}

function drawPrintAreaBackground(targetCtx, width, height, scaleX, scaleY) {
  const maskRect = getMaskRect();

  if (state.maskImage) {
    const backgroundCanvas = document.createElement("canvas");
    const backgroundCtx = backgroundCanvas.getContext("2d");
    backgroundCanvas.width = Math.max(1, Math.round(width));
    backgroundCanvas.height = Math.max(1, Math.round(height));

    backgroundCtx.fillStyle = "#ffffff";
    backgroundCtx.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
    backgroundCtx.globalCompositeOperation = "destination-in";
    backgroundCtx.drawImage(
      state.maskImage,
      maskRect.x * scaleX,
      maskRect.y * scaleY,
      maskRect.width * scaleX,
      maskRect.height * scaleY,
    );

    targetCtx.drawImage(backgroundCanvas, 0, 0);
    return;
  }

  targetCtx.save();
  traceShape(targetCtx, getLabelShape(), scaleX, scaleY);
  targetCtx.clip();
  targetCtx.fillStyle = "#ffffff";
  targetCtx.fillRect(0, 0, width, height);
  targetCtx.restore();
}

function drawTransformedOverlay(targetCtx, scaleX, scaleY) {
  targetCtx.translate(state.overlay.x * scaleX, state.overlay.y * scaleY);
  targetCtx.rotate((state.overlay.rotation * Math.PI) / 180);
  targetCtx.globalAlpha = state.template.overlayStyle?.opacity ?? 1;
  targetCtx.globalCompositeOperation = state.template.overlayStyle?.blendMode ?? "source-over";

  const drawWidth = state.overlayImage.width * state.overlay.scale * scaleX;
  const drawHeight = state.overlayImage.height * state.overlay.scale * scaleY;
  targetCtx.drawImage(
    state.overlayImage,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight,
  );
}

function drawMaskedOverlay(targetCtx, width, height, scaleX, scaleY) {
  const maskRect = getMaskRect();

  if (state.maskImage) {
    const maskCanvas = document.createElement("canvas");
    const maskCtx = maskCanvas.getContext("2d");
    maskCanvas.width = Math.max(1, Math.round(width));
    maskCanvas.height = Math.max(1, Math.round(height));

    maskCtx.save();
    drawTransformedOverlay(maskCtx, scaleX, scaleY);
    maskCtx.restore();

    maskCtx.globalCompositeOperation = "destination-in";
    maskCtx.drawImage(
      state.maskImage,
      maskRect.x * scaleX,
      maskRect.y * scaleY,
      maskRect.width * scaleX,
      maskRect.height * scaleY,
    );

    targetCtx.drawImage(maskCanvas, 0, 0);
    return;
  }

  targetCtx.save();
  traceShape(targetCtx, getLabelShape(), scaleX, scaleY);
  targetCtx.clip();
  drawTransformedOverlay(targetCtx, scaleX, scaleY);
  targetCtx.restore();
}

function drawScene(targetCtx, options = {}) {
  const {
    width = canvas.width,
    height = canvas.height,
    showGuide = true,
    clear = true,
  } = options;
  const scaleX = width / state.template.baseWidth;
  const scaleY = height / state.template.baseHeight;

  if (clear) {
    targetCtx.clearRect(0, 0, width, height);
  }

  if (!state.baseImage) {
    return;
  }

  const drawBaseOnTop = state.template.baseLayerOrder === "foreground";

  if (!drawBaseOnTop) {
    targetCtx.drawImage(state.baseImage, 0, 0, width, height);
  }

  const shouldDrawPrintAreaBackground =
    state.overlayImage || (showGuide && state.template.previewPrintAreaBackground);

  if (shouldDrawPrintAreaBackground) {
    drawPrintAreaBackground(targetCtx, width, height, scaleX, scaleY);
  }

  if (state.overlayImage) {
    drawMaskedOverlay(targetCtx, width, height, scaleX, scaleY);
  }

  if (drawBaseOnTop) {
    targetCtx.drawImage(state.baseImage, 0, 0, width, height);
  }

  drawTextLayers(targetCtx, scaleX, scaleY);

  if (showGuide) {
    drawTemplatePreviewFill(targetCtx, scaleX, scaleY);
    drawOverlayBounds(targetCtx, scaleX, scaleY);
  }
}

function render(options = {}) {
  if (!state.baseImage) {
    drawPlaceholder();
    return;
  }

  drawScene(ctx, options);
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
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

async function handleOverlayUpload(event) {
  const [file] = event.target.files ?? [];
  if (!file) return;

  state.overlayImage = await readImageFile(file);
  state.overlayOriginalData = new Uint8Array(await file.arrayBuffer());
  state.overlayStorageUrl = serializeImageForStorage(state.overlayImage, file.type);
  state.overlayFileName = file.name;
  state.isDesignConfirmed = false;
  updateFileStatus();
  updateConfirmUI();
  fitOverlayToLabel();
}

function handlePointerDown(event) {
  const point = getCanvasPoint(event);
  if (!isPointInsideOverlay(point)) return;

  state.dragging = true;
  if (canvas.setPointerCapture) {
    canvas.setPointerCapture(event.pointerId);
  }
  state.dragOffsetX = point.x - state.overlay.x;
  state.dragOffsetY = point.y - state.overlay.y;
  canvas.classList.add("dragging");
}

function handlePointerMove(event) {
  if (!state.dragging) return;
  const point = getCanvasPoint(event);
  state.overlay.x = point.x - state.dragOffsetX;
  state.overlay.y = point.y - state.dragOffsetY;
  markDesignDirty();
  render();
}

function handlePointerUp() {
  if (state.dragging) {
    saveProjectState();
  }
  state.dragging = false;
  canvas.classList.remove("dragging");
}

function clearProjectState() {
  localStorage.removeItem(getStorageKey());
  state.overlayImage = null;
  state.overlayOriginalData = null;
  state.overlayStorageUrl = null;
  state.overlayFileName = "";
  state.texts = {};
  state.dragging = false;
  state.isDesignConfirmed = false;
  resetOverlayState();
  exportFormatInput.value = "png";
  overlayInput.value = "";
  initializeTextControls();
  updateFileStatus();
  updateConfirmUI();
  syncControlsFromState();
  render();
}

function isSafariBrowser() {
  const userAgent = window.navigator.userAgent;
  return /Safari/i.test(userAgent) && !/Chrome|CriOS|Edg|OPR|Firefox/i.test(userAgent);
}

function triggerDownload(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";

  if (isSafariBrowser()) {
    link.target = "_blank";
  }

  document.body.appendChild(link);
  link.click();
  link.remove();
}

function exportImage() {
  if (!state.baseImage) {
    window.alert(`${state.template.name}画像の読み込みに失敗しています。`);
    return;
  }

  try {
    const compositeImage = buildCompositeImageData();
    const zipEntries = [
      {
        name: `${state.template.exportFileName}.${compositeImage.extension}`,
        data: compositeImage.bytes,
      },
    ];
    const originalUpload = buildOriginalUploadData();
    if (originalUpload) {
      zipEntries.unshift({ name: originalUpload.name, data: originalUpload.bytes });
    }
    const zipBlob = window.createStoredZip(zipEntries);
    const objectUrl = URL.createObjectURL(zipBlob);
    triggerDownload(objectUrl, `${state.template.exportFileName}-set.zip`);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (error) {
    console.error(error);
    window.alert("ZIP の書き出しに失敗しました。");
  }
}

overlayInput.addEventListener("change", (event) => {
  handleOverlayUpload(event).catch((error) => {
    console.error(error);
    window.alert("ラベル画像の読み込みに失敗しました。");
  });
});

scaleInput.addEventListener("input", () => {
  state.overlay.scale = Number(scaleInput.value);
  markDesignDirty();
  syncControlsFromState();
  render();
  saveProjectState();
});

rotationInput.addEventListener("input", () => {
  state.overlay.rotation = Number(rotationInput.value);
  markDesignDirty();
  syncControlsFromState();
  render();
  saveProjectState();
});

fitButton.addEventListener("click", fitOverlayToLabel);

resetButton.addEventListener("click", () => {
  if (!state.overlayImage) return;
  fitOverlayToLabel();
});

clearAllButton.addEventListener("click", clearProjectState);

confirmButton.addEventListener("click", confirmDesign);

downloadButton.addEventListener("click", () => {
  exportImage();
});
exportFormatInput.addEventListener("change", saveProjectState);

canvas.addEventListener("pointerdown", handlePointerDown);
canvas.addEventListener("pointermove", handlePointerMove);
canvas.addEventListener("pointerup", handlePointerUp);
canvas.addEventListener("pointercancel", handlePointerUp);
canvas.addEventListener("pointerleave", handlePointerUp);
async function initializeApp() {
  resetOverlayState();
  initializeTextControls();
  syncControlsFromState();
  updateConfirmUI();
  setCanvasSize(state.template.baseWidth, state.template.baseHeight);
  drawPlaceholder();
  await loadTemplateBaseImage();
  await restoreProjectState();
  updateFileStatus();
  render();
}

initializeApp().catch((error) => {
  console.error(error);
  window.alert(`${state.template.name}画像の読み込みに失敗しました。`);
});
