import { EditorState } from "@codemirror/state";

import { Breadcrumb } from "./CollectBreadcrumbs";
import { SiblingItem, detectHeadingLevel } from "./CollectSiblings";
import { getFrontmatterEnd } from "./utils/getFrontmatterEnd";

/**
 * Previous heading line before `pos` (document order, any level).
 */
export function findPreviousHeadingPos(
  state: EditorState,
  pos: number
): number | null {
  const frontmatterEnd = getFrontmatterEnd(state);
  const startLine = state.doc.lineAt(pos).number;

  for (let i = startLine - 1; i >= 1; i--) {
    const line = state.doc.line(i);
    if (line.from < frontmatterEnd) {
      break;
    }
    if (line.text.trim() === "---") {
      continue;
    }
    if (detectHeadingLevel(line.text) !== null) {
      return line.from;
    }
  }

  return null;
}

/**
 * Next heading line after `pos` (document order, any level).
 */
export function findNextHeadingPos(
  state: EditorState,
  pos: number
): number | null {
  const frontmatterEnd = getFrontmatterEnd(state);
  const startLine = state.doc.lineAt(pos).number;

  for (let i = startLine + 1; i <= state.doc.lines; i++) {
    const line = state.doc.line(i);
    if (line.from < frontmatterEnd) {
      continue;
    }
    if (line.text.trim() === "---") {
      continue;
    }
    if (detectHeadingLevel(line.text) !== null) {
      return line.from;
    }
  }

  return null;
}

/**
 * Parent outline node of the sticky breadcrumb tip.
 * `null` means document root (caller should zoom out).
 */
export function findParentZoomPos(breadcrumbs: Breadcrumb[]): number | null {
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return breadcrumbs[breadcrumbs.length - 2].pos;
}

function isSameOutlinePeer(a: SiblingItem | Breadcrumb, b: SiblingItem) {
  if (a.kind !== b.kind) {
    return false;
  }
  if (a.kind === "heading") {
    return a.headingLevel === b.headingLevel;
  }
  if (a.kind === "list") {
    return a.listType === b.listType;
  }
  return false;
}

/**
 * Previous/next sibling at the same outline level and kind
 * (same heading level, or same list type).
 */
export function findSiblingZoomPos(
  breadcrumbs: Breadcrumb[],
  direction: -1 | 1
): number | null {
  if (breadcrumbs.length === 0) {
    return null;
  }

  const current = breadcrumbs[breadcrumbs.length - 1];
  if (
    current.pos == null ||
    current.kind === "document" ||
    current.kind === "text"
  ) {
    return null;
  }

  const peers = current.siblings.filter((s) => isSameOutlinePeer(current, s));
  const index = peers.findIndex((s) => s.pos === current.pos);
  if (index < 0) {
    return null;
  }

  const target = peers[index + direction];
  return target ? target.pos : null;
}
