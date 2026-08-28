import * as Obsidian from "obsidian";

import { en } from "./en";
import { LocaleKey, LocaleTable } from "./types";
import { zh } from "./zh";

function detectLocale(): LocaleTable {
  try {
    const getLanguage = (Obsidian as unknown as { getLanguage?: () => string })
      .getLanguage;
    const lang = (getLanguage?.() ?? "en").toLowerCase();
    if (lang.startsWith("zh")) {
      return zh;
    }
  } catch {
    // fall through to English
  }
  return en;
}

let active: LocaleTable = detectLocale();

/** Refresh locale from Obsidian language (e.g. after settings change). */
export function refreshLocale() {
  active = detectLocale();
}

export function t(key: LocaleKey): string {
  return active[key] ?? en[key] ?? key;
}
