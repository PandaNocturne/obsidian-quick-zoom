import { EditorView } from "@codemirror/view";

/**
 * Position used for default-mode breadcrumbs: the main cursor.
 */
export function getActiveOutlinePos(view: EditorView): number {
  return view.state.selection.main.head;
}
