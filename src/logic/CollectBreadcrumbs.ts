import { foldable } from "@codemirror/language";
import { EditorState } from "@codemirror/state";

import {
  BreadcrumbKind,
  SiblingItem,
  collectSiblings,
} from "./CollectSiblings";
import { cleanTitle } from "./utils/cleanTitle";
import {
  HeadingIndex,
  getHeadingAt,
  getHeadingIndex,
} from "./utils/getCachedHeadings";
import { getFrontmatterEnd } from "./utils/getFrontmatterEnd";
import {
  ListRecognitionOptions,
  ListType,
  detectListType,
  resolveListRecognitionOptions,
} from "./utils/listItemParsing";

import { SettingsService } from "../services/SettingsService";

export interface Breadcrumb {
  title: string;
  pos: number | null;
  siblings: SiblingItem[];
  /** Direct children under this breadcrumb (for `>` submenu) */
  children: SiblingItem[];
  kind: BreadcrumbKind;
  headingLevel?: number;
  listType?: ListType;
  /** Levels below the current zoom root (cursor tracking while zoomed) */
  dimmed?: boolean;
}

export interface GetDocumentTitle {
  getDocumentTitle(state: EditorState): string;
}

function lineBreadcrumbMeta(
  lineFrom: number,
  lineText: string,
  listOptions: ListRecognitionOptions,
  headings: HeadingIndex
): Pick<Breadcrumb, "kind" | "headingLevel" | "listType"> {
  const heading = getHeadingAt(headings, lineFrom);
  if (heading) {
    return { kind: "heading", headingLevel: heading.level };
  }

  const listType = detectListType(lineText, listOptions);
  if (listType) {
    return { kind: "list", listType };
  }

  return { kind: "text" };
}

export class CollectBreadcrumbs {
  constructor(
    private getDocumentTitle: GetDocumentTitle,
    private settings: SettingsService
  ) {}

  public collectStickyBreadcrumbs(state: EditorState, pos: number) {
    const breadcrumbs = this.collectBreadcrumbs(state, pos);

    while (
      breadcrumbs.length > 1 &&
      breadcrumbs[breadcrumbs.length - 1].kind === "text"
    ) {
      breadcrumbs.pop();
    }

    return breadcrumbs;
  }

  /**
   * Zoom-mode path that also follows the cursor deeper than `zoomRootPos`.
   * Crumbs after the zoom root are marked `dimmed`.
   */
  public collectZoomTrackedBreadcrumbs(
    state: EditorState,
    zoomRootPos: number,
    cursorPos: number
  ) {
    const zoomRootLineFrom = state.doc.lineAt(zoomRootPos).from;
    const breadcrumbs = this.collectStickyBreadcrumbs(state, cursorPos);

    let pastZoomRoot = false;
    let foundZoomRoot = false;
    for (const breadcrumb of breadcrumbs) {
      if (pastZoomRoot) {
        breadcrumb.dimmed = true;
      }
      if (breadcrumb.pos === zoomRootLineFrom) {
        foundZoomRoot = true;
        pastZoomRoot = true;
      }
    }

    if (!foundZoomRoot) {
      return this.collectBreadcrumbs(state, zoomRootLineFrom);
    }

    return breadcrumbs;
  }

  public collectDocumentBreadcrumb(state: EditorState): Breadcrumb[] {
    const listOptions = this.settings.getListRecognitionOptions();
    const headings = getHeadingIndex(state);
    const rootSiblings = collectSiblings(state, null, listOptions, headings);

    return [
      {
        title: this.getDocumentTitle.getDocumentTitle(state),
        pos: null,
        siblings: rootSiblings,
        children: rootSiblings,
        kind: "document",
      },
    ];
  }

  public collectBreadcrumbs(state: EditorState, pos: number) {
    const posLine = state.doc.lineAt(pos);
    const listOptions = resolveListRecognitionOptions(
      this.settings.getListRecognitionOptions(),
      posLine.text
    );
    const headings = getHeadingIndex(state);
    const breadcrumbs: Breadcrumb[] = [
      {
        title: this.getDocumentTitle.getDocumentTitle(state),
        pos: null,
        siblings: [],
        children: [],
        kind: "document",
      },
    ];

    const frontmatterEnd = getFrontmatterEnd(state);

    for (let i = 1; i < posLine.number; i++) {
      const line = state.doc.line(i);
      if (line.from < frontmatterEnd) {
        continue;
      }
      if (line.text.trim() === "---") {
        continue;
      }
      const f = foldable(state, line.from, line.to);
      if (f && f.to > posLine.from) {
        const heading = getHeadingAt(headings, line.from);
        if (heading) {
          breadcrumbs.push({
            title: heading.title,
            pos: line.from,
            siblings: [],
            children: [],
            kind: "heading",
            headingLevel: heading.level,
          });
          continue;
        }

        const listType = detectListType(line.text, listOptions);
        if (listType) {
          breadcrumbs.push({
            title: cleanTitle(line.text),
            pos: line.from,
            siblings: [],
            children: [],
            kind: "list",
            listType,
          });
        }
      }
    }

    const tipHeading = getHeadingAt(headings, posLine.from);
    breadcrumbs.push({
      title: tipHeading?.title ?? cleanTitle(posLine.text),
      pos: posLine.from,
      siblings: [],
      children: [],
      ...lineBreadcrumbMeta(posLine.from, posLine.text, listOptions, headings),
    });

    breadcrumbs[0].siblings = collectSiblings(
      state,
      null,
      listOptions,
      headings
    );

    for (let i = 1; i < breadcrumbs.length; i++) {
      breadcrumbs[i].siblings = collectSiblings(
        state,
        breadcrumbs[i - 1].pos,
        listOptions,
        headings
      );
    }

    for (const breadcrumb of breadcrumbs) {
      breadcrumb.children = collectSiblings(
        state,
        breadcrumb.pos,
        listOptions,
        headings
      );
    }

    return breadcrumbs;
  }
}
