/** YAML frontmatter key for per-note zoom state. */
export const ZOOM_STATE_FRONTMATTER_KEY = "quick-zoom";

export interface DocumentZoomStateRecord {
  from: number;
  to: number;
  updatedAt: string;
}

export type ZoomStateStorageMode = "tmp" | "frontmatter";

export function isValidZoomStateRecord(
  record: DocumentZoomStateRecord | null | undefined,
  docLength: number
): record is DocumentZoomStateRecord {
  if (!record) {
    return false;
  }

  const { from, to } = record;
  return (
    Number.isFinite(from) &&
    Number.isFinite(to) &&
    from >= 0 &&
    to > from &&
    to <= docLength
  );
}

export function parseZoomStateRecord(
  value: unknown
): DocumentZoomStateRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const from = raw.from;
  const to = raw.to;
  const updatedAt = raw.updatedAt;

  if (typeof from !== "number" || typeof to !== "number") {
    return null;
  }

  return {
    from,
    to,
    updatedAt:
      typeof updatedAt === "string" ? updatedAt : new Date().toISOString(),
  };
}

export function createZoomStateRecord(
  from: number,
  to: number
): DocumentZoomStateRecord {
  return {
    from,
    to,
    updatedAt: new Date().toISOString(),
  };
}
