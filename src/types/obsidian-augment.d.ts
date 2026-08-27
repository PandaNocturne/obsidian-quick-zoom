import "obsidian";

declare module "obsidian" {
  interface MenuItem {
    dom: HTMLElement;
  }

  interface Menu {
    dom: HTMLElement;
    setUseNativeMenu?(useNativeMenu: boolean): this;
  }
}
