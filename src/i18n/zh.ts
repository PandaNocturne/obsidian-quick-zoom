import { LocaleTable } from "./types";

export const zh: LocaleTable = {
  "settings.groupHistory": "历史记录",
  "settings.groupAdvanced": "高级",
  "settings.zoomOnClick": "点击列表标记时缩放",
  "settings.outlineLists": "大纲列表",
  "settings.recognizeUnordered": "识别无序列表",
  "settings.recognizeUnorderedDesc":
    "在大纲中包含无序列表项（-、*、+）。关闭时顶部导航默认不解析列表；光标落在列表行时仍会自动识别。",
  "settings.recognizeOrdered": "识别有序列表",
  "settings.recognizeOrderedDesc":
    "在大纲中包含有序列表项（1.、2.、…）。关闭时顶部导航默认不解析列表；光标落在列表行时仍会自动识别。",
  "settings.recognizeTask": "识别任务列表",
  "settings.recognizeTaskDesc":
    "在大纲中包含任务列表项（- [ ]、- [x]）。关闭时顶部导航默认不解析列表；光标落在列表行时仍会自动识别。",
  "settings.outlineDisplay": "导航栏设置",
  "settings.showBreadcrumbsDefault": "默认模式显示面包屑",
  "settings.showBreadcrumbsDefaultDesc":
    "未缩放时也始终显示顶部导航面包屑，并跟随光标所在标题。点击跳转到标题，而不是缩放。",
  "settings.headerWidth": "顶部导航栏宽度",
  "settings.headerWidthDesc":
    "顶部导航栏的宽度：与笔记正文列对齐，或铺满整个编辑页面区域。",
  "settings.headerWidthNote": "笔记区域宽度",
  "settings.headerWidthPage": "页面区域宽度",
  "settings.trackCursorZoomed": "缩放时跟踪光标",
  "settings.trackCursorZoomedDesc":
    "缩放后继续跟随光标所在标题（超过缩放根节点的层级以虚色显示）。",
  "settings.historyMaxEntries": "历史记录最大条数",
  "settings.historyMaxEntriesDesc":
    "缩放访问与默认模式光标跳转的前进/后退历史最多保留多少条。",
  "settings.renderMarkdown": "导航标题渲染 Markdown",
  "settings.renderMarkdownDesc":
    "在导航栏与菜单标题中渲染行内 Markdown（加粗、链接等）。",
  "settings.outlineItemMaxWidth": "导航标题最大宽度",
  "settings.outlineItemMaxWidthDesc":
    "导航标题的最大宽度（像素）。过长文本以省略号截断。",
  "settings.groupZoomState": "缩放状态",
  "settings.resetZoomStateRecords": "重置缩放状态记录",
  "settings.resetZoomStateRecordsDesc":
    "清除插件 tmp/zoom-state.json 中保存的所有缩放范围记录。",
  "settings.resetZoomStateRecordsButton": "重置",
  "settings.debug": "调试模式",
  "settings.debugDesc":
    "打开开发者工具（Command+Option+I 或 Control+Shift+I）以复制调试日志。",
  "settings.sourceNote":
    "基于 Viacheslav Slinko 的 Obsidian Zoom 二次开发。致谢与捐赠请见原插件仓库。",
  "settings.sourceLink": "原 Obsidian Zoom 仓库",
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
  "notice.zoomStateRecordsReset": "已清除缩放状态记录。",
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
