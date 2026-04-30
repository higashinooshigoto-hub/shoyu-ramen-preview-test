export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getControl(product, id) {
  return (product.controls || []).find((control) => control.id === id);
}

export function getScaleBounds(product) {
  const scaleControl = getControl(product, "scale") || {};
  return {
    min: Number(scaleControl.min ?? 0.1),
    max: Number(scaleControl.max ?? 8),
  };
}

export function getDefaultTexts(product) {
  return Object.fromEntries(
    (product.textLayers || []).map((layer) => [layer.id, layer.defaultText || ""]),
  );
}

export function createComposerState(product) {
  const scaleControl = getControl(product, "scale") || {};
  const initialScale = Number(scaleControl.value ?? 1);
  const texts = getDefaultTexts(product);

  return {
    product,
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
      x: product.canvas.width / 2,
      y: product.canvas.height / 2,
      scale: initialScale,
      rotation: 0,
    },
    texts,
    isDesignConfirmed: false,
  };
}

export function getStorageKey(product) {
  return `product-composer-state:${product.id}`;
}

export function getLabelRect(product) {
  return product.labelRect;
}

export function getMaskRect(product) {
  return product.maskRect || product.labelRect;
}

export function getSafeAreaRect(product) {
  const { labelRect, safeArea } = product;
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

export function getLabelCenter(product) {
  const rect = getLabelRect(product);
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

export function getTextLayerValue(state, layerId) {
  return state.texts[layerId] || "";
}

export function getTextLayerDisplayValue(state, layer) {
  const text = getTextLayerValue(state, layer.id);
  return text.length > 0 ? text : layer.defaultText || "";
}

export function hasTextContent(state) {
  return (state.product.textLayers || []).some(
    (layer) => getTextLayerValue(state, layer.id).length > 0,
  );
}

export function isHalfWidthAlphaNumericText(value) {
  return /^[A-Za-z0-9 ]+$/.test(value);
}

export function getTextInputLimit(layer, value) {
  if (value && layer.halfWidthMaxLength && isHalfWidthAlphaNumericText(value)) {
    return layer.halfWidthMaxLength;
  }

  return layer.maxLength || value.length;
}

export function resetOverlayState(state) {
  const center = getLabelCenter(state.product);
  state.overlay.x = center.x;
  state.overlay.y = center.y;
  state.overlay.scale = Number(getControl(state.product, "scale")?.value ?? 1);
  state.overlay.rotation = 0;
}
