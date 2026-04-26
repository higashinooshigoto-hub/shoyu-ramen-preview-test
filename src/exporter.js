import { dataUrlToUint8Array } from "./image-utils.js";
import { createStoredZip } from "./zip-utils.js";

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

function buildCompositeImageData({ state, renderer, exportFormat }) {
  const exportType = exportFormat === "jpeg" ? "image/jpeg" : "image/png";
  const extension = exportType === "image/jpeg" ? "jpg" : "png";
  const exportScale = state.product.export.scale || 1;
  const exportCanvas = document.createElement("canvas");
  const exportCtx = exportCanvas.getContext("2d");
  exportCanvas.width = Math.round(state.product.canvas.width * exportScale);
  exportCanvas.height = Math.round(state.product.canvas.height * exportScale);

  if (exportType === "image/jpeg") {
    exportCtx.fillStyle = "#ffffff";
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  }

  renderer.drawScene(exportCtx, {
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

function buildOriginalUploadData(state) {
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

export function exportZip({ state, renderer, exportFormat }) {
  if (!state.baseImage) {
    window.alert(`${state.product.name}画像の読み込みに失敗しています。`);
    return;
  }

  try {
    const compositeImage = buildCompositeImageData({ state, renderer, exportFormat });
    const zipEntries = [
      {
        name: `${state.product.export.fileName}.${compositeImage.extension}`,
        data: compositeImage.bytes,
      },
    ];

    const originalUpload = buildOriginalUploadData(state);
    if (originalUpload) {
      zipEntries.unshift({ name: originalUpload.name, data: originalUpload.bytes });
    }

    const zipBlob = createStoredZip(zipEntries);
    const objectUrl = URL.createObjectURL(zipBlob);
    triggerDownload(objectUrl, `${state.product.export.fileName}-set.zip`);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (error) {
    console.error(error);
    window.alert("ZIP の書き出しに失敗しました。");
  }
}
