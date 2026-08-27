import { Notice, Plugin } from "obsidian";

import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { Feature } from "./Feature";
import { isFoldingEnabled } from "./utils/isFoldingEnabled";

import { CalculateRangeForZooming } from "../logic/CalculateRangeForZooming";
import { KeepOnlyZoomedContentVisible } from "../logic/KeepOnlyZoomedContentVisible";
import { ZoomHistory } from "../logic/ZoomHistory";
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

  constructor(
    private plugin: Plugin,
    private logger: LoggerService,
    private settings: SettingsService
  ) {}

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

  private applyHistoryEntry(view: EditorView, entry: number | null) {
    this.zoomHistory.runWithoutRecording(() => {
      if (entry === null) {
        this.zoomOut(view);
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
      this.settings.getListRecognitionOptions()
    );

    if (!newRange) {
      return;
    }

    this.keepOnlyZoomedContentVisible.keepOnlyZoomedContentVisible(
      view,
      newRange.from,
      newRange.to,
      { scrollIntoView: false }
    );
  }

  public zoomIn(view: EditorView, pos: number) {
    const l = this.logger.bind("ZoomFeature:zoomIn");
    l("zooming in");

    if (!isFoldingEnabled(this.plugin.app)) {
      new Notice(
        `In order to zoom, you must first enable "Fold heading" and "Fold indent" under Settings -> Editor`
      );
      return;
    }

    const range = this.calculateRangeForZooming.calculateRangeForZooming(
      view.state,
      pos,
      this.settings.getListRecognitionOptions()
    );

    if (!range) {
      l("unable to calculate range for zooming");
      return;
    }

    this.keepOnlyZoomedContentVisible.keepOnlyZoomedContentVisible(
      view,
      range.from,
      range.to,
      { scrollTo: pos }
    );

    this.zoomHistory.record(view, pos);

    for (const cb of this.zoomInCallbacks) {
      cb(view, pos);
    }
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

  async load() {
    this.plugin.registerEditorExtension(
      this.keepOnlyZoomedContentVisible.getExtension()
    );

    this.plugin.addCommand({
      id: "zoom-in",
      name: "Zoom in",
      icon: "zoom-in",
      editorCallback: (editor) => {
        const view = getEditorViewFromEditor(editor);
        this.zoomIn(view, view.state.selection.main.head);
      },
      hotkeys: [
        {
          modifiers: ["Mod"],
          key: ".",
        },
      ],
    });

    this.plugin.addCommand({
      id: "zoom-out",
      name: "Zoom out the entire document",
      icon: "zoom-out",
      editorCallback: (editor) => this.zoomOut(getEditorViewFromEditor(editor)),
      hotkeys: [
        {
          modifiers: ["Mod", "Shift"],
          key: ".",
        },
      ],
    });

    this.plugin.addCommand({
      id: "zoom-back",
      name: "Zoom back",
      icon: "arrow-left",
      editorCallback: (editor) =>
        this.zoomBack(getEditorViewFromEditor(editor)),
    });

    this.plugin.addCommand({
      id: "zoom-forward",
      name: "Zoom forward",
      icon: "arrow-right",
      editorCallback: (editor) =>
        this.zoomForward(getEditorViewFromEditor(editor)),
    });
  }

  async unload() {}
}
