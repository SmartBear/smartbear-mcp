import { describe, expect, it } from "vitest";
import { ZephyrProjectSchema } from "../../../../zephyr/common/types";

describe("ZephyrProjectSchema", () => {
  it("validates a correct project", () => {
    const valid = {
      id: 1,
      jiraProjectId: 2,
      key: "ABC",
      enabled: true,
    };
    expect(() => ZephyrProjectSchema.parse(valid)).not.toThrow();
  });

  it("rejects an invalid project", () => {
    const invalid = { id: "x", jiraProjectId: 2, key: "ABC", enabled: true };
    expect(() => ZephyrProjectSchema.parse(invalid)).toThrow();
  });
});
