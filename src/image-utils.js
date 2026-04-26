export const STORAGE_IMAGE_MAX_SIZE = 1600;

export function loadImageFromSrc(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      loadImageFromSrc(reader.result).then(resolve).catch(reject);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function serializeImageForStorage(image, mimeType = "image/png") {
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

export function dataUrlToUint8Array(dataUrl) {
  const [, base64] = dataUrl.split(",", 2);
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}
