import { describe, expect, it } from "vitest";
import { QMETRY_HANDLER_MAP } from "../../../qmetry/client/handlers";
import { TOOLS } from "../../../qmetry/client/tools";

describe("QMetry handler map", () => {
  it("should have a function handler for every tool", () => {
    for (const t of TOOLS) {
      expect(typeof QMETRY_HANDLER_MAP[t.handler]).toBe("function");
    }
  });
});
