import { describe, expect, it } from "vitest";
import { QMETRY_HANDLER_MAP } from "./client/handlers.ts";
import { TOOLS } from "./client/tools/index.ts";

describe("QMetry handler map", () => {
  it("should have a function handler for every tool", () => {
    for (const t of TOOLS) {
      expect(typeof QMETRY_HANDLER_MAP[t.handler]).toBe("function");
    }
  });
});
