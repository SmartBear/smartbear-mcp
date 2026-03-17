import { describe, expect, it } from "vitest";
import { deepMerge } from "../../../../zephyr/common/utils";

describe("deepMerge", () => {
  it("should merge two simple objects", () => {
    const baseObject = { a: 1, b: 2 };
    const objectWithUpdates = { b: 3, c: 4 };
    const result = deepMerge(baseObject, objectWithUpdates);

    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it("should deep merge nested objects", () => {
    const baseObject = {
      a: 1,
      customFields: { field1: "value1", field2: "value2" },
    };
    const objectWithUpdates = {
      customFields: { field2: "updated", field3: "new" },
    };
    const result = deepMerge(baseObject, objectWithUpdates);

    expect(result).toEqual({
      a: 1,
      customFields: { field1: "value1", field2: "updated", field3: "new" },
    });
  });

  it("should skip undefined values", () => {
    const baseObject = { a: 1, b: 2 };
    const objectWithUpdates = { b: undefined, c: 3 };
    const result = deepMerge(baseObject, objectWithUpdates);

    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("should overwrite with null values", () => {
    const baseObject = { a: 1, component: { id: 1 } };
    const objectWithUpdates = { component: null };
    const result = deepMerge(baseObject, objectWithUpdates);

    expect(result).toEqual({ a: 1, component: null });
  });

  it("should set a value that was previously null", () => {
    const baseObject = {
      a: 1,
      component: null,
    };
    const objectWithUpdates = { component: { id: 1 } };
    const result = deepMerge(baseObject, objectWithUpdates);

    expect(result).toEqual({ a: 1, component: { id: 1 } });
  });

  it("should set a value that was previously not present", () => {
    const baseObject = {
      a: 1,
    };
    const objectWithUpdates = { component: { id: 1 } };
    const result = deepMerge(baseObject, objectWithUpdates);

    expect(result).toEqual({ a: 1, component: { id: 1 } });
  });

  it("should replace arrays rather than merge them", () => {
    const baseObject = { labels: ["old", "label"] };
    const objectWithUpdates = { labels: ["new", "labels"] };
    const result = deepMerge(baseObject, objectWithUpdates);

    expect(result).toEqual({ labels: ["new", "labels"] });
  });
});
