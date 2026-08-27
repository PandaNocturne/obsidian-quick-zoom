import { Plugin } from "obsidian";

import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { Feature } from "./Feature";
import { getDocumentTitle } from "./utils/getDocumentTitle";
import { getEditorViewFromEditorState } from "./utils/getEditorViewFromEditorState";

import { CollectBreadcrumbs } from "../logic/CollectBreadcrumbs";
import { DetectRangeBeforeVisibleRangeChanged } from "../logic/DetectRangeBeforeVisibleRangeChanged";
import {
  RenderNavigationHeader,
  ZoomHistoryNav,
} from "../logic/RenderNavigationHeader";
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
      this.renderNavigationHeader.showHeader(view, breadcrumbs);
    });
  }

  async unload() {}
}

class HideOrShowHistoryHeaderAfterZoomOut implements Feature {
  constructor(
    private notifyAfterZoomOut: NotifyAfterZoomOut,
    private collectBreadcrumbs: CollectBreadcrumbs,
    private renderNavigationHeader: RenderNavigationHeader,
    private zoomHistory: ZoomHistoryNav
  ) {}

  async load() {
    this.notifyAfterZoomOut.notifyAfterZoomOut((view) => {
      if (
        this.zoomHistory.canZoomBack(view) ||
        this.zoomHistory.canZoomForward(view)
      ) {
        const breadcrumbs = this.collectBreadcrumbs.collectDocumentBreadcrumb(
          view.state
        );
        this.renderNavigationHeader.showHeader(view, breadcrumbs);
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

    const pos =
      this.calculateVisibleContentRange.calculateVisibleContentRange(
        state
      ).from;

    const breadcrumbs = this.collectBreadcrumbs.collectBreadcrumbs(state, pos);

    this.renderNavigationHeader.showHeader(view, breadcrumbs);
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
      this.zoomHistory
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
  }

  async unload() {
    this.showHeaderAfterZoomIn.unload();
    this.hideOrShowHistoryHeaderAfterZoomOut.unload();
    this.updateHeaderAfterRangeBeforeVisibleRangeChanged.unload();
  }
}
