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
 * Regex-only heading level (does not know about code blocks).
 * Prefer {@link getHeadingIndex} in production.
 */
export function detectHeadingLevelFromText(lineText: string): number | null {
  const match = lineText.match(HEADING_RE);
  return match ? match[1].length : null;
}

/**
 * Heading index for outline / zoom navigation.
 *
 * 1. Live ATX headings from the editor doc, skipping fenced code blocks
 *    (updates immediately; ignores `#` comments inside ```python etc.)
 * 2. Merges Obsidian `metadataCache.headings` for anything not already
 *    covered (e.g. setext), once the cache has caught up.
 */
export function getHeadingIndex(state: EditorState): HeadingIndex {
  const index = liveFenceAwareAtxIndex(state);

  const fromCache = tryMetadataHeadingIndex(state);
  if (fromCache) {
    for (const [pos, info] of fromCache) {
      if (!index.has(pos)) {
        index.set(pos, info);
      }
    }
  }

  return index;
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

function tryMetadataHeadingIndex(state: EditorState): HeadingIndex | null {
  try {
    // Lazy load so Jest unit tests can import this module without resolving
    // the Obsidian runtime package (types-only in node_modules).
    /* eslint-disable @typescript-eslint/no-var-requires */
    const obsidian = require("obsidian") as typeof import("obsidian");
    /* eslint-enable @typescript-eslint/no-var-requires */
    const mdView = state.field(obsidian.editorViewField);
    const file = mdView.file;
    if (!file) {
      return new Map();
    }

    const cache = mdView.app.metadataCache.getFileCache(file);
    const index: HeadingIndex = new Map();

    for (const h of cache?.headings ?? []) {
      const lineNumber = h.position.start.line + 1;
      if (lineNumber < 1 || lineNumber > state.doc.lines) {
        continue;
      }
      const line = state.doc.line(lineNumber);

      // Prefer live ATX text when the line still is an ATX heading (avoids
      // stale titles while metadataCache lags). Skip if the live line no
      // longer matches and looks like plain text after an edit.
      const liveLevel = detectHeadingLevelFromText(line.text);
      if (liveLevel !== null) {
        index.set(line.from, {
          level: liveLevel,
          title: cleanTitle(line.text),
        });
        continue;
      }

      // Setext / cache-only: keep Obsidian's parsed heading if the cached
      // offset still lands on this line.
      const cachedOffset = h.position.start.offset;
      if (
        cachedOffset >= line.from &&
        cachedOffset <= line.to &&
        cachedOffset <= state.doc.length
      ) {
        index.set(line.from, {
          level: h.level,
          title: h.heading || cleanTitle(line.text),
        });
      }
    }

    return index;
  } catch {
    // editorViewField / obsidian missing outside the app (unit tests)
    return null;
  }
}
