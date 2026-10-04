import { setIcon } from "obsidian";

import {
  RenderOutlineTitleOptions,
  renderOutlineTitle,
} from "./renderOutlineTitle";

import { t } from "../../i18n";
import type { HeaderWidthMode } from "../../services/SettingsService";
import { Breadcrumb } from "../CollectBreadcrumbs";
import {
  OutlineIconTarget,
  SiblingItem,
  outlineIconColorClass,
  outlineIconName,
} from "../CollectSiblings";

export interface RenderHeaderOptions extends RenderOutlineTitleOptions {
  itemMaxWidthPx: number;
  headerWidthMode?: HeaderWidthMode;
}

export interface HeaderHistoryControls {
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  backLabel?: string;
  forwardLabel?: string;
}

function appendTitleIcon(
  container: HTMLElement,
  item: OutlineIconTarget,
  options?: { active?: boolean }
) {
  const iconSpan = container.createSpan({
    cls: `zoom-plugin-title-icon ${outlineIconColorClass(item)}`,
    attr: { "aria-hidden": "true" },
  });
  if (item.kind === "document" && options?.active) {
    iconSpan.classList.add("is-active");
  }
  // Ensure heading icons always use an explicit 1–6 level (never silent H1 default
  // from a stale breadcrumb missing headingLevel).
  const iconTarget: OutlineIconTarget =
    item.kind === "heading"
      ? {
          ...item,
          headingLevel: Math.min(6, Math.max(1, item.headingLevel ?? 1)),
        }
      : item;
  setIcon(iconSpan, outlineIconName(iconTarget));
  if (item.kind === "heading" && item.headingLevel) {
    iconSpan.dataset.headingLevel = String(item.headingLevel);
  }
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
  const button = container.createEl("button", {
    cls: "zoom-plugin-history-btn clickable-icon",
    attr: {
      type: "button",
      "aria-label": options.label,
    },
  });
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
}

export function renderHeader(
  doc: Document,
  ctx: {
    breadcrumbs: Breadcrumb[];
    mode?: "zoom" | "navigate";
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
    mode = "zoom",
    onClick,
    onDoubleClick,
    onDelimiterClick,
    history,
    renderOptions,
  } = ctx;

  const h = doc.createDiv({ cls: "zoom-plugin-header" });

  const trail = h.createDiv({ cls: "zoom-plugin-header-trail" });

  for (let i = 0; i < breadcrumbs.length; i++) {
    const breadcrumb = breadcrumbs[i];
    const siblings = breadcrumb.siblings ?? [];
    const children = breadcrumb.children ?? [];
    const isDocument = breadcrumb.kind === "document";
    const isLast = i === breadcrumbs.length - 1;

    const crumbClasses = ["zoom-plugin-crumb"];
    if (isLast) {
      crumbClasses.push("zoom-plugin-crumb--last");
    }
    if (breadcrumb.dimmed) {
      crumbClasses.push("zoom-plugin-crumb--dimmed");
    }
    const crumb = trail.createSpan({ cls: crumbClasses });

    const titleClasses = ["zoom-plugin-title"];
    if (isDocument) {
      titleClasses.push("zoom-plugin-title--document");
    }
    // Document is a zoom toggle (enter/exit), not a sibling picker.
    if (!isDocument && siblings.length > 0) {
      titleClasses.push("zoom-plugin-title-has-siblings");
    }
    const b = crumb.createEl("a", {
      cls: titleClasses,
      href: "#",
      attr: {
        "data-pos": String(breadcrumb.pos),
        "aria-label": isDocument
          ? mode === "navigate"
            ? t("aria.zoomToCurrentHeading")
            : t("aria.exitZoom")
          : breadcrumb.title,
      },
    });

    appendTitleIcon(b, breadcrumb, {
      active: isDocument && mode === "zoom",
    });

    if (!isDocument) {
      const titleSpan = b.createSpan({ cls: "zoom-plugin-title-text" });
      titleSpan.setCssProps({
        "max-width": `${renderOptions.itemMaxWidthPx}px`,
      });
      renderOutlineTitle(titleSpan, breadcrumb.title, renderOptions);
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

    // Last crumb only shows `>` when it has children to expand.
    // Intermediate crumbs always show `>` as hierarchy separators.
    if (!isLast || children.length > 0) {
      const delimiterClasses = ["zoom-plugin-delimiter"];
      if (isLast) {
        delimiterClasses.push("zoom-plugin-delimiter--trailing");
      }
      if (children.length > 0) {
        delimiterClasses.push("zoom-plugin-delimiter--clickable");
      }
      const d = crumb.createSpan({
        cls: delimiterClasses,
        attr:
          children.length > 0
            ? {
                role: "button",
                "aria-label": t("aria.expandSubmenu"),
                tabindex: "0",
              }
            : { "aria-hidden": "true" },
      });
      if (children.length > 0) {
        d.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelimiterClick?.(breadcrumb.pos, e, children);
        });
      }
      setIcon(d, "chevron-right");
    }
  }

  if (history) {
    const historyEl = h.createDiv({ cls: "zoom-plugin-header-history" });

    appendHistoryButton(historyEl, {
      icon: "arrow-left",
      label: history.backLabel ?? t("history.zoomBack"),
      disabled: !history.canGoBack,
      onClick: history.onBack,
    });

    appendHistoryButton(historyEl, {
      icon: "arrow-right",
      label: history.forwardLabel ?? t("history.zoomForward"),
      disabled: !history.canGoForward,
      onClick: history.onForward,
    });
  }

  return h;
}
