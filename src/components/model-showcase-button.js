"use client";

export const MODEL_SELECT_EVENT = "image-studio:select-model";

export default function ModelShowcaseButton({ modelId, children }) {
  function selectModel() {
    window.dispatchEvent(new CustomEvent(MODEL_SELECT_EVENT, { detail: { model: modelId } }));
  }

  return <button type="button" className="model-family-model" onClick={selectModel}>{children}</button>;
}
