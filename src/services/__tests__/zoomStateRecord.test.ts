import {
  createZoomStateRecord,
  isValidZoomStateRecord,
  parseZoomStateRecord,
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
