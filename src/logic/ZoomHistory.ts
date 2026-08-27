import { EditorView } from "@codemirror/view";

export type ZoomHistoryEntry = number | null;

interface ViewHistory {
  entries: ZoomHistoryEntry[];
  index: number;
}

const DEFAULT_MAX_ENTRIES = 50;

/**
 * Per-editor zoom visit history (browser-like back/forward).
 * `null` means the full document (zoomed out).
 */
export class ZoomHistory {
  private byView = new WeakMap<EditorView, ViewHistory>();
  private navigating = false;
  private maxEntries = DEFAULT_MAX_ENTRIES;

  isNavigating(): boolean {
    return this.navigating;
  }

  setMaxEntries(max: number) {
    this.maxEntries = Math.max(1, Math.floor(max));
  }

  getMaxEntries() {
    return this.maxEntries;
  }

  private getOrCreate(view: EditorView): ViewHistory {
    let history = this.byView.get(view);
    if (!history) {
      history = { entries: [], index: -1 };
      this.byView.set(view, history);
    }
    return history;
  }

  getCurrent(view: EditorView): ZoomHistoryEntry | undefined {
    const history = this.byView.get(view);
    if (!history || history.index < 0) {
      return undefined;
    }
    return history.entries[history.index];
  }

  canGoBack(view: EditorView): boolean {
    const history = this.byView.get(view);
    return !!history && history.index > 0;
  }

  canGoForward(view: EditorView): boolean {
    const history = this.byView.get(view);
    return !!history && history.index < history.entries.length - 1;
  }

  /**
   * Record a successful zoom change. Skipped while applying back/forward.
   */
  record(view: EditorView, pos: ZoomHistoryEntry) {
    if (this.navigating) {
      return;
    }

    const history = this.getOrCreate(view);

    if (history.index >= 0 && history.entries[history.index] === pos) {
      return;
    }

    if (history.entries.length === 0 && pos !== null) {
      history.entries.push(null);
      history.index = 0;
    }

    history.entries = history.entries.slice(0, history.index + 1);
    history.entries.push(pos);
    history.index = history.entries.length - 1;
    this.trim(history);
  }

  private trim(history: ViewHistory) {
    if (history.entries.length <= this.maxEntries) {
      return;
    }
    const overflow = history.entries.length - this.maxEntries;
    history.entries = history.entries.slice(overflow);
    history.index = Math.max(0, history.index - overflow);
  }

  goBack(view: EditorView): ZoomHistoryEntry | null {
    if (!this.canGoBack(view)) {
      return null;
    }
    const history = this.getOrCreate(view);
    history.index -= 1;
    return history.entries[history.index];
  }

  goForward(view: EditorView): ZoomHistoryEntry | null {
    if (!this.canGoForward(view)) {
      return null;
    }
    const history = this.getOrCreate(view);
    history.index += 1;
    return history.entries[history.index];
  }

  runWithoutRecording(fn: () => void) {
    this.navigating = true;
    try {
      fn();
    } finally {
      this.navigating = false;
    }
  }

  clear(view: EditorView) {
    this.byView.delete(view);
  }
}
