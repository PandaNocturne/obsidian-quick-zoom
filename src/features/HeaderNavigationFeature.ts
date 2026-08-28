import { Plugin } from "obsidian";

import { EditorState } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";

import { Feature } from "./Feature";
import { getDocumentTitle } from "./utils/getDocumentTitle";
import { getEditorViewFromEditorState } from "./utils/getEditorViewFromEditorState";

import { CollectBreadcrumbs } from "../logic/CollectBreadcrumbs";
import { DetectRangeBeforeVisibleRangeChanged } from "../logic/DetectRangeBeforeVisibleRangeChanged";
import {
  RenderNavigationHeader,
  ZoomHistoryNav,
} from "../logic/RenderNavigationHeader";
import { ZoomHistory } from "../logic/ZoomHistory";
import { getActiveOutlinePos } from "../logic/utils/getActiveOutlinePos";
import { LoggerService } from "../services/LoggerService";
import { SettingsService } from "../services/SettingsService";

export interface ZoomIn {
  zoomIn(view: EditorView, pos: number): void;
}

export interface ZoomOut {
  zoomOut(view: EditorView): void;
}

export interface NotifyAfterZoomIn {
  notifyAfterZoomIn(cb: (view: EditorView, pos: number) => void): void;
}

export interface NotifyAfterZoomOut {
  notifyAfterZoomOut(cb: (view: EditorView) => void): void;
}

export interface CalculateHiddenContentRanges {
  calculateHiddenContentRanges(
    state: EditorState
  ): { from: number; to: number }[] | null;
}

export interface CalculateVisibleContentRange {
  calculateVisibleContentRange(
    state: EditorState
  ): { from: number; to: number } | null;
}

class ShowHeaderAfterZoomIn implements Feature {
  constructor(
    private notifyAfterZoomIn: NotifyAfterZoomIn,
    private collectBreadcrumbs: CollectBreadcrumbs,
    private renderNavigationHeader: RenderNavigationHeader,
    private settings: SettingsService,
    private refreshHeader: (view: EditorView) => void
  ) {}

  async load() {
    this.notifyAfterZoomIn.notifyAfterZoomIn((view, pos) => {
      if (this.settings.trackCursorWhileZoomed) {
        this.refreshHeader(view);
        return;
      }

      const breadcrumbs = this.collectBreadcrumbs.collectBreadcrumbs(
        view.state,
        pos
      );
      this.renderNavigationHeader.showHeader(view, breadcrumbs, "zoom");
    });
  }

  async unload() {}
}

class HideOrShowHistoryHeaderAfterZoomOut implements Feature {
  constructor(
    private notifyAfterZoomOut: NotifyAfterZoomOut,
    private renderNavigationHeader: RenderNavigationHeader,
    private settings: SettingsService,
    private refreshDefaultModeHeader: (view: EditorView) => void
  ) {}

  async load() {
    this.notifyAfterZoomOut.notifyAfterZoomOut((view) => {
      if (this.settings.showBreadcrumbsInDefaultMode) {
        this.refreshDefaultModeHeader(view);
        return;
      }

      // Default breadcrumbs off: hide immediately on zoom-out (don't keep a
      // history-only header until the next mouse/selection refresh).
      this.renderNavigationHeader.hideHeader(view);
    });
  }

  async unload() {}
}

class UpdateHeaderAfterRangeBeforeVisibleRangeChanged implements Feature {
  private detectRangeBeforeVisibleRangeChanged =
    new DetectRangeBeforeVisibleRangeChanged(
      this.calculateHiddenContentRanges,
      {
        rangeBeforeVisibleRangeChanged: (state) =>
          this.rangeBeforeVisibleRangeChanged(state),
      }
    );

  constructor(
    private plugin: Plugin,
    private calculateHiddenContentRanges: CalculateHiddenContentRanges,
    private calculateVisibleContentRange: CalculateVisibleContentRange,
    private collectBreadcrumbs: CollectBreadcrumbs,
    private renderNavigationHeader: RenderNavigationHeader,
    private settings: SettingsService,
    private refreshHeader: (view: EditorView) => void
  ) {}

  async load() {
    this.plugin.registerEditorExtension(
      this.detectRangeBeforeVisibleRangeChanged.getExtension()
    );
  }

  async unload() {}

  private rangeBeforeVisibleRangeChanged(state: EditorState) {
    const view = getEditorViewFromEditorState(state);

    if (this.settings.trackCursorWhileZoomed) {
      this.refreshHeader(view);
      return;
    }

    const visible =
      this.calculateVisibleContentRange.calculateVisibleContentRange(state);
    if (!visible) {
      return;
    }

    const breadcrumbs = this.collectBreadcrumbs.collectBreadcrumbs(
      state,
      visible.from
    );

    this.renderNavigationHeader.showHeader(view, breadcrumbs, "zoom");
  }
}

class FollowViewportInDefaultMode implements Feature {
  private debounceTimers = new WeakMap<
    EditorView,
    ReturnType<typeof setTimeout>
  >();

  private extension = ViewPlugin.define((view) => {
    // Initial paint after editor mounts
    this.scheduleRefresh(view);

    return {
      update: (update: ViewUpdate) => {
        if (update.docChanged || update.selectionSet) {
          this.scheduleRefresh(update.view);
        }
      },
      destroy: () => {
        const timer = this.debounceTimers.get(view);
        if (timer) {
          clearTimeout(timer);
          this.debounceTimers.delete(view);
        }
      },
    };
  });

  constructor(
    private plugin: Plugin,
    private settings: SettingsService,
    private collectBreadcrumbs: CollectBreadcrumbs,
    private renderNavigationHeader: RenderNavigationHeader,
    private calculateVisibleContentRange: CalculateVisibleContentRange
  ) {}

  async load() {
    this.plugin.registerEditorExtension(this.extension);
    this.syncHeaderWidthClass();

    this.settings.onChange("showBreadcrumbsInDefaultMode", () => {
      this.refreshAllEditors();
    });
    this.settings.onChange("trackCursorWhileZoomed", () => {
      this.refreshAllEditors();
    });
    this.settings.onChange("headerWidthMode", () => {
      this.syncHeaderWidthClass();
      this.refreshAllEditors();
    });
  }

  async unload() {
    document.body.classList.remove(
      "zoom-plugin-header-width-note",
      "zoom-plugin-header-width-page"
    );
  }

  public refreshView(view: EditorView) {
    this.refreshNow(view, { syncZoomRoot: true });
  }

  private syncHeaderWidthClass() {
    const mode = this.settings.headerWidthMode;
    document.body.classList.toggle(
      "zoom-plugin-header-width-note",
      mode === "note"
    );
    document.body.classList.toggle(
      "zoom-plugin-header-width-page",
      mode === "page"
    );
  }

  private refreshAllEditors() {
    const leaves = this.plugin.app.workspace.getLeavesOfType("markdown");
    for (const leaf of leaves) {
      const view = (leaf.view as { editor?: { cm?: EditorView } }).editor?.cm;
      if (view) {
        this.refreshNow(view, { syncZoomRoot: true });
      }
    }
  }

  private scheduleRefresh(view: EditorView) {
    const prev = this.debounceTimers.get(view);
    if (prev) {
      clearTimeout(prev);
    }
    const timer = setTimeout(() => {
      this.debounceTimers.delete(view);
      this.refreshNow(view);
    }, 60);
    this.debounceTimers.set(view, timer);
  }

  private refreshNow(
    view: EditorView,
    options: { syncZoomRoot?: boolean } = {}
  ) {
    const visible =
      this.calculateVisibleContentRange.calculateVisibleContentRange(
        view.state
      );
    const isZoomed = visible !== null;

    if (isZoomed) {
      if (this.settings.trackCursorWhileZoomed) {
        const pos = getActiveOutlinePos(view);
        const breadcrumbs =
          this.collectBreadcrumbs.collectZoomTrackedBreadcrumbs(
            view.state,
            visible.from,
            pos
          );
        this.renderNavigationHeader.showHeader(view, breadcrumbs, "zoom");
        return;
      }

      if (options.syncZoomRoot) {
        const breadcrumbs = this.collectBreadcrumbs.collectBreadcrumbs(
          view.state,
          visible.from
        );
        this.renderNavigationHeader.showHeader(view, breadcrumbs, "zoom");
      }
      return;
    }

    if (!this.settings.showBreadcrumbsInDefaultMode) {
      this.renderNavigationHeader.hideHeader(view);
      return;
    }

    const pos = getActiveOutlinePos(view);
    const breadcrumbs = this.collectBreadcrumbs.collectStickyBreadcrumbs(
      view.state,
      pos
    );

    const anchor =
      [...breadcrumbs].reverse().find((b) => typeof b.pos === "number")?.pos ??
      null;
    this.renderNavigationHeader.recordCursorVisit(view, anchor);

    this.renderNavigationHeader.showHeader(view, breadcrumbs, "navigate");
  }
}

export class HeaderNavigationFeature implements Feature {
  private cursorHistory: ZoomHistory;
  private collectBreadcrumbs: CollectBreadcrumbs;
  private renderNavigationHeader: RenderNavigationHeader;
  private followViewportInDefaultMode: FollowViewportInDefaultMode;
  private showHeaderAfterZoomIn: ShowHeaderAfterZoomIn;
  private hideOrShowHistoryHeaderAfterZoomOut: HideOrShowHistoryHeaderAfterZoomOut;
  private updateHeaderAfterRangeBeforeVisibleRangeChanged: UpdateHeaderAfterRangeBeforeVisibleRangeChanged;

  constructor(
    private plugin: Plugin,
    private logger: LoggerService,
    private settings: SettingsService,
    private calculateHiddenContentRanges: CalculateHiddenContentRanges,
    private calculateVisibleContentRange: CalculateVisibleContentRange,
    private zoomIn: ZoomIn,
    private zoomOut: ZoomOut,
    private notifyAfterZoomIn: NotifyAfterZoomIn,
    private notifyAfterZoomOut: NotifyAfterZoomOut,
    private zoomHistory: ZoomHistoryNav
  ) {
    this.cursorHistory = new ZoomHistory();
    this.collectBreadcrumbs = new CollectBreadcrumbs(
      {
        getDocumentTitle: getDocumentTitle,
      },
      this.settings
    );

    const refreshHeader = (view: EditorView) => {
      this.followViewportInDefaultMode.refreshView(view);
    };

    this.renderNavigationHeader = new RenderNavigationHeader(
      this.plugin.app,
      this.logger,
      this.settings,
      this.zoomIn,
      this.zoomOut,
      this.zoomHistory,
      this.cursorHistory,
      refreshHeader
    );

    this.followViewportInDefaultMode = new FollowViewportInDefaultMode(
      this.plugin,
      this.settings,
      this.collectBreadcrumbs,
      this.renderNavigationHeader,
      this.calculateVisibleContentRange
    );

    this.showHeaderAfterZoomIn = new ShowHeaderAfterZoomIn(
      this.notifyAfterZoomIn,
      this.collectBreadcrumbs,
      this.renderNavigationHeader,
      this.settings,
      refreshHeader
    );

    this.hideOrShowHistoryHeaderAfterZoomOut =
      new HideOrShowHistoryHeaderAfterZoomOut(
        this.notifyAfterZoomOut,
        this.renderNavigationHeader,
        this.settings,
        refreshHeader
      );

    this.updateHeaderAfterRangeBeforeVisibleRangeChanged =
      new UpdateHeaderAfterRangeBeforeVisibleRangeChanged(
        this.plugin,
        this.calculateHiddenContentRanges,
        this.calculateVisibleContentRange,
        this.collectBreadcrumbs,
        this.renderNavigationHeader,
        this.settings,
        refreshHeader
      );

    this.syncCursorHistoryLimit();
    this.settings.onChange("historyMaxEntries", () => {
      this.syncCursorHistoryLimit();
    });
  }

  private syncCursorHistoryLimit() {
    this.cursorHistory.setMaxEntries(this.settings.historyMaxEntries);
  }

  async load() {
    this.plugin.registerEditorExtension(
      this.renderNavigationHeader.getExtension()
    );

    this.showHeaderAfterZoomIn.load();
    this.hideOrShowHistoryHeaderAfterZoomOut.load();
    this.updateHeaderAfterRangeBeforeVisibleRangeChanged.load();
    this.followViewportInDefaultMode.load();
  }

  async unload() {
    this.showHeaderAfterZoomIn.unload();
    this.hideOrShowHistoryHeaderAfterZoomOut.unload();
    this.updateHeaderAfterRangeBeforeVisibleRangeChanged.unload();
    this.followViewportInDefaultMode.unload();
  }
}
