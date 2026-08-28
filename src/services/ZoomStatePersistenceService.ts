import { App, Platform, Plugin, TFile } from "obsidian";

import { promises as fs } from "fs";
import { join } from "path";

import { SettingsService } from "./SettingsService";
import {
  DocumentZoomStateRecord,
  ZOOM_STATE_FRONTMATTER_KEY,
  createZoomStateRecord,
  parseZoomStateRecord,
} from "./zoomStateRecord";

type TmpStoreFile = Record<string, DocumentZoomStateRecord | null>;

export class ZoomStatePersistenceService {
  private writeChain: Promise<void> = Promise.resolve();

  constructor(private plugin: Plugin, private settings: SettingsService) {}

  async load(file: TFile): Promise<DocumentZoomStateRecord | null> {
    if (this.settings.zoomStateStorage === "frontmatter") {
      return this.loadFromFrontmatter(file);
    }
    return this.loadFromTmp(file);
  }

  async save(
    file: TFile,
    range: { from: number; to: number } | null
  ): Promise<void> {
    if (!this.settings.recordZoomState) {
      return;
    }

    const record =
      range === null ? null : createZoomStateRecord(range.from, range.to);

    this.writeChain = this.writeChain.then(() =>
      this.settings.zoomStateStorage === "frontmatter"
        ? this.saveToFrontmatter(file, record)
        : this.saveToTmp(file, record)
    );

    await this.writeChain;
  }

  private loadFromFrontmatter(file: TFile): DocumentZoomStateRecord | null {
    const cache = this.plugin.app.metadataCache.getFileCache(file);
    return parseZoomStateRecord(
      cache?.frontmatter?.[ZOOM_STATE_FRONTMATTER_KEY]
    );
  }

  private async saveToFrontmatter(
    file: TFile,
    record: DocumentZoomStateRecord | null
  ): Promise<void> {
    const app = this.plugin.app as App & {
      fileManager: {
        processFrontMatter(
          file: TFile,
          fn: (frontmatter: Record<string, unknown>) => void
        ): Promise<void>;
      };
    };

    await app.fileManager.processFrontMatter(file, (frontmatter) => {
      if (record === null) {
        delete frontmatter[ZOOM_STATE_FRONTMATTER_KEY];
        return;
      }
      frontmatter[ZOOM_STATE_FRONTMATTER_KEY] = { ...record };
    });
  }

  private getTmpStorePath(): string | null {
    const dir = (this.plugin.manifest as { dir?: string }).dir;
    if (!dir || !Platform.isDesktopApp) {
      return null;
    }
    return join(dir, "tmp", "zoom-state.json");
  }

  private async loadFromTmp(
    file: TFile
  ): Promise<DocumentZoomStateRecord | null> {
    const storePath = this.getTmpStorePath();
    if (!storePath) {
      return null;
    }

    try {
      const raw = await fs.readFile(storePath, "utf8");
      const store = JSON.parse(raw) as TmpStoreFile;
      return parseZoomStateRecord(store[file.path]);
    } catch {
      return null;
    }
  }

  private async saveToTmp(
    file: TFile,
    record: DocumentZoomStateRecord | null
  ): Promise<void> {
    const storePath = this.getTmpStorePath();
    if (!storePath) {
      return;
    }

    await fs.mkdir(join(storePath, ".."), { recursive: true });

    let store: TmpStoreFile = {};
    try {
      const raw = await fs.readFile(storePath, "utf8");
      store = JSON.parse(raw) as TmpStoreFile;
    } catch {
      store = {};
    }

    if (record === null) {
      delete store[file.path];
    } else {
      store[file.path] = record;
    }

    await fs.writeFile(
      storePath,
      JSON.stringify(store, null, 2) + "\n",
      "utf8"
    );
  }
}
