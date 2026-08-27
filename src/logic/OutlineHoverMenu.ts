import { App, Component, Menu, MenuItem } from "obsidian";

import { EditorView } from "@codemirror/view";

import {
  SiblingItem,
  collectSiblings,
  outlineIcon,
  outlineIconColorClass,
} from "./CollectSiblings";
import { renderOutlineTitle } from "./utils/renderOutlineTitle";

export interface OutlineHoverMenuContext {
  view: EditorView;
  selectedPath: Set<number>;
  zoomIn: (view: EditorView, pos: number) => void;
  zoomOut: (view: EditorView) => void;
  getSubmenuCloseDelayMs: () => number;
  renderMarkdown: boolean;
  itemMaxWidthPx: number;
  app: App;
  sourcePath: string;
  component: Component;
  getListOptions: () => {
    recognizeUnorderedLists: boolean;
    recognizeOrderedLists: boolean;
    recognizeTaskLists: boolean;
  };
  onMenuClose?: () => void;
}

const CONTAINS_PATCHED = "zoomOutlineContainsPatched";

export class OutlineHoverMenu {
  /** menus[0] = root, menus[1] = first submenu, ... */
  private menus: Menu[] = [];
  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  private expandedChevrons = new Map<number, HTMLElement>();
  private outsideClickHandler: ((e: MouseEvent) => void) | null = null;
  private onMenuClose: (() => void) | null = null;

  showAtMouseEvent(
    event: MouseEvent,
    items: SiblingItem[],
    ctx: OutlineHoverMenuContext,
    options?: { includeExitZoom?: boolean }
  ) {
    this.hideAll();

    this.onMenuClose = ctx.onMenuClose ?? null;

    const root = this.createMenuPanel(0);
    this.menus = [root];

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
    this.installMenuTreeContains();
    this.bindOutsideClick();
  }

  private createMenuPanel(depth: number): Menu {
    const menu = new Menu();
    menu.setUseNativeMenu?.(false);
    menu.dom.addClass("zoom-plugin-outline-menu");
    menu.dom.style.zIndex = String(1000 + depth);
    return menu;
  }

  private populateMenu(
    menu: Menu,
    items: SiblingItem[],
    ctx: OutlineHoverMenuContext,
    depth: number
  ) {
    for (const outlineItem of items) {
      menu.addItem((item) => {
        this.renderMenuItemTitle(item, outlineItem.title, ctx);
        item.setIcon(outlineIcon(outlineItem));
        this.applyOutlineIconStyle(item, outlineItem);
        if (ctx.selectedPath.has(outlineItem.pos)) {
          item.dom.addClass("selected");
        }
        item.onClick(() => {
          this.hideAll();
          ctx.zoomIn(ctx.view, outlineItem.pos);
        });

        const children = collectSiblings(
          ctx.view.state,
          outlineItem.pos,
          ctx.getListOptions()
        );
        if (children.length > 0) {
          this.bindChevronSubmenu(item, children, ctx, depth);
        }
      });
    }
  }

  private applyOutlineIconStyle(
    item: MenuItem,
    target: Pick<SiblingItem, "kind">
  ) {
    const iconEl = item.dom.querySelector(".menu-item-icon");
    if (iconEl instanceof HTMLElement) {
      iconEl.addClass(outlineIconColorClass(target));
    }
  }

  private renderMenuItemTitle(
    item: MenuItem,
    title: string,
    ctx: OutlineHoverMenuContext
  ) {
    item.setTitle("");
    const titleEl = item.dom.querySelector(".menu-item-title");
    if (!(titleEl instanceof HTMLElement)) {
      item.setTitle(title || "(empty)");
      return;
    }

    titleEl.addClass("zoom-plugin-outline-title");
    titleEl.style.maxWidth = `${ctx.itemMaxWidthPx}px`;
    renderOutlineTitle(titleEl, title, {
      renderMarkdown: ctx.renderMarkdown,
      app: ctx.app,
      sourcePath: ctx.sourcePath,
      component: ctx.component,
    });
  }

  private bindChevronSubmenu(
    item: MenuItem,
    children: SiblingItem[],
    ctx: OutlineHoverMenuContext,
    parentDepth: number
  ) {
    item.dom.addClass("menu-item-has-submenu");

    const chevron = item.dom.createDiv({
      cls: "zoom-plugin-outline-chevron",
      text: "›",
      attr: { "aria-label": "展开/折叠子菜单" },
    });

    const submenuDepth = parentDepth + 1;

    chevron.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.cancelClose();
      this.toggleSubmenu(chevron, children, ctx, submenuDepth);
    });
  }

  private toggleSubmenu(
    anchor: HTMLElement,
    items: SiblingItem[],
    ctx: OutlineHoverMenuContext,
    depth: number
  ) {
    if (this.expandedChevrons.get(depth) === anchor && this.menus[depth]) {
      this.setChevronExpanded(anchor, depth, false);
      this.closeFromDepth(depth);
      return;
    }

    this.openSubmenu(anchor, items, ctx, depth);
  }

  private setChevronExpanded(
    chevron: HTMLElement,
    depth: number,
    expanded: boolean
  ) {
    chevron.toggleClass("is-expanded", expanded);
    if (expanded) {
      this.expandedChevrons.set(depth, chevron);
    } else {
      this.expandedChevrons.delete(depth);
    }
  }

  private clearExpandedFromDepth(depth: number) {
    for (const [d, chevron] of this.expandedChevrons) {
      if (d >= depth) {
        chevron.toggleClass("is-expanded", false);
        this.expandedChevrons.delete(d);
      }
    }
  }

  /**
   * Obsidian closes parent menus when a sibling menu opens unless the parent
   * dom.contains() includes descendant menu panels (see Quick Explorer).
   */
  private installMenuTreeContains() {
    for (let i = 0; i < this.menus.length; i++) {
      const menu = this.menus[i];
      const dom = menu.dom as HTMLElement & {
        [CONTAINS_PATCHED]?: boolean;
      };
      if (dom[CONTAINS_PATCHED]) {
        continue;
      }

      const originalContains = dom.contains.bind(dom);
      dom.contains = (target: Node) => {
        if (originalContains(target)) {
          return true;
        }
        for (let j = i + 1; j < this.menus.length; j++) {
          if (this.menus[j].dom.contains(target)) {
            return true;
          }
        }
        return false;
      };
      dom[CONTAINS_PATCHED] = true;
    }
  }

  private bindMenuHover(
    menu: Menu,
    ctx: OutlineHoverMenuContext,
    depth: number
  ) {
    menu.dom.addEventListener("mouseenter", () => this.cancelClose());
    menu.dom.addEventListener("mouseleave", (e) => {
      const related = e.relatedTarget as Node | null;
      if (this.isNodeInMenuTree(related)) {
        this.cancelClose();
        return;
      }

      if (this.hasOpenSubmenu() && depth < this.deepestOpenDepth()) {
        return;
      }

      this.scheduleClose(ctx.getSubmenuCloseDelayMs(), e.clientX, e.clientY);
    });
  }

  private bindOutsideClick() {
    this.unbindOutsideClick();
    this.outsideClickHandler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!this.isNodeInMenuTree(target)) {
        this.hideAll();
      }
    };
    document.addEventListener("mousedown", this.outsideClickHandler, true);
  }

  private unbindOutsideClick() {
    if (this.outsideClickHandler) {
      document.removeEventListener("mousedown", this.outsideClickHandler, true);
      this.outsideClickHandler = null;
    }
  }

  private deepestOpenDepth(): number {
    return this.menus.length - 1;
  }

  private hasOpenSubmenu(): boolean {
    return this.menus.length > 1;
  }

  private isNodeInMenuTree(node: Node | null): boolean {
    if (!node) {
      return false;
    }
    for (const menu of this.menus) {
      if (menu.dom.contains(node)) {
        return true;
      }
    }
    return false;
  }

  private isPointerOverMenuTree(clientX?: number, clientY?: number): boolean {
    for (const menu of this.menus) {
      if (menu.dom.matches(":hover") || menu.dom.querySelector(":hover")) {
        return true;
      }
    }

    if (
      clientX !== undefined &&
      clientY !== undefined &&
      typeof document !== "undefined"
    ) {
      const under = document.elementFromPoint(clientX, clientY);
      if (under && this.isNodeInMenuTree(under)) {
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
    this.closeFromDepth(depth);

    const submenu = this.createMenuPanel(depth);
    this.menus[depth] = submenu;

    this.populateMenu(submenu, items, ctx, depth);
    this.bindMenuHover(submenu, ctx, depth);

    const rect = anchor.getBoundingClientRect();
    submenu.showAtPosition({ x: rect.right - 2, y: rect.top });
    this.setChevronExpanded(anchor, depth, true);
    this.installMenuTreeContains();
    this.ensureAncestorsVisible(depth);
  }

  /** Keep ancestor panels attached when deeper submenus open. */
  private ensureAncestorsVisible(upToDepth: number) {
    for (let i = 0; i < upToDepth; i++) {
      const menu = this.menus[i];
      if (!menu.dom.isConnected) {
        document.body.appendChild(menu.dom);
      }
      menu.dom.style.display = "";
    }
  }

  private closeFromDepth(depth: number) {
    for (let i = depth; i < this.menus.length; i++) {
      this.menus[i]?.hide();
    }
    this.menus.length = depth;
    this.clearExpandedFromDepth(depth);
  }

  private scheduleClose(delayMs: number, clientX?: number, clientY?: number) {
    this.cancelClose();
    this.closeTimer = setTimeout(() => {
      this.closeTimer = null;
      if (this.isPointerOverMenuTree(clientX, clientY)) {
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
    this.unbindOutsideClick();
    this.clearExpandedFromDepth(0);
    for (let i = this.menus.length - 1; i >= 0; i--) {
      this.menus[i]?.hide();
    }
    this.menus = [];
    this.onMenuClose?.();
    this.onMenuClose = null;
  }
}
