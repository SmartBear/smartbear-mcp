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

    describe("canIDeploy", () => {
      const mockInput = {
        pacticipant: "my-service",
        version: "1.0.0",
        environment: "production",
      };

      it("should successfully check if deployment is allowed", async () => {
        const mockResponse = {
          summary: { deployable: true, failed: 0 },
        };

        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.canIDeploy(mockInput);

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/can-i-deploy?pacticipant=my-service&version=1.0.0&environment=production",
          {
            method: "GET",
            headers: client.requestHeaders,
          },
        );
        expect(result.summary.deployable).toBe(true);
      });

      it("should handle deployment not allowed scenario", async () => {
        const mockResponse = {
          summary: { deployable: false },
        };

        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.canIDeploy(mockInput);

        expect(result.summary.deployable).toBe(false);
      });

      it("should handle HTTP errors correctly", async () => {
        const errorText = "Pacticipant not found";
        fetchMock.mockResponseOnce(errorText, {
          status: 404,
          statusText: "Not Found",
        });

        await expect(client.canIDeploy(mockInput)).rejects.toThrow(
          "Can-I-Deploy Request Failed - status: 404 Not Found - Pacticipant not found",
        );
      });

      it("should properly encode URL parameters", async () => {
        const inputWithSpecialChars = {
          pacticipant: "my-service@special",
          version: "1.0.0-beta+build.123",
          environment: "test/staging",
        };

        fetchMock.mockResponseOnce(
          JSON.stringify({ summary: { deployable: true } }),
        );

        await client.canIDeploy(inputWithSpecialChars);

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/can-i-deploy?pacticipant=my-service%40special&version=1.0.0-beta%2Bbuild.123&environment=test%2Fstaging",
          {
            method: "GET",
            headers: client.requestHeaders,
          },
        );
      });
    });

    describe("getMatrix", () => {
      const mockMatrixInput = {
        latestby: "cvp",
        limit: 100,
        q: [
          {
            pacticipant: "Example API",
            version: "1.0.0",
            latest: true,
          },
        ],
      };

      const mockMatrixResponse = {
        matrix: [
          {
            consumer: { name: "Consumer App", version: { number: "1.0.0" } },
            provider: { name: "Example API", version: { number: "1.0.0" } },
            pact: { createdAt: "2024-01-01T00:00:00Z" },
            verificationResult: {
              success: true,
              verifiedAt: "2024-01-01T01:00:00Z",
            },
          },
        ],
        notices: [
          {
            text: "All verification results are successful",
            type: "success",
          },
        ],
        summary: {
          deployable: true,
          failed: 0,
          success: 1,
          unknown: 0,
          reason: "All pacts are verified",
        },
      };

      it("should successfully retrieve matrix with basic parameters", async () => {
        fetchMock.mockResponseOnce(JSON.stringify(mockMatrixResponse));

        const result = await client.getMatrix(mockMatrixInput);

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/matrix?latestby=cvp&limit=100&q[]pacticipant=Example%20API&q[]version=1.0.0&q[]latest=true",
          {
            method: "GET",
            headers: client.requestHeaders,
          },
        );
        expect(result.summary.deployable).toBe(true);
        expect(result.matrix).toHaveLength(1);
      });

      it("should handle matrix with multiple selectors", async () => {
        const multiSelectorInput = {
          latestby: "cvpv",
          q: [
            {
              pacticipant: "Consumer App",
              branch: "main",
              latest: true,
            },
            {
              pacticipant: "Provider API",
              environment: "production",
              tag: "v1.0",
            },
          ],
        };

        fetchMock.mockResponseOnce(JSON.stringify(mockMatrixResponse));

        await client.getMatrix(multiSelectorInput);

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/matrix?latestby=cvpv&q[]pacticipant=Consumer%20App&q[]branch=main&q[]latest=true&q[]pacticipant=Provider%20API&q[]environment=production&q[]tag=v1.0",
          {
            method: "GET",
            headers: client.requestHeaders,
          },
        );
      });

      it("should handle matrix with all optional selector parameters", async () => {
        const fullSelectorInput = {
          limit: 50,
          q: [
            {
              pacticipant: "Full Service",
              version: "2.1.0",
              branch: "feature/new-api",
              environment: "staging",
              latest: false,
              tag: "beta",
              mainBranch: true,
            },
          ],
        };

        fetchMock.mockResponseOnce(JSON.stringify(mockMatrixResponse));

        await client.getMatrix(fullSelectorInput);

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/matrix?limit=50&q[]pacticipant=Full%20Service&q[]version=2.1.0&q[]branch=feature%2Fnew-api&q[]environment=staging&q[]latest=false&q[]tag=beta&q[]mainBranch=true",
          {
            method: "GET",
            headers: client.requestHeaders,
          },
        );
      });

      it("should handle matrix with minimal parameters", async () => {
        const minimalInput = {
          q: [
            {
              pacticipant: "Simple Service",
            },
          ],
        };

        fetchMock.mockResponseOnce(JSON.stringify(mockMatrixResponse));

        await client.getMatrix(minimalInput);

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/matrix?q[]pacticipant=Simple%20Service",
          {
            method: "GET",
            headers: client.requestHeaders,
          },
        );
      });

      it("should properly encode special characters in parameters", async () => {
        const specialCharsInput = {
          q: [
            {
              pacticipant: "Service@Company/API",
              version: "1.0.0-beta+build.123",
              branch: "feature/fix-bug#123",
              environment: "test/staging",
              tag: "v1.0.0-rc.1",
            },
          ],
        };

        fetchMock.mockResponseOnce(JSON.stringify(mockMatrixResponse));

        await client.getMatrix(specialCharsInput);

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/matrix?q[]pacticipant=Service%40Company%2FAPI&q[]version=1.0.0-beta%2Bbuild.123&q[]branch=feature%2Ffix-bug%23123&q[]environment=test%2Fstaging&q[]tag=v1.0.0-rc.1",
          {
            method: "GET",
            headers: client.requestHeaders,
          },
        );
      });

      it("should handle HTTP 400 error with meaningful message", async () => {
        const errorText = "Invalid query parameters";
        fetchMock.mockResponseOnce(errorText, {
          status: 400,
          statusText: "Bad Request",
        });

        await expect(client.getMatrix(mockMatrixInput)).rejects.toThrow(
          "Matrix Request Failed - status: 400 Bad Request - Invalid query parameters",
        );
      });

      it("should handle HTTP 404 error when pacticipant not found", async () => {
        const errorText = "Pacticipant not found";
        fetchMock.mockResponseOnce(errorText, {
          status: 404,
          statusText: "Not Found",
        });

        await expect(client.getMatrix(mockMatrixInput)).rejects.toThrow(
          "Matrix Request Failed - status: 404 Not Found - Pacticipant not found",
        );
      });
    });

    describe("getProviderStates", () => {
      it("should return provider states when response is OK", async () => {
        const mockProviderStates = {
          providerStates: [
            { name: "User exists", params: { id: "123" }, consumers: [] },
            { name: "No users", consumers: [] },
          ],
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockProviderStates), {
          status: 200,
        });
        const result = await client.getProviderStates({
          provider: "UserService",
        });
        expect(result).toEqual(mockProviderStates);
        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacts/provider/UserService/provider-states",
          {
            method: "GET",
            headers: client.requestHeaders,
          },
        );
      });

      it("should encode provider name in URL", async () => {
        const mockProviderStates = { providerStates: [] };
        fetchMock.mockResponseOnce(JSON.stringify(mockProviderStates), {
          status: 200,
        });
        await client.getProviderStates({ provider: "Service@Company/API" });
        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacts/provider/Service%40Company%2FAPI/provider-states",
          {
            method: "GET",
            headers: client.requestHeaders,
          },
        );
      });

      it("should throw error if response is not OK", async () => {
        fetchMock.mockResponseOnce("Provider not found", { status: 404 });
        await expect(
          client.getProviderStates({ provider: "UnknownService" }),
        ).rejects.toThrow(
          "Get Provider States Failed - status: 404  - Provider not found",
        );
      });
    });

    describe("publishContracts", () => {
      const mockInput = {
        pacticipantName: "ConsumerApp",
        pacticipantVersionNumber: "1.0.0",
        contracts: [
          {
            consumerName: "ConsumerApp",
            providerName: "ProviderAPI",
            content: "eyJjb25zdW1lciI6IHsibmFtZSI6ICJDb25zdW1lckFwcCJ9fQ==",
            contentType: "application/json" as const,
            specification: "pact" as const,
          },
        ],
        branch: "main",
      };

      it("should publish consumer contracts", async () => {
        const mockResponse = { pacticipantVersionNumber: "1.0.0" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        await client.publishContracts(mockInput);

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/contracts/publish",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify(mockInput),
          },
        );
      });

      it("should handle HTTP errors", async () => {
        fetchMock.mockResponseOnce("Unprocessable Entity", {
          status: 422,
          statusText: "Unprocessable Entity",
        });
        await expect(client.publishContracts(mockInput)).rejects.toThrow(
          "Publish Consumer Contracts Failed - status: 422 Unprocessable Entity",
        );
      });
    });

    describe("publishProviderContract", () => {
      const mockInput = {
        providerName: "ProviderAPI",
        pacticipantVersionNumber: "2.0.0",
        contract: {
          content: "eyJvcGVuYXBpIjogIjMuMC4wIn0=",
          contentType: "application/json" as const,
          specification: "oas" as const,
          selfVerificationResults: {
            success: true,
            verifier: "dredd",
          },
        },
        branch: "main",
      };

      it("should publish a provider contract", async () => {
        const mockResponse = { _links: {} };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const { providerName, ...bodyWithoutProvider } = mockInput;
        await client.publishProviderContract(mockInput);

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/provider-contracts/provider/ProviderAPI/publish",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify(bodyWithoutProvider),
          },
        );
      });

      it("should URL-encode the provider name", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        await client.publishProviderContract({
          ...mockInput,
          providerName: "Provider API/v2",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/provider-contracts/provider/Provider%20API%2Fv2/publish",
          expect.objectContaining({ method: "POST" }),
        );
      });
    });

    describe("getPactsForVerification", () => {
      it("should retrieve pacts for verification", async () => {
        const mockInput = {
          providerName: "ProviderAPI",
          consumerVersionSelectors: [{ mainBranch: true }],
          includePendingStatus: true,
        };
        // PactsForVerificationResponse._embedded.pacts
        const mockResponse = { _embedded: { pacts: [] } };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const { providerName, ...bodyWithoutProvider } = mockInput;
        await client.getPactsForVerification(mockInput);

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacts/provider/ProviderAPI/for-verification",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify(bodyWithoutProvider),
          },
        );
      });
    });

    describe("BDCT provider-version methods", () => {
      const bdctInput = {
        providerName: "ProviderAPI",
        providerVersionNumber: "2.0.0",
      };
      const bdctBase =
        "https://example.com/contracts/bi-directional/provider/ProviderAPI/version/2.0.0";

      it("getBiDirectionalProviderContract should call correct URL", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));
        await client.getBiDirectionalProviderContract(bdctInput);
        expect(fetchMock).toHaveBeenCalledWith(
          `${bdctBase}/provider-contract`,
          { method: "GET", headers: client.requestHeaders },
        );
      });

      it("getBiDirectionalProviderContractVerificationResults should call correct URL", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));
        await client.getBiDirectionalProviderContractVerificationResults(
          bdctInput,
        );
        expect(fetchMock).toHaveBeenCalledWith(
          `${bdctBase}/provider-contract-verification-results`,
          { method: "GET", headers: client.requestHeaders },
        );
      });

      it("getBiDirectionalConsumerContract should call correct URL", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));
        await client.getBiDirectionalConsumerContract(bdctInput);
        expect(fetchMock).toHaveBeenCalledWith(
          `${bdctBase}/consumer-contract`,
          { method: "GET", headers: client.requestHeaders },
        );
      });

      it("getBiDirectionalConsumerContractVerificationResults should call correct URL", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));
        await client.getBiDirectionalConsumerContractVerificationResults(
          bdctInput,
        );
        expect(fetchMock).toHaveBeenCalledWith(
          `${bdctBase}/consumer-contract-verification-results`,
          { method: "GET", headers: client.requestHeaders },
        );
      });

      it("getBiDirectionalCrossContractVerificationResults should call correct URL", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));
        await client.getBiDirectionalCrossContractVerificationResults(
          bdctInput,
        );
        expect(fetchMock).toHaveBeenCalledWith(
          `${bdctBase}/cross-contract-verification-results`,
          { method: "GET", headers: client.requestHeaders },
        );
      });
    });

    describe("BDCT consumer-version methods", () => {
      const bdctConsumerInput = {
        providerName: "ProviderAPI",
        providerVersionNumber: "2.0.0",
        consumerName: "ConsumerApp",
        consumerVersionNumber: "1.0.0",
      };
      const bdctBase =
        "https://example.com/contracts/bi-directional/provider/ProviderAPI/version/2.0.0/consumer/ConsumerApp/version/1.0.0";

      it("getBiDirectionalConsumerContractByConsumer should call correct URL", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));
        await client.getBiDirectionalConsumerContractByConsumer(
          bdctConsumerInput,
        );
        expect(fetchMock).toHaveBeenCalledWith(
          `${bdctBase}/consumer-contract`,
          { method: "GET", headers: client.requestHeaders },
        );
      });

      it("getBiDirectionalProviderContractByConsumer should call correct URL", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));
        await client.getBiDirectionalProviderContractByConsumer(
          bdctConsumerInput,
        );
        expect(fetchMock).toHaveBeenCalledWith(
          `${bdctBase}/provider-contract`,
          { method: "GET", headers: client.requestHeaders },
        );
      });

      it("getBiDirectionalProviderContractVerificationResultsByConsumer should call correct URL", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));
        await client.getBiDirectionalProviderContractVerificationResultsByConsumer(
          bdctConsumerInput,
        );
        expect(fetchMock).toHaveBeenCalledWith(
          `${bdctBase}/provider-contract-verification-results`,
          { method: "GET", headers: client.requestHeaders },
        );
      });

      it("getBiDirectionalConsumerContractVerificationResultsByConsumer should call correct URL", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));
        await client.getBiDirectionalConsumerContractVerificationResultsByConsumer(
          bdctConsumerInput,
        );
        expect(fetchMock).toHaveBeenCalledWith(
          `${bdctBase}/consumer-contract-verification-results`,
          { method: "GET", headers: client.requestHeaders },
        );
      });

      it("getBiDirectionalCrossContractVerificationResultsByConsumer should call correct URL", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));
        await client.getBiDirectionalCrossContractVerificationResultsByConsumer(
          bdctConsumerInput,
        );
        expect(fetchMock).toHaveBeenCalledWith(
          `${bdctBase}/cross-contract-verification-results`,
          { method: "GET", headers: client.requestHeaders },
        );
      });
    });

    describe("listIntegrations", () => {
      it("should retrieve all integrations", async () => {
        // IntegrationsResponse._embedded.integrations
        const mockResponse = {
          _embedded: { integrations: [{ _links: {} }, { _links: {} }] },
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.listIntegrations();

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/integrations",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result._embedded?.integrations).toHaveLength(2);
      });
    });

    describe("getPacticipantNetwork", () => {
      it("should retrieve the integration network for a pacticipant", async () => {
        // PacticipantNetwork._embedded is Record<string, unknown>
        const mockResponse = {
          _embedded: {
            pacticipants: [{ name: "ServiceA" }, { name: "ServiceB" }],
          },
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getPacticipantNetwork({
          pacticipantName: "ServiceA",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipant/ServiceA/network",
          { method: "GET", headers: client.requestHeaders },
        );
        expect((result._embedded?.pacticipants as unknown[]).length).toBe(2);
      });
    });

    describe("listLabels", () => {
      it("should retrieve all labels without params", async () => {
        // LabelsResponse._embedded.labels
        const mockResponse = { _embedded: { labels: [{ name: "team-a" }] } };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.listLabels();

        expect(fetchMock).toHaveBeenCalledWith("https://example.com/labels", {
          method: "GET",
          headers: client.requestHeaders,
        });
        expect(result._embedded?.labels).toHaveLength(1);
      });

      it("should append pagination query params", async () => {
        fetchMock.mockResponseOnce(
          JSON.stringify({ _embedded: { labels: [] } }),
        );

        await client.listLabels({ pageNumber: 1, pageSize: 10 });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/labels?page=1&size=10",
          { method: "GET", headers: client.requestHeaders },
        );
      });
    });

    describe("getPacticipantLabel", () => {
      it("should retrieve a specific label for a pacticipant", async () => {
        const mockResponse = { name: "team-a" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getPacticipantLabel({
          pacticipantName: "ServiceA",
          labelName: "team-a",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/ServiceA/labels/team-a",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.name).toBe("team-a");
      });

      it("should handle 404 when label not applied", async () => {
        fetchMock.mockResponseOnce("Not Found", {
          status: 404,
          statusText: "Not Found",
        });
        await expect(
          client.getPacticipantLabel({
            pacticipantName: "ServiceA",
            labelName: "missing-label",
          }),
        ).rejects.toThrow(
          "Get Pacticipant Label Failed - status: 404 Not Found - Not Found",
        );
      });
    });

    describe("listPacticipantsByLabel", () => {
      it("should retrieve pacticipants with a given label", async () => {
        // PacticipantsByLabelResponse._embedded.pacticipants
        const mockResponse = {
          _embedded: {
            pacticipants: [{ name: "ServiceA" }, { name: "ServiceB" }],
          },
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.listPacticipantsByLabel({
          labelName: "team-a",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/pacticipants/label/team-a",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result._embedded?.pacticipants).toHaveLength(2);
      });
    });

    describe("getIntegrationsByTeam", () => {
      it("should retrieve integrations for a team", async () => {
        // IntegrationsResponse._embedded.integrations
        const mockResponse = {
          _embedded: { integrations: [{ _links: {} }] },
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getIntegrationsByTeam({
          teamId: "team-uuid-1",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/integrations/team/team-uuid-1",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result._embedded?.integrations).toHaveLength(1);
      });
    });

    describe("deleteIntegration", () => {
      it("should delete a consumer-provider integration", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        await client.deleteIntegration({
          providerName: "ProviderAPI",
          consumerName: "ConsumerApp",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/integrations/provider/ProviderAPI/consumer/ConsumerApp",
          { method: "DELETE", headers: client.requestHeaders },
        );
      });
    });

    describe("deleteAllIntegrations", () => {
      it("should delete all integrations", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        await client.deleteAllIntegrations();

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/integrations",
          { method: "DELETE", headers: client.requestHeaders },
        );
      });
    });
  });
});
