import {
  RenderOutlineTitleOptions,
  renderOutlineTitle,
} from "./renderOutlineTitle";

import { SiblingItem } from "../CollectSiblings";

export interface BreadcrumbHeaderItem {
  title: string;
  pos: number | null;
  siblings?: SiblingItem[];
}

export interface RenderHeaderOptions extends RenderOutlineTitleOptions {
  itemMaxWidthPx: number;
}

export function renderHeader(
  doc: Document,
  ctx: {
    breadcrumbs: BreadcrumbHeaderItem[];
    onClick: (
      pos: number | null,
      event: MouseEvent,
      siblings: SiblingItem[]
    ) => void;
    renderOptions: RenderHeaderOptions;
  }
) {
  const { breadcrumbs, onClick, renderOptions } = ctx;

  const h = doc.createElement("div");
  h.classList.add("zoom-plugin-header");

  for (let i = 0; i < breadcrumbs.length; i++) {
    if (i > 0) {
      const d = doc.createElement("span");
      d.classList.add("zoom-plugin-delimiter");
      d.textContent = ">";
      h.append(d);
    }

    const breadcrumb = breadcrumbs[i];
    const siblings = breadcrumb.siblings ?? [];

    const b = doc.createElement("a");
    b.classList.add("zoom-plugin-title");
    if (siblings.length > 0) {
      b.classList.add("zoom-plugin-title-has-siblings");
    }
    b.dataset.pos = String(breadcrumb.pos);
    b.href = "#";

    const titleSpan = doc.createElement("span");
    titleSpan.classList.add("zoom-plugin-title-text");
    titleSpan.style.maxWidth = `${renderOptions.itemMaxWidthPx}px`;
    renderOutlineTitle(titleSpan, breadcrumb.title, renderOptions);
    b.appendChild(titleSpan);

    if (siblings.length > 0) {
      const chevron = doc.createElement("span");
      chevron.classList.add("zoom-plugin-title-chevron");
      chevron.setAttribute("aria-hidden", "true");
      chevron.textContent = "▾";
      b.appendChild(chevron);
    }

    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick(breadcrumb.pos, e, siblings);
    });
    h.appendChild(b);
  }

  return h;
}
