import { Platform, Plugin, TFile } from "obsidian";

import { promises as fs } from "fs";
import { join } from "path";

import {
  DocumentZoomStateRecord,
  createZoomStateRecord,
  parseZoomStateRecord,
} from "./zoomStateRecord";

type TmpStoreFile = Record<string, DocumentZoomStateRecord | null>;

export class ZoomStatePersistenceService {
  private writeChain: Promise<void> = Promise.resolve();

  constructor(private plugin: Plugin) {}

  async load(file: TFile): Promise<DocumentZoomStateRecord | null> {
    const storePath = this.getStorePath();
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

  async save(
    file: TFile,
    range: { from: number; to: number } | null
  ): Promise<void> {
    const record =
      range === null ? null : createZoomStateRecord(range.from, range.to);

    this.writeChain = this.writeChain.then(() =>
      this.writeRecord(file, record)
    );
    await this.writeChain;
  }

  async resetAll(): Promise<void> {
    const storePath = this.getStorePath();
    if (!storePath) {
      return;
    }

    this.writeChain = this.writeChain.then(async () => {
      try {
        await fs.unlink(storePath);
      } catch {
        // File may not exist yet.
      }
    });
    await this.writeChain;
  }

  private getStorePath(): string | null {
    const dir = (this.plugin.manifest as { dir?: string }).dir;
    if (!dir || !Platform.isDesktopApp) {
      return null;
    }
    return join(dir, "tmp", "zoom-state.json");
  }

  private async writeRecord(
    file: TFile,
    record: DocumentZoomStateRecord | null
  ): Promise<void> {
    const storePath = this.getStorePath();
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
