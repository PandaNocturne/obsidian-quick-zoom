import { Platform } from "obsidian";

import { ListRecognitionOptions } from "../logic/utils/listItemParsing";

export type HeaderWidthMode = "note" | "page";

export interface ObsidianZoomPluginSettings {
  debug: boolean;
  zoomOnClick: boolean;
  outlineSubmenuCloseDelayMs: number;
  recognizeUnorderedLists: boolean;
  recognizeOrderedLists: boolean;
  recognizeTaskLists: boolean;
  renderMarkdown: boolean;
  outlineItemMaxWidthPx: number;
  showBreadcrumbsInDefaultMode: boolean;
  trackCursorWhileZoomed: boolean;
  historyMaxEntries: number;
  headerWidthMode: HeaderWidthMode;
}

interface ObsidianZoomPluginSettingsJson {
  debug: boolean;
  zoomOnClick: boolean;
  zoomOnClickMobile: boolean;
  outlineSubmenuCloseDelayMs: number;
  recognizeUnorderedLists: boolean;
  recognizeOrderedLists: boolean;
  recognizeTaskLists: boolean;
  renderMarkdown: boolean;
  outlineItemMaxWidthPx: number;
  showBreadcrumbsInDefaultMode: boolean;
  trackCursorWhileZoomed: boolean;
  historyMaxEntries: number;
  headerWidthMode: HeaderWidthMode;
}

const DEFAULT_SETTINGS: ObsidianZoomPluginSettingsJson = {
  debug: false,
  zoomOnClick: true,
  zoomOnClickMobile: false,
  outlineSubmenuCloseDelayMs: 400,
  recognizeUnorderedLists: false,
  recognizeOrderedLists: false,
  recognizeTaskLists: false,
  renderMarkdown: true,
  outlineItemMaxWidthPx: 300,
  showBreadcrumbsInDefaultMode: false,
  trackCursorWhileZoomed: false,
  historyMaxEntries: 50,
  headerWidthMode: "note",
};

export interface Storage {
  loadData(): Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  saveData(settigns: any): Promise<void>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

type K = keyof ObsidianZoomPluginSettings;
type V<T extends K> = ObsidianZoomPluginSettings[T];
type Callback<T extends K> = (cb: V<T>) => void;

export class SettingsService implements ObsidianZoomPluginSettings {
  private storage: Storage;
  private values: ObsidianZoomPluginSettingsJson;
  private handlers: Map<K, Set<Callback<K>>>;

  constructor(storage: Storage) {
    this.storage = storage;
    this.handlers = new Map();
  }

  get debug() {
    return this.values.debug;
  }
  set debug(value: boolean) {
    this.set("debug", value);
  }

  get zoomOnClick(): boolean {
    return Platform.isDesktop
      ? this.values.zoomOnClick
      : this.values.zoomOnClickMobile;
  }
  set zoomOnClick(value: boolean) {
    this.set("zoomOnClick", value);
  }

  get outlineSubmenuCloseDelayMs() {
    return this.values.outlineSubmenuCloseDelayMs;
  }
  set outlineSubmenuCloseDelayMs(value: number) {
    this.set("outlineSubmenuCloseDelayMs", value);
  }

  get recognizeUnorderedLists() {
    return this.values.recognizeUnorderedLists;
  }
  set recognizeUnorderedLists(value: boolean) {
    this.set("recognizeUnorderedLists", value);
  }

  get recognizeOrderedLists() {
    return this.values.recognizeOrderedLists;
  }
  set recognizeOrderedLists(value: boolean) {
    this.set("recognizeOrderedLists", value);
  }

  get recognizeTaskLists() {
    return this.values.recognizeTaskLists;
  }
  set recognizeTaskLists(value: boolean) {
    this.set("recognizeTaskLists", value);
  }

  get renderMarkdown() {
    return this.values.renderMarkdown;
  }
  set renderMarkdown(value: boolean) {
    this.set("renderMarkdown", value);
  }

  get outlineItemMaxWidthPx() {
    return this.values.outlineItemMaxWidthPx;
  }
  set outlineItemMaxWidthPx(value: number) {
    this.set("outlineItemMaxWidthPx", value);
  }

  get showBreadcrumbsInDefaultMode() {
    return this.values.showBreadcrumbsInDefaultMode;
  }
  set showBreadcrumbsInDefaultMode(value: boolean) {
    this.set("showBreadcrumbsInDefaultMode", value);
  }

  get trackCursorWhileZoomed() {
    return this.values.trackCursorWhileZoomed;
  }
  set trackCursorWhileZoomed(value: boolean) {
    this.set("trackCursorWhileZoomed", value);
  }

  get historyMaxEntries() {
    return this.values.historyMaxEntries;
  }
  set historyMaxEntries(value: number) {
    this.set("historyMaxEntries", value);
  }

  get headerWidthMode() {
    return this.values.headerWidthMode;
  }
  set headerWidthMode(value: HeaderWidthMode) {
    this.set("headerWidthMode", value);
  }

  getListRecognitionOptions(): ListRecognitionOptions {
    return {
      recognizeUnorderedLists: this.recognizeUnorderedLists,
      recognizeOrderedLists: this.recognizeOrderedLists,
      recognizeTaskLists: this.recognizeTaskLists,
    };
  }

  onChange<T extends K>(key: T, cb: Callback<T>) {
    if (!this.handlers.has(key)) {
      this.handlers.set(key, new Set());
    }

    this.handlers.get(key).add(cb);
  }

  removeCallback<T extends K>(key: T, cb: Callback<T>): void {
    const handlers = this.handlers.get(key);

    if (handlers) {
      handlers.delete(cb);
    }
  }

  async load() {
    this.values = Object.assign(
      {},
      DEFAULT_SETTINGS,
      await this.storage.loadData()
    );
  }

  async save() {
    await this.storage.saveData(this.values);
  }

  private set<T extends K>(key: T, value: V<T>): void {
    switch (key) {
      case "debug":
        this.values.debug = value as boolean;
        break;
      case "zoomOnClick":
        if (Platform.isDesktop) {
          this.values.zoomOnClick = value as boolean;
        } else {
          this.values.zoomOnClickMobile = value as boolean;
        }
        break;
      case "outlineSubmenuCloseDelayMs":
        this.values.outlineSubmenuCloseDelayMs = value as number;
        break;
      case "recognizeUnorderedLists":
        this.values.recognizeUnorderedLists = value as boolean;
        break;
      case "recognizeOrderedLists":
        this.values.recognizeOrderedLists = value as boolean;
        break;
      case "recognizeTaskLists":
        this.values.recognizeTaskLists = value as boolean;
        break;
      case "renderMarkdown":
        this.values.renderMarkdown = value as boolean;
        break;
      case "outlineItemMaxWidthPx":
        this.values.outlineItemMaxWidthPx = value as number;
        break;
      case "showBreadcrumbsInDefaultMode":
        this.values.showBreadcrumbsInDefaultMode = value as boolean;
        break;
      case "trackCursorWhileZoomed":
        this.values.trackCursorWhileZoomed = value as boolean;
        break;
      case "historyMaxEntries":
        this.values.historyMaxEntries = value as number;
        break;
      case "headerWidthMode":
        this.values.headerWidthMode = value as HeaderWidthMode;
        break;
    }

    const callbacks = this.handlers.get(key);

    if (!callbacks) {
      return;
    }

    for (const cb of callbacks.values()) {
      cb(value);
    }
  }
}
