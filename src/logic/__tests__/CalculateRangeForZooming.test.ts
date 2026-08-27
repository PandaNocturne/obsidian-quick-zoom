import { EditorState } from "@codemirror/state";

import { CalculateRangeForZooming } from "../CalculateRangeForZooming";

jest.mock("@codemirror/language", () => {
  return {
    foldable: jest.fn(),
  };
});

const foldable: jest.Mock = jest.requireMock("@codemirror/language").foldable;

const ALL_LISTS_ON = {
  recognizeUnorderedLists: true,
  recognizeOrderedLists: true,
  recognizeTaskLists: true,
};

beforeEach(() => {
  foldable.mockReturnValue(null);
});

test("should return heading line if heading is unfoldable", () => {
  foldable.mockReturnValue(null);
  const state = EditorState.create({
    doc: "# header",
  });
  const calculateRangeForZooming = new CalculateRangeForZooming();

  const x = calculateRangeForZooming.calculateRangeForZooming(
    state,
    1,
    ALL_LISTS_ON
  );

  expect(x).toStrictEqual({ from: 0, to: state.doc.line(1).to });
});

test("should return range from line start if block is foldable", () => {
  foldable.mockReturnValue({ from: 8, to: 16 });
  const state = EditorState.create({
    doc: "# header\n\nline1\n",
  });
  const calculateRangeForZooming = new CalculateRangeForZooming();

  const x = calculateRangeForZooming.calculateRangeForZooming(
    state,
    1,
    ALL_LISTS_ON
  );

  expect(x).toStrictEqual({ from: 0, to: 16 });
});

test("should return range of current line if block is unfoldable but line is list item", () => {
  foldable.mockReturnValue(null);
  const state = EditorState.create({
    doc: "line\n\n- list\n\nline",
  });
  const calculateRangeForZooming = new CalculateRangeForZooming();

  const x = calculateRangeForZooming.calculateRangeForZooming(
    state,
    8,
    ALL_LISTS_ON
  );

  expect(x).toStrictEqual({ from: 6, to: 12 });
});

test("should not treat list as list when list recognition is disabled; zoom as paragraph", () => {
  foldable.mockReturnValue(null);
  const state = EditorState.create({
    doc: "line\n\n- list\n\nline",
  });
  const calculateRangeForZooming = new CalculateRangeForZooming();

  const x = calculateRangeForZooming.calculateRangeForZooming(state, 8, {
    recognizeUnorderedLists: false,
    recognizeOrderedLists: false,
    recognizeTaskLists: false,
  });

  // "- list" is treated as a single-line paragraph when list recognition is off
  expect(x).toStrictEqual({ from: 6, to: 12 });
});

test("should zoom blank line as its own range", () => {
  foldable.mockReturnValue(null);
  const state = EditorState.create({
    doc: "a\n\nb",
  });
  const calculateRangeForZooming = new CalculateRangeForZooming();
  const blank = state.doc.line(2);

  const x = calculateRangeForZooming.calculateRangeForZooming(
    state,
    blank.from,
    ALL_LISTS_ON
  );

  expect(x).toStrictEqual({ from: blank.from, to: blank.to });
});

test("should zoom contiguous paragraph lines as one block", () => {
  foldable.mockReturnValue(null);
  const state = EditorState.create({
    doc: "# h\n\npara1\npara2\n\nnext",
  });
  const calculateRangeForZooming = new CalculateRangeForZooming();
  const para1 = state.doc.line(3);

  const x = calculateRangeForZooming.calculateRangeForZooming(
    state,
    para1.from,
    ALL_LISTS_ON
  );

  expect(x).toStrictEqual({
    from: state.doc.line(3).from,
    to: state.doc.line(4).to,
  });
});
