import { EditorState } from "@codemirror/state";

import { SettingsService } from "../../services/SettingsService";
import { CollectBreadcrumbs } from "../CollectBreadcrumbs";
import {
  findNextHeadingPos,
  findParentZoomPos,
  findPreviousHeadingPos,
  findSiblingZoomPos,
} from "../FindOutlineNeighbor";

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

function mockStandardFolds() {
  foldable.mockImplementation((_state: EditorState, from: number) => {
    if (from === 0) return { from: 0, to: 4 };
    if (from === 5) return { from: 5, to: 38 };
    if (from === 10) return { from: 10, to: 38 };
    if (from === 16) return { from: 16, to: 29 };
    if (from === 20) return { from: 20, to: 29 };
    if (from === 32) return { from: 32, to: 38 };
    if (from === 39) return { from: 39, to: 44 };
    return null;
  });
}

const DOC = "# a\n\n# b\n\n## c\n\n- 1\n\t- 2\n\t\t- 3\n\n### d\n\n# e\n\nf";

test("findPreviousHeadingPos / findNextHeadingPos scan document headings", () => {
  const state = EditorState.create({ doc: DOC });
  mockStandardFolds();

  // on "## c" (pos 10) → prev is "# b" (5), next is "### d" (32)
  expect(findPreviousHeadingPos(state, 10)).toBe(5);
  expect(findNextHeadingPos(state, 10)).toBe(32);

  // on "# a" → no previous
  expect(findPreviousHeadingPos(state, 0)).toBeNull();
  expect(findNextHeadingPos(state, 0)).toBe(5);
});

test("findParentZoomPos returns parent or null for document", () => {
  const state = EditorState.create({ doc: DOC });
  mockStandardFolds();
  const collectBreadcrumbs = new CollectBreadcrumbs(getDocumentTitle, settings);

  const underList = collectBreadcrumbs.collectStickyBreadcrumbs(state, 28);
  expect(findParentZoomPos(underList)).toBe(20);

  const atTop = collectBreadcrumbs.collectStickyBreadcrumbs(state, 0);
  expect(findParentZoomPos(atTop)).toBeNull();
});

test("findSiblingZoomPos keeps same heading level / list type", () => {
  const state = EditorState.create({ doc: DOC });
  mockStandardFolds();
  const collectBreadcrumbs = new CollectBreadcrumbs(getDocumentTitle, settings);

  // "# b" peers among H1: a, b, e
  const atB = collectBreadcrumbs.collectStickyBreadcrumbs(state, 5);
  expect(findSiblingZoomPos(atB, -1)).toBe(0);
  expect(findSiblingZoomPos(atB, 1)).toBe(39);

  // list under "## c": only one unordered peer at that level in siblings of "1"
  const atList = collectBreadcrumbs.collectStickyBreadcrumbs(state, 16);
  expect(findSiblingZoomPos(atList, -1)).toBeNull();
  expect(findSiblingZoomPos(atList, 1)).toBeNull();
});
