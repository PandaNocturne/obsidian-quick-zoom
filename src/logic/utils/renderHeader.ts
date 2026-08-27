import { setIcon } from "obsidian";

import {
  RenderOutlineTitleOptions,
  renderOutlineTitle,
} from "./renderOutlineTitle";

import { Breadcrumb } from "../CollectBreadcrumbs";
import {
  OutlineIconTarget,
  SiblingItem,
  outlineIconColorClass,
  outlineIconName,
} from "../CollectSiblings";

export interface RenderHeaderOptions extends RenderOutlineTitleOptions {
  itemMaxWidthPx: number;
}

export interface HeaderHistoryControls {
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
}

function appendTitleIcon(container: HTMLElement, item: OutlineIconTarget) {
  const iconSpan = container.ownerDocument.createElement("span");
  iconSpan.className = `zoom-plugin-title-icon ${outlineIconColorClass(item)}`;
  iconSpan.setAttribute("aria-hidden", "true");
  setIcon(iconSpan, outlineIconName(item));
  container.appendChild(iconSpan);
}

function appendHistoryButton(
  container: HTMLElement,
  options: {
    icon: string;
    label: string;
    disabled: boolean;
    onClick: () => void;
  }
) {
  const button = container.ownerDocument.createElement("button");
  button.type = "button";
  button.className = "zoom-plugin-history-btn clickable-icon";
  button.setAttribute("aria-label", options.label);
  button.disabled = options.disabled;
  if (options.disabled) {
    button.addClass("is-disabled");
  }
  setIcon(button, options.icon);
  button.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!options.disabled) {
      options.onClick();
    }
  });
  container.appendChild(button);
}

export function renderHeader(
  doc: Document,
  ctx: {
    breadcrumbs: Breadcrumb[];
    onClick: (
      pos: number | null,
      event: MouseEvent,
      siblings: SiblingItem[]
    ) => void;
    onDoubleClick?: (
      pos: number | null,
      event: MouseEvent,
      siblings: SiblingItem[]
    ) => void;
    onDelimiterClick?: (
      pos: number | null,
      event: MouseEvent,
      children: SiblingItem[]
    ) => void;
    history?: HeaderHistoryControls;
    renderOptions: RenderHeaderOptions;
  }
) {
  const {
    breadcrumbs,
    onClick,
    onDoubleClick,
    onDelimiterClick,
    history,
    renderOptions,
  } = ctx;

  const h = doc.createElement("div");
  h.classList.add("zoom-plugin-header");

  const trail = doc.createElement("div");
  trail.classList.add("zoom-plugin-header-trail");

  for (let i = 0; i < breadcrumbs.length; i++) {
    const breadcrumb = breadcrumbs[i];
    const siblings = breadcrumb.siblings ?? [];
    const children = breadcrumb.children ?? [];
    const isDocument = breadcrumb.kind === "document";
    const isLast = i === breadcrumbs.length - 1;

    const crumb = doc.createElement("span");
    crumb.classList.add("zoom-plugin-crumb");
    if (isLast) {
      crumb.classList.add("zoom-plugin-crumb--last");
    }

    const b = doc.createElement("a");
    b.classList.add("zoom-plugin-title");
    if (isDocument) {
      b.classList.add("zoom-plugin-title--document");
    }
    if (siblings.length > 0) {
      b.classList.add("zoom-plugin-title-has-siblings");
    }
    b.dataset.pos = String(breadcrumb.pos);
    b.href = "#";
    b.setAttribute("aria-label", breadcrumb.title);

    appendTitleIcon(b, breadcrumb);

    if (!isDocument) {
      const titleSpan = doc.createElement("span");
      titleSpan.classList.add("zoom-plugin-title-text");
      titleSpan.style.maxWidth = `${renderOptions.itemMaxWidthPx}px`;
      renderOutlineTitle(titleSpan, breadcrumb.title, renderOptions);
      b.appendChild(titleSpan);
    }

    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick(breadcrumb.pos, e, siblings);
    });

    if (onDoubleClick) {
      b.addEventListener("dblclick", (e) => {
        e.preventDefault();
        e.stopPropagation();
        onDoubleClick(breadcrumb.pos, e, siblings);
      });
    }

    crumb.appendChild(b);

    const d = doc.createElement("span");
    d.classList.add("zoom-plugin-delimiter");
    if (isLast) {
      d.classList.add("zoom-plugin-delimiter--trailing");
    }
    if (children.length > 0) {
      d.classList.add("zoom-plugin-delimiter--clickable");
      d.setAttribute("role", "button");
      d.setAttribute("aria-label", "展开子菜单");
      d.tabIndex = 0;
      d.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        onDelimiterClick?.(breadcrumb.pos, e, children);
      });
    } else {
      d.setAttribute("aria-hidden", "true");
    }
    setIcon(d, "chevron-right");
    crumb.appendChild(d);

    trail.appendChild(crumb);
  }

  h.appendChild(trail);

  if (history) {
    const historyEl = doc.createElement("div");
    historyEl.classList.add("zoom-plugin-header-history");

    appendHistoryButton(historyEl, {
      icon: "arrow-left",
      label: "后退到上一次缩放",
      disabled: !history.canGoBack,
      onClick: history.onBack,
    });

    appendHistoryButton(historyEl, {
      icon: "arrow-right",
      label: "前进到下一次缩放",
      disabled: !history.canGoForward,
      onClick: history.onForward,
    });

    h.appendChild(historyEl);
  }

  return h;
}
