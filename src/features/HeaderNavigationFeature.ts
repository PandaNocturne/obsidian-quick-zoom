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
    private renderNavigationHeader: RenderNavigationHeader
  ) {}

  async load() {
    this.notifyAfterZoomIn.notifyAfterZoomIn((view, pos) => {
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
    private collectBreadcrumbs: CollectBreadcrumbs,
    private renderNavigationHeader: RenderNavigationHeader,
    private zoomHistory: ZoomHistoryNav,
    private settings: SettingsService,
    private calculateVisibleContentRange: CalculateVisibleContentRange,
    private refreshDefaultModeHeader: (view: EditorView) => void
  ) {}

  async load() {
    this.notifyAfterZoomOut.notifyAfterZoomOut((view) => {
      if (this.settings.showBreadcrumbsInDefaultMode) {
        this.refreshDefaultModeHeader(view);
        return;
      }

      if (
        this.zoomHistory.canZoomBack(view) ||
        this.zoomHistory.canZoomForward(view)
      ) {
        const breadcrumbs = this.collectBreadcrumbs.collectDocumentBreadcrumb(
          view.state
        );
        this.renderNavigationHeader.showHeader(view, breadcrumbs, "zoom");
        return;
      }

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
    private renderNavigationHeader: RenderNavigationHeader
  ) {}

  async load() {
    this.plugin.registerEditorExtension(
      this.detectRangeBeforeVisibleRangeChanged.getExtension()
    );
  }

  async unload() {}

  private rangeBeforeVisibleRangeChanged(state: EditorState) {
    const view = getEditorViewFromEditorState(state);

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

    this.settings.onChange("showBreadcrumbsInDefaultMode", () => {
      this.refreshAllEditors();
    });
  }

  async unload() {}

  public refreshView(view: EditorView) {
    this.refreshNow(view);
  }

  private refreshAllEditors() {
    const leaves = this.plugin.app.workspace.getLeavesOfType("markdown");
    for (const leaf of leaves) {
      const view = (leaf.view as { editor?: { cm?: EditorView } }).editor?.cm;
      if (view) {
        this.refreshNow(view);
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

  private refreshNow(view: EditorView) {
    const isZoomed =
      this.calculateVisibleContentRange.calculateVisibleContentRange(
        view.state
      ) !== null;

    if (isZoomed) {
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
    this.renderNavigationHeader.showHeader(view, breadcrumbs, "navigate");
  }
}

export class HeaderNavigationFeature implements Feature {
  private collectBreadcrumbs = new CollectBreadcrumbs(
    {
      getDocumentTitle: getDocumentTitle,
    },
    this.settings
  );

  private renderNavigationHeader = new RenderNavigationHeader(
    this.plugin.app,
    this.logger,
    this.settings,
    this.zoomIn,
    this.zoomOut,
    this.zoomHistory
  );

  private followViewportInDefaultMode = new FollowViewportInDefaultMode(
    this.plugin,
    this.settings,
    this.collectBreadcrumbs,
    this.renderNavigationHeader,
    this.calculateVisibleContentRange
  );

  private showHeaderAfterZoomIn = new ShowHeaderAfterZoomIn(
    this.notifyAfterZoomIn,
    this.collectBreadcrumbs,
    this.renderNavigationHeader
  );

  private hideOrShowHistoryHeaderAfterZoomOut =
    new HideOrShowHistoryHeaderAfterZoomOut(
      this.notifyAfterZoomOut,
      this.collectBreadcrumbs,
      this.renderNavigationHeader,
      this.zoomHistory,
      this.settings,
      this.calculateVisibleContentRange,
      (view) => this.followViewportInDefaultMode.refreshView(view)
    );

  private updateHeaderAfterRangeBeforeVisibleRangeChanged =
    new UpdateHeaderAfterRangeBeforeVisibleRangeChanged(
      this.plugin,
      this.calculateHiddenContentRanges,
      this.calculateVisibleContentRange,
      this.collectBreadcrumbs,
      this.renderNavigationHeader
    );

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
  ) {}

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
