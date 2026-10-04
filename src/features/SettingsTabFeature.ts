import { App, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";

import { Feature } from "./Feature";

import { t } from "../i18n";
import {
  HeaderWidthMode,
  ObsidianZoomPluginSettings,
  SettingsService,
} from "../services/SettingsService";

const ORIGINAL_PLUGIN_URL = "https://github.com/vslinko/obsidian-zoom";

type SettingKey = keyof ObsidianZoomPluginSettings;

const SETTING_KEYS = new Set<string>([
  "debug",
  "zoomOnClick",
  "recognizeUnorderedLists",
  "recognizeOrderedLists",
  "recognizeTaskLists",
  "renderMarkdown",
  "outlineItemMaxWidthPx",
  "showBreadcrumbsInDefaultMode",
  "trackCursorWhileZoomed",
  "historyMaxEntries",
  "headerWidthMode",
  "recordZoomState",
  "restoreZoomOnOpen",
  "zoomStateMaxEntries",
]);

function isSettingKey(key: string): key is SettingKey {
  return SETTING_KEYS.has(key);
}

class ObsidianZoomPluginSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    plugin: Plugin,
    private settings: SettingsService,
    private resetZoomStateRecords: () => Promise<void>
  ) {
    super(app, plugin);
  }

  /** Obsidian 1.13+: bind controls to SettingsService instead of plugin.settings. */
  getControlValue(key: string): unknown {
    if (!isSettingKey(key)) {
      return undefined;
    }
    return this.settings[key];
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    if (!isSettingKey(key)) {
      return;
    }

    switch (key) {
      case "debug":
      case "zoomOnClick":
      case "recognizeUnorderedLists":
      case "recognizeOrderedLists":
      case "recognizeTaskLists":
      case "renderMarkdown":
      case "showBreadcrumbsInDefaultMode":
      case "trackCursorWhileZoomed":
      case "recordZoomState":
      case "restoreZoomOnOpen":
        this.settings[key] = Boolean(value);
        break;
      case "outlineItemMaxWidthPx":
      case "historyMaxEntries":
      case "zoomStateMaxEntries":
        this.settings[key] = Number(value);
        break;
      case "headerWidthMode": {
        const mode: HeaderWidthMode = value === "page" ? "page" : "note";
        this.settings.headerWidthMode = mode;
        break;
      }
    }

    await this.settings.save();
  }

  /**
   * Obsidian 1.13+: declarative definitions for settings search.
   * Older hosts keep using display().
   */
  getSettingDefinitions() {
    return [
      {
        type: "group" as const,
        heading: t("settings.outlineLists"),
        items: [
          {
            name: t("settings.zoomOnClick"),
            control: { type: "toggle" as const, key: "zoomOnClick" },
          },
          {
            name: t("settings.recognizeUnordered"),
            desc: t("settings.recognizeUnorderedDesc"),
            control: {
              type: "toggle" as const,
              key: "recognizeUnorderedLists",
            },
          },
          {
            name: t("settings.recognizeOrdered"),
            desc: t("settings.recognizeOrderedDesc"),
            control: { type: "toggle" as const, key: "recognizeOrderedLists" },
          },
          {
            name: t("settings.recognizeTask"),
            desc: t("settings.recognizeTaskDesc"),
            control: { type: "toggle" as const, key: "recognizeTaskLists" },
          },
        ],
      },
      {
        type: "group" as const,
        heading: t("settings.outlineDisplay"),
        items: [
          {
            name: t("settings.headerWidth"),
            desc: t("settings.headerWidthDesc"),
            control: {
              type: "dropdown" as const,
              key: "headerWidthMode",
              defaultValue: "note",
              options: {
                note: t("settings.headerWidthNote"),
                page: t("settings.headerWidthPage"),
              },
            },
          },
          {
            name: t("settings.renderMarkdown"),
            desc: t("settings.renderMarkdownDesc"),
            control: { type: "toggle" as const, key: "renderMarkdown" },
          },
          {
            name: t("settings.showBreadcrumbsDefault"),
            desc: t("settings.showBreadcrumbsDefaultDesc"),
            control: {
              type: "toggle" as const,
              key: "showBreadcrumbsInDefaultMode",
            },
          },
          {
            name: t("settings.trackCursorZoomed"),
            desc: t("settings.trackCursorZoomedDesc"),
            control: {
              type: "toggle" as const,
              key: "trackCursorWhileZoomed",
            },
          },
          {
            name: t("settings.outlineItemMaxWidth"),
            desc: t("settings.outlineItemMaxWidthDesc"),
            control: {
              type: "number" as const,
              key: "outlineItemMaxWidthPx",
              min: 1,
              placeholder: "300",
            },
          },
        ],
      },
      {
        type: "group" as const,
        heading: t("settings.groupZoomState"),
        items: [
          {
            name: t("settings.recordZoomState"),
            desc: t("settings.recordZoomStateDesc"),
            control: { type: "toggle" as const, key: "recordZoomState" },
          },
          {
            name: t("settings.restoreZoomOnOpen"),
            desc: t("settings.restoreZoomOnOpenDesc"),
            control: { type: "toggle" as const, key: "restoreZoomOnOpen" },
          },
          {
            name: t("settings.zoomStateMaxEntries"),
            desc: t("settings.zoomStateMaxEntriesDesc"),
            control: {
              type: "number" as const,
              key: "zoomStateMaxEntries",
              min: 1,
              max: 5000,
              placeholder: "200",
            },
          },
          {
            name: t("settings.resetZoomStateRecords"),
            desc: t("settings.resetZoomStateRecordsDesc"),
            render: (setting: Setting) => {
              setting.addButton((button) => {
                button.setButtonText(t("settings.resetZoomStateRecordsButton"));
                button.onClick(() => {
                  void this.resetZoomStateRecords().then(() => {
                    new Notice(t("notice.zoomStateRecordsReset"));
                  });
                });
              });
            },
          },
        ],
      },
      {
        type: "group" as const,
        heading: t("settings.groupHistory"),
        items: [
          {
            name: t("settings.historyMaxEntries"),
            desc: t("settings.historyMaxEntriesDesc"),
            control: {
              type: "number" as const,
              key: "historyMaxEntries",
              min: 1,
              max: 500,
              placeholder: "50",
            },
          },
        ],
      },
      {
        type: "group" as const,
        heading: t("settings.groupAdvanced"),
        items: [
          {
            name: t("settings.debug"),
            desc: t("settings.debugDesc"),
            control: { type: "toggle" as const, key: "debug" },
          },
          {
            name: t("settings.sourceNote"),
            render: (setting: Setting) => {
              const link = setting.descEl.createEl("a", {
                cls: "external-link",
                text: t("settings.sourceLink"),
                href: ORIGINAL_PLUGIN_URL,
              });
              link.setAttr("target", "_blank");
              link.setAttr("rel", "noopener noreferrer");
            },
          },
        ],
      },
    ];
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    this.addHeading(t("settings.outlineLists"));

    new Setting(containerEl)
      .setName(t("settings.zoomOnClick"))
      .addToggle((toggle) => {
        toggle.setValue(this.settings.zoomOnClick).onChange(async (value) => {
          this.settings.zoomOnClick = value;
          await this.settings.save();
        });
      });

    new Setting(containerEl)
      .setName(t("settings.recognizeUnordered"))
      .setDesc(t("settings.recognizeUnorderedDesc"))
      .addToggle((toggle) => {
        toggle
          .setValue(this.settings.recognizeUnorderedLists)
          .onChange(async (value) => {
            this.settings.recognizeUnorderedLists = value;
            await this.settings.save();
          });
      });

    new Setting(containerEl)
      .setName(t("settings.recognizeOrdered"))
      .setDesc(t("settings.recognizeOrderedDesc"))
      .addToggle((toggle) => {
        toggle
          .setValue(this.settings.recognizeOrderedLists)
          .onChange(async (value) => {
            this.settings.recognizeOrderedLists = value;
            await this.settings.save();
          });
      });

    new Setting(containerEl)
      .setName(t("settings.recognizeTask"))
      .setDesc(t("settings.recognizeTaskDesc"))
      .addToggle((toggle) => {
        toggle
          .setValue(this.settings.recognizeTaskLists)
          .onChange(async (value) => {
            this.settings.recognizeTaskLists = value;
            await this.settings.save();
          });
      });

    this.addHeading(t("settings.outlineDisplay"));

    new Setting(containerEl)
      .setName(t("settings.headerWidth"))
      .setDesc(t("settings.headerWidthDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("note", t("settings.headerWidthNote"))
          .addOption("page", t("settings.headerWidthPage"))
          .setValue(this.settings.headerWidthMode)
          .onChange(async (value) => {
            this.settings.headerWidthMode = value === "page" ? "page" : "note";
            await this.settings.save();
          });
      });

    new Setting(containerEl)
      .setName(t("settings.renderMarkdown"))
      .setDesc(t("settings.renderMarkdownDesc"))
      .addToggle((toggle) => {
        toggle
          .setValue(this.settings.renderMarkdown)
          .onChange(async (value) => {
            this.settings.renderMarkdown = value;
            await this.settings.save();
          });
      });

    new Setting(containerEl)
      .setName(t("settings.showBreadcrumbsDefault"))
      .setDesc(t("settings.showBreadcrumbsDefaultDesc"))
      .addToggle((toggle) => {
        toggle
          .setValue(this.settings.showBreadcrumbsInDefaultMode)
          .onChange(async (value) => {
            this.settings.showBreadcrumbsInDefaultMode = value;
            await this.settings.save();
          });
      });

    new Setting(containerEl)
      .setName(t("settings.trackCursorZoomed"))
      .setDesc(t("settings.trackCursorZoomedDesc"))
      .addToggle((toggle) => {
        toggle
          .setValue(this.settings.trackCursorWhileZoomed)
          .onChange(async (value) => {
            this.settings.trackCursorWhileZoomed = value;
            await this.settings.save();
          });
      });

    new Setting(containerEl)
      .setName(t("settings.outlineItemMaxWidth"))
      .setDesc(t("settings.outlineItemMaxWidthDesc"))
      .addText((text) => {
        text
          .setPlaceholder("300")
          .setValue(String(this.settings.outlineItemMaxWidthPx))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            if (Number.isNaN(parsed) || parsed < 1) {
              return;
            }
            this.settings.outlineItemMaxWidthPx = parsed;
            await this.settings.save();
          });
      });

    this.addHeading(t("settings.groupZoomState"));

    new Setting(containerEl)
      .setName(t("settings.recordZoomState"))
      .setDesc(t("settings.recordZoomStateDesc"))
      .addToggle((toggle) => {
        toggle
          .setValue(this.settings.recordZoomState)
          .onChange(async (value) => {
            this.settings.recordZoomState = value;
            await this.settings.save();
          });
      });

    new Setting(containerEl)
      .setName(t("settings.restoreZoomOnOpen"))
      .setDesc(t("settings.restoreZoomOnOpenDesc"))
      .addToggle((toggle) => {
        toggle
          .setValue(this.settings.restoreZoomOnOpen)
          .onChange(async (value) => {
            this.settings.restoreZoomOnOpen = value;
            await this.settings.save();
          });
      });

    new Setting(containerEl)
      .setName(t("settings.zoomStateMaxEntries"))
      .setDesc(t("settings.zoomStateMaxEntriesDesc"))
      .addText((text) => {
        text
          .setPlaceholder("200")
          .setValue(String(this.settings.zoomStateMaxEntries))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            if (Number.isNaN(parsed) || parsed < 1) {
              return;
            }
            this.settings.zoomStateMaxEntries = Math.min(parsed, 5000);
            await this.settings.save();
          });
      });

    new Setting(containerEl)
      .setName(t("settings.resetZoomStateRecords"))
      .setDesc(t("settings.resetZoomStateRecordsDesc"))
      .addButton((button) => {
        button.setButtonText(t("settings.resetZoomStateRecordsButton"));
        button.onClick(() => {
          void this.resetZoomStateRecords().then(() => {
            new Notice(t("notice.zoomStateRecordsReset"));
          });
        });
      });

    this.addHeading(t("settings.groupHistory"));

    new Setting(containerEl)
      .setName(t("settings.historyMaxEntries"))
      .setDesc(t("settings.historyMaxEntriesDesc"))
      .addText((text) => {
        text
          .setPlaceholder("50")
          .setValue(String(this.settings.historyMaxEntries))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            if (Number.isNaN(parsed) || parsed < 1) {
              return;
            }
            this.settings.historyMaxEntries = Math.min(parsed, 500);
            await this.settings.save();
          });
      });

    this.addHeading(t("settings.groupAdvanced"));

    new Setting(containerEl)
      .setName(t("settings.debug"))
      .setDesc(t("settings.debugDesc"))
      .addToggle((toggle) => {
        toggle.setValue(this.settings.debug).onChange(async (value) => {
          this.settings.debug = value;
          await this.settings.save();
        });
      });

    this.renderSourceFooter();
  }

  private addHeading(text: string) {
    new Setting(this.containerEl).setName(text).setHeading();
  }

  private renderSourceFooter() {
    const footer = this.containerEl.createDiv({
      cls: "zoom-plugin-settings-source",
    });

    footer.createDiv({
      cls: "zoom-plugin-settings-source__note",
      text: t("settings.sourceNote"),
    });

    const link = footer.createEl("a", {
      cls: "external-link",
      text: t("settings.sourceLink"),
      href: ORIGINAL_PLUGIN_URL,
    });
    link.setAttr("target", "_blank");
    link.setAttr("rel", "noopener noreferrer");
  }
}

export class SettingsTabFeature implements Feature {
  constructor(
    private plugin: Plugin,
    private settings: SettingsService,
    private resetZoomStateRecords: () => Promise<void>
  ) {}

  async load() {
    this.plugin.addSettingTab(
      new ObsidianZoomPluginSettingTab(
        this.plugin.app,
        this.plugin,
        this.settings,
        this.resetZoomStateRecords
      )
    );
  }

  async unload() {}
}
