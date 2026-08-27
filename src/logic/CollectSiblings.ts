import { foldable } from "@codemirror/language";
import { EditorState } from "@codemirror/state";

import { cleanTitle } from "./utils/cleanTitle";

export interface SiblingItem {
  title: string;
  pos: number;
}

const LIST_ITEM_RE = /^\s*([-*+]|\d+\.)\s+/;

export function collectSiblings(
  state: EditorState,
  parentPos: number | null
): SiblingItem[] {
  const doc = state.doc;

  let startLine: number;
  let parentTo: number;

  if (parentPos === null) {
    startLine = 1;
    parentTo = doc.length;
  } else {
    const parentLine = doc.lineAt(parentPos);
    const parentFold = foldable(state, parentLine.from, parentLine.to);
    startLine = parentLine.number + 1;
    parentTo = parentFold ? parentFold.to : parentLine.to;
  }

  const siblings: SiblingItem[] = [];
  let skipUntil = -1;

  for (let i = startLine; i <= doc.lines; i++) {
    const line = doc.line(i);
    if (line.from >= parentTo) {
      break;
    }
    if (line.from < skipUntil) {
      continue;
    }

    const f = foldable(state, line.from, line.to);
    if (f && f.to <= parentTo) {
      siblings.push({ title: cleanTitle(line.text), pos: line.from });
      skipUntil = f.to;
      continue;
    }

    if (LIST_ITEM_RE.test(line.text)) {
      siblings.push({ title: cleanTitle(line.text), pos: line.from });
      skipUntil = line.to;
    }
  }

  return siblings;
}
