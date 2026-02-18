import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateTestCycle } from "../../../../../zephyr/tool/test-cycle/update-test-cycle";

describe("UpdateTestCycle", () => {
  let mockClient: any;
  let instance: UpdateTestCycle;

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
    instance = new UpdateTestCycle(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Update Test Cycle");
    expect(instance.specification.summary).toContain(
      "Update an existing Test Cycle in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBeDefined();

    const partialInput = {
      testCycleIdOrKey: "SA-R40",
      name: "Updated Name",
    };
    const partialResult =
      instance.specification.inputSchema?.safeParse(partialInput);
    expect(partialResult?.success).toBe(true);

    const missingKeyInput = { name: "Updated Name" };
    const missingKeyResult =
      instance.specification.inputSchema?.safeParse(missingKeyInput);
    expect(missingKeyResult?.success).toBe(false);
  });

  describe("handle method", () => {
    const existingTestCycle = {
      id: 1,
      key: "SA-R40",
      name: "Original Test Cycle",
      project: {
        id: 10005,
        self: "https://api.zephyrscale-dev.smartbear.com/v2/projects/10005",
      },
      jiraProjectVersion: {
        id: 10000,
        self: "https://jira.example/rest/api/2/version/10000",
      },
      status: {
        id: 10000,
        self: "https://api.zephyrscale-dev.smartbear.com/v2/statuses/10000",
      },
      folder: {
        id: 100006,
        self: "https://api.zephyrscale-dev.smartbear.com/v2/folders/10006",
      },
      description: "Original description",
      plannedStartDate: "2018-05-19T13:15:13Z",
      plannedEndDate: "2018-05-20T13:15:13Z",
      owner: {
        self: "https://jira.example/rest/api/2/user?accountId=9isdyh",
        accountId: "9isdyh",
      },
      customFields: {
        Environment: "Dev",
        Browser: "Chrome",
        Implemented: false
      },
      links: {
        self: "http://example.com",
        issues: [],
        webLinks: [],
        testPlans: [],
      },
    };

    beforeEach(() => {
      mockClient.getApiClient().get.mockResolvedValue(existingTestCycle);
    });

    it("should fetch existing test cycle and merge updates", async () => {
      const responseMock = {
        ...existingTestCycle,
        name: "Updated Test Cycle",
        description: "Updated description",
      };
      mockClient.getApiClient().put.mockResolvedValueOnce(responseMock);

      const args = {
        testCycleIdOrKey: "SA-R40",
        name: "Updated Test Cycle",
        description: "Updated description",
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);

      expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
        "/testcycles/SA-R40",
      );

      expect(mockClient.getApiClient().put).toHaveBeenCalledWith(
        "/testcycles/SA-R40",
        expect.objectContaining({
          name: "Updated Test Cycle",
          description: "Updated description",
          plannedStartDate: "2018-05-19T13:15:13Z",
          plannedEndDate: "2018-05-20T13:15:13Z",
          customFields: {
            Environment: "Dev",
            Browser: "Chrome",
            Implemented: false
          },
          project: {
            id: 10005,
            self: "https://api.zephyrscale-dev.smartbear.com/v2/projects/10005",
          },
          status: {
            id: 10000,
            self: "https://api.zephyrscale-dev.smartbear.com/v2/statuses/10000",
          },
          links: existingTestCycle.links,
        }),
      );
    });

    it("should preserve existing properties not included in updates", async () => {
      mockClient.getApiClient().put.mockResolvedValueOnce(existingTestCycle);

      const args = {
        testCycleIdOrKey: "SA-R40",
        name: "Updated Name Only",
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);

      const mergedBody = mockClient.getApiClient().put.mock.calls[0][1];

      expect(mergedBody.name).toBe("Updated Name Only");
      expect(mergedBody.description).toBe("Original description");
      expect(mergedBody.plannedStartDate).toBe("2018-05-19T13:15:13Z");
      expect(mergedBody.plannedEndDate).toBe("2018-05-20T13:15:13Z");
      expect(mergedBody.customFields).toEqual({
        Environment: "Dev",
        Browser: "Chrome",
        Implemented: false
      });
      expect(mergedBody.links).toEqual(existingTestCycle.links);
    });

    it("should handle API errors when fetching not existing test cycle", async () => {
      mockClient
        .getApiClient()
        .get.mockRejectedValueOnce(new Error("Test cycle not found"));

      const args = {
        testCycleIdOrKey: "SA-R40",
        name: "Updated Name",
      };

      await expect(
        instance.handle(args, EXTRA_REQUEST_HANDLER),
      ).rejects.toThrow("Test cycle not found");
    });

    it("should handle API errors when updating test cycle", async () => {
      mockClient.getApiClient().put.mockRejectedValueOnce(new Error("Update failed"));

      const args = {
        testCycleIdOrKey: "SA-R40",
        name: "Updated Name",
      };

      await expect(
        instance.handle(args, EXTRA_REQUEST_HANDLER),
      ).rejects.toThrow("Update failed");
    });
  });

  describe("deepMerge functionality", () => {
    const existingTestCycle = {
      id: 1,
      key: "SA-R40",
      name: "Original Test Cycle",
      project: {
        id: 10005,
        self: "https://api.zephyrscale-dev.smartbear.com/v2/projects/10005",
      },
      jiraProjectVersion: {
        id: 10000,
        self: "https://jira.example/rest/api/2/version/10000",
      },
      status: {
        id: 10000,
        self: "https://api.zephyrscale-dev.smartbear.com/v2/statuses/10000",
      },
      folder: {
        id: 100006,
        self: "https://api.zephyrscale-dev.smartbear.com/v2/folders/10006",
      },
      description: "Original description",
      plannedStartDate: "2018-05-19T13:15:13Z",
      plannedEndDate: "2018-05-20T13:15:13Z",
      owner: {
        self: "https://jira.example/rest/api/2/user?accountId=9isdyh",
        accountId: "9isdyh",
      },
      customFields: {
        Environment: "Dev",
        Browser: "Chrome",
        Implemented: false,
        Region: "US",
      },
      links: {
        self: "http://example.com",
        issues: [],
        webLinks: [],
        testPlans: [],
      },
    };

    beforeEach(() => {
      mockClient.getApiClient().get.mockResolvedValue(existingTestCycle);
      mockClient.getApiClient().put.mockResolvedValue(existingTestCycle);
    });

    it("should deep merge nested objects like customFields", async () => {
      const args = {
        testCycleIdOrKey: "SA-R40",
        customFields: {
          Browser: "Firefox",
          OS: "Windows",
        },
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);

      const mergedBody = mockClient.getApiClient().put.mock.calls[0][1];

      expect(mergedBody.customFields).toEqual({
        Environment: "Dev",
        Browser: "Firefox",
        Implemented: false,
        Region: "US",
        OS: "Windows",
      });

      expect(mergedBody.links).toEqual(existingTestCycle.links);
    });

    it("should skip undefined values in updates", async () => {
      const args = {
        testCycleIdOrKey: "SA-R40",
        name: "Updated Name",
        description: undefined,
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);

      const mergedBody = mockClient.getApiClient().put.mock.calls[0][1];
      expect(mergedBody.description).toBe("Original description");
      expect(mergedBody.name).toBe("Updated Name");
    });

    it("should handle null values by overwriting (regular fields)", async () => {
      const args = {
        testCycleIdOrKey: "SA-R40",
        description: null,
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);

      const mergedBody = mockClient.getApiClient().put.mock.calls[0][1];
      expect(mergedBody.description).toBeNull();
    });

    it("should NOT overwrite plannedStartDate when update provides null", async () => {
      const args = {
        testCycleIdOrKey: "SA-R40",
        plannedStartDate: null as any,
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);

      const mergedBody = mockClient.getApiClient().put.mock.calls[0][1];
      expect(mergedBody.plannedStartDate).toBe("2018-05-19T13:15:13Z");
    });

    it("should NOT overwrite plannedEndDate when update provides null", async () => {
      const args = {
        testCycleIdOrKey: "SA-R40",
        plannedEndDate: null as any,
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);

      const mergedBody = mockClient.getApiClient().put.mock.calls[0][1];
      expect(mergedBody.plannedEndDate).toBe("2018-05-20T13:15:13Z");
    });

    it("should update plannedStartDate/plannedEndDate when values are provided", async () => {
      const args = {
        testCycleIdOrKey: "SA-R40",
        plannedStartDate: "2018-06-01T00:00:00Z",
        plannedEndDate: "2018-06-10T00:00:00Z",
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);

      const mergedBody = mockClient.getApiClient().put.mock.calls[0][1];
      expect(mergedBody.plannedStartDate).toBe("2018-06-01T00:00:00Z");
      expect(mergedBody.plannedEndDate).toBe("2018-06-10T00:00:00Z");
    });

    it("should handle empty objects in updates (customFields: {}) without removing existing fields", async () => {
      const args = {
        testCycleIdOrKey: "SA-R40",
        customFields: {},
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);

      const mergedBody = mockClient.getApiClient().put.mock.calls[0][1];
      expect(mergedBody.customFields).toEqual({
        Environment: "Dev",
        Browser: "Chrome",
        Implemented: false,
        Region: "US",
      });
    });

    it("should merge deeply nested objects", async () => {
      const existingWithNested = {
        ...existingTestCycle,
        customFields: {
          ...existingTestCycle.customFields,
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

      mockClient.getApiClient().get.mockReset();
      mockClient.getApiClient().get.mockResolvedValueOnce(existingWithNested);

      const args = {
        testCycleIdOrKey: "SA-R40",
        customFields: {
          nested: {
            level1: {
              level2: {
                field2: "updated",
                field3: "new",
              },
            },
          },
        },
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);

      const mergedBody = mockClient.getApiClient().put.mock.calls[0][1];
      expect(mergedBody.customFields.nested).toEqual({
        level1: {
          level2: {
            field1: "value1",
            field2: "updated",
            field3: "new",
          },
          otherField: "preserved",
        },
      });
    });

    it("should handle complex merge scenario with multiple field types", async () => {
      const args = {
        testCycleIdOrKey: "SA-R40",
        name: "Updated Test Cycle",
        project: {
          id: 10006
        },
        jiraProjectVersion: {
          id: 10006
        },
        status: {
          id: 10006
        },
        folder: {
          id: 10006
        },
        description: "Updated description",
        plannedStartDate: "2035-03-19T13:15:13Z",
        plannedEndDate: "2035-05-20T13:15:13Z",
        owner: {
          accountId: "9",
        },
        customFields: {
          Browser: "Safari",
          Implemented: true,
          Region: "US",
          MultiOptionField: [
            "Option1",
            "Option2"
          ]
        }
      };

      await instance.handle(args, EXTRA_REQUEST_HANDLER);
      const mergedBody = mockClient.getApiClient().put.mock.calls[0][1];

      expect(mergedBody.name).toEqual("Updated Test Cycle");
      expect(mergedBody.project)
        .toEqual({
          id: 10006,
          self: "https://api.zephyrscale-dev.smartbear.com/v2/projects/10005",
        });
      expect(mergedBody.jiraProjectVersion)
        .toEqual({
          id: 10006,
          self: "https://jira.example/rest/api/2/version/10000",
        });
      expect(mergedBody.status)
        .toEqual({
          id: 10006,
          self: "https://api.zephyrscale-dev.smartbear.com/v2/statuses/10000",
        });
      expect(mergedBody.folder)
        .toEqual({
          id: 10006,
          self: "https://api.zephyrscale-dev.smartbear.com/v2/folders/10006",
        });
      expect(mergedBody.description).toEqual("Updated description")
      expect(mergedBody.plannedStartDate).toEqual("2035-03-19T13:15:13Z");
      expect(mergedBody.plannedEndDate).toEqual("2035-05-20T13:15:13Z");
      expect(mergedBody.owner).toEqual({
            self: "https://jira.example/rest/api/2/user?accountId=9isdyh",
            accountId: "9",
        }
      );
      expect(mergedBody.customFields).toEqual({
        Environment: "Dev",
        Browser: "Safari",
        Implemented: true,
        Region: "US",
        MultiOptionField: [
          "Option1",
          "Option2"
        ]
      });
    });
  });
});
