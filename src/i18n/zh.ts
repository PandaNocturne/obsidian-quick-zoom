import { LocaleTable } from "./types";

export const zh: LocaleTable = {
  "settings.zoomOnClick": "点击列表标记时缩放",
  "settings.submenuCloseDelay": "大纲子菜单关闭延迟",
  "settings.submenuCloseDelayDesc":
    "鼠标移出后，等待多少毫秒再关闭大纲子菜单。",
  "settings.outlineLists": "大纲列表",
  "settings.recognizeUnordered": "识别无序列表",
  "settings.recognizeUnorderedDesc": "在大纲中包含无序列表项（-、*、+）。",
  "settings.recognizeOrdered": "识别有序列表",
  "settings.recognizeOrderedDesc": "在大纲中包含有序列表项（1.、2.、…）。",
  "settings.recognizeTask": "识别任务列表",
  "settings.recognizeTaskDesc": "在大纲中包含任务列表项（- [ ]、- [x]）。",
  "settings.outlineDisplay": "大纲显示",
  "settings.showBreadcrumbsDefault": "默认模式显示面包屑",
  "settings.showBreadcrumbsDefaultDesc":
    "未缩放时也始终显示顶部大纲面包屑，并跟随光标所在标题。点击跳转到标题，而不是缩放。",
  "settings.headerWidth": "顶部栏宽度",
  "settings.headerWidthDesc":
    "顶部面包屑栏的宽度：与笔记正文列对齐，或铺满整个编辑页面区域。",
  "settings.headerWidthNote": "笔记区域宽度",
  "settings.headerWidthPage": "页面区域宽度",
  "settings.trackCursorZoomed": "缩放时跟踪光标",
  "settings.trackCursorZoomedDesc":
    "缩放后继续跟随光标所在标题（超过缩放根节点的层级以虚色显示）。",
  "settings.historyMaxEntries": "历史记录最大条数",
  "settings.historyMaxEntriesDesc":
    "缩放访问与默认模式光标跳转的前进/后退历史最多保留多少条。",
  "settings.renderMarkdown": "大纲标题渲染 Markdown",
  "settings.renderMarkdownDesc":
    "在面包屑与菜单标题中渲染行内 Markdown（加粗、链接等）。",
  "settings.outlineItemMaxWidth": "大纲条目最大宽度",
  "settings.outlineItemMaxWidthDesc":
    "大纲标题的最大宽度（像素）。过长文本以省略号截断。",
  "settings.debug": "调试模式",
  "settings.debugDesc":
    "打开开发者工具（Command+Option+I 或 Control+Shift+I）以复制调试日志。",
  "commands.zoomIn": "放大",
  "commands.zoomOut": "退出全部缩放",
  "commands.zoomBack": "缩放过中后退",
  "commands.zoomForward": "缩放过中前进",
  "commands.zoomPrevHeading": "缩放到上一个标题",
  "commands.zoomNextHeading": "缩放到下一个标题",
  "commands.zoomParent": "缩放到父节点",
  "commands.zoomPrevSibling": "缩放到上一个同级",
  "commands.zoomNextSibling": "缩放到下一个同级",
  "notice.enableFolding":
    "要使用缩放，请先在「设置 → 编辑器」中启用「折叠标题」和「折叠缩进」。",
  "aria.zoomToCurrentHeading": "缩放到当前标题",
  "aria.exitZoom": "退出缩放",
  "aria.expandSubmenu": "展开子菜单",
  "aria.toggleSubmenu": "展开/折叠子菜单",
  "history.zoomBack": "后退到上一次缩放",
  "history.zoomForward": "前进到下一次缩放",
  "history.cursorBack": "后退到上一光标位置",
  "history.cursorForward": "前进到下一光标位置",
  "menu.exitZoom": "退出缩放",
  "menu.emptyTitle": "（空）",
};
