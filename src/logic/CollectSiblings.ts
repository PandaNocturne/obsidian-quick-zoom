import { foldable } from "@codemirror/language";
import { EditorState } from "@codemirror/state";

import { cleanTitle } from "./utils/cleanTitle";
import { getFrontmatterEnd } from "./utils/getFrontmatterEnd";

export type OutlineKind = "heading" | "list";

export interface SiblingItem {
  title: string;
  pos: number;
  kind: OutlineKind;
  /** Present when kind is heading; 1–6 */
  headingLevel?: number;
}

const LIST_ITEM_RE = /^\s*([-*+]|\d+\.)\s+/;
const HEADING_RE = /^\s*(#{1,6})\s/;

export function detectHeadingLevel(lineText: string): number | null {
  const match = lineText.match(HEADING_RE);
  return match ? match[1].length : null;
}

export function detectOutlineKind(lineText: string): OutlineKind {
  return detectHeadingLevel(lineText) !== null ? "heading" : "list";
}

export function outlineIcon(
  item: Pick<SiblingItem, "kind" | "headingLevel">
): string {
  if (item.kind === "list") {
    return "list";
  }
  const level = Math.min(6, Math.max(1, item.headingLevel ?? 1));
  return `heading-${level}`;
}

export function collectSiblings(
  state: EditorState,
  parentPos: number | null
): SiblingItem[] {
  const doc = state.doc;
  const frontmatterEnd = getFrontmatterEnd(state);

  let startLine: number;
  let parentTo: number;

  if (parentPos === null) {
    startLine = frontmatterEnd > 0 ? doc.lineAt(frontmatterEnd).number : 1;
    parentTo = doc.length;
  } else {
    const parentLine = doc.lineAt(parentPos);
    const parentFold = foldable(state, parentLine.from, parentLine.to);
    startLine = parentLine.number + 1;
    parentTo = parentFold ? parentFold.to : parentLine.to;
  }

  const siblings: SiblingItem[] = [];
  let skipUntil = Math.max(frontmatterEnd, -1);

  for (let i = startLine; i <= doc.lines; i++) {
    const line = doc.line(i);
    if (line.from >= parentTo) {
      break;
    }
    if (line.from < skipUntil) {
      continue;
    }

    // Frontmatter fences / horizontal rules must not appear as outline items
    if (line.text.trim() === "---") {
      continue;
    }

    const f = foldable(state, line.from, line.to);
    if (f && f.to <= parentTo) {
      const headingLevel = detectHeadingLevel(line.text);
      siblings.push({
        title: cleanTitle(line.text),
        pos: line.from,
        kind: headingLevel !== null ? "heading" : "list",
        ...(headingLevel !== null ? { headingLevel } : {}),
      });
      skipUntil = f.to;
      continue;
    }

    if (LIST_ITEM_RE.test(line.text)) {
      siblings.push({
        title: cleanTitle(line.text),
        pos: line.from,
        kind: "list",
      });
      skipUntil = line.to;
    }
  }

  return siblings;
}
