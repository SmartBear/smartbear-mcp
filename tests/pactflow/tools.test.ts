// tools.test.ts
import { z } from "zod";
import { TOOLS, ToolDefinition } from "../../pactflow/client/tools.js"; // adjust the import path
import { describe, it, expect } from 'vitest';


describe("TOOLS definition for 'generate_pact'", () => {
  it("defines the generate_pact tool with correct metadata", () => {
    const tool = TOOLS.find((t) => t.name === "generate_pact");
    expect(tool).toBeDefined();
    expect(tool?.description).toMatch(/Generate Pact tests using PactFlow AI/);
    expect(tool?.clients).toEqual(["pactflow"]);
    expect(tool?.handler).toBe("generate");
    expect(typeof tool?.inputSchema).toBe("object");
  });

  it("enforces presence of matcher when openapi input is provided", () => {
    const tool = TOOLS.find((t) => t.name === "generate_pact") as ToolDefinition;
    const schema = z.object(tool.inputSchema);

    const invalidOpenapi = {
      openapi: {
        document: {
          openapi: "3.0.0",
          paths: {},
        },
      },
    };

    expect(() => schema.parse(invalidOpenapi)).toThrow(/matcher/);
  });

  it("rejects unsupported language values in the language field", () => {
    const tool = TOOLS.find((t) => t.name === "generate_pact") as ToolDefinition;
    const schema = z.object(tool.inputSchema);

    const invalidData = {
      language: "ruby", // not allowed in enum
    };

    expect(() => schema.parse(invalidData)).toThrow(/Invalid enum value/);
  });
});