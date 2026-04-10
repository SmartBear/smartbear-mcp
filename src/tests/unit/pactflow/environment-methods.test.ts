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

    describe("listEnvironments", () => {
      it("should retrieve all environments", async () => {
        // EnvironmentsResponse._embedded.environments
        const mockResponse = {
          _embedded: {
            environments: [
              { uuid: "env-1", name: "production", production: true },
            ],
          },
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.listEnvironments();

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/environments",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result._embedded?.environments).toHaveLength(1);
      });

      it("should handle HTTP errors", async () => {
        fetchMock.mockResponseOnce("Forbidden", {
          status: 403,
          statusText: "Forbidden",
        });
        await expect(client.listEnvironments()).rejects.toThrow(
          "List Environments Failed - status: 403 Forbidden - Forbidden",
        );
      });
    });

    describe("getEnvironment", () => {
      it("should retrieve an environment by UUID", async () => {
        const mockResponse = {
          name: "production",
          uuid: "env-uuid-1",
          production: true,
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getEnvironment({
          environmentId: "env-uuid-1",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/environments/env-uuid-1",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.name).toBe("production");
        expect(result.production).toBe(true);
      });
    });

    describe("createEnvironment", () => {
      it("should create a new environment", async () => {
        const mockResponse = {
          uuid: "env-uuid-1",
          name: "production",
          production: true,
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.createEnvironment({
          name: "production",
          displayName: "Production",
          production: true,
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/environments",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify({
              name: "production",
              displayName: "Production",
              production: true,
            }),
          },
        );
        expect(result.uuid).toBe("env-uuid-1");
      });

      it("should handle HTTP errors", async () => {
        fetchMock.mockResponseOnce("Conflict", {
          status: 409,
          statusText: "Conflict",
        });
        await expect(
          client.createEnvironment({
            name: "production",
            displayName: "Production",
            production: true,
          }),
        ).rejects.toThrow("Create Environment Failed - status: 409 Conflict");
      });
    });

    describe("updateEnvironment", () => {
      it("should update an environment", async () => {
        const mockResponse = {
          uuid: "env-uuid-1",
          name: "staging",
          production: false,
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.updateEnvironment({
          environmentId: "env-uuid-1",
          name: "staging",
          displayName: "Staging",
          production: false,
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/environments/env-uuid-1",
          {
            method: "PUT",
            headers: client.requestHeaders,
            body: JSON.stringify({
              name: "staging",
              displayName: "Staging",
              production: false,
            }),
          },
        );
        expect(result.name).toBe("staging");
      });
    });

    describe("deleteEnvironment", () => {
      it("should delete an environment", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        await client.deleteEnvironment({ environmentId: "env-uuid-1" });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/environments/env-uuid-1",
          { method: "DELETE", headers: client.requestHeaders },
        );
      });

      it("should handle HTTP errors", async () => {
        fetchMock.mockResponseOnce("Not Found", {
          status: 404,
          statusText: "Not Found",
        });
        await expect(
          client.deleteEnvironment({ environmentId: "missing-uuid" }),
        ).rejects.toThrow("Delete Environment Failed - status: 404 Not Found");
      });
    });

    describe("recordDeployment", () => {
      const baseInput = {
        pacticipantName: "ServiceA",
        versionNumber: "1.0.0",
        environmentId: "env-uuid-1",
      };

      it("should record a deployment without applicationInstance", async () => {
        const mockResponse = { uuid: "dep-uuid-1" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        await client.recordDeployment(baseInput);

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/versions/1.0.0/deployed-versions/environment/env-uuid-1",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify({}),
          },
        );
      });

      it("should include applicationInstance in the body when provided", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        await client.recordDeployment({
          ...baseInput,
          applicationInstance: "blue",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/versions/1.0.0/deployed-versions/environment/env-uuid-1",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify({ applicationInstance: "blue" }),
          },
        );
      });

      it("should handle HTTP errors", async () => {
        fetchMock.mockResponseOnce("Not found", {
          status: 404,
          statusText: "Not Found",
        });
        await expect(client.recordDeployment(baseInput)).rejects.toThrow(
          "Record Deployment Failed - status: 404 Not Found - Not found",
        );
      });
    });

    describe("getCurrentlyDeployed", () => {
      it("should retrieve currently deployed versions for an environment", async () => {
        // DeployedVersionsResponse._embedded.deployedVersions
        const mockResponse = {
          _embedded: {
            deployedVersions: [{ uuid: "dv-1", currentlyDeployed: true }],
          },
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getCurrentlyDeployed({
          environmentId: "env-uuid-1",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/environments/env-uuid-1/deployed-versions/currently-deployed",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result._embedded?.deployedVersions).toHaveLength(1);
      });
    });

    describe("recordRelease", () => {
      it("should record a release", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ uuid: "rel-uuid-1" }));

        await client.recordRelease({
          pacticipantName: "ServiceA",
          versionNumber: "1.0.0",
          environmentId: "env-uuid-1",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/versions/1.0.0/released-versions/environment/env-uuid-1",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify({}),
          },
        );
      });
    });

    describe("getCurrentlySupported", () => {
      it("should retrieve currently supported versions for an environment", async () => {
        // ReleasedVersionsResponse._embedded.releasedVersions
        const mockResponse = { _embedded: { releasedVersions: [] } };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getCurrentlySupported({
          environmentId: "env-uuid-1",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/environments/env-uuid-1/released-versions/currently-supported",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result._embedded?.releasedVersions).toBeDefined();
      });
    });

    describe("getDeployedVersions", () => {
      it("should retrieve deployment records for a specific version in an environment", async () => {
        // DeployedVersionsResponse._embedded.deployedVersions
        const mockResponse = {
          _embedded: { deployedVersions: [{ currentlyDeployed: true }] },
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getDeployedVersions({
          pacticipantName: "ServiceA",
          versionNumber: "1.0.0",
          environmentId: "env-uuid-1",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/versions/1.0.0/deployed-versions/environment/env-uuid-1",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result._embedded?.deployedVersions?.[0].currentlyDeployed).toBe(
          true,
        );
      });
    });

    describe("getReleasedVersions", () => {
      it("should retrieve release records for a specific version in an environment", async () => {
        // ReleasedVersionsResponse._embedded.releasedVersions
        const mockResponse = {
          _embedded: { releasedVersions: [{ currentlySupported: true }] },
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getReleasedVersions({
          pacticipantName: "ServiceA",
          versionNumber: "1.0.0",
          environmentId: "env-uuid-1",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/versions/1.0.0/released-versions/environment/env-uuid-1",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result._embedded?.releasedVersions?.[0].currentlySupported).toBe(
          true,
        );
      });
    });

    describe("getMetrics", () => {
      const mockMetricsResponse = {
        interactions: {
          latestInteractionsCount: 42,
          latestMessagesCount: 8,
          latestInteractionsAndMessagesCount: 50,
        },
        pacticipants: {
          count: 15,
          withMainBranchSetCount: 12,
        },
        integrations: { count: 7 },
        pactPublications: { count: 42, last30DaysCount: 15 },
        pactVersions: { count: 38 },
        pactRevisionsPerConsumerVersion: {
          distribution: { "1": 20, "2": 10, "3": 5 },
        },
        verificationResults: {
          count: 1250,
          distinctCount: 1200,
          successCount: 1200,
          failureCount: 50,
        },
        verificationResultsPerPactVersion: {
          distribution: { "1": 800, "2": 300, "3": 150 },
        },
        pacticipantVersions: {
          count: 320,
          withUserCreatedBranchCount: 145,
          withBranchCount: 280,
          withBranchSetCount: 300,
        },
        webhooks: { count: 12 },
        tags: { count: 100, distinctCount: 50 },
        webhookExecutions: { count: 5000 },
        triggeredWebhooks: { count: 4500 },
        secrets: { count: 8 },
        environments: { count: 3 },
        providerContractPublications: { count: 25 },
        providerContractVersions: { count: 22 },
        providerContractSelfVerifications: { count: 200 },
        deployedVersions: { last30DaysCount: 320 },
        releasedVersions: { last30DaysCount: 145 },
      };

      it("should successfully retrieve account-wide metrics", async () => {
        fetchMock.mockResponseOnce(JSON.stringify(mockMetricsResponse));

        const result = await client.getMetrics();

        expect(fetchMock).toHaveBeenCalledWith("https://example.com/metrics", {
          method: "GET",
          headers: client.requestHeaders,
        });
        expect(result.interactions.latestInteractionsCount).toBe(42);
        expect(result.pacticipants.count).toBe(15);
        expect(result.verificationResults.count).toBe(1250);
      });

      it("should handle HTTP 401 error when not authenticated", async () => {
        const errorText = "Unauthorized";
        fetchMock.mockResponseOnce(errorText, {
          status: 401,
          statusText: "Unauthorized",
        });

        await expect(client.getMetrics()).rejects.toThrow(
          "Metrics Request Failed - status: 401 Unauthorized - Unauthorized",
        );
      });

      it("should handle HTTP 500 error gracefully", async () => {
        const errorText = "Internal server error";
        fetchMock.mockResponseOnce(errorText, {
          status: 500,
          statusText: "Internal Server Error",
        });

        await expect(client.getMetrics()).rejects.toThrow(
          "Metrics Request Failed - status: 500 Internal Server Error",
        );
      });

      it("should handle network errors", async () => {
        fetchMock.mockRejectOnce(new Error("Network timeout"));

        await expect(client.getMetrics()).rejects.toThrow("Network timeout");
      });
    });

    describe("getTeamMetrics", () => {
      const mockTeamMetricsResponse = {
        teams: [
          {
            name: "Platform Team",
            metrics: {
              users: {
                activeRegularCount: 8,
                activeSystemCount: 2,
              },
              interactions: {
                latestInteractionsCount: 12,
                latestMessagesCount: 3,
              },
              pacticipants: { count: 10 },
              integrations: { count: 5 },
              pactPublications: { count: 150, last30DaysCount: 45 },
              pactVersions: { count: 140 },
              verificationResults: {
                count: 450,
                successCount: 430,
                failureCount: 20,
              },
              webhooks: { count: 8 },
              webhookExecutions: { count: 1500 },
              triggeredWebhooks: { count: 1400 },
              secrets: { count: 3 },
              environments: { count: 3 },
              providerContractPublications: { count: 10 },
              providerContractVersions: { count: 9 },
              providerContractSelfVerifications: { count: 85 },
              deployedVersions: { last30DaysCount: 85 },
              releasedVersions: { last30DaysCount: 32 },
            },
          },
          {
            name: "API Team",
            metrics: {
              users: {
                activeRegularCount: 6,
                activeSystemCount: 1,
              },
              interactions: {
                latestInteractionsCount: 6,
                latestMessagesCount: 2,
              },
              pacticipants: { count: 5 },
              integrations: { count: 2 },
              pactPublications: { count: 80, last30DaysCount: 20 },
              pactVersions: { count: 75 },
              verificationResults: {
                count: 200,
                successCount: 190,
                failureCount: 10,
              },
              webhooks: { count: 4 },
              webhookExecutions: { count: 800 },
              triggeredWebhooks: { count: 750 },
              secrets: { count: 2 },
              environments: { count: 2 },
              providerContractPublications: { count: 5 },
              providerContractVersions: { count: 4 },
              providerContractSelfVerifications: { count: 40 },
              deployedVersions: { last30DaysCount: 40 },
              releasedVersions: { last30DaysCount: 12 },
            },
          },
        ],
      };

      it("should successfully retrieve metrics for all teams", async () => {
        fetchMock.mockResponseOnce(JSON.stringify(mockTeamMetricsResponse));

        const result = await client.getTeamMetrics();

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/metrics/teams",
          {
            method: "GET",
            headers: client.requestHeaders,
          },
        );
        expect(result.teams).toBeDefined();
        expect(Array.isArray(result.teams)).toBe(true);
        expect(result.teams.length).toBe(2);
        expect(result.teams[0].name).toBe("Platform Team");
        expect(result.teams[0].metrics.users.activeRegularCount).toBe(8);
        expect(result.teams[0].metrics.integrations.count).toBe(5);
      });

      it("should handle HTTP 403 error when user lacks access to teams", async () => {
        const errorText = "Forbidden - You do not have access to these teams";
        fetchMock.mockResponseOnce(errorText, {
          status: 403,
          statusText: "Forbidden",
        });

        await expect(client.getTeamMetrics()).rejects.toThrow(
          "Team Metrics Request Failed - status: 403 Forbidden",
        );
      });

      it("should handle HTTP 500 error gracefully", async () => {
        const errorText = "Internal server error";
        fetchMock.mockResponseOnce(errorText, {
          status: 500,
          statusText: "Internal Server Error",
        });

        await expect(client.getTeamMetrics()).rejects.toThrow(
          "Team Metrics Request Failed - status: 500 Internal Server Error",
        );
      });

      it("should handle network errors", async () => {
        fetchMock.mockRejectOnce(new Error("Network timeout"));

        await expect(client.getTeamMetrics()).rejects.toThrow(
          "Network timeout",
        );
      });
    });
  });
});
