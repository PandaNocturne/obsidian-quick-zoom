import { App, Component } from "obsidian";

import { EditorSelection, StateEffect, StateField } from "@codemirror/state";
import { EditorView, showPanel } from "@codemirror/view";

import { Breadcrumb } from "./CollectBreadcrumbs";
import { SiblingItem } from "./CollectSiblings";
import { OutlineHoverMenu } from "./OutlineHoverMenu";
import { ZoomHistory } from "./ZoomHistory";
import { HeaderHistoryControls, renderHeader } from "./utils/renderHeader";

import { LoggerService } from "../services/LoggerService";
import { SettingsService } from "../services/SettingsService";

export type { Breadcrumb };

export type HeaderInteractionMode = "zoom" | "navigate";

export interface ZoomIn {
  zoomIn(view: EditorView, pos: number): void;
}

export interface ZoomOut {
  zoomOut(view: EditorView): void;
}

export interface ZoomHistoryNav {
  canZoomBack(view: EditorView): boolean;
  canZoomForward(view: EditorView): boolean;
  zoomBack(view: EditorView): void;
  zoomForward(view: EditorView): void;
}

interface HeaderState {
  breadcrumbs: Breadcrumb[];
  mode: HeaderInteractionMode;
  onClick: (
    view: EditorView,
    pos: number | null,
    event: MouseEvent,
    siblings: SiblingItem[],
    breadcrumbs: Breadcrumb[],
    mode: HeaderInteractionMode
  ) => void;
  onDoubleClick: (
    view: EditorView,
    pos: number | null,
    event: MouseEvent,
    siblings: SiblingItem[],
    breadcrumbs: Breadcrumb[],
    mode: HeaderInteractionMode
  ) => void;
  onDelimiterClick: (
    view: EditorView,
    pos: number | null,
    event: MouseEvent,
    children: SiblingItem[],
    breadcrumbs: Breadcrumb[],
    mode: HeaderInteractionMode
  ) => void;
  getHistory: (view: EditorView) => HeaderHistoryControls;
  renderOptions: {
    renderMarkdown: boolean;
    itemMaxWidthPx: number;
    app: App;
    sourcePath: string;
    component: Component;
  };
}

const showHeaderEffect = StateEffect.define<HeaderState>();
const hideHeaderEffect = StateEffect.define<void>();

const headerState = StateField.define<HeaderState | null>({
  create: () => null,
  update: (value, tr) => {
    for (const e of tr.effects) {
      if (e.is(showHeaderEffect)) {
        value = e.value;
      }
      if (e.is(hideHeaderEffect)) {
        value = null;
      }
    }
    return value;
  },
  provide: (f) =>
    showPanel.from(f, (state) => {
      if (!state) {
        return null;
      }

      return (view) => ({
        top: true,
        dom: renderHeader(view.dom.ownerDocument, {
          breadcrumbs: state.breadcrumbs,
          mode: state.mode,
          onClick: (pos, event, siblings) =>
            state.onClick(
              view,
              pos,
              event,
              siblings,
              state.breadcrumbs,
              state.mode
            ),
          onDoubleClick: (pos, event, siblings) =>
            state.onDoubleClick(
              view,
              pos,
              event,
              siblings,
              state.breadcrumbs,
              state.mode
            ),
          onDelimiterClick: (pos, event, children) =>
            state.onDelimiterClick(
              view,
              pos,
              event,
              children,
              state.breadcrumbs,
              state.mode
            ),
          history: state.getHistory(view),
          renderOptions: state.renderOptions,
        }),
      });
    }),
});

export class RenderNavigationHeader {
  private outlineMenu = new OutlineHoverMenu();
  private headerComponent: Component | null = null;
  private menuComponent: Component | null = null;
  private lastBreadcrumbKey: string | null = null;
  private lastMode: HeaderInteractionMode | null = null;
  private lastHistoryKey: string | null = null;

  getExtension() {
    return headerState;
  }

  constructor(
    private app: App,
    private logger: LoggerService,
    private settings: SettingsService,
    private zoomIn: ZoomIn,
    private zoomOut: ZoomOut,
    private zoomHistory: ZoomHistoryNav,
    private cursorHistory: ZoomHistory,
    private onCursorHistoryNavigated?: (view: EditorView) => void
  ) {}

  public showHeader(
    view: EditorView,
    breadcrumbs: Breadcrumb[],
    mode: HeaderInteractionMode = "zoom"
  ) {
    const key = breadcrumbs
      .map((b) => `${b.pos}:${b.title}:${b.dimmed ? 1 : 0}`)
      .join("|");
    const historyKey = this.getHistoryKey(view, mode);
    if (
      this.lastBreadcrumbKey === key &&
      this.lastMode === mode &&
      this.lastHistoryKey === historyKey &&
      this.headerComponent
    ) {
      return;
    }
    this.lastBreadcrumbKey = key;
    this.lastMode = mode;
    this.lastHistoryKey = historyKey;

    const l = this.logger.bind("ToggleNavigationHeaderLogic:showHeader");
    l("show header", mode);

    this.headerComponent?.unload();
    this.headerComponent = new Component();
    this.headerComponent.load();

    view.dispatch({
      effects: [
        showHeaderEffect.of({
          breadcrumbs,
          mode,
          onClick: this.onClick,
          onDoubleClick: this.onDoubleClick,
          onDelimiterClick: this.onDelimiterClick,
          getHistory: this.getHistory,
          renderOptions: this.getRenderOptions(),
        }),
      ],
    });
  }

  public hideHeader(view: EditorView) {
    const l = this.logger.bind("ToggleNavigationHeaderLogic:hideHeader");
    l("hide header");

    this.lastBreadcrumbKey = null;
    this.lastMode = null;
    this.lastHistoryKey = null;
    this.outlineMenu.hideAll();
    this.menuComponent?.unload();
    this.menuComponent = null;
    this.headerComponent?.unload();
    this.headerComponent = null;

    view.dispatch({
      effects: [hideHeaderEffect.of()],
    });
  }

  /** Record an outline/cursor anchor for default-mode back/forward. */
  public recordCursorVisit(view: EditorView, pos: number | null) {
    this.cursorHistory.record(view, pos);
  }

  private navigateTo(view: EditorView, pos: number) {
    const safePos = Math.max(0, Math.min(pos, view.state.doc.length));
    view.dispatch({
      selection: EditorSelection.cursor(safePos),
      effects: [EditorView.scrollIntoView(safePos, { y: "start" })],
    });
    view.focus();
  }

  private getHistoryKey(view: EditorView, mode: HeaderInteractionMode) {
    if (mode === "navigate") {
      return `c:${this.cursorHistory.canGoBack(view) ? 1 : 0}${
        this.cursorHistory.canGoForward(view) ? 1 : 0
      }`;
    }
    return `z:${this.zoomHistory.canZoomBack(view) ? 1 : 0}${
      this.zoomHistory.canZoomForward(view) ? 1 : 0
    }`;
  }

  private getHistory = (view: EditorView): HeaderHistoryControls => {
    if (this.lastMode === "navigate") {
      return {
        canGoBack: this.cursorHistory.canGoBack(view),
        canGoForward: this.cursorHistory.canGoForward(view),
        onBack: () => this.cursorBack(view),
        onForward: () => this.cursorForward(view),
        backLabel: "后退到上一光标位置",
        forwardLabel: "前进到下一光标位置",
      };
    }

    return {
      canGoBack: this.zoomHistory.canZoomBack(view),
      canGoForward: this.zoomHistory.canZoomForward(view),
      onBack: () => this.zoomHistory.zoomBack(view),
      onForward: () => this.zoomHistory.zoomForward(view),
      backLabel: "后退到上一次缩放",
      forwardLabel: "前进到下一次缩放",
    };
  };

  private cursorBack(view: EditorView) {
    if (!this.cursorHistory.canGoBack(view)) {
      return;
    }
    const entry = this.cursorHistory.goBack(view);
    this.lastBreadcrumbKey = null;
    this.cursorHistory.runWithoutRecording(() => {
      this.navigateTo(view, entry ?? 0);
    });
    this.onCursorHistoryNavigated?.(view);
  }

  private cursorForward(view: EditorView) {
    if (!this.cursorHistory.canGoForward(view)) {
      return;
    }
    const entry = this.cursorHistory.goForward(view);
    this.lastBreadcrumbKey = null;
    this.cursorHistory.runWithoutRecording(() => {
      this.navigateTo(view, entry ?? 0);
    });
    this.onCursorHistoryNavigated?.(view);
  }

  private getRenderOptions() {
    return {
      renderMarkdown: this.settings.renderMarkdown,
      itemMaxWidthPx: this.settings.outlineItemMaxWidthPx,
      app: this.app,
      sourcePath: this.app.workspace.getActiveFile()?.path ?? "",
      component: this.headerComponent as Component,
    };
  }

  private onClick = (
    view: EditorView,
    pos: number | null,
    event: MouseEvent,
    siblings: SiblingItem[],
    breadcrumbs: Breadcrumb[],
    mode: HeaderInteractionMode
  ) => {
    const selectedPath = new Set(
      breadcrumbs
        .map((b) => b.pos)
        .filter((p): p is number => typeof p === "number")
    );

    if (mode === "navigate") {
      // File icon: enter zoom at the current heading (same control as zoom-out).
      if (pos === null) {
        const zoomTarget = [...breadcrumbs]
          .reverse()
          .find((b) => typeof b.pos === "number");
        if (zoomTarget && typeof zoomTarget.pos === "number") {
          this.zoomIn.zoomIn(view, zoomTarget.pos);
          return;
        }
        if (siblings.length > 0) {
          this.showOutlineMenu(view, siblings, selectedPath, event, "zoom");
        }
        return;
      }
      if (siblings.length > 0) {
        this.showOutlineMenu(view, siblings, selectedPath, event, mode);
        return;
      }
      this.navigateTo(view, pos);
      return;
    }

    if (pos === null) {
      this.zoomOut.zoomOut(view);
      return;
    }

    if (siblings.length > 0) {
      this.showOutlineMenu(view, siblings, selectedPath, event, mode);
      return;
    }

    this.zoomIn.zoomIn(view, pos);
  };

  private onDoubleClick = (
    view: EditorView,
    pos: number | null,
    _event: MouseEvent,
    _siblings: SiblingItem[],
    breadcrumbs: Breadcrumb[],
    mode: HeaderInteractionMode
  ) => {
    this.outlineMenu.hideAll();

    if (mode === "navigate") {
      if (pos === null) {
        const zoomTarget = [...breadcrumbs]
          .reverse()
          .find((b) => typeof b.pos === "number");
        if (zoomTarget && typeof zoomTarget.pos === "number") {
          this.zoomIn.zoomIn(view, zoomTarget.pos);
        }
        return;
      }
      this.navigateTo(view, pos);
      return;
    }

    if (pos === null) {
      this.zoomOut.zoomOut(view);
      return;
    }

    this.zoomIn.zoomIn(view, pos);
  };

  private onDelimiterClick = (
    view: EditorView,
    _pos: number | null,
    event: MouseEvent,
    children: SiblingItem[],
    breadcrumbs: Breadcrumb[],
    mode: HeaderInteractionMode
  ) => {
    if (children.length === 0) {
      return;
    }

    const selectedPath = new Set(
      breadcrumbs
        .map((b) => b.pos)
        .filter((p): p is number => typeof p === "number")
    );

    this.showOutlineMenu(view, children, selectedPath, event, mode);
  };

  private showOutlineMenu(
    view: EditorView,
    items: SiblingItem[],
    selectedPath: Set<number>,
    event: MouseEvent,
    mode: HeaderInteractionMode,
    options?: { includeExitZoom?: boolean }
  ) {
    this.menuComponent?.unload();
    this.menuComponent = new Component();
    this.menuComponent.load();

    const anchor =
      event.currentTarget instanceof HTMLElement
        ? event.currentTarget
        : event.target instanceof HTMLElement
        ? event.target
        : null;

    if (!anchor) {
      return;
    }

    this.outlineMenu.showAtElement(
      anchor,
      items,
      {
        view,
        selectedPath,
        zoomIn: (v, p) => this.zoomIn.zoomIn(v, p),
        zoomOut: (v) => this.zoomOut.zoomOut(v),
        navigateTo:
          mode === "navigate" ? (v, p) => this.navigateTo(v, p) : undefined,
        getSubmenuCloseDelayMs: () => this.settings.outlineSubmenuCloseDelayMs,
        renderMarkdown: this.settings.renderMarkdown,
        itemMaxWidthPx: this.settings.outlineItemMaxWidthPx,
        app: this.app,
        sourcePath: this.app.workspace.getActiveFile()?.path ?? "",
        component: this.menuComponent,
        getListOptions: () => this.settings.getListRecognitionOptions(),
        onMenuClose: () => {
          this.menuComponent?.unload();
          this.menuComponent = null;
        },
      },
      options
    );
  }
}
