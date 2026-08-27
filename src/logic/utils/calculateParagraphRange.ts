import { EditorState } from "@codemirror/state";

import {
  ListRecognitionOptions,
  isRecognizedListLine,
} from "./listItemParsing";

const HEADING_RE = /^\s*(#{1,6})\s/;

/**
 * True for lines that continue a plain-text paragraph (not blank, heading, list, or hr).
 */
export function isParagraphBodyLine(
  lineText: string,
  listOptions: ListRecognitionOptions
): boolean {
  const trimmed = lineText.trim();
  if (trimmed === "" || trimmed === "---") {
    return false;
  }
  if (HEADING_RE.test(lineText)) {
    return false;
  }
  if (isRecognizedListLine(lineText, listOptions)) {
    return false;
  }
  return true;
}

/**
 * Range for zooming a paragraph or blank line when it is not foldable.
 * - Blank / hr: just that line
 * - Text: contiguous non-blank paragraph body lines
 */
export function calculateParagraphRange(
  state: EditorState,
  pos: number,
  listOptions: ListRecognitionOptions
): { from: number; to: number } {
  const doc = state.doc;
  const line = doc.lineAt(pos);

  if (!isParagraphBodyLine(line.text, listOptions)) {
    return { from: line.from, to: line.to };
  }

  let fromLine = line.number;
  let toLine = line.number;

  while (fromLine > 1) {
    const prev = doc.line(fromLine - 1);
    if (!isParagraphBodyLine(prev.text, listOptions)) {
      break;
    }
    fromLine--;
  }

  while (toLine < doc.lines) {
    const next = doc.line(toLine + 1);
    if (!isParagraphBodyLine(next.text, listOptions)) {
      break;
    }
    toLine++;
  }

  return { from: doc.line(fromLine).from, to: doc.line(toLine).to };
}
