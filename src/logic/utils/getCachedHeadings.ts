import { EditorState } from "@codemirror/state";

import { cleanTitle } from "./cleanTitle";

export interface HeadingInfo {
  level: number;
  title: string;
}

/** Keyed by CodeMirror line `.from` (document offset). */
export type HeadingIndex = Map<number, HeadingInfo>;

const HEADING_RE = /^\s*(#{1,6})\s/;
const FENCE_OPEN_RE = /^(`{3,}|~{3,})(.*)$/;

/**
 * Regex-only heading level (does not skip code fences by itself).
 */
export function detectHeadingLevelFromText(lineText: string): number | null {
  const match = lineText.match(HEADING_RE);
  return match ? match[1].length : null;
}

/**
 * Heading index for outline / zoom navigation.
 *
 * Scans the live editor document with ATX heading regex, skipping fenced
 * code blocks (` ``` ` / `~~~`) so `#` comments inside Python/etc. are ignored.
 */
export function getHeadingIndex(state: EditorState): HeadingIndex {
  return liveFenceAwareAtxIndex(state);
}

export function getHeadingAt(
  index: HeadingIndex,
  lineFrom: number
): HeadingInfo | null {
  return index.get(lineFrom) ?? null;
}

/**
 * Scan the live document for ATX headings, skipping fenced code blocks.
 */
export function liveFenceAwareAtxIndex(state: EditorState): HeadingIndex {
  const index: HeadingIndex = new Map();
  let inFence = false;
  let fenceChar = "";
  let fenceLen = 0;

  for (let i = 1; i <= state.doc.lines; i++) {
    const line = state.doc.line(i);
    const trimmed = line.text.trim();
    const fenceMatch = trimmed.match(FENCE_OPEN_RE);

    if (fenceMatch) {
      const marker = fenceMatch[1];
      const ch = marker[0];
      const len = marker.length;
      if (!inFence) {
        inFence = true;
        fenceChar = ch;
        fenceLen = len;
      } else if (ch === fenceChar && len >= fenceLen && !fenceMatch[2].trim()) {
        inFence = false;
        fenceChar = "";
        fenceLen = 0;
      }
      continue;
    }

    if (inFence) {
      continue;
    }

    const level = detectHeadingLevelFromText(line.text);
    if (level !== null) {
      index.set(line.from, {
        level,
        title: cleanTitle(line.text),
      });
    }
  }

  return index;
}
