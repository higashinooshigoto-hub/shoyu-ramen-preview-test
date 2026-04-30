/**
 * Product JSON schema notes for this repository.
 *
 * This file is documentation-first. It intentionally keeps runtime behavior
 * to a minimum so we can clarify the product data structure without forcing
 * a large refactor.
 */

/**
 * @typedef {Object} ProductCatalogEntry
 * @property {string} id
 * @property {string} config
 */

/**
 * @typedef {Object} ProductAssetConfig
 * @property {string} [base]
 * @property {string} [mask]
 * @property {string} [boundary]
 */

/**
 * @typedef {Object} ProductCanvasConfig
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Object} ProductRect
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {number} [borderRadius]
 */

/**
 * @typedef {Object} ProductSafeArea
 * @property {number} [insetX]
 * @property {number} [insetY]
 */

/**
 * @typedef {Object} ClipShapePoint
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} ProductClipShape
 * @property {"roundedRect"|"polygon"} type
 * @property {ClipShapePoint[]} [points]
 */

/**
 * @typedef {Object} ProductOverlayStyle
 * @property {string} [blendMode]
 * @property {number} [opacity]
 */

/**
 * @typedef {Object} ProductPreviewConfig
 * @property {string} [printAreaBackground]
 * @property {boolean} [showPrintAreaGuide]
 * @property {boolean} [showBoundaryGuide]
 * @property {string} [note]
 * @property {string} [stageAspectRatio]
 * @property {boolean} [fitCanvasToShell]
 * @property {"contain"|"cover"} [stageObjectFit]
 */

/**
 * @typedef {Object} ProductExportConfig
 * @property {number} [scale]
 * @property {string} [fileName]
 */

/**
 * @typedef {Object} ProductTextLayer
 * @property {string} id
 * @property {string} label
 * @property {string} [placeholder]
 * @property {string} [defaultText]
 * @property {number} [maxLength]
 * @property {number} [halfWidthMaxLength]
 * @property {number} x
 * @property {number} y
 * @property {number} [maxWidth]
 * @property {number} [fontSize]
 * @property {number} [minFontSize]
 * @property {number} [fontWeight]
 * @property {string} [fontFamily]
 * @property {string} [fillStyle]
 * @property {string} [strokeStyle]
 * @property {number} [lineWidth]
 * @property {string} [lineJoin]
 * @property {string} [paintOrder]
 * @property {CanvasTextAlign|string} [textAlign]
 * @property {CanvasTextBaseline|string} [textBaseline]
 */

/**
 * @typedef {Object} ProductControlButton
 * @property {string} action
 * @property {string} label
 */

/**
 * @typedef {Object} ProductControl
 * @property {"heading"|"file"|"range"|"buttonRow"|"tips"|"textLayers"|"confirm"|"download"|"resetAll"} type
 * @property {string} [id]
 * @property {string} [text]
 * @property {string} [label]
 * @property {string} [accept]
 * @property {number} [min]
 * @property {number} [max]
 * @property {number} [step]
 * @property {number} [value]
 * @property {string} [output]
 * @property {ProductControlButton[]} [buttons]
 * @property {string} [heading]
 * @property {string} [pendingText]
 * @property {string} [confirmedText]
 * @property {string} [buttonLabel]
 * @property {string} [description]
 * @property {{value: string, label: string}[]} [formats]
 */

/**
 * Canonical product config shape used by this repository today.
 *
 * Note:
 * - This is a visual preview schema, not a pricing simulator schema.
 * - Fields such as rates / fees / terms / resultFields are currently unknown
 *   in this repository and should be treated as TODO if needed later.
 *
 * @typedef {Object} ProductConfig
 * @property {string} id
 * @property {string} name
 * @property {string} title
 * @property {string} [eyebrow]
 * @property {string} [lead]
 * @property {ProductAssetConfig} assets
 * @property {ProductCanvasConfig} canvas
 * @property {ProductRect} labelRect
 * @property {ProductRect} [maskRect]
 * @property {ProductSafeArea} [safeArea]
 * @property {ProductClipShape} [clipShape]
 * @property {ProductOverlayStyle} [overlayStyle]
 * @property {"background"|"foreground"} [baseLayerOrder]
 * @property {ProductPreviewConfig} [preview]
 * @property {ProductExportConfig} [export]
 * @property {ProductTextLayer[]} [textLayers]
 * @property {ProductControl[]} [controls]
 *
 * Future extension slots (not standardized in current runtime):
 * @property {string} [category]
 * @property {string} [description]
 * @property {Record<string, unknown>} [defaultValues]
 * @property {Record<string, unknown>} [constraints]
 * @property {Record<string, unknown>} [rates]
 * @property {Record<string, unknown>} [fees]
 * @property {Record<string, unknown>} [terms]
 * @property {string} [calculationType]
 * @property {unknown[]} [resultFields]
 * @property {string[]} [notes]
 * @property {string[]} [disclaimers]
 * @property {number} [displayOrder]
 * @property {boolean} [enabled]
 * @property {string[]} [tags]
 */

/**
 * Repository-level notes for future product data work.
 */
export const PRODUCT_SCHEMA_NOTES = {
  sourceOfTruth: [
    "products/index.json",
    "products/*.json",
    "docs/codex-handoff.md",
    "docs/product-simulation-spec.md"
  ],
  currentDomain: "visual-preview-composer",
  unsupportedSimulationFields: ["rates", "fees", "terms", "pricing", "periods"],
  todoPolicy: "If a product condition is unknown, keep it as TODO or unknown rather than guessing."
};
