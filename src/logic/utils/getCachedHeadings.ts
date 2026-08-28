import { EditorState } from "@codemirror/state";

import { cleanTitle } from "./cleanTitle";

export interface HeadingInfo {
  level: number;
  title: string;
}

/** Keyed by CodeMirror line `.from` (document offset). */
export type HeadingIndex = Map<number, HeadingInfo>;

const HEADING_RE = /^\s*(#{1,6})\s/;

/**
 * Regex-only heading level (does not know about code blocks).
 * Prefer {@link getHeadingIndex} / metadataCache in production.
 */
export function detectHeadingLevelFromText(lineText: string): number | null {
  const match = lineText.match(HEADING_RE);
  return match ? match[1].length : null;
}

/**
 * Headings from Obsidian's metadataCache (excludes code-block `#` comments).
 *
 * Equivalent to:
 * `app.metadataCache.getFileCache(app.workspace.getActiveFile())?.headings`
 *
 * Falls back to a regex scan only when the editor view / file is unavailable
 * (e.g. unit tests without `editorViewField`).
 */
export function getHeadingIndex(state: EditorState): HeadingIndex {
  const fromCache = tryMetadataHeadingIndex(state);
  if (fromCache !== null) {
    return fromCache;
  }
  return regexFallbackHeadingIndex(state);
}

export function getHeadingAt(
  index: HeadingIndex,
  lineFrom: number
): HeadingInfo | null {
  return index.get(lineFrom) ?? null;
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
      index.set(line.from, {
        level: h.level,
        title: h.heading || cleanTitle(line.text),
      });
    }

    return index;
  } catch {
    // editorViewField / obsidian missing outside the app (unit tests)
    return null;
  }
}

function regexFallbackHeadingIndex(state: EditorState): HeadingIndex {
  const index: HeadingIndex = new Map();
  for (let i = 1; i <= state.doc.lines; i++) {
    const line = state.doc.line(i);
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
