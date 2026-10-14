import { describe, expect, it } from "vitest";
import { RESULT_EXPLORER_MODEL_SOURCE } from "./result-explorer";

const m = new Function(
  `${RESULT_EXPLORER_MODEL_SOURCE}; return {findList,columnsFor,cellText,rootScalars,nestedEntries,pageInfo,rowMatches,toolResultData};`,
)();

describe("result explorer model", () => {
  it("finds HAL embedded lists", () => {
    const l = m.findList({ _embedded: { pacticipants: [{ name: "a" }] } });
    expect(l.key).toBe("_embedded.pacticipants");
    expect(l.items).toHaveLength(1);
  });

  it("finds top-level arrays and array properties, ignoring _links", () => {
    expect(m.findList([1, 2]).items).toHaveLength(2);
    expect(m.findList({ _links: [1], matrix: [{}] }).key).toBe("matrix");
    expect(m.findList({ summary: { ok: true } })).toBeNull();
  });

  it("picks at most 6 scalar columns, preferring name-like fields", () => {
    const cols = m.columnsFor([
      { zzz: 1, name: "a", a: 1, b: 2, c: 3, d: 4, e: 5, nested: { x: 1 } },
    ]);
    expect(cols).toHaveLength(6);
    expect(cols[0]).toBe("name");
    expect(cols).not.toContain("nested");
  });

  it("summarises nested values", () => {
    expect(m.cellText([1, 2, 3])).toBe("[3 items]");
    expect(m.cellText({ a: 1 })).toBe("{…}");
    expect(m.cellText(null)).toBe("null");
  });

  it("splits root scalars from nested sections", () => {
    const d = { ok: true, pagination: {}, detail: { a: 1 }, rows: [1] };
    expect(m.rootScalars(d, "rows")).toEqual([{ key: "ok", value: "true" }]);
    expect(m.nestedEntries(d, "rows").map((e: any) => e.key)).toEqual([
      "detail",
    ]);
  });

  it("reads pagination info only when well-formed", () => {
    expect(
      m.pageInfo({ pagination: { pageNumber: 2, totalPages: 3 } }).pageNumber,
    ).toBe(2);
    expect(
      m.pageInfo({ page: { number: 2, totalPages: 3, totalElements: 107 } }),
    ).toEqual({ pageNumber: 2, totalPages: 3, totalItems: 107 });
    expect(m.pageInfo({})).toBeNull();
  });

  it("filters items by any value", () => {
    expect(m.rowMatches({ a: { b: "Hello" } }, "hell")).toBe(true);
    expect(m.rowMatches({ a: 1 }, "zzz")).toBe(false);
  });

  it("reads a tool result from metadata or standard text content", () => {
    expect(
      m.toolResultData({ _meta: { contractTesting: { result: { id: 1 } } } }),
    ).toEqual({ data: { id: 1 }, meta: { result: { id: 1 } } });
    expect(
      m.toolResultData({ content: [{ type: "text", text: '{"id":2}' }] }),
    ).toEqual({ data: { id: 2 }, meta: null });
  });
});
