import { describe, expect, it } from "vitest";
import {
  ZephyrProjectListSchema,
  ZephyrProjectSchema,
} from "../../../../zephyr/common/types";

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

describe("ZephyrProjectListSchema", () => {
  it("validates a correct project list", () => {
    const valid = {
      next: "",
      startAt: 0,
      maxResults: 10,
      total: 1,
      isLast: true,
      values: [{ id: 1, jiraProjectId: 2, key: "ABC", enabled: true }],
    };
    expect(() => ZephyrProjectListSchema.parse(valid)).not.toThrow();
  });

  it("rejects a list containing invalid projects", () => {
    const invalid = {
      next: null,
      startAt: 0,
      maxResults: 10,
      total: 1,
      isLast: true,
      values: [{ id: 1, jiraProjectId: 2, key: "ABC", enabled: true }],
    };
    expect(() => ZephyrProjectListSchema.parse(invalid)).not.toThrow();
  });
});
