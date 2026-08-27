export interface BreadcrumbHeaderItem {
  title: string;
  pos: number | null;
  siblings?: Array<{ title: string; pos: number }>;
}

export function renderHeader(
  doc: Document,
  ctx: {
    breadcrumbs: BreadcrumbHeaderItem[];
    onClick: (
      pos: number | null,
      event: MouseEvent,
      siblings: Array<{ title: string; pos: number }>
    ) => void;
  }
) {
  const { breadcrumbs, onClick } = ctx;

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
    const hasSiblingMenu = siblings.length > 1;

    const b = doc.createElement("a");
    b.classList.add("zoom-plugin-title");
    if (hasSiblingMenu) {
      b.classList.add("zoom-plugin-title-has-siblings");
    }
    b.dataset.pos = String(breadcrumb.pos);
    b.href = "#";
    b.appendChild(doc.createTextNode(breadcrumb.title));

    if (hasSiblingMenu) {
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
