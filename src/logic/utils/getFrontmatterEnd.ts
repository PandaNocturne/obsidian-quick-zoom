import { EditorState } from "@codemirror/state";

/**
 * Returns the document position where content after YAML frontmatter starts.
 * Obsidian frontmatter is a block opening and closing with `---` on its own line.
 * Returns 0 when the document has no frontmatter.
 */
export function getFrontmatterEnd(state: EditorState): number {
  const doc = state.doc;
  if (doc.lines < 2) {
    return 0;
  }

  if (doc.line(1).text.trim() !== "---") {
    return 0;
  }

  for (let i = 2; i <= doc.lines; i++) {
    if (doc.line(i).text.trim() === "---") {
      return i < doc.lines ? doc.line(i + 1).from : doc.line(i).to;
    }
  }

  return 0;
}
