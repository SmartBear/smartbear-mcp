import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  foldNullableUnionsForOpenAi,
  toProviderSchema,
} from "../../../common/provider-schema";

// A nullable object plus a nullable primitive and a required field — the exact
// shapes that break provider structured outputs when emitted as `anyOf` unions.
const schema = z.object({
  folder: z
    .object({ id: z.number().min(1) })
    .nullable()
    .describe("ID and link to the folder resource, or null."),
  tag: z.string().nullable(),
  name: z.string(),
});

describe("provider-schema", () => {
  describe("toProviderSchema (openai)", () => {
    const json = toProviderSchema(schema, "openai") as any;

    it("emits no anyOf/oneOf unions", () => {
      const serialized = JSON.stringify(json);
      expect(serialized).not.toContain("anyOf");
      expect(serialized).not.toContain("oneOf");
    });

    it("expresses a nullable object as a `[object, null]` type-array", () => {
      expect(json.properties.folder.type).toEqual(["object", "null"]);
      // The nested object shape is preserved.
      expect(json.properties.folder.properties.id).toMatchObject({
        type: "number",
      });
      // Description on the nullable wrapper is preserved.
      expect(json.properties.folder.description).toContain("folder resource");
    });

    it("expresses a nullable primitive as a `[string, null]` type-array", () => {
      expect(json.properties.tag.type).toEqual(["string", "null"]);
    });

    it("keeps every declared property in `required`", () => {
      expect(json.required).toEqual(
        expect.arrayContaining(["folder", "tag", "name"]),
      );
    });
  });

  describe("toProviderSchema (gemini)", () => {
    const json = toProviderSchema(schema, "gemini") as any;

    it("emits no anyOf/oneOf unions", () => {
      const serialized = JSON.stringify(json);
      expect(serialized).not.toContain("anyOf");
      expect(serialized).not.toContain("oneOf");
    });

    it("expresses a nullable object via the `nullable: true` annotation", () => {
      expect(json.properties.folder.type).toBe("object");
      expect(json.properties.folder.nullable).toBe(true);
      expect(json.properties.folder.properties.id).toMatchObject({
        type: "number",
      });
    });

    it("expresses a nullable primitive via the `nullable: true` annotation", () => {
      expect(json.properties.tag.type).toBe("string");
      expect(json.properties.tag.nullable).toBe(true);
    });
  });

  describe("foldNullableUnionsForOpenAi", () => {
    it("folds `<schema> | null` into a type-array", () => {
      const ctx = {
        jsonSchema: {
          anyOf: [{ type: "string" }, { type: "null" }],
        },
      };
      foldNullableUnionsForOpenAi(ctx);
      expect(ctx.jsonSchema).not.toHaveProperty("anyOf");
      expect((ctx.jsonSchema as any).type).toEqual(["string", "null"]);
    });

    it("leaves genuine multi-type unions untouched", () => {
      // `string | number | null` cannot be a single type-array — it must stay
      // a union, which both providers reject (documented limitation).
      const ctx = {
        jsonSchema: {
          anyOf: [
            { anyOf: [{ type: "string" }, { type: "number" }] },
            { type: "null" },
          ],
        },
      };
      const before = JSON.parse(JSON.stringify(ctx.jsonSchema));
      foldNullableUnionsForOpenAi(ctx);
      expect(ctx.jsonSchema).toEqual(before);
    });

    it("ignores nodes without an anyOf", () => {
      const ctx = { jsonSchema: { type: "object", properties: {} } };
      const before = JSON.parse(JSON.stringify(ctx.jsonSchema));
      foldNullableUnionsForOpenAi(ctx);
      expect(ctx.jsonSchema).toEqual(before);
    });
  });
});
