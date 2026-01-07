import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { QmetryClient } from "../../../qmetry/client";
import { TOOLS } from "../../../qmetry/client/tools/index.js";

const fetchMock = createFetchMock(vi);

// Helper to create and configure a client
async function createConfiguredClient(
  apiKey = "fake-token",
  baseUrl = "https://qmetry.example",
): Promise<QmetryClient> {
  const client = new QmetryClient();
  await client.configure({} as any, {
    api_key: apiKey,
    base_url: baseUrl,
  });
  return client;
}

describe("QmetryClient", () => {
  let client: QmetryClient;

  beforeEach(async () => {
    vi.clearAllMocks();
    fetchMock.enableMocks();
    fetchMock.resetMocks();
    client = await createConfiguredClient();
  });

  afterEach(() => {
    fetchMock.disableMocks();
  });

  describe("constructor", () => {
    it("should initialize with correct parameters", async () => {
      const testClient = await createConfiguredClient(
        "fake-token",
        "https://qmetry.example",
      );
      expect(testClient).toBeInstanceOf(QmetryClient);
      expect(testClient.getBaseUrl()).toBe("https://qmetry.example");
      expect(testClient.getToken()).toBe("fake-token");
    });

    it("should store token and endpoint", () => {
      expect(client.getBaseUrl()).toBe("https://qmetry.example");
      expect(client.getToken()).toBe("fake-token");
    });
  });

  describe("registerTools", () => {
    const mockRegister = vi.fn();
    const mockGetInput = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("registers all QMetry tools", async () => {
      await client.registerTools(mockRegister, mockGetInput);

      expect(mockRegister).toHaveBeenCalledTimes(TOOLS.length);
      expect(mockRegister.mock.calls[0][0].title).toBe(
        "Fetch QMetry list Projects",
      );
      expect(mockRegister.mock.calls[0][0].summary).toBe(
        "Fetch QMetry projects list including projectID, name, projectKey, isArchived, viewIds and folderPath needed for other operations",
      );
    });

    it("registers tools with correct structure", async () => {
      await client.registerTools(mockRegister, mockGetInput);

      // Check that all registered tools have the expected structure
      const toolCalls = mockRegister.mock.calls;
      expect(toolCalls.length).toBe(TOOLS.length);

      toolCalls.forEach(([toolConfig, handler], _index) => {
        expect(toolConfig).toHaveProperty("title");
        expect(toolConfig).toHaveProperty("summary");
        expect(typeof toolConfig.title).toBe("string");
        expect(typeof toolConfig.summary).toBe("string");
        expect(typeof handler).toBe("function");
      });
    });

    it("should throw if register function is missing", async () => {
      // @ts-expect-error testing bad input
      await expect(client.registerTools(null, mockGetInput)).rejects.toThrow(
        "register is not a function",
      );
    });
  });

  describe("utilities", () => {
    it("should expose token and baseUrl", () => {
      expect(client.getToken()).toBe("fake-token");
      expect(client.getBaseUrl()).toBe("https://qmetry.example");
    });
  });
});
