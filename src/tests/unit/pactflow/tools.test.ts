// tools.test.ts

import { describe, expect, it } from "vitest";
import type { ZodObject, ZodTypeAny } from "zod";
import { TOOLS } from "../../../pactflow/client/tools";

describe("TOOLS definition for 'Generate Pact Tests'", () => {
  it("defines the generate pact tests tool with correct metadata", () => {
    const tool = TOOLS.find((t) => t.title === "Generate Pact Tests");
    expect(tool).toBeDefined();
    expect(tool?.summary).toMatch(/Generate Pact tests using PactFlow AI/);
    expect(tool?.clients).toEqual(["pactflow"]);
    expect(tool?.handler).toBe("generate");
  });

  it("rejects unsupported language values in the language field", () => {
    const tool = TOOLS.find((t) => t.title === "Generate Pact Tests");
    const schema = tool?.inputSchema as ZodObject<{
      [key: string]: ZodTypeAny;
    }>;
    const languageSchema = schema.shape.language;
    expect(languageSchema).toBeDefined();

    const invalidData = "ruby"; // not in enum
    expect(() => languageSchema?.parse(invalidData)).toThrow(
      /Invalid enum value/,
    );
  });
});
