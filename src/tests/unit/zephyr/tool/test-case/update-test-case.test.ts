import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateTestCase } from "../../../../../zephyr/tool/test-case/update-test-case";

describe("UpdateTestCase", () => {
  let mockClient: any;
  let instance: UpdateTestCase;
  const EXTRA_REQUEST_HANDLER: RequestHandlerExtra<
    ServerRequest,
    ServerNotification
  > = {
    signal: AbortSignal.timeout(5000),
    requestId: "",
    sendNotification: (_notification) => {
      throw new Error("Function not implemented.");
    },
    sendRequest: (_request, _resultSchema, _options?) => {
      throw new Error("Function not implemented.");
    },
  };

  beforeEach(() => {
    mockClient = {
      getApiClient: vi.fn().mockReturnValue({
        get: vi.fn(),
        put: vi.fn(),
      }),
    };
    instance = new UpdateTestCase(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Update Test Case");
    expect(instance.specification.summary).toContain(
      "Update an existing Test Case in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.idempotent).toBe(true);

    // Input schema should accept partial updates (only testCaseKey is required)
    expect(instance.specification.inputSchema).toBeDefined();

    // Test that the schema accepts partial body updates
    const partialInput = {
      testCaseKey: "TEST-T123",
      name: "Updated Name",
    };
    const partialResult =
      instance.specification.inputSchema?.safeParse(partialInput);
    expect(partialResult?.success).toBe(true);

    // Test that testCaseKey is required
    const missingKeyInput = { name: "Updated Name" };
    const missingKeyResult =
      instance.specification.inputSchema?.safeParse(missingKeyInput);
    expect(missingKeyResult?.success).toBe(false);

    // Output schema should accept both empty object and response with data
    expect(instance.specification.outputSchema).toBeDefined();

    // Test that empty object is valid
    const emptyOutput = {};
    const emptyResult =
      instance.specification.outputSchema?.safeParse(emptyOutput);
    expect(emptyResult?.success).toBe(true);

    // Test that a default response structure (error object) is valid
    const validErrorOutput = {
      errorCode: 404,
      message: "Test Case not found",
    };
    const validResult =
      instance.specification.outputSchema?.safeParse(validErrorOutput);
    expect(validResult?.success).toBe(true);
  });

  describe("handle method", () => {
    const existingTestCase = {
      id: 12345,
      key: "SA-T10",
      name: "Original Test Case",
      project: {
        id: 100,
        self: "https://api.zephyrscale-dev.smartbear.com/v2/projects/100",
      },
      priority: {
        id: 1,
        self: "https://api.zephyrscale-dev.smartbear.com/v2/priorities/7467",
      },
      status: {
        id: 1,
        self: "https://api.zephyrscale-dev.smartbear.com/v2/statuses/7463",
      },
      objective: "Original objective",
      labels: ["existing-label"],
      customFields: {
        Environment: "Dev",
        Browser: "Chrome",
      },
    };

    beforeEach(() => {
      mockClient.getApiClient().get.mockResolvedValue(existingTestCase);
    });

    it("should fetch existing test case and merge updates", async () => {
      const responseMock = {
        ...existingTestCase,
        name: "Updated Test Case",
        objective: "Updated objective",
      };
      mockClient.getApiClient().put.mockResolvedValueOnce(responseMock);

      const args = {
        testCaseKey: "SA-T10",
        id: 12345,
        key: "SA-T10",
        name: "Updated Test Case",
        project: { id: 100 },
        priority: { id: 1 },
        status: { id: 1 },
        objective: "Updated objective",
      };

      const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);

      expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
        "/testcases/SA-T10",
      );
      expect(mockClient.getApiClient().put).toHaveBeenCalledWith(
        "/testcases/SA-T10",
        expect.objectContaining({
          name: "Updated Test Case",
          objective: "Updated objective",
          labels: ["existing-label"], // Should preserve existing labels
          customFields: {
            Environment: "Dev",
            Browser: "Chrome",
          },
          project: {
            id: 100,
            self: "https://api.zephyrscale-dev.smartbear.com/v2/projects/100",
          },
          priority: {
            id: 1,
            self: "https://api.zephyrscale-dev.smartbear.com/v2/priorities/7467",
          },
          status: {
            id: 1,
            self: "https://api.zephyrscale-dev.smartbear.com/v2/statuses/7463",
          },
        }),
      );
      expect(result.structuredContent).toBe(responseMock);
    });

    it("should preserve existing properties not included in updates", async () => {
      mockClient.getApiClient().put.mockResolvedValueOnce(existingTestCase);

      const args = {
        testCaseKey: "SA-T10",
        id: 12345,
        key: "SA-T10",
        name: "Updated Test Case",
        project: { id: 100 },
        priority: { id: 1 },
        status: { id: 1 },
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);

      const putCall = mockClient.getApiClient().put.mock.calls[0];
      const mergedBody = putCall[1];

      expect(mergedBody.name).toBe("Updated Test Case");
      expect(mergedBody.objective).toBe("Original objective"); // Preserved
      expect(mergedBody.labels).toEqual(["existing-label"]); // Preserved
      expect(mergedBody.customFields).toEqual({
        Environment: "Dev",
        Browser: "Chrome",
      }); // Preserved
      expect(mergedBody.project).toEqual({
        id: 100,
        self: "https://api.zephyrscale-dev.smartbear.com/v2/projects/100",
      }); // Self link is preserved and not replaced, because we ignore it during Test Case update anyway
      expect(mergedBody.priority).toEqual({
        id: 1,
        self: "https://api.zephyrscale-dev.smartbear.com/v2/priorities/7467",
      }); // Self link is preserved and not replaced, because we ignore it during Test Case update anyway
      expect(mergedBody.status).toEqual({
        id: 1,
        self: "https://api.zephyrscale-dev.smartbear.com/v2/statuses/7463",
      }); // Self link is preserved and not replaced, because we ignore it during Test Case update anyway
    });

    it("should handle API errors when fetching existing test case", async () => {
      mockClient
        .getApiClient()
        .get.mockRejectedValueOnce(new Error("Test case not found"));

      const args = {
        testCaseKey: "SA-T10",
        id: 12345,
        key: "SA-T10",
        name: "Updated Test Case",
        project: { id: 100 },
        priority: { id: 1 },
        status: { id: 1 },
      };

      await expect(
        instance.handle(args, EXTRA_REQUEST_HANDLER),
      ).rejects.toThrow("Test case not found");
    });

    it("should handle API errors when updating test case", async () => {
      mockClient
        .getApiClient()
        .put.mockRejectedValueOnce(new Error("Update failed"));

      const args = {
        testCaseKey: "SA-T10",
        id: 12345,
        key: "SA-T10",
        name: "Updated Test Case",
        project: { id: 100 },
        priority: { id: 1 },
        status: { id: 1 },
      };

      await expect(
        instance.handle(args, EXTRA_REQUEST_HANDLER),
      ).rejects.toThrow("Update failed");
    });
  });

  describe("deepMerge functionality", () => {
    const existingTestCase = {
      id: 12345,
      key: "SA-T10",
      name: "Original Test Case",
      project: {
        id: 100,
        self: "https://api.zephyrscale-dev.smartbear.com/v2/projects/100",
      },
      priority: {
        id: 1,
        self: "https://api.zephyrscale-dev.smartbear.com/v2/priorities/7467",
      },
      status: {
        id: 1,
        self: "https://api.zephyrscale-dev.smartbear.com/v2/statuses/7463",
      },
      objective: "Original objective",
      labels: ["existing-label"],
      customFields: {
        Environment: "Dev",
        Browser: "Chrome",
        Region: "US",
      },
    };

    beforeEach(() => {
      mockClient.getApiClient().get.mockResolvedValue(existingTestCase);
      mockClient.getApiClient().put.mockResolvedValue(existingTestCase);
    });

    it("should deep merge nested objects like customFields", async () => {
      const args = {
        testCaseKey: "SA-T10",
        id: 12345,
        key: "SA-T10",
        name: "Original Test Case",
        project: { id: 100 },
        priority: { id: 1 },
        status: { id: 1 },
        customFields: {
          Browser: "Firefox", // Update existing field
          OS: "Windows", // Add new field
        },
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);

      const putCall = mockClient.getApiClient().put.mock.calls[0];
      const mergedBody = putCall[1];

      expect(mergedBody.customFields).toEqual({
        Environment: "Dev", // Preserved from existing
        Browser: "Firefox", // Updated
        Region: "US", // Preserved from existing
        OS: "Windows", // Added new
      });
    });

    it("should replace arrays instead of merging them", async () => {
      const args = {
        testCaseKey: "SA-T10",
        id: 12345,
        key: "SA-T10",
        name: "Original Test Case",
        project: { id: 100 },
        priority: { id: 1 },
        status: { id: 1 },
        // Should replace, not merge. Realistically, when customer asks the MCP client to add a label, the client always uses preceding get_test_case call to create a new array with the new label added
        labels: ["new-label", "another-label"],
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);

      const putCall = mockClient.getApiClient().put.mock.calls[0];
      const mergedBody = putCall[1];

      expect(mergedBody.labels).toEqual(["new-label", "another-label"]);
      expect(mergedBody.labels).not.toContain("existing-label");
    });

    it("should skip undefined values in updates", async () => {
      const args = {
        testCaseKey: "SA-T10",
        id: 12345,
        key: "SA-T10",
        name: "Updated Test Case",
        project: { id: 100 },
        priority: { id: 1 },
        status: { id: 1 },
        objective: undefined, // Should be skipped
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);

      const putCall = mockClient.getApiClient().put.mock.calls[0];
      const mergedBody = putCall[1];

      expect(mergedBody.objective).toBe("Original objective"); // Preserved
      expect(mergedBody.name).toBe("Updated Test Case"); // Updated
    });

    it("should handle null values by overwriting", async () => {
      const args = {
        testCaseKey: "SA-T10",
        id: 12345,
        key: "SA-T10",
        name: "Original Test Case",
        project: { id: 100 },
        priority: { id: 1 },
        status: { id: 1 },
        objective: null, // Should overwrite with null
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);

      const putCall = mockClient.getApiClient().put.mock.calls[0];
      const mergedBody = putCall[1];

      expect(mergedBody.objective).toBeNull();
    });

    it("should handle empty objects in updates", async () => {
      const args = {
        testCaseKey: "SA-T10",
        id: 12345,
        key: "SA-T10",
        name: "Original Test Case",
        project: { id: 100 },
        priority: { id: 1 },
        status: { id: 1 },
        customFields: {}, // Empty object should not remove existing fields
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);

      const putCall = mockClient.getApiClient().put.mock.calls[0];
      const mergedBody = putCall[1];

      // When merging with empty object, existing fields should be preserved
      expect(mergedBody.customFields).toEqual({
        Environment: "Dev",
        Browser: "Chrome",
        Region: "US",
      });
    });

    it("should merge deeply nested objects", async () => {
      const existingWithNested = {
        ...existingTestCase,
        customFields: {
          ...existingTestCase.customFields,
          nested: {
            level1: {
              level2: {
                field1: "value1",
                field2: "value2",
              },
              otherField: "preserved",
            },
          },
        },
      };

      // Reset the mock for this specific test
      mockClient.getApiClient().get.mockReset();
      mockClient.getApiClient().get.mockResolvedValueOnce(existingWithNested);

      const args = {
        testCaseKey: "SA-T10",
        id: 12345,
        key: "SA-T10",
        name: "Original Test Case",
        project: { id: 100 },
        priority: { id: 1 },
        status: { id: 1 },
        customFields: {
          nested: {
            level1: {
              level2: {
                field2: "updated", // Update existing
                field3: "new", // Add new
              },
            },
          },
        },
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);

      const putCall = mockClient.getApiClient().put.mock.calls[0];
      const mergedBody = putCall[1];

      expect(mergedBody.customFields.nested).toEqual({
        level1: {
          level2: {
            field1: "value1", // Preserved
            field2: "updated", // Updated
            field3: "new", // Added
          },
          otherField: "preserved", // Preserved
        },
      });
    });

    it("should handle primitive value updates", async () => {
      const args = {
        testCaseKey: "SA-T10",
        id: 12345,
        key: "SA-T10",
        name: "Completely New Name",
        project: { id: 200 }, // Changed
        priority: { id: 2 }, // Changed
        status: { id: 3 }, // Changed
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);

      const putCall = mockClient.getApiClient().put.mock.calls[0];
      const mergedBody = putCall[1];

      expect(mergedBody.name).toBe("Completely New Name");
      expect(mergedBody.project).toEqual({
        id: 200,
        self: "https://api.zephyrscale-dev.smartbear.com/v2/projects/100",
      });
      expect(mergedBody.priority).toEqual({
        id: 2,
        self: "https://api.zephyrscale-dev.smartbear.com/v2/priorities/7467",
      });
      expect(mergedBody.status).toEqual({
        id: 3,
        self: "https://api.zephyrscale-dev.smartbear.com/v2/statuses/7463",
      });
    });

    it("should handle updating with estimatedTime", async () => {
      const args = {
        testCaseKey: "SA-T10",
        id: 12345,
        key: "SA-T10",
        name: "Original Test Case",
        project: { id: 100 },
        priority: { id: 1 },
        status: { id: 1 },
        estimatedTime: 3600000, // Add estimated time
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);

      const putCall = mockClient.getApiClient().put.mock.calls[0];
      const mergedBody = putCall[1];

      expect(mergedBody.estimatedTime).toBe(3600000);
      expect(mergedBody.name).toBe("Original Test Case"); // Preserved
    });

    it("should handle complex merge scenario with multiple field types", async () => {
      const args = {
        testCaseKey: "SA-T10",
        id: 12345,
        key: "SA-T10",
        name: "Updated Name", // Primitive update
        project: { id: 100 },
        priority: { id: 2 }, // Object update
        status: { id: 1 },
        labels: ["regression", "automated"], // Array replacement
        customFields: {
          // Nested object merge
          Browser: "Safari", // Update existing
          NewField: "NewValue", // Add new
        },
        estimatedTime: 7200000, // Add new field
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);

      const putCall = mockClient.getApiClient().put.mock.calls[0];
      const mergedBody = putCall[1];

      expect(mergedBody.name).toBe("Updated Name");
      expect(mergedBody.project).toEqual({
        id: 100,
        self: "https://api.zephyrscale-dev.smartbear.com/v2/projects/100",
      });
      expect(mergedBody.priority).toEqual({
        id: 2,
        self: "https://api.zephyrscale-dev.smartbear.com/v2/priorities/7467",
      });
      expect(mergedBody.status).toEqual({
        id: 1,
        self: "https://api.zephyrscale-dev.smartbear.com/v2/statuses/7463",
      });
      expect(mergedBody.labels).toEqual(["regression", "automated"]);
      expect(mergedBody.customFields).toEqual({
        Environment: "Dev", // Preserved
        Browser: "Safari", // Updated
        Region: "US", // Preserved
        NewField: "NewValue", // Added
      });
      expect(mergedBody.estimatedTime).toBe(7200000);
      expect(mergedBody.objective).toBe("Original objective"); // Preserved
    });
  });
});
