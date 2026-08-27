import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

import { Feature } from "./Feature";

import { SettingsService } from "../services/SettingsService";

class ObsidianZoomPluginSettingTab extends PluginSettingTab {
  constructor(app: App, plugin: Plugin, private settings: SettingsService) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Zooming in when clicking on the bullet")
      .addToggle((toggle) => {
        toggle.setValue(this.settings.zoomOnClick).onChange(async (value) => {
          this.settings.zoomOnClick = value;
          await this.settings.save();
        });
      });

    new Setting(containerEl)
      .setName("Outline submenu close delay")
      .setDesc(
        "Milliseconds to wait before closing outline submenus after the mouse leaves."
      )
      .addText((text) => {
        text
          .setPlaceholder("400")
          .setValue(String(this.settings.outlineSubmenuCloseDelayMs))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            if (Number.isNaN(parsed) || parsed < 0) {
              return;
            }
            this.settings.outlineSubmenuCloseDelayMs = parsed;
            await this.settings.save();
          });
      });

    containerEl.createEl("h3", { text: "Outline lists" });

    new Setting(containerEl)
      .setName("Recognize unordered lists")
      .setDesc("Include unordered list items (-, *, +) in the outline.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.settings.recognizeUnorderedLists)
          .onChange(async (value) => {
            this.settings.recognizeUnorderedLists = value;
            await this.settings.save();
          });
      });

    new Setting(containerEl)
      .setName("Recognize ordered lists")
      .setDesc("Include ordered list items (1., 2., ...) in the outline.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.settings.recognizeOrderedLists)
          .onChange(async (value) => {
            this.settings.recognizeOrderedLists = value;
            await this.settings.save();
          });
      });

    new Setting(containerEl)
      .setName("Recognize task lists")
      .setDesc("Include task list items (- [ ], - [x]) in the outline.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.settings.recognizeTaskLists)
          .onChange(async (value) => {
            this.settings.recognizeTaskLists = value;
            await this.settings.save();
          });
      });

    containerEl.createEl("h3", { text: "Outline display" });

    new Setting(containerEl)
      .setName("Render markdown in outline titles")
      .setDesc(
        "Render inline markdown (bold, links, etc.) in breadcrumb and menu titles."
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.settings.renderMarkdown)
          .onChange(async (value) => {
            this.settings.renderMarkdown = value;
            await this.settings.save();
          });
      });

    new Setting(containerEl)
      .setName("Outline item max width")
      .setDesc(
        "Maximum width of outline titles in pixels. Longer text is truncated with an ellipsis."
      )
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

    new Setting(containerEl)
      .setName("Debug mode")
      .setDesc(
        "Open DevTools (Command+Option+I or Control+Shift+I) to copy the debug logs."
      )
      .addToggle((toggle) => {
        toggle.setValue(this.settings.debug).onChange(async (value) => {
          this.settings.debug = value;
          await this.settings.save();
        });
      });
  }
}

export class SettingsTabFeature implements Feature {
  constructor(private plugin: Plugin, private settings: SettingsService) {}

  async load() {
    this.plugin.addSettingTab(
      new ObsidianZoomPluginSettingTab(
        this.plugin.app,
        this.plugin,
        this.settings
      )
    );
  }

  async unload() {}
}
