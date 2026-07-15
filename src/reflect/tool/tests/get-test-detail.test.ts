import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { GetTestDetail } from "./get-test-detail.ts";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const testDetailMock = {
  id: 1,
  name: "Sauce Demo",
  description: "",
  steps: [
    {
      type: "direct-navigation",
      url: "https://www.saucedemo.com/",
    },
    {
      type: "click",
      selector: '[data-test="username"]',
    },
    {
      type: "input",
      selector: '[data-test="username"]',
      inputText: "error_user",
    },
    {
      type: "click",
      selector: '[data-test="password"]',
    },
    {
      type: "input",
      selector: '[data-test="password"]',
      inputText: "secret_sauce",
    },
    {
      type: "click",
      selector: '[data-test="login-button"]',
    },
    {
      type: "implicit-navigation",
      url: "https://www.saucedemo.com/inventory.html",
    },
  ],
};

describe("GetTestDetail", () => {
  let mockClient: any;
  let instance: GetTestDetail;

  beforeEach(() => {
    fetchMock.resetMocks();

    mockClient = {
      getHeaders: vi.fn().mockReturnValue({
        "X-API-KEY": "test-api-key",
        "Content-Type": "application/json",
      }),
    };

    instance = new GetTestDetail(mockClient as any);
  });

  describe("specification", () => {
    it("should have the correct title", () => {
      expect(instance.specification.title).toBe("Get Test Detail");
    });

    it("should have the correct toolset", () => {
      expect(instance.specification.toolset).toBe("Tests");
    });

    it("should have a non-empty summary", () => {
      expect(instance.specification.summary).toBeTruthy();
    });
  });

  describe("handle – happy path", () => {
    it("should call the correct URL with GET method and auth headers", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(testDetailMock));

      await instance.handle({ testId: "1" }, {} as any);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.reflect.run/v1/tests/1",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
        }),
      );
    });

    it("should return test id and name in the response", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(testDetailMock));

      const result = await instance.handle({ testId: "1" }, {} as any);

      const parsed = JSON.parse((result.content[0] as any).text);
      expect(parsed.id).toBe(1);
      expect(parsed.name).toBe("Sauce Demo");
    });

    it("should return the full steps array in the response", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(testDetailMock));

      const result = await instance.handle({ testId: "1" }, {} as any);

      const parsed = JSON.parse((result.content[0] as any).text);
      expect(parsed.steps).toHaveLength(7);
    });

    it("should include direct-navigation step with correct url", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(testDetailMock));

      const result = await instance.handle({ testId: "1" }, {} as any);

      const parsed = JSON.parse((result.content[0] as any).text);
      const navStep = parsed.steps.find(
        (s: any) => s.type === "direct-navigation",
      );
      expect(navStep?.url).toBe("https://www.saucedemo.com/");
    });

    it("should include input step with inputText", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(testDetailMock));

      const result = await instance.handle({ testId: "1" }, {} as any);

      const parsed = JSON.parse((result.content[0] as any).text);
      const inputStep = parsed.steps.find(
        (s: any) =>
          s.type === "input" && s.selector === '[data-test="username"]',
      );
      expect(inputStep?.inputText).toBe("error_user");
    });

    it("should return content as a text node", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(testDetailMock));

      const result = await instance.handle({ testId: "1" }, {} as any);

      expect(result.content[0].type).toBe("text");
    });
  });

  describe("handle – error cases", () => {
    it("should throw ToolError if testId is missing (empty string)", async () => {
      await expect(instance.handle({ testId: "" }, {} as any)).rejects.toThrow(
        "testId argument is required",
      );
    });

    it("should throw ToolError if testId is not provided at all", async () => {
      await expect(instance.handle({}, {} as any)).rejects.toThrow(
        "testId argument is required",
      );
    });

    it("should throw ToolError if testId is whitespace-only", async () => {
      await expect(
        instance.handle({ testId: "   " }, {} as any),
      ).rejects.toThrow("testId argument is required");
    });

    it("should throw ToolError on 401 Unauthorized", async () => {
      fetchMock.mockResponseOnce("Unauthorized", { status: 401 });

      await expect(instance.handle({ testId: "1" }, {} as any)).rejects.toThrow(
        "Failed to get test detail",
      );
    });

    it("should throw ToolError on 404 Not Found", async () => {
      fetchMock.mockResponseOnce("Not Found", { status: 404 });

      await expect(
        instance.handle({ testId: "999" }, {} as any),
      ).rejects.toThrow("Failed to get test detail");
    });

    it("should throw ToolError on 500 Internal Server Error", async () => {
      fetchMock.mockResponseOnce("Server Error", { status: 500 });

      await expect(instance.handle({ testId: "1" }, {} as any)).rejects.toThrow(
        "Failed to get test detail",
      );
    });

    it("should include HTTP status in the error message", async () => {
      fetchMock.mockResponseOnce("Not Found", { status: 404 });

      await expect(instance.handle({ testId: "1" }, {} as any)).rejects.toThrow(
        "404",
      );
    });
  });
});
