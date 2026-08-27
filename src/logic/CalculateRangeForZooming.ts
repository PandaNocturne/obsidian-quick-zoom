import { foldable } from "@codemirror/language";
import { EditorState } from "@codemirror/state";

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

    if (!foldRange && isRecognizedListLine(line.text, listOptions)) {
      return { from: line.from, to: line.to };
    }

    if (!foldRange) {
      return null;
    }

    return { from: line.from, to: foldRange.to };
  }
}
