import { EditorState } from "@codemirror/state";

import { collectSiblings } from "../../CollectSiblings";
import {
  detectHeadingLevelFromText,
  getHeadingAt,
  getHeadingIndex,
  liveFenceAwareAtxIndex,
} from "../getCachedHeadings";
import { ListRecognitionOptions } from "../listItemParsing";

jest.mock("@codemirror/language", () => {
  return {
    foldable: jest.fn(() => null),
  };
});

test("detectHeadingLevelFromText matches ATX headings only by text", () => {
  expect(detectHeadingLevelFromText("# a")).toBe(1);
  expect(detectHeadingLevelFromText("## b")).toBe(2);
  expect(detectHeadingLevelFromText("#comment")).toBeNull();
});

test("liveFenceAwareAtxIndex skips # comments inside fenced code blocks", () => {
  const state = EditorState.create({
    doc: "# real\n\n```python\n# fake\nprint(1)\n```\n\n## also\n",
  });

  const index = liveFenceAwareAtxIndex(state);
  const fakeFrom = state.doc.line(4).from;
  expect(getHeadingAt(index, 0)?.title).toBe("real");
  expect(getHeadingAt(index, fakeFrom)).toBeNull();
  expect(getHeadingAt(index, state.doc.line(8).from)?.title).toBe("also");
});

test("getHeadingIndex uses fence-aware regex only (no metadata API)", () => {
  const state = EditorState.create({
    doc: "# a\n\n```js\n# not heading\n```\n\n## b\n",
  });

  const index = getHeadingIndex(state);
  expect(getHeadingAt(index, 0)?.level).toBe(1);
  expect(getHeadingAt(index, state.doc.line(4).from)).toBeNull();
  expect(getHeadingAt(index, state.doc.line(7).from)?.level).toBe(2);
});

test("tilde fences are skipped the same way", () => {
  const state = EditorState.create({
    doc: "# a\n\n~~~~\n# inside\n~~~~\n\n# b\n",
  });

  const index = getHeadingIndex(state);
  expect([...index.values()].map((h) => h.title)).toEqual(["a", "b"]);
});

test("collectSiblings ignores code-fence comments via getHeadingIndex", () => {
  const doc = "# real\n\n```python\n# fake\nprint(1)\n```\n\n## also\n";
  const state = EditorState.create({ doc });
  const fakeLineFrom = state.doc.line(4).from;
  const realFrom = 0;
  const alsoFrom = state.doc.line(8).from;

  const options: ListRecognitionOptions = {
    recognizeUnorderedLists: false,
    recognizeOrderedLists: false,
    recognizeTaskLists: false,
  };

  const siblings = collectSiblings(state, null, options);
  expect(siblings.map((s) => s.pos)).toEqual([realFrom, alsoFrom]);
  expect(siblings.find((s) => s.pos === fakeLineFrom)).toBeUndefined();
});
