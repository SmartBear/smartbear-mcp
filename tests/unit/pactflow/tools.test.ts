// tools.test.ts
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
    const openapiSchema = tool?.parameters.find((p) => p.name === "openapi")?.type;
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
    const languageSchema = tool?.parameters.find((p) => p.name === "language")?.type;
    expect(languageSchema).toBeDefined();

    const invalidData = "ruby"; // not in enum
    expect(() => languageSchema?.parse(invalidData)).toThrow(/Invalid enum value/);
  });
});