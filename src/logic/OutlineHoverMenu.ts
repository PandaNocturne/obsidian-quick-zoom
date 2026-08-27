import { Menu, MenuItem } from "obsidian";

import { EditorView } from "@codemirror/view";

import { SiblingItem, collectSiblings, outlineIcon } from "./CollectSiblings";

export interface OutlineHoverMenuContext {
  view: EditorView;
  selectedPath: Set<number>;
  zoomIn: (view: EditorView, pos: number) => void;
  zoomOut: (view: EditorView) => void;
  getSubmenuCloseDelayMs: () => number;
}

export class OutlineHoverMenu {
  /** Index = depth; root menu at 0 */
  private menuStack: (Menu | null)[] = [];
  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  showAtMouseEvent(
    event: MouseEvent,
    items: SiblingItem[],
    ctx: OutlineHoverMenuContext,
    options?: { includeExitZoom?: boolean }
  ) {
    this.hideAll();

    const root = new Menu();
    root.setUseNativeMenu?.(false);
    this.menuStack = [root];

    if (options?.includeExitZoom) {
      root.addItem((item) => {
        item.setTitle("退出缩放");
        item.setIcon("zoom-out");
        item.onClick(() => {
          this.hideAll();
          ctx.zoomOut(ctx.view);
        });
      });
      root.addSeparator();
    }

    this.populateMenu(root, items, ctx, 0);
    root.showAtMouseEvent(event);
    this.bindMenuHover(root, ctx, 0);
  }

  private populateMenu(
    menu: Menu,
    items: SiblingItem[],
    ctx: OutlineHoverMenuContext,
    depth: number
  ) {
    for (const outlineItem of items) {
      menu.addItem((item) => {
        item.setTitle(outlineItem.title || "(empty)");
        item.setIcon(outlineIcon(outlineItem));
        item.setChecked(ctx.selectedPath.has(outlineItem.pos));
        item.onClick(() => {
          this.hideAll();
          ctx.zoomIn(ctx.view, outlineItem.pos);
        });

        const children = collectSiblings(ctx.view.state, outlineItem.pos);
        if (children.length > 0) {
          item.dom.addClass("menu-item-has-submenu");
          this.bindItemSubmenuHover(item, children, ctx, depth);
        }
      });
    }
  }

  private bindItemSubmenuHover(
    item: MenuItem,
    children: SiblingItem[],
    ctx: OutlineHoverMenuContext,
    depth: number
  ) {
    item.dom.addEventListener("mouseenter", () => {
      this.cancelClose();
      this.openSubmenu(item.dom, children, ctx, depth + 1);
    });
  }

  private bindMenuHover(
    menu: Menu,
    ctx: OutlineHoverMenuContext,
    depth: number
  ) {
    menu.dom.addEventListener("mouseenter", () => this.cancelClose());
    menu.dom.addEventListener("mouseleave", () =>
      this.scheduleClose(ctx.getSubmenuCloseDelayMs())
    );
  }

  private openSubmenu(
    anchor: HTMLElement,
    items: SiblingItem[],
    ctx: OutlineHoverMenuContext,
    depth: number
  ) {
    this.closeFromDepth(depth);

    const submenu = new Menu();
    submenu.setUseNativeMenu?.(false);
    this.menuStack[depth] = submenu;

    this.populateMenu(submenu, items, ctx, depth);
    this.bindMenuHover(submenu, ctx, depth);

    const rect = anchor.getBoundingClientRect();
    submenu.showAtPosition({ x: rect.right - 2, y: rect.top });
  }

  private closeFromDepth(depth: number) {
    for (let i = depth; i < this.menuStack.length; i++) {
      this.menuStack[i]?.hide();
      this.menuStack[i] = null;
    }
    this.menuStack.length = depth;
  }

  private scheduleClose(delayMs: number) {
    this.cancelClose();
    this.closeTimer = setTimeout(() => this.hideAll(), delayMs);
  }

  private cancelClose() {
    if (this.closeTimer !== null) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  hideAll() {
    this.cancelClose();
    for (const menu of this.menuStack) {
      menu?.hide();
    }
    this.menuStack = [];
  }
}
