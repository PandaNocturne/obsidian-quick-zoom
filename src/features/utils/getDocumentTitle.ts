import { editorInfoField } from "obsidian";

import { EditorState } from "@codemirror/state";

export function getDocumentTitle(state: EditorState) {
  const info = state.field(editorInfoField);
  return info.file?.basename ?? "";
}
