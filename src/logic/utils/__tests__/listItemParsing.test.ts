import {
  ListRecognitionOptions,
  detectAnyListType,
  detectListType,
  isRecognizedListLine,
  resolveListRecognitionOptions,
} from "../listItemParsing";

const ALL_LISTS_ON: ListRecognitionOptions = {
  recognizeUnorderedLists: true,
  recognizeOrderedLists: true,
  recognizeTaskLists: true,
};

const ALL_LISTS_OFF: ListRecognitionOptions = {
  recognizeUnorderedLists: false,
  recognizeOrderedLists: false,
  recognizeTaskLists: false,
};

test("should detect unordered list items when enabled", () => {
  expect(detectListType("- item", ALL_LISTS_ON)).toBe("unordered");
  expect(detectListType("* item", ALL_LISTS_ON)).toBe("unordered");
  expect(detectListType("+ item", ALL_LISTS_ON)).toBe("unordered");
});

test("should detect ordered list items when enabled", () => {
  expect(detectListType("1. item", ALL_LISTS_ON)).toBe("ordered");
  expect(detectListType("12. item", ALL_LISTS_ON)).toBe("ordered");
});

test("should detect task list items when enabled", () => {
  expect(detectListType("- [ ] task", ALL_LISTS_ON)).toBe("task");
  expect(detectListType("- [x] done", ALL_LISTS_ON)).toBe("task");
  expect(detectListType("* [X] done", ALL_LISTS_ON)).toBe("task");
});

test("should prefer task over unordered when both match", () => {
  expect(detectListType("- [ ] task", ALL_LISTS_ON)).toBe("task");
});

test("should return null when list type is disabled", () => {
  expect(detectListType("- item", ALL_LISTS_OFF)).toBeNull();
  expect(detectListType("1. item", ALL_LISTS_OFF)).toBeNull();
  expect(detectListType("- [ ] task", ALL_LISTS_OFF)).toBeNull();
});

test("should respect per-type toggles", () => {
  const onlyUnordered: ListRecognitionOptions = {
    recognizeUnorderedLists: true,
    recognizeOrderedLists: false,
    recognizeTaskLists: false,
  };

  expect(detectListType("- item", onlyUnordered)).toBe("unordered");
  expect(detectListType("1. item", onlyUnordered)).toBeNull();
  expect(detectListType("- [ ] task", onlyUnordered)).toBeNull();
});

test("isRecognizedListLine mirrors detectListType", () => {
  expect(isRecognizedListLine("- item", ALL_LISTS_ON)).toBe(true);
  expect(isRecognizedListLine("- item", ALL_LISTS_OFF)).toBe(false);
});

test("detectAnyListType ignores recognition toggles", () => {
  expect(detectAnyListType("- item")).toBe("unordered");
  expect(detectAnyListType("1. item")).toBe("ordered");
  expect(detectAnyListType("- [ ] task")).toBe("task");
  expect(detectAnyListType("# heading")).toBeNull();
});

test("resolveListRecognitionOptions enables all lists when focused on a list", () => {
  expect(resolveListRecognitionOptions(ALL_LISTS_OFF, "- focused")).toEqual(
    ALL_LISTS_ON
  );
  expect(resolveListRecognitionOptions(ALL_LISTS_OFF, "# heading")).toEqual(
    ALL_LISTS_OFF
  );
  expect(
    resolveListRecognitionOptions(
      {
        recognizeUnorderedLists: true,
        recognizeOrderedLists: false,
        recognizeTaskLists: false,
      },
      "plain paragraph"
    )
  ).toEqual({
    recognizeUnorderedLists: true,
    recognizeOrderedLists: false,
    recognizeTaskLists: false,
  });
});
