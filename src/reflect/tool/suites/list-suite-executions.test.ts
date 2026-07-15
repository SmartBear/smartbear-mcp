import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import type { ReflectClient } from "../../client.ts";
import { ListSuiteExecutions } from "./list-suite-executions.ts";

type Extra = RequestHandlerExtra<ServerRequest, ServerNotification>;

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const executionsMock = [
  { id: "exec-1", status: "passed" },
  { id: "exec-2", status: "failed" },
];

describe("ListSuiteExecutions", () => {
  let mockClient: Pick<ReflectClient, "getHeaders">;
  let instance: ListSuiteExecutions;

  beforeEach(() => {
    fetchMock.resetMocks();

    mockClient = {
      getHeaders: vi.fn().mockReturnValue({
        "X-API-KEY": "test-api-key",
        "Content-Type": "application/json",
      }),
    };

    instance = new ListSuiteExecutions(mockClient as unknown as ReflectClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("List Suite Executions");
  });

  it("should call suite executions API and return results", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(executionsMock));

    const result = await instance.handle(
      { suiteId: "suite-1" },
      {} as unknown as Extra,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.reflect.run/v1/suites/suite-1/executions",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as TextContent).text);
    expect(parsed).toHaveLength(2);
  });

  it("should throw ToolError if suiteId is missing", async () => {
    await expect(instance.handle({}, {} as unknown as Extra)).rejects.toThrow(
      "suiteId argument is required",
    );
  });

  it("should throw ToolError if fetch fails", async () => {
    fetchMock.mockResponseOnce("Not Found", { status: 404 });
    await expect(
      instance.handle({ suiteId: "suite-1" }, {} as unknown as Extra),
    ).rejects.toThrow("Failed to list suite executions");
  });
});
