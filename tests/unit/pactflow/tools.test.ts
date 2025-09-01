// tools.test.ts
import { ZodObject, ZodTypeAny } from "zod";
import { TOOLS } from "../../../pactflow/client/tools.js";
import { describe, it, expect } from 'vitest';

describe("TOOLS definition for 'Generate Pact Tests'", () => {
  it("defines the generate pact tests tool with correct metadata", () => {
    const tool = TOOLS.find((t) => t.title === "Generate Pact Tests");
    expect(tool).toBeDefined();
    expect(tool?.summary).toMatch(/Generate Pact tests using PactFlow AI/);
    expect(tool?.clients).toEqual(["pactflow"]);
    expect(tool?.handler).toBe("generate");
  });

  it("enforces presence of matcher when openapi input is provided", () => {
    const tool = TOOLS.find((t) => t.title === "Generate Pact Tests");
    const schema = tool?.zodSchema as ZodObject<{ [key: string]: ZodTypeAny }>;
    const openapiSchema = (schema.shape["body"] as ZodObject<{ [key: string]: ZodTypeAny }>).shape["openapi"];
    expect(openapiSchema).toBeDefined();

    const invalidOpenapi = {
      openapi: {
        document: {
          openapi: "3.0.0",
          paths: {},
        },
      },
    };

    expect(() => openapiSchema?.parse(invalidOpenapi.openapi)).toThrow(/matcher/);
  });

  it("rejects unsupported language values in the language field", () => {
    const tool = TOOLS.find((t) => t.title === "Generate Pact Tests");
    const schema = tool?.zodSchema as ZodObject<{ [key: string]: ZodTypeAny }>;
    const languageSchema = (schema.shape["body"] as ZodObject<{ [key: string]: ZodTypeAny }>).shape["language"];
    expect(languageSchema).toBeDefined();

    const invalidData = "ruby"; // not in enum
    expect(() => languageSchema?.parse(invalidData)).toThrow(/Invalid enum value/);
  });
});