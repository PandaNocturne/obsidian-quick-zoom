import { foldable } from "@codemirror/language";
import { EditorState } from "@codemirror/state";

import {
  HeadingIndex,
  getHeadingAt,
  getHeadingIndex,
} from "./getCachedHeadings";
import { ListRecognitionOptions, detectAnyListType } from "./listItemParsing";

/**
 * Prefer CodeMirror's fold service; when it is not ready yet (common on the
 * first paint of a newly opened note), fall back to heading-level / list-indent
 * structure so outline nesting stays correct.
 */
export function getOutlineFoldRange(
  state: EditorState,
  lineFrom: number,
  _listOptions: ListRecognitionOptions,
  headings: HeadingIndex = getHeadingIndex(state)
): { from: number; to: number } | null {
  const line = state.doc.lineAt(lineFrom);
  const cmFold = foldable(state, line.from, line.to);
  if (cmFold) {
    return cmFold;
  }

  const heading = getHeadingAt(headings, line.from);
  if (heading) {
    return structuralHeadingFold(state, line.number, heading.level, headings);
  }

  // Use any-list detection so indent nesting works even when the current
  // recognition toggles would hide this line as an outline item.
  if (detectAnyListType(line.text)) {
    return structuralListFold(state, line.number, line.text);
  }

  return null;
}

export function leadingIndentWidth(lineText: string): number {
  const match = lineText.match(/^\s*/);
  if (!match) {
    return 0;
  }
  let width = 0;
  for (const ch of match[0]) {
    width += ch === "\t" ? 4 : 1;
  }
  return width;
}

function structuralHeadingFold(
  state: EditorState,
  lineNumber: number,
  level: number,
  headings: HeadingIndex
): { from: number; to: number } | null {
  const line = state.doc.line(lineNumber);
  let foundContent = false;

  for (let i = lineNumber + 1; i <= state.doc.lines; i++) {
    const next = state.doc.line(i);
    const nextHeading = getHeadingAt(headings, next.from);
    if (nextHeading && nextHeading.level <= level) {
      return foundContent ? { from: line.from, to: next.from } : null;
    }
    if (next.text.trim() !== "") {
      foundContent = true;
    }
  }

  return foundContent ? { from: line.from, to: state.doc.length } : null;
}

function structuralListFold(
  state: EditorState,
  lineNumber: number,
  lineText: string
): { from: number; to: number } | null {
  const line = state.doc.line(lineNumber);
  const indent = leadingIndentWidth(lineText);
  let foundNested = false;
  let end = line.to;

  for (let i = lineNumber + 1; i <= state.doc.lines; i++) {
    const next = state.doc.line(i);
    if (next.text.trim() === "") {
      if (foundNested) {
        end = next.to;
      }
      continue;
    }

    const nextIndent = leadingIndentWidth(next.text);
    if (detectAnyListType(next.text)) {
      if (nextIndent > indent) {
        foundNested = true;
        end = next.to;
        continue;
      }
      return foundNested ? { from: line.from, to: next.from } : null;
    }

    // Indented continuation under this list item
    if (nextIndent > indent) {
      foundNested = true;
      end = next.to;
      continue;
    }

    return foundNested ? { from: line.from, to: next.from } : null;
  }

  return foundNested ? { from: line.from, to: end } : null;
}
