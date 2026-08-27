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
  private expandedChevron: HTMLElement | null = null;
  private expandedDepth: number | null = null;

  showAtMouseEvent(
    event: MouseEvent,
    items: SiblingItem[],
    ctx: OutlineHoverMenuContext,
    options?: { includeExitZoom?: boolean }
  ) {
    this.hideAll();

    const root = new Menu();
    root.setUseNativeMenu?.(false);
    root.dom.addClass("zoom-plugin-outline-menu");
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
    this.bindMenuHover(root, ctx);
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
        if (ctx.selectedPath.has(outlineItem.pos)) {
          item.dom.addClass("selected");
        }
        item.onClick(() => {
          this.hideAll();
          ctx.zoomIn(ctx.view, outlineItem.pos);
        });

        const children = collectSiblings(ctx.view.state, outlineItem.pos);
        if (children.length > 0) {
          this.bindChevronSubmenu(item, children, ctx, depth);
        }
      });
    }
  }

  private bindChevronSubmenu(
    item: MenuItem,
    children: SiblingItem[],
    ctx: OutlineHoverMenuContext,
    depth: number
  ) {
    item.dom.addClass("menu-item-has-submenu");

    const chevron = item.dom.createDiv({
      cls: "zoom-plugin-outline-chevron",
      text: "›",
      attr: { "aria-label": "展开/折叠子菜单" },
    });

    chevron.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.cancelClose();
      this.toggleSubmenu(chevron, children, ctx, depth + 1);
    });
  }

  private toggleSubmenu(
    anchor: HTMLElement,
    items: SiblingItem[],
    ctx: OutlineHoverMenuContext,
    depth: number
  ) {
    if (this.expandedChevron === anchor && this.menuStack[depth]) {
      this.setChevronExpanded(anchor, false);
      this.closeFromDepth(depth);
      return;
    }

    this.openSubmenu(anchor, items, ctx, depth);
  }

  private setChevronExpanded(
    chevron: HTMLElement,
    expanded: boolean,
    depth?: number
  ) {
    chevron.toggleClass("is-expanded", expanded);
    if (expanded) {
      this.expandedChevron = chevron;
      this.expandedDepth = depth ?? this.expandedDepth;
    } else if (this.expandedChevron === chevron) {
      this.expandedChevron = null;
      this.expandedDepth = null;
    }
  }

  private bindMenuHover(menu: Menu, ctx: OutlineHoverMenuContext) {
    menu.dom.addEventListener("mouseenter", () => this.cancelClose());
    menu.dom.addEventListener("mouseleave", () =>
      this.scheduleClose(ctx.getSubmenuCloseDelayMs())
    );
  }

  /** True while the pointer is over any open outline menu panel. */
  private isPointerOverMenuTree(): boolean {
    for (const menu of this.menuStack) {
      if (!menu) {
        continue;
      }
      if (menu.dom.matches(":hover") || menu.dom.querySelector(":hover")) {
        return true;
      }
    }
    return false;
  }

  private openSubmenu(
    anchor: HTMLElement,
    items: SiblingItem[],
    ctx: OutlineHoverMenuContext,
    depth: number
  ) {
    if (this.expandedChevron && this.expandedChevron !== anchor) {
      this.setChevronExpanded(this.expandedChevron, false);
    }

    this.closeFromDepth(depth);

    const submenu = new Menu();
    submenu.setUseNativeMenu?.(false);
    submenu.dom.addClass("zoom-plugin-outline-menu");
    this.menuStack[depth] = submenu;

    this.populateMenu(submenu, items, ctx, depth);
    this.bindMenuHover(submenu, ctx);

    const rect = anchor.getBoundingClientRect();
    submenu.showAtPosition({ x: rect.right - 2, y: rect.top });
    this.setChevronExpanded(anchor, true, depth);
  }

  private closeFromDepth(depth: number) {
    for (let i = depth; i < this.menuStack.length; i++) {
      this.menuStack[i]?.hide();
      this.menuStack[i] = null;
    }
    this.menuStack.length = depth;

    if (this.expandedDepth !== null && depth <= this.expandedDepth) {
      if (this.expandedChevron) {
        this.setChevronExpanded(this.expandedChevron, false);
      }
    }
  }

  private scheduleClose(delayMs: number) {
    this.cancelClose();
    this.closeTimer = setTimeout(() => {
      this.closeTimer = null;
      if (this.isPointerOverMenuTree()) {
        return;
      }
      this.hideAll();
    }, delayMs);
  }

  private cancelClose() {
    if (this.closeTimer !== null) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  hideAll() {
    this.cancelClose();
    if (this.expandedChevron) {
      this.setChevronExpanded(this.expandedChevron, false);
    }
    for (const menu of this.menuStack) {
      menu?.hide();
    }
    this.menuStack = [];
  }
}
