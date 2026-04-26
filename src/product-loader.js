async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${path} を読み込めませんでした。`);
  }
  return response.json();
}

export async function loadProductCatalog() {
  return loadJson("./products/index.json");
}

export function resolveProductId(catalog, locationSearch = window.location.search) {
  const params = new URLSearchParams(locationSearch);
  const requestedProductId = params.get("product");
  const productIds = new Set((catalog.products || []).map((product) => product.id));

  if (requestedProductId && productIds.has(requestedProductId)) {
    return requestedProductId;
  }

  return catalog.defaultProductId || catalog.products?.[0]?.id;
}

export async function loadProductConfig(catalog, productId) {
  const productEntry = (catalog.products || []).find((product) => product.id === productId);
  if (!productEntry) {
    throw new Error(`商品ID ${productId} が見つかりません。`);
  }

  const product = await loadJson(productEntry.config);
  return normalizeProduct(product);
}

function normalizeProduct(product) {
  const width = product.canvas?.width || product.baseWidth;
  const height = product.canvas?.height || product.baseHeight;

  return {
    ...product,
    canvas: {
      width,
      height,
    },
    export: {
      scale: 1,
      fileName: product.id || "product-preview",
      ...(product.export || {}),
    },
    overlayStyle: {
      blendMode: "source-over",
      opacity: 1,
      ...(product.overlayStyle || {}),
    },
    preview: {
      showPrintAreaGuide: true,
      ...(product.preview || {}),
    },
    textLayers: product.textLayers || [],
    controls: product.controls || [],
  };
}
