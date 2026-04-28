import {
  getLabelRect,
  getMaskRect,
  getSafeAreaRect,
  getTextLayerDisplayValue,
} from "./state.js";

const DEFAULT_TEMPLATE_PREVIEW_STROKE = "rgba(0, 0, 0, 0.5)";

export function createRenderer({ canvas, canvasShell, state }) {
  const ctx = canvas.getContext("2d");

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
    if (state.product.clipShape) {
      return state.product.clipShape;
    }

    return {
      type: "roundedRect",
      rect: getLabelRect(state.product),
    };
  }

  function traceShape(targetCtx, shape, scaleX = 1, scaleY = 1) {
    if (!shape) return;

    if (shape.type === "polygon") {
      tracePolygon(targetCtx, shape.points, scaleX, scaleY);
      return;
    }

    traceRoundedRect(targetCtx, shape.rect || getLabelRect(state.product), scaleX, scaleY);
  }

  function buildTextFont(layer, fontSize) {
    return `${layer.fontWeight || 700} ${fontSize}px ${layer.fontFamily || '"Hiragino Sans", "Yu Gothic", sans-serif'}`;
  }

  function fitTextFontSize(targetCtx, layer, text, scale = 1) {
    const maxWidth = (layer.maxWidth || state.product.canvas.width) * scale;
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
    const layers = state.product.textLayers || [];
    if (!layers.length) return;

    const scale = Math.min(scaleX, scaleY);
    targetCtx.save();

    for (const layer of layers) {
      const rawText = getTextLayerDisplayValue(state, layer);
      if (!rawText.length) continue;

      const fontSize = fitTextFontSize(targetCtx, layer, rawText, scale);
      targetCtx.font = buildTextFont(layer, fontSize);
      targetCtx.textAlign = layer.textAlign || "center";
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
    ctx.fillText(`${state.product.name}のベース画像を読み込み中です`, canvas.width / 2, 72);
    ctx.font = '400 18px "Hiragino Sans", "Yu Gothic", sans-serif';
    ctx.fillText("次に画像を読み込むと位置やサイズを調整できます", canvas.width / 2, 108);
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
    if (state.product.preview?.showPrintAreaGuide === false) return;
    drawEmptyOverlayPreview(targetCtx, scaleX, scaleY);
  }

  function drawBoundaryGuide(targetCtx, width, height) {
    if (!state.boundaryImage) return;
    targetCtx.drawImage(state.boundaryImage, 0, 0, width, height);
  }

  function drawPrintAreaBackground(targetCtx, width, height, scaleX, scaleY) {
    const maskRect = getMaskRect(state.product);

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
    targetCtx.globalAlpha = state.product.overlayStyle?.opacity ?? 1;
    targetCtx.globalCompositeOperation = state.product.overlayStyle?.blendMode ?? "source-over";

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
    const maskRect = getMaskRect(state.product);

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
    const scaleX = width / state.product.canvas.width;
    const scaleY = height / state.product.canvas.height;

    if (clear) {
      targetCtx.clearRect(0, 0, width, height);
    }

    if (!state.baseImage) {
      return;
    }

    const drawBaseOnTop = state.product.baseLayerOrder === "foreground";

    if (!drawBaseOnTop) {
      targetCtx.drawImage(state.baseImage, 0, 0, width, height);
    }

    const shouldDrawPrintAreaBackground =
      state.overlayImage || (showGuide && state.product.preview?.printAreaBackground);

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
      drawBoundaryGuide(targetCtx, width, height);
    }
  }

  function render(options = {}) {
    if (!state.baseImage) {
      drawPlaceholder();
      return;
    }

    drawScene(ctx, options);
  }

  return {
    canvas,
    drawPlaceholder,
    drawScene,
    getSafeAreaRect: () => getSafeAreaRect(state.product),
    render,
    setCanvasSize,
  };
}
