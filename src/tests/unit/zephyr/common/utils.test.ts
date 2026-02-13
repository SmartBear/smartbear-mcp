import { describe, expect, it } from "vitest";
import { deepMerge } from "../../../../zephyr/common/utils";

describe("deepMerge", () => {
  it("should merge two simple objects", () => {
    const target = { a: 1, b: 2 };
    const updates = { b: 3, c: 4 };
    const result = deepMerge(target, updates);

    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it("should deep merge nested objects", () => {
    const target = {
      a: 1,
      customFields: { field1: "value1", field2: "value2" },
    };
    const updates = { customFields: { field2: "updated", field3: "new" } };
    const result = deepMerge(target, updates);

    expect(result).toEqual({
      a: 1,
      customFields: { field1: "value1", field2: "updated", field3: "new" },
    });
  });

  it("should skip undefined values", () => {
    const target = { a: 1, b: 2 };
    const updates = { b: undefined, c: 3 };
    const result = deepMerge(target, updates);

    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("should overwrite with null values", () => {
    const target = { a: 1, component: { id: 1 } };
    const updates = { component: null };
    const result = deepMerge(target, updates);

    expect(result).toEqual({ a: 1, component: null });
  });

  it("should set a value that was previously null", () => {
    const target = {
      a: 1,
      component: null as { id?: number; self?: string } | null,
    };
    const updates = { component: { id: 1 } };
    const result = deepMerge(target, updates);

    expect(result).toEqual({ a: 1, component: { id: 1 } });
  });

  it("should replace arrays rather than merge them", () => {
    const target = { labels: ["old", "label"] };
    const updates = { labels: ["new", "labels"] };
    const result = deepMerge(target, updates);

    expect(result).toEqual({ labels: ["new", "labels"] });
  });
});
