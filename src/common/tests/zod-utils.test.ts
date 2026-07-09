import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  fullyUnwrapZodType,
  getReadableTypeName,
  getTypeDescription,
  isOptionalType,
} from "../zod-utils";

describe("zod-utils", () => {
  describe("isOptionalType", () => {
    it.each([
      ["ZodOptional", z.string().optional(), true],
      ["ZodNullable", z.string().nullable(), true],
      ["ZodDefault", z.string().default("foo"), true],
      [
        "nested optionals",
        z.string().optional().nullable().default("bar"),
        true,
      ],
      [
        "nested optionals in any order",
        z.string().optional().describe("foo"),
        true,
      ],
      ["required type", z.string(), false],
    ])("returns $2 for $0", (_desc, zodType, expected) => {
      expect(isOptionalType(zodType)).toBe(expected);
    });
  });

  describe("fullyUnwrapZodType", () => {
    it.each([
      ["base type", z.string(), z.ZodString],
      ["unwraps ZodOptional", z.string().optional(), z.ZodString],
      ["unwraps ZodNullable number", z.number().nullable(), z.ZodNumber],
      ["unwraps ZodDefault", z.string().default("foo"), z.ZodString],
      [
        "unwraps nested wrappers",
        z.string().optional().nullable().default("bar"),
        z.ZodString,
      ],
      [
        "unwraps nested wrappers in any order",
        z.string().optional().describe("foo"),
        z.ZodString,
      ],
      [
        "unwraps nested wrappers in any order",
        z.number().default(1).describe("foo"),
        z.ZodNumber,
      ],
    ])("it unwraps %s", (_desc, zodType, expectedCtor) => {
      expect(fullyUnwrapZodType(zodType)).toBeInstanceOf(expectedCtor);
    });
  });

  describe("getTypeDescription", () => {
    it.each([
      ["description", z.string().describe("desc"), "desc"],
      [
        "description from url",
        z.url().describe("http://example.com"),
        "http://example.com",
      ],
      [
        "description from wrapped type",
        z.string().describe("desc").optional(),
        "desc",
      ],
      [
        "description from wrapped type in any order",
        z.string().optional().describe("desc"),
        "desc",
      ],
      ["no description", z.string(), null],
    ])("returns %s", (_desc, zodType, expected) => {
      expect(getTypeDescription(zodType)).toBe(expected);
    });
  });

  describe("getReadableTypeName", () => {
    it.each([
      ["string", z.string()],
      ["number", z.number()],
      ["boolean", z.boolean()],
      ["array", z.array(z.string())],
      ["object", z.object({ key: z.string() })],
      ["enum", z.enum(["value1", "value2"])],
      ["literal", z.literal("value")],
      ["union", z.union([z.string(), z.number()])],
      ["record<string, number>", z.record(z.string(), z.number())],
      ["record<string, array>", z.record(z.string(), z.array(z.string()))],
      ["any", z.any()],
      ["string", z.optional(z.string())],
      ["string", z.string().default("default")],
      ["string", z.string().regex(/test/).nullish().describe("regex test")],
    ])("should return '%s' for the given Zod type", (expected, zodType) => {
      const result = getReadableTypeName(zodType);
      expect(result).toBe(expected);
    });
  });
});
