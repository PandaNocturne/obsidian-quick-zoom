import { App, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";

import { Feature } from "./Feature";

import { t } from "../i18n";
import { SettingsService } from "../services/SettingsService";

const ORIGINAL_PLUGIN_URL = "https://github.com/vslinko/obsidian-zoom";

class ObsidianZoomPluginSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    plugin: Plugin,
    private settings: SettingsService,
    private resetZoomStateRecords: () => Promise<void>
  ) {
    super(app, plugin);
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
