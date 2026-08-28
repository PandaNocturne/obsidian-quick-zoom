export type ListType = "unordered" | "ordered" | "task";

export interface ListRecognitionOptions {
  recognizeUnorderedLists: boolean;
  recognizeOrderedLists: boolean;
  recognizeTaskLists: boolean;
}

export const ALL_LIST_TYPES_ON: ListRecognitionOptions = {
  recognizeUnorderedLists: true,
  recognizeOrderedLists: true,
  recognizeTaskLists: true,
};

const TASK_LIST_RE = /^\s*[-*+]\s+\[[ xX]\]\s+/;
const ORDERED_LIST_RE = /^\s*\d+\.\s+/;
const UNORDERED_LIST_RE = /^\s*[-*+]\s+/;

export function detectListType(
  lineText: string,
  options: ListRecognitionOptions
): ListType | null {
  if (options.recognizeTaskLists && TASK_LIST_RE.test(lineText)) {
    return "task";
  }
  if (options.recognizeOrderedLists && ORDERED_LIST_RE.test(lineText)) {
    return "ordered";
  }
  if (options.recognizeUnorderedLists && UNORDERED_LIST_RE.test(lineText)) {
    return "unordered";
  }
  return null;
}

/** Detect list type ignoring recognition toggles. */
export function detectAnyListType(lineText: string): ListType | null {
  return detectListType(lineText, ALL_LIST_TYPES_ON);
}

export function isRecognizedListLine(
  lineText: string,
  options: ListRecognitionOptions
): boolean {
  return detectListType(lineText, options) !== null;
}

/**
 * Settings control default outline parsing (e.g. header while on headings).
 * When the focused line is a list item, enable all list types so breadcrumbs,
 * menus, and zoom still work without permanently turning settings on.
 */
export function resolveListRecognitionOptions(
  settings: ListRecognitionOptions,
  focusedLineText: string
): ListRecognitionOptions {
  if (detectAnyListType(focusedLineText) !== null) {
    return ALL_LIST_TYPES_ON;
  }
  return settings;
}
