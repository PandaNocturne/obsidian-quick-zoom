import { Plugin, TFile } from "obsidian";

import {
  DocumentZoomStateRecord,
  ZoomStateStoreFile,
  createZoomStateRecord,
  parseZoomStateRecord,
  pruneZoomStateStore,
} from "./zoomStateRecord";

export class ZoomStatePersistenceService {
  private writeChain: Promise<void> = Promise.resolve();

  constructor(private plugin: Plugin, private getMaxEntries: () => number) {}

  async load(file: TFile): Promise<DocumentZoomStateRecord | null> {
    const storePath = this.getStorePath();
    if (!storePath) {
      return null;
    }

    try {
      const adapter = this.plugin.app.vault.adapter;
      if (!(await adapter.exists(storePath))) {
        return null;
      }
      const raw = await adapter.read(storePath);
      const store = JSON.parse(raw) as ZoomStateStoreFile;
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
        const adapter = this.plugin.app.vault.adapter;
        if (await adapter.exists(storePath)) {
          await adapter.remove(storePath);
        }
      } catch {
        // File may not exist yet.
      }
    });
    await this.writeChain;
  }

  /**
   * Vault-relative path under the plugin folder, e.g.
   * `.obsidian/plugins/quick-zoom/data/zoom-state.json`
   */
  private getStorePath(): string | null {
    const dir = (this.plugin.manifest as { dir?: string }).dir;
    if (!dir) {
      return null;
    }
    return `${dir.replace(/\\/g, "/").replace(/\/$/, "")}/data/zoom-state.json`;
  }

  private async writeRecord(
    file: TFile,
    record: DocumentZoomStateRecord | null
  ): Promise<void> {
    const storePath = this.getStorePath();
    if (!storePath) {
      return;
    }

    const adapter = this.plugin.app.vault.adapter;
    const dataDir = storePath.replace(/\/[^/]+$/, "");
    if (!(await adapter.exists(dataDir))) {
      await adapter.mkdir(dataDir);
    }

    let store: ZoomStateStoreFile = {};
    try {
      if (await adapter.exists(storePath)) {
        const raw = await adapter.read(storePath);
        store = JSON.parse(raw) as ZoomStateStoreFile;
      }
    } catch {
      store = {};
    }

    if (record === null) {
      delete store[file.path];
    } else {
      store[file.path] = record;
    }

    store = pruneZoomStateStore(store, {
      maxEntries: this.getMaxEntries(),
      keepPath: (path) =>
        this.plugin.app.vault.getAbstractFileByPath(path) != null,
    });

    if (Object.keys(store).length === 0) {
      if (await adapter.exists(storePath)) {
        await adapter.remove(storePath);
      }
      return;
    }

    await adapter.write(storePath, JSON.stringify(store, null, 2) + "\n");
  }
}
