import { EditorState } from "@codemirror/state";

import {
  HeadingIndex,
  getHeadingAt,
  getHeadingIndex,
} from "./getCachedHeadings";
import {
  ListRecognitionOptions,
  isRecognizedListLine,
} from "./listItemParsing";

/**
 * True for lines that continue a plain-text paragraph (not blank, heading, list, or hr).
 * Heading detection uses Obsidian metadataCache when available.
 */
export function isParagraphBodyLine(
  lineFrom: number,
  lineText: string,
  listOptions: ListRecognitionOptions,
  headings: HeadingIndex
): boolean {
  const trimmed = lineText.trim();
  if (trimmed === "" || trimmed === "---") {
    return false;
  }
  if (getHeadingAt(headings, lineFrom)) {
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
  listOptions: ListRecognitionOptions,
  headings: HeadingIndex = getHeadingIndex(state)
): { from: number; to: number } {
  const doc = state.doc;
  const line = doc.lineAt(pos);

  if (!isParagraphBodyLine(line.from, line.text, listOptions, headings)) {
    return { from: line.from, to: line.to };
  }

  let fromLine = line.number;
  let toLine = line.number;

  while (fromLine > 1) {
    const prev = doc.line(fromLine - 1);
    if (!isParagraphBodyLine(prev.from, prev.text, listOptions, headings)) {
      break;
    }
    fromLine--;
  }

  while (toLine < doc.lines) {
    const next = doc.line(toLine + 1);
    if (!isParagraphBodyLine(next.from, next.text, listOptions, headings)) {
      break;
    }
    toLine++;
  }

  return { from: doc.line(fromLine).from, to: doc.line(toLine).to };
}
