import { editorInfoField } from "obsidian";

import { EditorState } from "@codemirror/state";

export function getDocumentTitle(state: EditorState) {
  try {
    const info = state.field(editorInfoField, false);
    return info?.file?.basename ?? "";
  } catch {
    return "";
  }
}
