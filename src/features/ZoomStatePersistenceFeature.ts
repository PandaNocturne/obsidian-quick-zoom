import { MarkdownView, Plugin } from "obsidian";

import { EditorView } from "@codemirror/view";

import { Feature } from "./Feature";
import { ZoomFeature } from "./ZoomFeature";
import { isFoldingEnabled } from "./utils/isFoldingEnabled";

import { SettingsService } from "../services/SettingsService";
import { ZoomStatePersistenceService } from "../services/ZoomStatePersistenceService";
import { isValidZoomStateRecord } from "../services/zoomStateRecord";
import { getEditorViewFromEditor } from "../utils/getEditorViewFromEditor";

export class ZoomStatePersistenceFeature implements Feature {
  private persistence: ZoomStatePersistenceService;
  private restoring = false;
  private pendingRestorePath: string | null = null;

  constructor(
    private plugin: Plugin,
    private settings: SettingsService,
    private zoomFeature: ZoomFeature
  ) {
    this.persistence = new ZoomStatePersistenceService(plugin, settings);
  }

  async load() {
    this.zoomFeature.notifyAfterZoomIn((view) => {
      void this.persistCurrentZoom(view);
    });
    this.zoomFeature.notifyAfterZoomOut((view) => {
      void this.persistZoomCleared(view);
    });

    this.plugin.registerEvent(
      this.plugin.app.workspace.on("active-leaf-change", (leaf) => {
        void this.scheduleRestore(leaf?.view);
      })
    );

    this.plugin.app.workspace.onLayoutReady(() => {
      const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
      void this.scheduleRestore(view);
    });
  }

  async unload() {}

  private async persistCurrentZoom(view: EditorView) {
    if (this.restoring || !this.settings.recordZoomState) {
      return;
    }

    const file = this.getFileForView(view);
    if (!file) {
      return;
    }

    const range = this.zoomFeature.calculateVisibleContentRange(view.state);
    if (!range) {
      return;
    }

    await this.persistence.save(file, range);
  }

  private async persistZoomCleared(view: EditorView) {
    if (this.restoring || !this.settings.recordZoomState) {
      return;
    }

    const file = this.getFileForView(view);
    if (!file) {
      return;
    }

    await this.persistence.save(file, null);
  }

  private scheduleRestore(view: unknown) {
    if (!(view instanceof MarkdownView) || !view.file) {
      return;
    }

    this.pendingRestorePath = view.file.path;

    window.setTimeout(() => {
      if (this.pendingRestorePath !== view.file?.path) {
        return;
      }
      void this.tryRestore(view);
    }, 0);
  }

  private async tryRestore(view: MarkdownView) {
    if (
      !this.settings.recordZoomState ||
      !this.settings.restoreZoomOnOpen ||
      !isFoldingEnabled(this.plugin.app)
    ) {
      return;
    }

    const file = view.file;
    if (!file) {
      return;
    }

    const cm = getEditorViewFromEditor(view.editor);
    if (this.zoomFeature.calculateVisibleContentRange(cm.state)) {
      return;
    }

    const record = await this.persistence.load(file);
    if (!isValidZoomStateRecord(record, cm.state.doc.length)) {
      return;
    }

    this.restoring = true;
    try {
      this.zoomFeature.restorePersistedZoom(cm, record.from, record.to);
    } finally {
      window.setTimeout(() => {
        this.restoring = false;
      }, 100);
    }
  }

  private getFileForView(view: EditorView) {
    const active = this.plugin.app.workspace.getActiveFile();
    const leafView =
      this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!leafView?.file) {
      return active;
    }

    try {
      const leafCm = getEditorViewFromEditor(leafView.editor);
      if (leafCm !== view) {
        return active;
      }
    } catch {
      return active;
    }

    return leafView.file;
  }
}
