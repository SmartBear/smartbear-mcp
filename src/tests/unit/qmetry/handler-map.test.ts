import { describe, it, expect } from "vitest";
import { TOOLS } from "../../../qmetry/client/tools.js";
import { QMETRY_HANDLER_MAP } from "../../../qmetry/client/handlers.js";

describe("QMetry handler map", () => {
  it("should have a function handler for every tool", () => {
    for (const t of TOOLS) {
      expect(typeof QMETRY_HANDLER_MAP[t.handler]).toBe("function");
    }
  });
});
