import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { GetScenario } from "../../../../../loadninja/tool/scenario/get-scenario";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const VALID_UUID = "bacca5c2-2a19-11a2-8004-a4305c690000";

describe("GetScenario", () => {
  let mockClient: any;
  let instance: GetScenario;

  beforeEach(() => {
    fetchMock.resetMocks();
    mockClient = {
      getBaseUrl: vi.fn().mockReturnValue("https://api.loadninja.com/v1"),
      getHeaders: vi.fn().mockReturnValue({
        authorization: "test-key",
        "Content-Type": "application/json",
      }),
    };
    instance = new GetScenario(mockClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Scenario");
  });

  it("should GET /scenario/{id} with correct URL and headers", async () => {
    const scenario = {
      data: {
        scenarioId: VALID_UUID,
        scenarioName: "Load Test",
        durationBased: true,
      },
    };
    fetchMock.mockResponseOnce(JSON.stringify(scenario));

    const result = await instance.handle(
      { scenarioId: VALID_UUID },
      {} as any,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.loadninja.com/v1/scenario/${VALID_UUID}`,
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          authorization: "test-key",
        }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.data.scenarioId).toBe(VALID_UUID);
  });

  it("should throw ToolError on non-2xx response", async () => {
    fetchMock.mockResponseOnce("Not Found", { status: 500 });
    await expect(
      instance.handle({ scenarioId: VALID_UUID }, {} as any),
    ).rejects.toThrow(`GET /scenario/${VALID_UUID} failed: 500`);
  });

  it("should throw on invalid UUID", async () => {
    await expect(
      instance.handle({ scenarioId: "not-a-uuid" }, {} as any),
    ).rejects.toThrow();
  });
});
