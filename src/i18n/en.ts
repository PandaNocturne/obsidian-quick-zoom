import { LocaleTable } from "./types";

export const en: LocaleTable = {
  "settings.zoomOnClick": "Zooming in when clicking on the bullet",
  "settings.submenuCloseDelay": "Outline submenu close delay",
  "settings.submenuCloseDelayDesc":
    "Milliseconds to wait before closing outline submenus after the mouse leaves.",
  "settings.outlineLists": "Outline lists",
  "settings.recognizeUnordered": "Recognize unordered lists",
  "settings.recognizeUnorderedDesc":
    "Include unordered list items (-, *, +) in the outline.",
  "settings.recognizeOrdered": "Recognize ordered lists",
  "settings.recognizeOrderedDesc":
    "Include ordered list items (1., 2., ...) in the outline.",
  "settings.recognizeTask": "Recognize task lists",
  "settings.recognizeTaskDesc":
    "Include task list items (- [ ], - [x]) in the outline.",
  "settings.outlineDisplay": "Outline display",
  "settings.showBreadcrumbsDefault": "Show breadcrumbs in default mode",
  "settings.showBreadcrumbsDefaultDesc":
    "Always show the top outline breadcrumbs without zooming. They follow the cursor heading. Clicks jump to headings instead of zooming.",
  "settings.headerWidth": "Header width",
  "settings.headerWidthDesc":
    "Width of the top breadcrumb bar: match the note content column, or span the full editor page pane.",
  "settings.headerWidthNote": "Note area width",
  "settings.headerWidthPage": "Page area width",
  "settings.trackCursorZoomed": "Track cursor while zoomed",
  "settings.trackCursorZoomedDesc":
    "While zoomed, keep following the cursor heading beyond the zoom root. Levels below the zoom root are shown dimmed.",
  "settings.historyMaxEntries": "History max entries",
  "settings.historyMaxEntriesDesc":
    "Maximum number of back/forward history entries for zoom visits and default-mode cursor jumps.",
  "settings.renderMarkdown": "Render markdown in outline titles",
  "settings.renderMarkdownDesc":
    "Render inline markdown (bold, links, etc.) in breadcrumb and menu titles.",
  "settings.outlineItemMaxWidth": "Outline item max width",
  "settings.outlineItemMaxWidthDesc":
    "Maximum width of outline titles in pixels. Longer text is truncated with an ellipsis.",
  "settings.debug": "Debug mode",
  "settings.debugDesc":
    "Open DevTools (Command+Option+I or Control+Shift+I) to copy the debug logs.",
  "commands.zoomIn": "Zoom in",
  "commands.zoomOut": "Zoom out the entire document",
  "commands.zoomBack": "Zoom back",
  "commands.zoomForward": "Zoom forward",
  "notice.enableFolding":
    'In order to zoom, you must first enable "Fold heading" and "Fold indent" under Settings -> Editor',
  "aria.zoomToCurrentHeading": "Zoom to current heading",
  "aria.exitZoom": "Exit zoom",
  "aria.expandSubmenu": "Expand submenu",
  "aria.toggleSubmenu": "Expand/collapse submenu",
  "history.zoomBack": "Go back to previous zoom",
  "history.zoomForward": "Go forward to next zoom",
  "history.cursorBack": "Go back to previous cursor position",
  "history.cursorForward": "Go forward to next cursor position",
  "menu.exitZoom": "Exit zoom",
  "menu.emptyTitle": "(empty)",
};
