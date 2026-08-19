import { describe, expect, it } from "vitest";
import { applyEdits } from "./client/patch-spec-utils";

describe("applyEdits", () => {
  const text = [
    "info:",
    "  title: Pets",
    "paths:",
    "  /pets:",
    "    get:",
    "      description: OK",
    "  /pets/{id}:",
    "    get:",
    "      description: OK",
  ].join("\n");

  it("applies a unique edit", () => {
    const result = applyEdits(text, [
      { oldString: "title: Pets", replaceString: "title: Pet Store" },
    ]);

    expect(result.text).toContain("title: Pet Store");
    expect(result.failed).toEqual([]);
  });

  it("applies edits sequentially so later edits see earlier changes", () => {
    const result = applyEdits(text, [
      { oldString: "title: Pets", replaceString: "title: Pet Store" },
      { oldString: "title: Pet Store", replaceString: "title: Pet Shop" },
    ]);

    expect(result.text).toContain("title: Pet Shop");
    expect(result.failed).toEqual([]);
  });

  it("deletes the matched text when replaceString is empty", () => {
    const result = applyEdits(text, [
      { oldString: "  title: Pets\n", replaceString: "" },
    ]);

    expect(result.text).not.toContain("title: Pets");
    expect(result.failed).toEqual([]);
  });

  it("reports no_match when oldString is not found", () => {
    const result = applyEdits(text, [
      { oldString: "does not exist", replaceString: "x" },
    ]);

    expect(result.text).toBe(text);
    expect(result.failed).toEqual([
      {
        index: 0,
        oldString: "does not exist",
        error: "no_match",
        matchCount: 0,
      },
    ]);
  });

  it("reports ambiguous when oldString matches more than once", () => {
    const result = applyEdits(text, [
      { oldString: "description: OK", replaceString: "description: Done" },
    ]);

    expect(result.text).toBe(text);
    expect(result.failed).toEqual([
      {
        index: 0,
        oldString: "description: OK",
        error: "ambiguous",
        matchCount: 2,
      },
    ]);
  });

  it("replaces every occurrence when replaceAll is true", () => {
    const result = applyEdits(text, [
      {
        oldString: "description: OK",
        replaceString: "description: Done",
        replaceAll: true,
      },
    ]);

    expect(result.text).not.toContain("description: OK");
    expect(result.text.split("description: Done")).toHaveLength(3);
    expect(result.failed).toEqual([]);
  });

  it("applies valid edits and reports failed ones in a mixed batch", () => {
    const result = applyEdits(text, [
      { oldString: "missing", replaceString: "x" },
      { oldString: "title: Pets", replaceString: "title: Pet Store" },
      { oldString: "description: OK", replaceString: "description: Done" },
    ]);

    expect(result.text).toContain("title: Pet Store");
    expect(result.text).toContain("description: OK");
    expect(result.failed).toEqual([
      {
        index: 0,
        oldString: "missing",
        error: "no_match",
        matchCount: 0,
      },
      {
        index: 2,
        oldString: "description: OK",
        error: "ambiguous",
        matchCount: 2,
      },
    ]);
  });
});
