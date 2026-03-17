import { describe, expect, it } from "vitest";
import {
  GetProject200Response as GetProjectResponse,
  ListProjects200Response as ListProjectsResponse,
} from "../../../../zephyr/common/rest-api-schemas";

describe("listProjectsResponse", () => {
  it("rejects responses with invalid next", () => {
    const valid = {
      next: "",
      startAt: 0,
      maxResults: 10,
      total: 1,
      isLast: true,
      values: [{ id: 1, jiraProjectId: 2, key: "ABC", enabled: true }],
    };
    expect(() => ListProjectsResponse.parse(valid)).toThrow();
  });

  it("validates a correct project list", () => {
    const valid = {
      next: "https://api.zephyrscale.smartbear.com/v2/projects?startAt=10&maxResults=10",
      startAt: 0,
      maxResults: 10,
      total: 1,
      isLast: true,
      values: [{ id: 1, jiraProjectId: 2, key: "ABC", enabled: true }],
    };
    expect(() => ListProjectsResponse.parse(valid)).not.toThrow();
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
    expect(() => ListProjectsResponse.parse(invalid)).toThrow();
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
    expect(() => GetProjectResponse.parse(valid)).not.toThrow();
  });

  it("rejects an invalid project", () => {
    const invalid = { id: "x", jiraProjectId: 2, key: "ABC", enabled: true };
    expect(() => GetProjectResponse.parse(invalid)).toThrow();
  });
});
