import { foldable } from "@codemirror/language";
import { EditorState } from "@codemirror/state";

import { cleanTitle } from "./utils/cleanTitle";
import {
  HeadingIndex,
  detectHeadingLevelFromText,
  getHeadingAt,
  getHeadingIndex,
} from "./utils/getCachedHeadings";
import { getFrontmatterEnd } from "./utils/getFrontmatterEnd";
import {
  ListRecognitionOptions,
  ListType,
  detectListType,
} from "./utils/listItemParsing";

export type OutlineKind = "heading" | "list" | "text";
export type BreadcrumbKind = "document" | OutlineKind;

export interface SiblingItem {
  title: string;
  pos: number;
  kind: OutlineKind;
  /** Present when kind is heading; 1–6 */
  headingLevel?: number;
  /** Present when kind is list */
  listType?: ListType;
}

export interface OutlineIconTarget {
  kind: BreadcrumbKind;
  headingLevel?: number;
  listType?: ListType;
}

/** @deprecated Prefer getHeadingIndex (fence-aware regex) */
export { detectHeadingLevelFromText as detectHeadingLevel } from "./utils/getCachedHeadings";

export function detectOutlineKind(lineText: string): OutlineKind {
  return detectHeadingLevelFromText(lineText) !== null ? "heading" : "list";
}

export function outlineIcon(
  item: Pick<SiblingItem, "kind" | "headingLevel" | "listType">
): string {
  if (item.kind === "text") {
    return "pilcrow";
  }
  if (item.kind === "list") {
    switch (item.listType) {
      case "ordered":
        return "list-ordered";
      case "task":
        return "check-square";
      default:
        return "list";
    }
  }
  const level = Math.min(6, Math.max(1, item.headingLevel ?? 1));
  return `heading-${level}`;
}

export function outlineIconName(item: OutlineIconTarget): string {
  if (item.kind === "document") {
    return "scan-eye";
  }
  if (item.kind === "text") {
    return "pilcrow";
  }
  return outlineIcon({
    kind: item.kind,
    headingLevel: item.headingLevel,
    listType: item.listType,
  });
}

export function outlineIconColorClass(
  item: Pick<OutlineIconTarget, "kind">
): string {
  switch (item.kind) {
    case "document":
      return "zoom-plugin-icon--document";
    case "heading":
      return "zoom-plugin-icon--heading";
    case "list":
      return "zoom-plugin-icon--list";
    default:
      return "zoom-plugin-icon--text";
  }
}

export function collectSiblings(
  state: EditorState,
  parentPos: number | null,
  listOptions: ListRecognitionOptions,
  headings: HeadingIndex = getHeadingIndex(state)
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
      const heading = getHeadingAt(headings, line.from);
      if (heading) {
        siblings.push({
          title: heading.title,
          pos: line.from,
          kind: "heading",
          headingLevel: heading.level,
        });
        skipUntil = f.to;
        continue;
      }

      const listType = detectListType(line.text, listOptions);
      if (listType) {
        siblings.push({
          title: cleanTitle(line.text),
          pos: line.from,
          kind: "list",
          listType,
        });
        skipUntil = f.to;
      }
      continue;
    }

    const heading = getHeadingAt(headings, line.from);
    if (heading) {
      siblings.push({
        title: heading.title,
        pos: line.from,
        kind: "heading",
        headingLevel: heading.level,
      });
      skipUntil = line.to;
      continue;
    }

    const listType = detectListType(line.text, listOptions);
    if (listType) {
      siblings.push({
        title: cleanTitle(line.text),
        pos: line.from,
        kind: "list",
        listType,
      });
      skipUntil = line.to;
    }
  }

  return siblings;
}
