export interface DocumentZoomStateRecord {
  from: number;
  to: number;
  updatedAt: string;
}

export type ZoomStateStoreFile = Record<string, DocumentZoomStateRecord>;

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

/**
 * Drop paths that no longer exist, then keep only the newest `maxEntries`
 * records by `updatedAt` (oldest removed first).
 */
export function pruneZoomStateStore(
  store: ZoomStateStoreFile,
  options: {
    maxEntries: number;
    keepPath?: (path: string) => boolean;
  }
): ZoomStateStoreFile {
  const maxEntries = Math.max(1, Math.floor(options.maxEntries));
  const keepPath = options.keepPath ?? (() => true);

  const entries = Object.entries(store).filter(([path, record]) => {
    if (!record || typeof record !== "object") {
      return false;
    }
    return keepPath(path);
  });

  entries.sort((a, b) => {
    const aTime = Date.parse(a[1].updatedAt) || 0;
    const bTime = Date.parse(b[1].updatedAt) || 0;
    return bTime - aTime;
  });

  const next: ZoomStateStoreFile = {};
  for (const [path, record] of entries.slice(0, maxEntries)) {
    next[path] = record;
  }
  return next;
}
