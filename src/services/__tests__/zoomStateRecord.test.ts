import {
  createZoomStateRecord,
  isValidZoomStateRecord,
  parseZoomStateRecord,
  pruneZoomStateStore,
} from "../zoomStateRecord";

test("parseZoomStateRecord accepts valid frontmatter payload", () => {
  expect(
    parseZoomStateRecord({
      from: 10,
      to: 50,
      updatedAt: "2026-08-28T00:00:00.000Z",
    })
  ).toEqual({
    from: 10,
    to: 50,
    updatedAt: "2026-08-28T00:00:00.000Z",
  });
});

test("parseZoomStateRecord rejects invalid payload", () => {
  expect(parseZoomStateRecord(null)).toBeNull();
  expect(parseZoomStateRecord({ from: "bad", to: 1 })).toBeNull();
});

test("isValidZoomStateRecord checks document bounds", () => {
  const record = createZoomStateRecord(5, 20);
  expect(isValidZoomStateRecord(record, 100)).toBe(true);
  expect(isValidZoomStateRecord(record, 15)).toBe(false);
  expect(isValidZoomStateRecord({ ...record, from: 20 }, 100)).toBe(false);
});

test("pruneZoomStateStore keeps newest records and drops missing paths", () => {
  const pruned = pruneZoomStateStore(
    {
      "a.md": {
        from: 1,
        to: 2,
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      "b.md": {
        from: 1,
        to: 2,
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
      "gone.md": {
        from: 1,
        to: 2,
        updatedAt: "2026-12-01T00:00:00.000Z",
      },
      "c.md": {
        from: 1,
        to: 2,
        updatedAt: "2026-03-01T00:00:00.000Z",
      },
    },
    {
      maxEntries: 2,
      keepPath: (path) => path !== "gone.md",
    }
  );

  expect(Object.keys(pruned).sort()).toEqual(["b.md", "c.md"]);
  expect(pruned["b.md"].updatedAt).toBe("2026-06-01T00:00:00.000Z");
});
