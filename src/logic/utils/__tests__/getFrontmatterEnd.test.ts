import { EditorState } from "@codemirror/state";

import { getFrontmatterEnd } from "../getFrontmatterEnd";

test("should return 0 when document has no frontmatter", () => {
  const state = EditorState.create({ doc: "# heading\n\ntext" });
  expect(getFrontmatterEnd(state)).toBe(0);
});

test("should return position after closing frontmatter fence", () => {
  const state = EditorState.create({
    doc: "---\ntitle: test\n---\n# heading\n",
  });
  // lines: --- / title: test / --- / # heading /
  // content after frontmatter starts at "# heading"
  expect(getFrontmatterEnd(state)).toBe(state.doc.line(4).from);
});

test("should return 0 when opening fence has no closing fence", () => {
  const state = EditorState.create({
    doc: "---\ntitle: test\n# heading\n",
  });
  expect(getFrontmatterEnd(state)).toBe(0);
});

test("should ignore --- that is not at document start", () => {
  const state = EditorState.create({
    doc: "# heading\n---\nmore\n---\n",
  });
  expect(getFrontmatterEnd(state)).toBe(0);
});
