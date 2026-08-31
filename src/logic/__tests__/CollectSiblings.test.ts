import { EditorState } from "@codemirror/state";

import { collectSiblings } from "../CollectSiblings";
import { ListRecognitionOptions } from "../utils/listItemParsing";

jest.mock("@codemirror/language", () => {
  return {
    foldable: jest.fn(),
  };
});

const foldable: jest.Mock = jest.requireMock("@codemirror/language").foldable;

const ALL_LISTS_ON: ListRecognitionOptions = {
  recognizeUnorderedLists: true,
  recognizeOrderedLists: true,
  recognizeTaskLists: true,
};

test("should collect top-level siblings under document root", () => {
  const state = EditorState.create({
    doc: "# a\n\n# b\n\n## c\n\n- 1\n\t- 2\n\t\t- 3\n\n### d\n\n# e\n\nf",
  });
  foldable.mockImplementation((_state, from) => {
    if (from === 0) return { from: 0, to: 4 };
    if (from === 5) return { from: 5, to: 38 };
    if (from === 10) return { from: 10, to: 38 };
    if (from === 16) return { from: 16, to: 29 };
    if (from === 20) return { from: 20, to: 29 };
    if (from === 32) return { from: 32, to: 38 };
    if (from === 39) return { from: 39, to: 44 };
    return null;
  });

  expect(collectSiblings(state, null, ALL_LISTS_ON)).toStrictEqual([
    { title: "a", pos: 0, kind: "heading", headingLevel: 1 },
    { title: "b", pos: 5, kind: "heading", headingLevel: 1 },
    { title: "e", pos: 39, kind: "heading", headingLevel: 1 },
  ]);
});

test("should collect direct children under a parent heading", () => {
  const state = EditorState.create({
    doc: "# a\n\n# b\n\n## c\n\n- 1\n\t- 2\n\t\t- 3\n\n### d\n\n# e\n\nf",
  });
  foldable.mockImplementation((_state, from) => {
    if (from === 0) return { from: 0, to: 4 };
    if (from === 5) return { from: 5, to: 38 };
    if (from === 10) return { from: 10, to: 38 };
    if (from === 16) return { from: 16, to: 29 };
    if (from === 20) return { from: 20, to: 29 };
    if (from === 32) return { from: 32, to: 38 };
    if (from === 39) return { from: 39, to: 44 };
    return null;
  });

  expect(collectSiblings(state, 10, ALL_LISTS_ON)).toStrictEqual([
    { title: "1", pos: 16, kind: "list", listType: "unordered" },
    { title: "d", pos: 32, kind: "heading", headingLevel: 3 },
  ]);
});

test("should skip YAML frontmatter when collecting top-level siblings", () => {
  const doc = "---\ntitle: note\ntags:\n  - a\n---\n\n# a\n\n# b\n";
  const state = EditorState.create({ doc });
  const headingA = doc.indexOf("# a");
  const headingB = doc.indexOf("# b");
  const frontmatterFrom = 0;
  const frontmatterTo = doc.indexOf("---\n\n# a") + 3;

  foldable.mockImplementation((_state, from) => {
    if (from === frontmatterFrom)
      return { from: frontmatterFrom, to: frontmatterTo };
    if (from === headingA) return { from: headingA, to: headingB };
    if (from === headingB) return { from: headingB, to: doc.length };
    return null;
  });

  expect(collectSiblings(state, null, ALL_LISTS_ON)).toStrictEqual([
    { title: "a", pos: headingA, kind: "heading", headingLevel: 1 },
    { title: "b", pos: headingB, kind: "heading", headingLevel: 1 },
  ]);
});

test("should not collect list items when list recognition is disabled", () => {
  const state = EditorState.create({
    doc: "# a\n\n- item\n",
  });
  foldable.mockImplementation((_state, from) => {
    if (from === 0) return { from: 0, to: 12 };
    return null;
  });

  expect(
    collectSiblings(state, 0, {
      recognizeUnorderedLists: false,
      recognizeOrderedLists: false,
      recognizeTaskLists: false,
    })
  ).toStrictEqual([]);
});

test("should collect ordered and task list items by type", () => {
  const state = EditorState.create({
    doc: "# a\n\n1. ordered\n- [ ] task\n",
  });
  foldable.mockImplementation((_state, from) => {
    if (from === 0) return { from: 0, to: state.doc.length };
    return null;
  });

  expect(
    collectSiblings(state, 0, {
      recognizeUnorderedLists: false,
      recognizeOrderedLists: true,
      recognizeTaskLists: true,
    })
  ).toStrictEqual([
    { title: "ordered", pos: 5, kind: "list", listType: "ordered" },
    { title: "task", pos: 16, kind: "list", listType: "task" },
  ]);
});

test("should keep lists nested under headings when foldable is unavailable", () => {
  const state = EditorState.create({
    doc: "# title\n\n- item\n\t- nested\n\n# other\n",
  });
  // Simulate first note load: CodeMirror fold service not ready yet
  foldable.mockReturnValue(null);

  expect(collectSiblings(state, null, ALL_LISTS_ON)).toStrictEqual([
    { title: "title", pos: 0, kind: "heading", headingLevel: 1 },
    { title: "other", pos: 27, kind: "heading", headingLevel: 1 },
  ]);

  expect(collectSiblings(state, 0, ALL_LISTS_ON)).toStrictEqual([
    { title: "item", pos: 9, kind: "list", listType: "unordered" },
  ]);
});

test("should keep nested list items under parent when foldable is unavailable", () => {
  const state = EditorState.create({
    doc: "- parent\n\t- child\n\t\t- grand\n- sibling\n",
  });
  foldable.mockReturnValue(null);

  expect(collectSiblings(state, null, ALL_LISTS_ON)).toStrictEqual([
    { title: "parent", pos: 0, kind: "list", listType: "unordered" },
    { title: "sibling", pos: 28, kind: "list", listType: "unordered" },
  ]);

  expect(collectSiblings(state, 0, ALL_LISTS_ON)).toStrictEqual([
    { title: "child", pos: 9, kind: "list", listType: "unordered" },
  ]);
});
