import { foldable } from "@codemirror/language";
import { EditorState } from "@codemirror/state";

import {
  SiblingItem,
  collectSiblings,
  detectHeadingLevel,
} from "./CollectSiblings";
import { cleanTitle } from "./utils/cleanTitle";
import { getFrontmatterEnd } from "./utils/getFrontmatterEnd";
import { detectListType } from "./utils/listItemParsing";

import { SettingsService } from "../services/SettingsService";

export interface Breadcrumb {
  title: string;
  pos: number | null;
  siblings: SiblingItem[];
}

export interface GetDocumentTitle {
  getDocumentTitle(state: EditorState): string;
}

export class CollectBreadcrumbs {
  constructor(
    private getDocumentTitle: GetDocumentTitle,
    private settings: SettingsService
  ) {}

  public collectBreadcrumbs(state: EditorState, pos: number) {
    const listOptions = this.settings.getListRecognitionOptions();
    const breadcrumbs: Breadcrumb[] = [
      {
        title: this.getDocumentTitle.getDocumentTitle(state),
        pos: null,
        siblings: [],
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
          });
          continue;
        }

        const listType = detectListType(line.text, listOptions);
        if (listType) {
          breadcrumbs.push({
            title: cleanTitle(line.text),
            pos: line.from,
            siblings: [],
          });
        }
      }
    }

    breadcrumbs.push({
      title: cleanTitle(posLine.text),
      pos: posLine.from,
      siblings: [],
    });

    breadcrumbs[0].siblings = collectSiblings(state, null, listOptions);

    for (let i = 1; i < breadcrumbs.length; i++) {
      breadcrumbs[i].siblings = collectSiblings(
        state,
        breadcrumbs[i - 1].pos,
        listOptions
      );
    }

    return breadcrumbs;
  }
}
