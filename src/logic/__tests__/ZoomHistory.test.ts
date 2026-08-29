import { ZoomHistory, ZoomHistoryEntry } from "../ZoomHistory";

test("default history records visits and supports back/forward including null", () => {
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

test("stayInZoom history never lands on null via back/forward", () => {
  const history = new ZoomHistory({ stayInZoom: true });
  const view = {} as import("@codemirror/view").EditorView;

  history.record(view, 10);
  expect(history.getCurrent(view)).toBe(10);
  expect(history.canGoBack(view)).toBe(false);

  history.record(view, 20);
  history.record(view, null);
  history.record(view, 30);

  expect(history.getCurrent(view)).toBe(30);
  expect(history.goBack(view)).toBe(20);
  expect(history.goBack(view)).toBe(10);
  expect(history.canGoBack(view)).toBe(false);

  expect(history.goForward(view)).toBe(20);
  expect(history.goForward(view)).toBe(30);
  expect(history.canGoForward(view)).toBe(false);
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

test("trims oldest entries when exceeding max", () => {
  const history = new ZoomHistory();
  history.setMaxEntries(3);
  const view = {} as import("@codemirror/view").EditorView;

  history.record(view, 10);
  history.record(view, 20);
  history.record(view, 30);
  // stack is [null, 10, 20, 30] then trimmed to last 3: [10, 20, 30]
  history.record(view, 40);

  expect(history.getCurrent(view)).toBe(40);
  expect(history.goBack(view)).toBe(30);
  expect(history.goBack(view)).toBe(20);
  expect(history.canGoBack(view)).toBe(false);
});
