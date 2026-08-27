import { App, Component } from "obsidian";

import { StateEffect, StateField } from "@codemirror/state";
import { EditorView, showPanel } from "@codemirror/view";

import { Breadcrumb } from "./CollectBreadcrumbs";
import { SiblingItem } from "./CollectSiblings";
import { OutlineHoverMenu } from "./OutlineHoverMenu";
import { renderHeader } from "./utils/renderHeader";

import { LoggerService } from "../services/LoggerService";
import { SettingsService } from "../services/SettingsService";

export type { Breadcrumb };

export interface ZoomIn {
  zoomIn(view: EditorView, pos: number): void;
}

export interface ZoomOut {
  zoomOut(view: EditorView): void;
}

interface HeaderState {
  breadcrumbs: Breadcrumb[];
  onClick: (
    view: EditorView,
    pos: number | null,
    event: MouseEvent,
    siblings: SiblingItem[],
    breadcrumbs: Breadcrumb[]
  ) => void;
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
          onClick: (pos, event, siblings) =>
            state.onClick(view, pos, event, siblings, state.breadcrumbs),
          renderOptions: state.renderOptions,
        }),
      });
    }),
});

export class RenderNavigationHeader {
  private outlineMenu = new OutlineHoverMenu();
  private headerComponent: Component | null = null;
  private menuComponent: Component | null = null;

  getExtension() {
    return headerState;
  }

  constructor(
    private app: App,
    private logger: LoggerService,
    private settings: SettingsService,
    private zoomIn: ZoomIn,
    private zoomOut: ZoomOut
  ) {}

  public showHeader(view: EditorView, breadcrumbs: Breadcrumb[]) {
    const l = this.logger.bind("ToggleNavigationHeaderLogic:showHeader");
    l("show header");

    this.headerComponent?.unload();
    this.headerComponent = new Component();
    this.headerComponent.load();

    view.dispatch({
      effects: [
        showHeaderEffect.of({
          breadcrumbs,
          onClick: this.onClick,
          renderOptions: this.getRenderOptions(),
        }),
      ],
    });
  }

  public hideHeader(view: EditorView) {
    const l = this.logger.bind("ToggleNavigationHeaderLogic:hideHeader");
    l("hide header");

    this.outlineMenu.hideAll();
    this.menuComponent?.unload();
    this.menuComponent = null;
    this.headerComponent?.unload();
    this.headerComponent = null;

    view.dispatch({
      effects: [hideHeaderEffect.of()],
    });
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
    breadcrumbs: Breadcrumb[]
  ) => {
    const selectedPath = new Set(
      breadcrumbs
        .map((b) => b.pos)
        .filter((p): p is number => typeof p === "number")
    );

    if (pos === null) {
      this.zoomOut.zoomOut(view);
      return;
    }

    if (siblings.length > 0) {
      this.showOutlineMenu(view, siblings, selectedPath, event);
      return;
    }

    this.zoomIn.zoomIn(view, pos);
  };

  private showOutlineMenu(
    view: EditorView,
    items: SiblingItem[],
    selectedPath: Set<number>,
    event: MouseEvent,
    options?: { includeExitZoom?: boolean }
  ) {
    this.menuComponent?.unload();
    this.menuComponent = new Component();
    this.menuComponent.load();

    this.outlineMenu.showAtMouseEvent(
      event,
      items,
      {
        view,
        selectedPath,
        zoomIn: (v, p) => this.zoomIn.zoomIn(v, p),
        zoomOut: (v) => this.zoomOut.zoomOut(v),
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
