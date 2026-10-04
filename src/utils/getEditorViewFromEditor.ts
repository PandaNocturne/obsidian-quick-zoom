import { Editor } from "obsidian";

import { EditorView } from "@codemirror/view";

export function getEditorViewFromEditor(editor: Editor): EditorView {
  return (editor as unknown as { cm: EditorView }).cm;
}
