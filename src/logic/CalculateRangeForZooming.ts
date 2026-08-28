import { foldable } from "@codemirror/language";
import { EditorState } from "@codemirror/state";

import { detectHeadingLevel } from "./CollectSiblings";
import { calculateParagraphRange } from "./utils/calculateParagraphRange";
import {
  ListRecognitionOptions,
  isRecognizedListLine,
} from "./utils/listItemParsing";

export class CalculateRangeForZooming {
  public calculateRangeForZooming(
    state: EditorState,
    pos: number,
    listOptions: ListRecognitionOptions
  ) {
    const line = state.doc.lineAt(pos);
    const foldRange = foldable(state, line.from, line.to);

    if (foldRange) {
      return { from: line.from, to: foldRange.to };
    }

    // Empty headings / leaf list items: zoom the line itself
    if (
      detectHeadingLevel(line.text) !== null ||
      isRecognizedListLine(line.text, listOptions)
    ) {
      return { from: line.from, to: line.to };
    }

    // Paragraphs and blank lines
    return calculateParagraphRange(state, pos, listOptions);
  }

  /**
   * Zoom to the full lines covered by a text selection (supports multi-line).
   */
  public calculateRangeForSelection(
    state: EditorState,
    selectionFrom: number,
    selectionTo: number
  ) {
    const anchor = Math.min(selectionFrom, selectionTo);
    const head = Math.max(selectionFrom, selectionTo);
    // Selection `to` is exclusive; if it sits on a line start, exclude that line.
    const endPos = head > anchor ? head - 1 : head;
    const from = state.doc.lineAt(anchor).from;
    const to = state.doc.lineAt(endPos).to;
    return { from, to };
  }
}
