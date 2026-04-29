function getProductHeading(product) {
  const source = product.headerTitle || product.title || product.name || "Product Preview";
  return source.replace(/\s*プレビュー$/, "").trim();
}

export function applyProductContent(product, elements) {
  document.title = product.title || product.name || "Product Preview";
  elements.title.textContent = getProductHeading(product);
  elements.stageNote.innerHTML = product.preview?.note || "";
}

export function buildControls(container, product, handlers) {
  const refs = {
    ranges: {},
    outputs: {},
    textInputs: {},
    overlayInput: null,
    overlayStatus: null,
    exportFormatInput: null,
    downloadPanel: null,
    confirmStatus: null,
    confirmTexts: null,
  };

  container.replaceChildren();

  for (const control of product.controls || []) {
    if (control.type === "heading") {
      const heading = document.createElement("h2");
      heading.textContent = control.text;
      container.append(heading);
      continue;
    }

    if (control.type === "file") {
      const field = document.createElement("label");
      field.className = "field";

      const label = document.createElement("span");
      label.textContent = control.label;
      field.append(label);

      const input = document.createElement("input");
      input.type = "file";
      input.accept = control.accept || ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
      input.addEventListener("change", handlers.onFileChange);
      field.append(input);

      const status = document.createElement("p");
      status.className = "file-status";
      field.append(status);

      refs.overlayInput = input;
      refs.overlayStatus = status;
      container.append(field);
      continue;
    }

    if (control.type === "buttonRow") {
      const row = document.createElement("div");
      row.className = "button-row";

      for (const buttonConfig of control.buttons || []) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = buttonConfig.label;
        button.addEventListener("click", () => handlers.onAction(buttonConfig.action));
        row.append(button);
      }

      container.append(row);
      continue;
    }

    if (control.type === "range") {
      const field = document.createElement("div");
      field.className = "field range-field";

      const label = document.createElement("span");
      label.textContent = control.label;
      field.append(label);

      const output = document.createElement("output");
      field.append(output);

      const input = document.createElement("input");
      input.type = "range";
      input.min = String(control.min);
      input.max = String(control.max);
      input.step = String(control.step);
      input.value = String(control.value ?? 0);
      input.addEventListener("input", () => {
        handlers.onRangeChange(control.id, Number(input.value));
      });

      const rangeControl = document.createElement("div");
      rangeControl.className = "range-control";

      if (control.id === "rotation") {
        rangeControl.classList.add("has-step-buttons");

        const decrementButton = document.createElement("button");
        decrementButton.type = "button";
        decrementButton.className = "step-button";
        decrementButton.textContent = "-";
        decrementButton.setAttribute("aria-label", `${control.label}を1度下げる`);
        decrementButton.addEventListener("click", () => {
          handlers.onRangeStep(control.id, -Number(control.step || 1));
        });
        rangeControl.append(decrementButton);
      }

      rangeControl.append(input);

      if (control.id === "rotation") {
        const incrementButton = document.createElement("button");
        incrementButton.type = "button";
        incrementButton.className = "step-button";
        incrementButton.textContent = "+";
        incrementButton.setAttribute("aria-label", `${control.label}を1度上げる`);
        incrementButton.addEventListener("click", () => {
          handlers.onRangeStep(control.id, Number(control.step || 1));
        });
        rangeControl.append(incrementButton);
      }

      field.append(rangeControl);

      refs.ranges[control.id] = input;
      refs.outputs[control.id] = {
        element: output,
        format: control.output || "plain",
      };
      updateOutput(output, control.output, Number(input.value));
      container.append(field);
      continue;
    }

    if (control.type === "tips") {
      const tips = document.createElement("p");
      tips.className = "tips";
      tips.textContent = control.text;
      container.append(tips);
      continue;
    }

    if (control.type === "textLayers") {
      if (!product.textLayers?.length) continue;

      const section = document.createElement("section");
      const heading = document.createElement("h2");
      heading.textContent = control.heading;
      section.append(heading);

      if (control.guidance) {
        const guidance = document.createElement("p");
        guidance.className = "tips text-guidance";
        guidance.textContent = control.guidance;
        section.append(guidance);
      }

      const fields = document.createElement("div");
      fields.id = "textFields";
      section.append(fields);

      for (const layer of product.textLayers) {
        const field = document.createElement("label");
        field.className = "field";

        const title = document.createElement("span");
        title.textContent = layer.label;
        field.append(title);

        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = layer.placeholder || "";
        let isComposing = false;

        input.addEventListener("compositionstart", () => {
          isComposing = true;
        });

        input.addEventListener("compositionend", () => {
          isComposing = false;
          input.value = handlers.onTextCommit(layer, input.value);
        });

        input.addEventListener("input", () => {
          if (isComposing) {
            handlers.onTextDraft(layer, input.value);
            return;
          }

          input.value = handlers.onTextCommit(layer, input.value);
        });

        input.addEventListener("blur", () => {
          input.value = handlers.onTextCommit(layer, input.value);
        });

        field.append(input);

        if (layer.hint) {
          const hint = document.createElement("p");
          hint.className = "field-hint";
          hint.textContent = layer.hint;
          field.append(hint);
        }

        refs.textInputs[layer.id] = input;
        fields.append(field);
      }

      container.append(section);
      continue;
    }

    if (control.type === "confirm") {
      const heading = document.createElement("h2");
      heading.textContent = control.heading;
      container.append(heading);

      const status = document.createElement("p");
      status.className = "tips";
      container.append(status);

      const actions = document.createElement("div");
      actions.className = "footer-actions";

      const button = document.createElement("button");
      button.className = "primary-button";
      button.type = "button";
      button.textContent = control.buttonLabel;
      button.addEventListener("click", handlers.onConfirm);
      actions.append(button);
      container.append(actions);

      refs.confirmStatus = status;
      refs.confirmTexts = {
        pending: control.pendingText,
        confirmed: control.confirmedText,
      };
      continue;
    }

    if (control.type === "download") {
      const panel = document.createElement("section");
      panel.className = "download-panel";
      panel.hidden = true;

      const heading = document.createElement("h2");
      heading.textContent = control.heading;
      panel.append(heading);

      const description = document.createElement("p");
      description.className = "tips";
      description.textContent = control.description;
      panel.append(description);

      const field = document.createElement("label");
      field.className = "field";

      const label = document.createElement("span");
      label.textContent = "保存形式";
      field.append(label);

      const select = document.createElement("select");
      for (const format of control.formats || []) {
        const option = document.createElement("option");
        option.value = format.value;
        option.textContent = format.label;
        select.append(option);
      }
      select.addEventListener("change", handlers.onExportFormatChange);
      field.append(select);
      panel.append(field);

      const actions = document.createElement("div");
      actions.className = "footer-actions";

      const button = document.createElement("button");
      button.className = "primary-button";
      button.type = "button";
      button.textContent = control.buttonLabel;
      button.addEventListener("click", handlers.onDownload);
      actions.append(button);
      panel.append(actions);

      refs.exportFormatInput = select;
      refs.downloadPanel = panel;
      container.append(panel);
      continue;
    }

    if (control.type === "resetAll") {
      const actions = document.createElement("div");
      actions.className = "footer-actions secondary-actions";

      const button = document.createElement("button");
      button.className = "danger-button";
      button.type = "button";
      button.textContent = control.label;
      button.addEventListener("click", handlers.onClearAll);
      actions.append(button);
      container.append(actions);
    }
  }

  return refs;
}

export function updateOutput(output, format, value) {
  if (format === "percent") {
    output.value = `${Math.round(value * 100)}%`;
    return;
  }

  if (format === "degree") {
    output.value = `${Math.round(value)}°`;
    return;
  }

  output.value = String(value);
}

export function updateRange(refs, id, value) {
  const input = refs.ranges[id];
  const output = refs.outputs[id];
  if (!input || !output) return;

  input.value = String(value);
  updateOutput(output.element, output.format, value);
}

export function updateAllRanges(refs, state) {
  updateRange(refs, "scale", state.overlay.scale);
  updateRange(refs, "rotation", state.overlay.rotation);
}

export function updateFileStatus(refs, state) {
  if (!refs.overlayStatus) return;
  refs.overlayStatus.textContent = state.overlayFileName
    ? `現在表示中: ${state.overlayFileName}`
    : "";
}

export function updateConfirmUI(refs, isDesignConfirmed) {
  if (refs.downloadPanel) {
    refs.downloadPanel.hidden = !isDesignConfirmed;
  }

  if (refs.confirmStatus && refs.confirmTexts) {
    refs.confirmStatus.textContent = isDesignConfirmed
      ? refs.confirmTexts.confirmed
      : refs.confirmTexts.pending;
  }
}

export function syncTextInputs(refs, state) {
  for (const layer of state.product.textLayers || []) {
    if (refs.textInputs[layer.id]) {
      refs.textInputs[layer.id].value = state.texts[layer.id] || "";
    }
  }
}
