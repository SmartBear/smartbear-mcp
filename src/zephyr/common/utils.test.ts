import { describe, expect, it } from "vitest";
import { z } from "zod";
import { deepMerge, deepStrip } from "./utils";

// A permissive schema so these cases exercise merge behavior without stripping.
const passthrough = z.any();

describe("deepMerge", () => {
  it("should merge two simple objects", () => {
    const baseObject = { a: 1, b: 2 };
    const objectWithUpdates = { b: 3, c: 4 };
    const result = deepMerge(baseObject, objectWithUpdates, passthrough);

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
    const result = deepMerge(baseObject, objectWithUpdates, passthrough);

    expect(result).toEqual({
      a: 1,
      customFields: { field1: "value1", field2: "updated", field3: "new" },
    });
  });

  it("should skip undefined values", () => {
    const baseObject = { a: 1, b: 2 };
    const objectWithUpdates = { b: undefined, c: 3 };
    const result = deepMerge(baseObject, objectWithUpdates, passthrough);

    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("should overwrite with null values", () => {
    const baseObject = { a: 1, component: { id: 1 } };
    const objectWithUpdates = { component: null };
    const result = deepMerge(baseObject, objectWithUpdates, passthrough);

    expect(result).toEqual({ a: 1, component: null });
  });

  it("should set a value that was previously null", () => {
    const baseObject = {
      a: 1,
      component: null,
    };
    const objectWithUpdates = { component: { id: 1 } };
    const result = deepMerge(baseObject, objectWithUpdates, passthrough);

    expect(result).toEqual({ a: 1, component: { id: 1 } });
  });

  it("should set a value that was previously not present", () => {
    const baseObject = {
      a: 1,
    };
    const objectWithUpdates = { component: { id: 1 } };
    const result = deepMerge(baseObject, objectWithUpdates, passthrough);

    expect(result).toEqual({ a: 1, component: { id: 1 } });
  });

  it("should replace arrays rather than merge them", () => {
    const baseObject = { labels: ["old", "label"] };
    const objectWithUpdates = { labels: ["new", "labels"] };
    const result = deepMerge(baseObject, objectWithUpdates, passthrough);

    expect(result).toEqual({ labels: ["new", "labels"] });
  });

  it("should replace non-plain objects (e.g. Date) wholesale", () => {
    const baseObject = { when: new Date("2020-01-01T00:00:00Z") };
    const updated = new Date("2024-06-01T00:00:00Z");
    const result = deepMerge(baseObject, { when: updated }, passthrough);

    expect(result.when).toBe(updated);
  });

  it("should strip keys not declared in the target schema", () => {
    const schema = z.object({ a: z.number(), b: z.number() }).strict();
    const baseObject = { a: 1, b: 2, extra: "drop me", createdOn: "x" };
    const objectWithUpdates = { b: 3 };

    const result = deepMerge(baseObject, objectWithUpdates, schema);

    expect(result).toEqual({ a: 1, b: 3 });
  });

  it("should strip unknown keys nested inside strict sub-objects", () => {
    const schema = z
      .object({
        id: z.number(),
        nested: z.object({ id: z.number() }).strict(),
      })
      .strict();
    const baseObject = {
      id: 1,
      nested: { id: 2, self: "url", extra: true },
      links: ["remove"],
    };

    const result = deepMerge(baseObject, {}, schema);

    expect(result).toEqual({ id: 1, nested: { id: 2 } });
  });

  it("should still enforce leaf validations after stripping", () => {
    const schema = z.object({ name: z.string().min(1) }).strict();

    expect(() => deepMerge({ name: "", extra: 1 }, {}, schema)).toThrow();
  });
});

describe("deepStrip", () => {
  it("loosens strict objects at every level while keeping known keys", () => {
    const schema = z
      .object({
        id: z.number(),
        child: z.object({ id: z.number() }).strict(),
        list: z.array(z.object({ id: z.number() }).strict()),
      })
      .strict();

    const parsed = deepStrip(schema).parse({
      id: 1,
      child: { id: 2, extra: 1 },
      list: [{ id: 3, extra: 2 }],
      topExtra: "x",
    });

    expect(parsed).toEqual({ id: 1, child: { id: 2 }, list: [{ id: 3 }] });
  });

  it("preserves leaf validation rules", () => {
    const schema = z.object({ n: z.number().min(1) }).strict();

    expect(() => deepStrip(schema).parse({ n: 0 })).toThrow();
  });
});
