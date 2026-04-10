import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { PactflowClient } from "../../../pactflow/client";

const fetchMock = createFetchMock(vi);

async function createConfiguredClient(config: {
  token?: string;
  username?: string;
  password?: string;
}): Promise<PactflowClient> {
  const client = new PactflowClient();
  const mockServer = { server: vi.fn() } as any;
  await client.configure(mockServer, {
    base_url: "https://example.com",
    token: config.token,
    username: config.username,
    password: config.password,
  });
  return client;
}

describe("PactFlowClient", () => {
  let client: PactflowClient;

  beforeEach(async () => {
    vi.clearAllMocks();
    fetchMock.enableMocks();
    fetchMock.resetMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    fetchMock.disableMocks();
  });

  describe("API Methods", () => {
    beforeEach(async () => {
      client = await createConfiguredClient({ token: "test-token" });
    });

    describe("listPacticipants", () => {
      it("should retrieve pacticipants without params", async () => {
        // PacticipantsResponse._embedded.pacticipants
        const mockResponse = {
          _embedded: { pacticipants: [{ name: "ServiceA" }] },
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.listPacticipants();

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result._embedded?.pacticipants).toHaveLength(1);
      });

      it("should append pagination query params", async () => {
        fetchMock.mockResponseOnce(
          JSON.stringify({ _embedded: { pacticipants: [] } }),
        );

        await client.listPacticipants({ pageNumber: 2, pageSize: 10 });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants?page=2&size=10",
          { method: "GET", headers: client.requestHeaders },
        );
      });

      it("should handle HTTP errors", async () => {
        fetchMock.mockResponseOnce("Unauthorized", {
          status: 401,
          statusText: "Unauthorized",
        });
        await expect(client.listPacticipants()).rejects.toThrow(
          "List Pacticipants Failed - status: 401 Unauthorized - Unauthorized",
        );
      });
    });

    describe("getPacticipant", () => {
      it("should retrieve a pacticipant by name", async () => {
        const mockResponse = { name: "ServiceA", mainBranch: "main" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getPacticipant({
          pacticipantName: "ServiceA",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.name).toBe("ServiceA");
      });

      it("should URL-encode the pacticipant name", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ name: "Service A/B" }));

        await client.getPacticipant({ pacticipantName: "Service A/B" });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/Service%20A%2FB",
          { method: "GET", headers: client.requestHeaders },
        );
      });

      it("should handle 404 when pacticipant not found", async () => {
        fetchMock.mockResponseOnce("Not found", {
          status: 404,
          statusText: "Not Found",
        });
        await expect(
          client.getPacticipant({ pacticipantName: "Unknown" }),
        ).rejects.toThrow(
          "Get Pacticipant Failed - status: 404 Not Found - Not found",
        );
      });
    });

    describe("listBranches", () => {
      it("should retrieve branches for a pacticipant", async () => {
        // BranchesResponse._embedded.branches
        const mockResponse = { _embedded: { branches: [{ name: "main" }] } };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.listBranches({
          pacticipantName: "ServiceA",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/branches",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result._embedded?.branches).toHaveLength(1);
      });

      it("should append filter and pagination query params", async () => {
        fetchMock.mockResponseOnce(
          JSON.stringify({ _embedded: { branches: [] } }),
        );

        await client.listBranches({
          pacticipantName: "ServiceA",
          q: "feat",
          pageNumber: 1,
          pageSize: 20,
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/branches?q=feat&pageNumber=1&pageSize=20",
          { method: "GET", headers: client.requestHeaders },
        );
      });
    });

    describe("listVersions", () => {
      it("should retrieve versions for a pacticipant", async () => {
        // VersionsResponse._embedded.versions
        const mockResponse = { _embedded: { versions: [{ number: "1.0.0" }] } };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.listVersions({
          pacticipantName: "ServiceA",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/versions",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result._embedded?.versions).toHaveLength(1);
      });

      it("should append pagination query params", async () => {
        fetchMock.mockResponseOnce(
          JSON.stringify({ _embedded: { versions: [] } }),
        );

        await client.listVersions({
          pacticipantName: "ServiceA",
          pageNumber: 2,
          pageSize: 50,
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/versions?page=2&size=50",
          { method: "GET", headers: client.requestHeaders },
        );
      });
    });

    describe("getVersion", () => {
      it("should retrieve a specific version", async () => {
        const mockResponse = { number: "1.0.0", branch: "main" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getVersion({
          pacticipantName: "ServiceA",
          versionNumber: "1.0.0",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/versions/1.0.0",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.number).toBe("1.0.0");
      });

      it("should URL-encode version number with special characters", async () => {
        fetchMock.mockResponseOnce(
          JSON.stringify({ number: "1.0.0-beta+build.1" }),
        );

        await client.getVersion({
          pacticipantName: "ServiceA",
          versionNumber: "1.0.0-beta+build.1",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/versions/1.0.0-beta%2Bbuild.1",
          { method: "GET", headers: client.requestHeaders },
        );
      });
    });

    describe("getLatestVersion", () => {
      it("should retrieve the latest version without tag", async () => {
        const mockResponse = { number: "2.0.0" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getLatestVersion({
          pacticipantName: "ServiceA",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/latest-version",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.number).toBe("2.0.0");
      });

      it("should retrieve the latest version filtered by tag", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ number: "1.5.0" }));

        await client.getLatestVersion({
          pacticipantName: "ServiceA",
          tag: "prod",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/latest-version/prod",
          { method: "GET", headers: client.requestHeaders },
        );
      });
    });

    describe("updatePacticipant", () => {
      it("should send a PUT request to update pacticipant metadata", async () => {
        const mockResponse = { name: "ServiceA", mainBranch: "main" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        await client.updatePacticipant({
          pacticipantName: "ServiceA",
          mainBranch: "main",
          displayName: "Service A",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA",
          {
            method: "PUT",
            headers: client.requestHeaders,
            body: JSON.stringify({
              mainBranch: "main",
              displayName: "Service A",
            }),
          },
        );
      });
    });

    describe("patchPacticipant", () => {
      it("should send a PATCH request to partially update pacticipant metadata", async () => {
        const mockResponse = { name: "ServiceA", mainBranch: "develop" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        await client.patchPacticipant({
          pacticipantName: "ServiceA",
          mainBranch: "develop",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA",
          {
            method: "PATCH",
            headers: client.requestHeaders,
            body: JSON.stringify({ mainBranch: "develop" }),
          },
        );
      });
    });

    describe("updateVersion", () => {
      it("should send a PUT request to update a version's build URL", async () => {
        const mockResponse = { number: "1.0.0", buildUrl: "https://ci.com/1" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        await client.updateVersion({
          pacticipantName: "ServiceA",
          versionNumber: "1.0.0",
          buildUrl: "https://ci.com/1",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/versions/1.0.0",
          {
            method: "PUT",
            headers: client.requestHeaders,
            body: JSON.stringify({ buildUrl: "https://ci.com/1" }),
          },
        );
      });
    });

    describe("getBranchVersions", () => {
      it("should retrieve all versions for a branch", async () => {
        // VersionsResponse._embedded.versions
        const mockResponse = { _embedded: { versions: [{ number: "1.0.0" }] } };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getBranchVersions({
          pacticipantName: "ServiceA",
          branchName: "main",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/branches/main/versions",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result._embedded?.versions).toHaveLength(1);
      });

      it("should append pagination params", async () => {
        fetchMock.mockResponseOnce(
          JSON.stringify({ _embedded: { versions: [] } }),
        );

        await client.getBranchVersions({
          pacticipantName: "ServiceA",
          branchName: "main",
          pageNumber: 2,
          pageSize: 25,
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/branches/main/versions?page=2&size=25",
          { method: "GET", headers: client.requestHeaders },
        );
      });
    });

    describe("createPacticipant", () => {
      it("should create a new pacticipant", async () => {
        const mockResponse = { name: "NewService", displayName: "New Service" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.createPacticipant({
          name: "NewService",
          displayName: "New Service",
          mainBranch: "main",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify({
              name: "NewService",
              displayName: "New Service",
              mainBranch: "main",
            }),
          },
        );
        expect(result.name).toBe("NewService");
      });
    });

    describe("deletePacticipant", () => {
      it("should delete a pacticipant", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        await client.deletePacticipant({ pacticipantName: "OldService" });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/OldService",
          { method: "DELETE", headers: client.requestHeaders },
        );
      });

      it("should URL-encode pacticipant names with special characters", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        await client.deletePacticipant({
          pacticipantName: "My Service/v2",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/My%20Service%2Fv2",
          { method: "DELETE", headers: client.requestHeaders },
        );
      });
    });

    describe("getBranch", () => {
      it("should retrieve a specific branch", async () => {
        const mockResponse = {
          name: "main",
          pacticipant: { name: "ServiceA" },
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getBranch({
          pacticipantName: "ServiceA",
          branchName: "main",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/branches/main",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.name).toBe("main");
      });

      it("should handle not found errors", async () => {
        fetchMock.mockResponseOnce("Not Found", {
          status: 404,
          statusText: "Not Found",
        });
        await expect(
          client.getBranch({
            pacticipantName: "ServiceA",
            branchName: "missing",
          }),
        ).rejects.toThrow("Get Branch Failed - status: 404 Not Found");
      });
    });

    describe("deleteBranch", () => {
      it("should delete a branch", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        await client.deleteBranch({
          pacticipantName: "ServiceA",
          branchName: "old-feature",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/branches/old-feature",
          { method: "DELETE", headers: client.requestHeaders },
        );
      });
    });

    describe("addLabel", () => {
      it("should apply a label to a pacticipant", async () => {
        const mockResponse = { name: "mobile" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        await client.addLabel({
          pacticipantName: "ConsumerApp",
          labelName: "mobile",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ConsumerApp/labels/mobile",
          {
            method: "PUT",
            headers: client.requestHeaders,
            body: JSON.stringify({}),
          },
        );
      });
    });

    describe("removeLabel", () => {
      it("should remove a label from a pacticipant", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        await client.removeLabel({
          pacticipantName: "ConsumerApp",
          labelName: "mobile",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ConsumerApp/labels/mobile",
          { method: "DELETE", headers: client.requestHeaders },
        );
      });
    });
  });
});
