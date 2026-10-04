import { editorViewField } from "obsidian";

import { EditorState } from "@codemirror/state";

export function getDocumentTitle(state: EditorState) {
  const view = state.field(editorViewField, false);
  return view?.getDisplayText() ?? "";
}
