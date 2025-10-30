import { describe, expect, it } from "vitest";
import {
  getProjectResponse,
  listProjectsResponse,
} from "../../../../zephyr/common/rest-api-schemas";

describe("listProjectsResponse", () => {
  it("validates a correct project list", () => {
    const valid = {
      next: "",
      startAt: 0,
      maxResults: 10,
      total: 1,
      isLast: true,
      values: [{ id: 1, jiraProjectId: 2, key: "ABC", enabled: true }],
    };
    expect(() => listProjectsResponse.parse(valid)).not.toThrow();
  });

  it("rejects a list containing projects with invalid ID", () => {
    const invalid = {
      next: null,
      startAt: 0,
      maxResults: 10,
      total: 1,
      isLast: true,
      values: [{ id: "x", jiraProjectId: 2, key: "ABC", enabled: true }],
    };
    expect(() => listProjectsResponse.parse(invalid)).toThrow();
  });
});

describe("getProjectResponse", () => {
  it("validates a correct project", () => {
    const valid = {
      id: 1,
      jiraProjectId: 2,
      key: "ABC",
      enabled: true,
    };
    expect(() => getProjectResponse.parse(valid)).not.toThrow();
  });

  it("rejects an invalid project", () => {
    const invalid = { id: "x", jiraProjectId: 2, key: "ABC", enabled: true };
    expect(() => getProjectResponse.parse(invalid)).toThrow();
  });
});
