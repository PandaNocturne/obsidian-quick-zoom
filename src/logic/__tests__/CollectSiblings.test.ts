import { EditorState } from "@codemirror/state";

import { collectSiblings } from "../CollectSiblings";

jest.mock("@codemirror/language", () => {
  return {
    foldable: jest.fn(),
  };
});

const foldable: jest.Mock = jest.requireMock("@codemirror/language").foldable;

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

  expect(collectSiblings(state, null)).toStrictEqual([
    { title: "a", pos: 0 },
    { title: "b", pos: 5 },
    { title: "e", pos: 39 },
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

  expect(collectSiblings(state, 10)).toStrictEqual([
    { title: "1", pos: 16 },
    { title: "d", pos: 32 },
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

  expect(collectSiblings(state, null)).toStrictEqual([
    { title: "a", pos: headingA },
    { title: "b", pos: headingB },
  ]);
});
