import { Notice, Plugin } from "obsidian";

import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { Feature } from "./Feature";
import { getDocumentTitle } from "./utils/getDocumentTitle";
import { isFoldingEnabled } from "./utils/isFoldingEnabled";

import { t } from "../i18n";
import { CalculateRangeForZooming } from "../logic/CalculateRangeForZooming";
import { CollectBreadcrumbs } from "../logic/CollectBreadcrumbs";
import {
  findNextHeadingPos,
  findParentZoomPos,
  findPreviousHeadingPos,
  findSiblingZoomPos,
} from "../logic/FindOutlineNeighbor";
import { KeepOnlyZoomedContentVisible } from "../logic/KeepOnlyZoomedContentVisible";
import { ZoomHistory, ZoomHistoryEntry } from "../logic/ZoomHistory";
import { getActiveOutlinePos } from "../logic/utils/getActiveOutlinePos";
import { resolveListRecognitionOptions } from "../logic/utils/listItemParsing";
import { LoggerService } from "../services/LoggerService";
import { SettingsService } from "../services/SettingsService";
import { getEditorViewFromEditor } from "../utils/getEditorViewFromEditor";

export type ZoomInCallback = (view: EditorView, pos: number) => void;
export type ZoomOutCallback = (view: EditorView) => void;

export class ZoomFeature implements Feature {
  private zoomInCallbacks: ZoomInCallback[] = [];
  private zoomOutCallbacks: ZoomOutCallback[] = [];

  private keepOnlyZoomedContentVisible = new KeepOnlyZoomedContentVisible(
    this.logger
  );

  private calculateRangeForZooming = new CalculateRangeForZooming();
  private zoomHistory = new ZoomHistory();
  private collectBreadcrumbs: CollectBreadcrumbs;

  constructor(
    private plugin: Plugin,
    private logger: LoggerService,
    private settings: SettingsService
  ) {
    this.collectBreadcrumbs = new CollectBreadcrumbs(
      { getDocumentTitle },
      this.settings
    );
    this.syncHistoryLimit();
    this.settings.onChange("historyMaxEntries", () => {
      this.syncHistoryLimit();
    });
  }

  private syncHistoryLimit() {
    this.zoomHistory.setMaxEntries(this.settings.historyMaxEntries);
  }

  public calculateVisibleContentRange(state: EditorState) {
    return this.keepOnlyZoomedContentVisible.calculateVisibleContentRange(
      state
    );
  }

  public calculateHiddenContentRanges(state: EditorState) {
    return this.keepOnlyZoomedContentVisible.calculateHiddenContentRanges(
      state
    );
  }

  public notifyAfterZoomIn(cb: ZoomInCallback) {
    this.zoomInCallbacks.push(cb);
  }

  public notifyAfterZoomOut(cb: ZoomOutCallback) {
    this.zoomOutCallbacks.push(cb);
  }

  public canZoomBack(view: EditorView) {
    return this.zoomHistory.canGoBack(view);
  }

  public canZoomForward(view: EditorView) {
    return this.zoomHistory.canGoForward(view);
  }

  public zoomBack(view: EditorView) {
    if (!this.zoomHistory.canGoBack(view)) {
      return;
    }
    const entry = this.zoomHistory.goBack(view);
    this.applyHistoryEntry(view, entry);
  }

  public zoomForward(view: EditorView) {
    if (!this.zoomHistory.canGoForward(view)) {
      return;
    }
    const entry = this.zoomHistory.goForward(view);
    this.applyHistoryEntry(view, entry);
  }

  private applyHistoryEntry(view: EditorView, entry: ZoomHistoryEntry | null) {
    this.zoomHistory.runWithoutRecording(() => {
      if (entry === null) {
        this.zoomOut(view);
      } else if (typeof entry === "object") {
        this.applyZoomRange(view, entry.from, entry.to, entry.from, entry);
      } else {
        this.zoomIn(view, entry);
      }
    });
  }

  public refreshZoom(view: EditorView) {
    const prevRange =
      this.keepOnlyZoomedContentVisible.calculateVisibleContentRange(
        view.state
      );

    if (!prevRange) {
      return;
    }

    const newRange = this.calculateRangeForZooming.calculateRangeForZooming(
      view.state,
      prevRange.from,
      this.getListOptionsForPos(view.state, prevRange.from)
    );

    if (!newRange) {
      return;
    }

    // Keep a larger previous extent (e.g. selection zoom) when structural
    // recalculation would shrink below what the user had zoomed into.
    const to = Math.max(
      newRange.to,
      Math.min(prevRange.to, view.state.doc.length)
    );

    this.keepOnlyZoomedContentVisible.keepOnlyZoomedContentVisible(
      view,
      newRange.from,
      to,
      { scrollIntoView: false }
    );
  }

  /**
   * Zoom using current selection when non-empty (multi-line supported);
   * otherwise zoom at the cursor with heading/list/paragraph rules.
   */
  public zoomInFromEditor(view: EditorView) {
    const sel = view.state.selection.main;
    if (sel.from !== sel.to) {
      const l = this.logger.bind("ZoomFeature:zoomInFromEditor");
      l("zooming in to selection");

      if (!isFoldingEnabled(this.plugin.app)) {
        new Notice(t("notice.enableFolding"));
        return;
      }

      const range = this.calculateRangeForZooming.calculateRangeForSelection(
        view.state,
        sel.from,
        sel.to
      );
      this.applyZoomRange(view, range.from, range.to, sel.head, range);
      return;
    }

    this.zoomIn(view, sel.head);
  }

  public zoomIn(view: EditorView, pos: number) {
    const l = this.logger.bind("ZoomFeature:zoomIn");
    l("zooming in");

    if (!isFoldingEnabled(this.plugin.app)) {
      new Notice(t("notice.enableFolding"));
      return;
    }

    const range = this.calculateRangeForZooming.calculateRangeForZooming(
      view.state,
      pos,
      this.getListOptionsForPos(view.state, pos)
    );

    if (!range) {
      l("unable to calculate range for zooming");
      return;
    }

    this.applyZoomRange(view, range.from, range.to, pos, pos);
  }

  private applyZoomRange(
    view: EditorView,
    from: number,
    to: number,
    scrollTo: number,
    historyEntry: ZoomHistoryEntry
  ) {
    this.keepOnlyZoomedContentVisible.keepOnlyZoomedContentVisible(
      view,
      from,
      to,
      { scrollTo }
    );

    this.zoomHistory.record(view, historyEntry);

    for (const cb of this.zoomInCallbacks) {
      cb(view, from);
    }
  }

  private getListOptionsForPos(state: EditorState, pos: number) {
    return resolveListRecognitionOptions(
      this.settings.getListRecognitionOptions(),
      state.doc.lineAt(pos).text
    );
  }

  public zoomOut(view: EditorView) {
    const l = this.logger.bind("ZoomFeature:zoomOut");
    l("zooming out");

    this.keepOnlyZoomedContentVisible.showAllContent(view);
    this.zoomHistory.record(view, null);

    for (const cb of this.zoomOutCallbacks) {
      cb(view);
    }
  }

  /** Restore a previously persisted zoom range without touching history. */
  public restorePersistedZoom(view: EditorView, from: number, to: number) {
    this.keepOnlyZoomedContentVisible.keepOnlyZoomedContentVisible(
      view,
      from,
      to,
      { scrollTo: from }
    );

    for (const cb of this.zoomInCallbacks) {
      cb(view, from);
    }
  }

  public zoomToPreviousHeading(view: EditorView) {
    const pos = findPreviousHeadingPos(view.state, getActiveOutlinePos(view));
    if (pos !== null) {
      this.zoomIn(view, pos);
    }
  }

  public zoomToNextHeading(view: EditorView) {
    const pos = findNextHeadingPos(view.state, getActiveOutlinePos(view));
    if (pos !== null) {
      this.zoomIn(view, pos);
    }
  }

  public zoomToParent(view: EditorView) {
    const breadcrumbs = this.collectBreadcrumbs.collectStickyBreadcrumbs(
      view.state,
      getActiveOutlinePos(view)
    );
    const parentPos = findParentZoomPos(breadcrumbs);
    if (parentPos === null) {
      this.zoomOut(view);
      return;
    }
    this.zoomIn(view, parentPos);
  }

  public zoomToPreviousSibling(view: EditorView) {
    const breadcrumbs = this.collectBreadcrumbs.collectStickyBreadcrumbs(
      view.state,
      getActiveOutlinePos(view)
    );
    const pos = findSiblingZoomPos(breadcrumbs, -1);
    if (pos !== null) {
      this.zoomIn(view, pos);
    }
  }

  public zoomToNextSibling(view: EditorView) {
    const breadcrumbs = this.collectBreadcrumbs.collectStickyBreadcrumbs(
      view.state,
      getActiveOutlinePos(view)
    );
    const pos = findSiblingZoomPos(breadcrumbs, 1);
    if (pos !== null) {
      this.zoomIn(view, pos);
    }
  }

  async load() {
    this.plugin.registerEditorExtension(
      this.keepOnlyZoomedContentVisible.getExtension()
    );

    this.plugin.addCommand({
      id: "zoom-in",
      name: t("commands.zoomIn"),
      icon: "zoom-in",
      editorCallback: (editor) => {
        const view = getEditorViewFromEditor(editor);
        this.zoomInFromEditor(view);
      },
      hotkeys: [
        {
          modifiers: ["Mod", "Shift"],
          key: ".",
        },
      ],
    });

    this.plugin.addCommand({
      id: "zoom-out",
      name: t("commands.zoomOut"),
      icon: "zoom-out",
      editorCallback: (editor) => this.zoomOut(getEditorViewFromEditor(editor)),
      hotkeys: [
        {
          modifiers: ["Mod", "Shift"],
          key: "/",
        },
      ],
    });

    this.plugin.addCommand({
      id: "zoom-back",
      name: t("commands.zoomBack"),
      icon: "arrow-left",
      editorCallback: (editor) =>
        this.zoomBack(getEditorViewFromEditor(editor)),
    });

    this.plugin.addCommand({
      id: "zoom-forward",
      name: t("commands.zoomForward"),
      icon: "arrow-right",
      editorCallback: (editor) =>
        this.zoomForward(getEditorViewFromEditor(editor)),
    });

    this.plugin.addCommand({
      id: "zoom-prev-heading",
      name: t("commands.zoomPrevHeading"),
      icon: "chevron-up",
      editorCallback: (editor) =>
        this.zoomToPreviousHeading(getEditorViewFromEditor(editor)),
    });

    this.plugin.addCommand({
      id: "zoom-next-heading",
      name: t("commands.zoomNextHeading"),
      icon: "chevron-down",
      editorCallback: (editor) =>
        this.zoomToNextHeading(getEditorViewFromEditor(editor)),
    });

    this.plugin.addCommand({
      id: "zoom-parent",
      name: t("commands.zoomParent"),
      icon: "outdent",
      editorCallback: (editor) =>
        this.zoomToParent(getEditorViewFromEditor(editor)),
    });

    this.plugin.addCommand({
      id: "zoom-prev-sibling",
      name: t("commands.zoomPrevSibling"),
      icon: "chevrons-up",
      editorCallback: (editor) =>
        this.zoomToPreviousSibling(getEditorViewFromEditor(editor)),
    });

    this.plugin.addCommand({
      id: "zoom-next-sibling",
      name: t("commands.zoomNextSibling"),
      icon: "chevrons-down",
      editorCallback: (editor) =>
        this.zoomToNextSibling(getEditorViewFromEditor(editor)),
    });
  }

  async unload() {}
}
