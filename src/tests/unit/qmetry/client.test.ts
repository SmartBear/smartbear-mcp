import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QmetryClient } from "../../../qmetry/client";
import createFetchMock from "vitest-fetch-mock";

const fetchMock = createFetchMock(vi);

describe("QmetryClient", () => {
  let client: QmetryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.enableMocks();
    fetchMock.resetMocks();
    client = new QmetryClient("fake-token", "https://qmetry.example");
  });

  afterEach(() => {
    fetchMock.disableMocks();
  });

  describe("constructor", () => {
    it("should initialize with correct parameters", () => {
      const testClient = new QmetryClient("fake-token", "https://qmetry.example");
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

    it("registers all QMetry tools", () => {
      client.registerTools(mockRegister, mockGetInput);

      expect(mockRegister).toHaveBeenCalledTimes(6);
      expect(mockRegister.mock.calls[0][0].title).toBe("Set QMetry Project Info");
      expect(mockRegister.mock.calls[0][0].summary).toBe("Set current QMetry project for your account");
    });

    it("registers tools with correct structure", () => {
      client.registerTools(mockRegister, mockGetInput);

      // Check that all registered tools have the expected structure
      const toolCalls = mockRegister.mock.calls;
      expect(toolCalls.length).toBe(6);
      
      toolCalls.forEach(([toolConfig, handler], index) => {
        expect(toolConfig).toHaveProperty('title');
        expect(toolConfig).toHaveProperty('summary');
        expect(toolConfig).toHaveProperty('parameters');
        expect(typeof toolConfig.title).toBe('string');
        expect(typeof toolConfig.summary).toBe('string');
        expect(Array.isArray(toolConfig.parameters)).toBe(true);
        expect(typeof handler).toBe('function');
      });
    });

    it("should throw if register function is missing", () => {
      // @ts-expect-error testing bad input
      expect(() => client.registerTools(null, mockGetInput)).toThrow();
    });
  });

  describe("utilities", () => {
    it("should expose token and baseUrl", () => {
      expect(client.getToken()).toBe("fake-token");
      expect(client.getBaseUrl()).toBe("https://qmetry.example");
    });
  });
});
