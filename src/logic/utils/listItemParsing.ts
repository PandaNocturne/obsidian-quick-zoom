export type ListType = "unordered" | "ordered" | "task";

export interface ListRecognitionOptions {
  recognizeUnorderedLists: boolean;
  recognizeOrderedLists: boolean;
  recognizeTaskLists: boolean;
}

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

export function isRecognizedListLine(
  lineText: string,
  options: ListRecognitionOptions
): boolean {
  return detectListType(lineText, options) !== null;
}
