import { describe, expect, it } from "vitest";
import {
  getOADMatcherRecommendations,
  isPromptExecutionResult,
} from "./client/prompt-utils";

describe("Prompt Utils", () => {
  describe("getOADMatcherRecommendations tests", () => {
    it("returns a prompt execution result", () => {
      const openApiSpec = {
        openapi: "3.0.0",
        info: {
          title: "Test API",
          version: "1.0.0",
        },
        paths: {
          "/users": {
            get: {
              responses: {
                "200": {
                  description: "A list of users",
                },
              },
            },
          },
        },
        $$normalized: true,
      };

      const result = getOADMatcherRecommendations(openApiSpec);

      expect(isPromptExecutionResult(result)).toBe(true);
      expect(result.requiresPromptExecution).toBe(true);
      expect(result.prompt).toContain("Test API");
      expect(result.instructions).toContain(
        "Please execute the above prompt using your AI capabilities",
      );
    });
  });
});
