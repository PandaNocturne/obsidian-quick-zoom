import { EditorState } from "@codemirror/state";

import { SettingsService } from "../../services/SettingsService";
import { CollectBreadcrumbs } from "../CollectBreadcrumbs";

jest.mock("@codemirror/language", () => {
  return {
    foldable: jest.fn(),
  };
});

const getDocumentTitle = { getDocumentTitle: () => "Document" };
const foldable: jest.Mock = jest.requireMock("@codemirror/language").foldable;

const settings = {
  getListRecognitionOptions: () => ({
    recognizeUnorderedLists: true,
    recognizeOrderedLists: true,
    recognizeTaskLists: true,
  }),
} as SettingsService;

test("should return breadcrumbs based on folable zones that should include input position", () => {
  const state = EditorState.create({
    doc: "# a\n\n# b\n\n## c\n\n- 1\n\t- 2\n\t\t- 3\n\n### d\n\n# e\n\nf",
    //    0123 4 5678 9 01234 5 6789 0 1234 5 6 7890 1 234567 8 9012 3 45
    //                  1            2             3             4
  });
  foldable.mockImplementation((state, from) => {
    if (from === 0) return { from: 0, to: 4 };
    if (from === 5) return { from: 5, to: 38 };
    if (from === 10) return { from: 10, to: 38 };
    if (from === 16) return { from: 16, to: 29 };
    if (from === 20) return { from: 20, to: 29 };
    if (from === 32) return { from: 32, to: 38 };
    if (from === 39) return { from: 39, to: 44 };
    return null;
  });

  const collectBreadcrumbs = new CollectBreadcrumbs(getDocumentTitle, settings);

  const b = collectBreadcrumbs.collectBreadcrumbs(state, 28);

  expect(b).toStrictEqual([
    {
      title: "Document",
      pos: null,
      kind: "document",
      siblings: [
        { title: "a", pos: 0, kind: "heading", headingLevel: 1 },
        { title: "b", pos: 5, kind: "heading", headingLevel: 1 },
        { title: "e", pos: 39, kind: "heading", headingLevel: 1 },
      ],
      children: [
        { title: "a", pos: 0, kind: "heading", headingLevel: 1 },
        { title: "b", pos: 5, kind: "heading", headingLevel: 1 },
        { title: "e", pos: 39, kind: "heading", headingLevel: 1 },
      ],
    },
    {
      title: "b",
      pos: 5,
      kind: "heading",
      headingLevel: 1,
      siblings: [
        { title: "a", pos: 0, kind: "heading", headingLevel: 1 },
        { title: "b", pos: 5, kind: "heading", headingLevel: 1 },
        { title: "e", pos: 39, kind: "heading", headingLevel: 1 },
      ],
      children: [{ title: "c", pos: 10, kind: "heading", headingLevel: 2 }],
    },
    {
      title: "c",
      pos: 10,
      kind: "heading",
      headingLevel: 2,
      siblings: [{ title: "c", pos: 10, kind: "heading", headingLevel: 2 }],
      children: [
        { title: "1", pos: 16, kind: "list", listType: "unordered" },
        { title: "d", pos: 32, kind: "heading", headingLevel: 3 },
      ],
    },
    {
      title: "1",
      pos: 16,
      kind: "list",
      listType: "unordered",
      siblings: [
        { title: "1", pos: 16, kind: "list", listType: "unordered" },
        { title: "d", pos: 32, kind: "heading", headingLevel: 3 },
      ],
      children: [{ title: "2", pos: 20, kind: "list", listType: "unordered" }],
    },
    {
      title: "2",
      pos: 20,
      kind: "list",
      listType: "unordered",
      siblings: [{ title: "2", pos: 20, kind: "list", listType: "unordered" }],
      children: [{ title: "3", pos: 25, kind: "list", listType: "unordered" }],
    },
    {
      title: "3",
      pos: 25,
      kind: "list",
      listType: "unordered",
      siblings: [{ title: "3", pos: 25, kind: "list", listType: "unordered" }],
      children: [],
    },
  ]);
});

test("should auto-recognize lists when focused on a list even if settings are off", () => {
  const state = EditorState.create({
    doc: "# a\n\n- 1\n\t- 2\n",
  });
  foldable.mockImplementation((_state, from) => {
    if (from === 0) return { from: 0, to: state.doc.length };
    if (from === 5) return { from: 5, to: state.doc.length };
    if (from === 9) return { from: 9, to: state.doc.length };
    return null;
  });

  const offSettings = {
    getListRecognitionOptions: () => ({
      recognizeUnorderedLists: false,
      recognizeOrderedLists: false,
      recognizeTaskLists: false,
    }),
  } as SettingsService;

  const collectBreadcrumbs = new CollectBreadcrumbs(
    getDocumentTitle,
    offSettings
  );

  // Focused on a heading: lists stay off
  const onHeading = collectBreadcrumbs.collectBreadcrumbs(state, 0);
  expect(onHeading.map((b) => b.kind)).toEqual(["document", "heading"]);

  // Focused on nested list: auto-enable list parsing
  const onList = collectBreadcrumbs.collectBreadcrumbs(state, 12);
  expect(onList.map((b) => b.kind)).toEqual([
    "document",
    "heading",
    "list",
    "list",
  ]);
  expect(onList[2].title).toBe("1");
  expect(onList[3].title).toBe("2");
});
