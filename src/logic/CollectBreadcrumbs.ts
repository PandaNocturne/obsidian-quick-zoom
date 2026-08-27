import { foldable } from "@codemirror/language";
import { EditorState } from "@codemirror/state";

import {
  BreadcrumbKind,
  SiblingItem,
  collectSiblings,
  detectHeadingLevel,
} from "./CollectSiblings";
import { cleanTitle } from "./utils/cleanTitle";
import { getFrontmatterEnd } from "./utils/getFrontmatterEnd";
import {
  ListRecognitionOptions,
  ListType,
  detectListType,
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
}

export interface GetDocumentTitle {
  getDocumentTitle(state: EditorState): string;
}

function lineBreadcrumbMeta(
  lineText: string,
  listOptions: ListRecognitionOptions
): Pick<Breadcrumb, "kind" | "headingLevel" | "listType"> {
  const headingLevel = detectHeadingLevel(lineText);
  if (headingLevel !== null) {
    return { kind: "heading", headingLevel };
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

  public collectDocumentBreadcrumb(state: EditorState): Breadcrumb[] {
    const listOptions = this.settings.getListRecognitionOptions();
    const rootSiblings = collectSiblings(state, null, listOptions);

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
    const listOptions = this.settings.getListRecognitionOptions();
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
    const posLine = state.doc.lineAt(pos);

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
        const headingLevel = detectHeadingLevel(line.text);
        if (headingLevel !== null) {
          breadcrumbs.push({
            title: cleanTitle(line.text),
            pos: line.from,
            siblings: [],
            children: [],
            kind: "heading",
            headingLevel,
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

    breadcrumbs.push({
      title: cleanTitle(posLine.text),
      pos: posLine.from,
      siblings: [],
      children: [],
      ...lineBreadcrumbMeta(posLine.text, listOptions),
    });

    breadcrumbs[0].siblings = collectSiblings(state, null, listOptions);

    for (let i = 1; i < breadcrumbs.length; i++) {
      breadcrumbs[i].siblings = collectSiblings(
        state,
        breadcrumbs[i - 1].pos,
        listOptions
      );
    }

    for (const breadcrumb of breadcrumbs) {
      breadcrumb.children = collectSiblings(state, breadcrumb.pos, listOptions);
    }

    return breadcrumbs;
  }
}
