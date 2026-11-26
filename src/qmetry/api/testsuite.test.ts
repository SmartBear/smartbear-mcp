import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchTestSuites } from "../client/testsuite.js";

const token = "fake-token";
const baseUrl = "https://qmetry.example";
const projectKey = "TEST_PROJECT";

const mockOk = (data: any) => ({
  ok: true,
  json: async () => data,
  text: async () => JSON.stringify(data),
});

describe("testsuite API clients", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("fetchTestSuites", () => {
    it("should POST to the test suite list with folderPath defaulted to root and no viewId", async () => {
      global.fetch = vi.fn().mockResolvedValue(mockOk({ data: [] }));

      await fetchTestSuites(token, baseUrl, projectKey, {} as any);

      const [url, init] = (global.fetch as any).mock.calls[0];
      expect(url).toBe(`${baseUrl}/rest/testsuites/list/viewColumns`);
      expect(init.method).toBe("POST");
      const body = JSON.parse(init.body);
      expect(body.folderPath).toBe("");
      expect(body).not.toHaveProperty("viewId");
    });

    it("should keep a caller-supplied folderPath", async () => {
      global.fetch = vi.fn().mockResolvedValue(mockOk({ data: [] }));

      await fetchTestSuites(token, baseUrl, projectKey, {
        folderPath: "Regression",
      } as any);

      const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(body.folderPath).toBe("Regression");
    });

    it("should throw when folderPath is not a string", async () => {
      await expect(
        fetchTestSuites(token, baseUrl, projectKey, { folderPath: 1 } as any),
      ).rejects.toThrow(
        "[fetchTestSuites] Missing or invalid required parameter: 'folderPath'.",
      );
    });
  });
});
