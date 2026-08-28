import { EditorState } from "@codemirror/state";

import { Breadcrumb } from "./CollectBreadcrumbs";
import { SiblingItem } from "./CollectSiblings";
import { getHeadingIndex } from "./utils/getCachedHeadings";

/**
 * Previous heading before `pos` (document order, any level).
 * Uses Obsidian metadataCache headings when available.
 */
export function findPreviousHeadingPos(
  state: EditorState,
  pos: number
): number | null {
  const lineFrom = state.doc.lineAt(pos).from;
  let best: number | null = null;

  for (const from of getHeadingIndex(state).keys()) {
    if (from < lineFrom && (best === null || from > best)) {
      best = from;
    }
  }

  return best;
}

/**
 * Next heading after `pos` (document order, any level).
 * Uses Obsidian metadataCache headings when available.
 */
export function findNextHeadingPos(
  state: EditorState,
  pos: number
): number | null {
  const lineFrom = state.doc.lineAt(pos).from;
  let best: number | null = null;

  for (const from of getHeadingIndex(state).keys()) {
    if (from > lineFrom && (best === null || from < best)) {
      best = from;
    }
  }

  return best;
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
