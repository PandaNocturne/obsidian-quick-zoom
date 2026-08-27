import { ZoomHistory, ZoomHistoryEntry } from "../ZoomHistory";

test("records zoom visits and supports back/forward", () => {
  const history = new ZoomHistory();
  const view = {} as import("@codemirror/view").EditorView;

  history.record(view, 10);
  expect(history.getCurrent(view)).toBe(10);
  expect(history.canGoBack(view)).toBe(true);
  expect(history.canGoForward(view)).toBe(false);

  history.record(view, 20);
  expect(history.getCurrent(view)).toBe(20);

  expect(history.goBack(view)).toBe(10);
  expect(history.canGoForward(view)).toBe(true);

  expect(history.goBack(view)).toBe(null);
  expect(history.canGoBack(view)).toBe(false);

  expect(history.goForward(view)).toBe(10);
  expect(history.goForward(view)).toBe(20);
});

test("new visit truncates forward history", () => {
  const history = new ZoomHistory();
  const view = {} as import("@codemirror/view").EditorView;

  history.record(view, 10);
  history.record(view, 20);
  history.goBack(view);
  history.record(view, 30);

  expect(history.getCurrent(view)).toBe(30);
  expect(history.canGoForward(view)).toBe(false);
  expect(history.goBack(view)).toBe(10);
});

test("skips recording while navigating", () => {
  const history = new ZoomHistory();
  const view = {} as import("@codemirror/view").EditorView;

  history.record(view, 10);
  history.runWithoutRecording(() => {
    history.record(view, 99 as ZoomHistoryEntry);
  });

  expect(history.getCurrent(view)).toBe(10);
});

test("ignores duplicate consecutive entries", () => {
  const history = new ZoomHistory();
  const view = {} as import("@codemirror/view").EditorView;

  history.record(view, 10);
  history.record(view, 10);

  expect(history.goBack(view)).toBe(null);
  expect(history.canGoBack(view)).toBe(false);
});
