import { EditorView } from "@codemirror/view";

/**
 * Position used for sticky breadcrumbs: top of the visible editor content,
 * falling back to the cursor when coords cannot be resolved.
 */
export function getActiveOutlinePos(view: EditorView): number {
  const rect = view.contentDOM.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    const fromCoords = view.posAtCoords({
      x: rect.left + Math.min(24, Math.max(4, rect.width / 4)),
      y: rect.top + 4,
    });
    if (typeof fromCoords === "number") {
      return fromCoords;
    }
  }

  return view.state.selection.main.head;
}
