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
