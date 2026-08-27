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

function appendTitleIcon(container: HTMLElement, item: OutlineIconTarget) {
  const iconSpan = container.ownerDocument.createElement("span");
  iconSpan.className = `zoom-plugin-title-icon ${outlineIconColorClass(item)}`;
  iconSpan.setAttribute("aria-hidden", "true");
  setIcon(iconSpan, outlineIconName(item));
  container.appendChild(iconSpan);
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
    renderOptions: RenderHeaderOptions;
  }
) {
  const {
    breadcrumbs,
    onClick,
    onDoubleClick,
    onDelimiterClick,
    renderOptions,
  } = ctx;

  const h = doc.createElement("div");
  h.classList.add("zoom-plugin-header");

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

    h.appendChild(crumb);
  }

  return h;
}
