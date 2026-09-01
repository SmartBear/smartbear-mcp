import { beforeEach, describe, expect, it } from "vitest";
import { ToolError } from "../../common/tools";
import { ContractApi } from "./contract-api";
import { createMockHttpClient } from "./test-helpers";

describe("ContractApi", () => {
  let api: ContractApi;
  let mockHttp: ReturnType<typeof createMockHttpClient>;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    api = new ContractApi(mockHttp);
  });

  describe("getProviderStates", () => {
    it("should retrieve provider states for a provider", async () => {
      const mockResponse = {
        providerStates: [{ name: "user exists", consumers: ["ConsumerA"] }],
      };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getProviderStates({ provider: "ProviderA" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacts/provider/ProviderA/provider-states",
        { method: "GET", errorContext: "Get Provider States" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode the provider name", async () => {
      mockHttp.fetch.mockResolvedValueOnce({ providerStates: [] });

      await api.getProviderStates({ provider: "Provider A/B" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacts/provider/Provider%20A%2FB/provider-states",
        { method: "GET", errorContext: "Get Provider States" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Get Provider States Failed - status: 404 Not Found"),
      );

      await expect(
        api.getProviderStates({ provider: "Unknown" }),
      ).rejects.toThrow("Get Provider States Failed - status: 404 Not Found");
    });
  });

  describe("canIDeploy", () => {
    it("should check deployment with query params", async () => {
      const mockResponse = {
        summary: {
          deployable: true,
          reason: "OK",
          failed: 0,
          success: 1,
          unknown: 0,
        },
        matrix: [],
        notices: [],
      };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.canIDeploy({
        pacticipant: "ServiceA",
        version: "1.0.0",
        environment: "production",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/can-i-deploy?pacticipant=ServiceA&version=1.0.0&environment=production",
        { method: "GET", errorContext: "Can-I-Deploy Request" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode query param values", async () => {
      mockHttp.fetch.mockResolvedValueOnce({
        summary: {
          deployable: false,
          reason: "",
          failed: 0,
          success: 0,
          unknown: 0,
        },
        matrix: [],
        notices: [],
      });

      await api.canIDeploy({
        pacticipant: "Service A",
        version: "1.0+beta",
        environment: "staging",
      });

      const callUrl = mockHttp.fetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("pacticipant=Service+A");
      expect(callUrl).toContain("version=1.0%2Bbeta");
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError(
          "Can-I-Deploy Request Failed - status: 500 Internal Server Error",
        ),
      );

      await expect(
        api.canIDeploy({
          pacticipant: "ServiceA",
          version: "1.0.0",
          environment: "production",
        }),
      ).rejects.toThrow(
        "Can-I-Deploy Request Failed - status: 500 Internal Server Error",
      );
    });
  });

  describe("getMatrix", () => {
    it("should build matrix URL with required params", async () => {
      const mockResponse = {
        matrix: [],
        notices: [],
        summary: {
          deployable: true,
          failed: 0,
          reason: "",
          success: 0,
          unknown: 0,
        },
      };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getMatrix({
        q: [{ pacticipant: "ServiceA", version: "1.0.0" }],
      });

      const callUrl = mockHttp.fetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("https://test.example.com/matrix?");
      expect(callUrl).toContain("q[]pacticipant=ServiceA");
      expect(callUrl).toContain("q[]version=1.0.0");
      expect(result).toEqual(mockResponse);
    });

    it("should include optional latestby and limit params", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getMatrix({
        q: [{ pacticipant: "ServiceA" }],
        latestby: "cvp",
        limit: 50,
      });

      const callUrl = mockHttp.fetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("latestby=cvp");
      expect(callUrl).toContain("limit=50");
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Matrix Request Failed - status: 400 Bad Request"),
      );

      await expect(
        api.getMatrix({ q: [{ pacticipant: "ServiceA" }] }),
      ).rejects.toThrow("Matrix Request Failed - status: 400 Bad Request");
    });
  });

  describe("publishContracts", () => {
    it("should post to /contracts/publish", async () => {
      const mockResponse = { pacticipantVersionNumber: "1.2.3" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const body = {
        pacticipantName: "ConsumerA",
        pacticipantVersionNumber: "1.2.3",
        branch: "main",
        contracts: [
          {
            consumerName: "ConsumerA",
            providerName: "ProviderA",
            specification: "pact" as const,
            contentType: "application/json" as const,
            content: "base64content",
          },
        ],
      };

      const result = await api.publishContracts(body);

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/contracts/publish",
        expect.objectContaining({
          method: "POST",
          errorContext: "Publish Consumer Contracts",
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError(
          "Publish Consumer Contracts Failed - status: 422 Unprocessable Entity",
        ),
      );

      await expect(
        api.publishContracts({
          pacticipantName: "ConsumerA",
          pacticipantVersionNumber: "1.0.0",
          contracts: [
            {
              consumerName: "ConsumerA",
              providerName: "ProviderA",
              specification: "pact" as const,
              contentType: "application/json" as const,
              content: "base64",
            },
          ],
        }),
      ).rejects.toThrow(
        "Publish Consumer Contracts Failed - status: 422 Unprocessable Entity",
      );
    });
  });

  describe("publishProviderContract", () => {
    const validProviderContractInput = {
      providerName: "ProviderA",
      pacticipantVersionNumber: "2.0.0",
      branch: "main",
      contract: {
        content: "base64spec",
        contentType: "application/yaml" as const,
        specification: "oas" as const,
        selfVerificationResults: {
          success: true,
          verifier: "dredd",
        },
      },
    };

    it("should post to the provider contract endpoint", async () => {
      const mockResponse = { success: true };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.publishProviderContract(
        validProviderContractInput,
      );

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/provider-contracts/provider/ProviderA/publish",
        expect.objectContaining({
          method: "POST",
          errorContext: "Publish Provider Contract",
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode the provider name", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.publishProviderContract({
        ...validProviderContractInput,
        providerName: "Provider A/B",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/provider-contracts/provider/Provider%20A%2FB/publish",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError(
          "Publish Provider Contract Failed - status: 400 Bad Request",
        ),
      );

      await expect(
        api.publishProviderContract(validProviderContractInput),
      ).rejects.toThrow(
        "Publish Provider Contract Failed - status: 400 Bad Request",
      );
    });
  });

  describe("getPactsForVerification", () => {
    it("should post to the pacts-for-verification endpoint", async () => {
      const mockResponse = { pacts: [] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getPactsForVerification({
        providerName: "ProviderA",
        consumerVersionSelectors: [{ branch: "main" }],
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacts/provider/ProviderA/for-verification",
        expect.objectContaining({
          method: "POST",
          errorContext: "Get Pacts for Verification",
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode the provider name", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getPactsForVerification({
        providerName: "Provider A/B",
        consumerVersionSelectors: [],
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacts/provider/Provider%20A%2FB/for-verification",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError(
          "Get Pacts for Verification Failed - status: 404 Not Found",
        ),
      );

      await expect(
        api.getPactsForVerification({
          providerName: "Unknown",
          consumerVersionSelectors: [],
        }),
      ).rejects.toThrow(
        "Get Pacts for Verification Failed - status: 404 Not Found",
      );
    });
  });

  describe("getBiDirectionalProviderContract", () => {
    it("should fetch the BDCT provider contract", async () => {
      const mockResponse = { content: "spec" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getBiDirectionalProviderContract({
        providerName: "ProviderA",
        providerVersionNumber: "1.0.0",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/contracts/bi-directional/provider/ProviderA/version/1.0.0/provider-contract",
        { method: "GET", errorContext: "Get BDCT Provider Contract" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode provider name and version", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getBiDirectionalProviderContract({
        providerName: "Provider A/B",
        providerVersionNumber: "1.0+beta",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/contracts/bi-directional/provider/Provider%20A%2FB/version/1.0%2Bbeta/provider-contract",
        { method: "GET", errorContext: "Get BDCT Provider Contract" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError(
          "Get BDCT Provider Contract Failed - status: 404 Not Found",
        ),
      );

      await expect(
        api.getBiDirectionalProviderContract({
          providerName: "Unknown",
          providerVersionNumber: "1.0.0",
        }),
      ).rejects.toThrow(
        "Get BDCT Provider Contract Failed - status: 404 Not Found",
      );
    });
  });

  describe("getBiDirectionalProviderContractVerificationResults", () => {
    it("should fetch BDCT provider contract verification results", async () => {
      const mockResponse = { success: true };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result =
        await api.getBiDirectionalProviderContractVerificationResults({
          providerName: "ProviderA",
          providerVersionNumber: "1.0.0",
        });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/contracts/bi-directional/provider/ProviderA/version/1.0.0/provider-contract-verification-results",
        {
          method: "GET",
          errorContext: "Get BDCT Provider Contract Verification Results",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode provider name and version", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getBiDirectionalProviderContractVerificationResults({
        providerName: "Provider A/B",
        providerVersionNumber: "1.0+beta",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/contracts/bi-directional/provider/Provider%20A%2FB/version/1.0%2Bbeta/provider-contract-verification-results",
        {
          method: "GET",
          errorContext: "Get BDCT Provider Contract Verification Results",
        },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError(
          "Get BDCT Provider Contract Verification Results Failed - status: 404 Not Found",
        ),
      );

      await expect(
        api.getBiDirectionalProviderContractVerificationResults({
          providerName: "Unknown",
          providerVersionNumber: "1.0.0",
        }),
      ).rejects.toThrow(
        "Get BDCT Provider Contract Verification Results Failed - status: 404 Not Found",
      );
    });
  });

  describe("getBiDirectionalConsumerContract", () => {
    it("should fetch BDCT consumer contract", async () => {
      const mockResponse = { pacts: [] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getBiDirectionalConsumerContract({
        providerName: "ProviderA",
        providerVersionNumber: "1.0.0",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/contracts/bi-directional/provider/ProviderA/version/1.0.0/consumer-contract",
        { method: "GET", errorContext: "Get BDCT Consumer Contract" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode provider name and version", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getBiDirectionalConsumerContract({
        providerName: "Provider A/B",
        providerVersionNumber: "1.0+beta",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/contracts/bi-directional/provider/Provider%20A%2FB/version/1.0%2Bbeta/consumer-contract",
        { method: "GET", errorContext: "Get BDCT Consumer Contract" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError(
          "Get BDCT Consumer Contract Failed - status: 404 Not Found",
        ),
      );

      await expect(
        api.getBiDirectionalConsumerContract({
          providerName: "Unknown",
          providerVersionNumber: "1.0.0",
        }),
      ).rejects.toThrow(
        "Get BDCT Consumer Contract Failed - status: 404 Not Found",
      );
    });
  });

  describe("getBiDirectionalConsumerContractVerificationResults", () => {
    it("should fetch BDCT consumer contract verification results", async () => {
      const mockResponse = { results: [] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result =
        await api.getBiDirectionalConsumerContractVerificationResults({
          providerName: "ProviderA",
          providerVersionNumber: "1.0.0",
        });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/contracts/bi-directional/provider/ProviderA/version/1.0.0/consumer-contract-verification-results",
        {
          method: "GET",
          errorContext: "Get BDCT Consumer Contract Verification Results",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode provider name and version", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getBiDirectionalConsumerContractVerificationResults({
        providerName: "Provider A/B",
        providerVersionNumber: "1.0+beta",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/contracts/bi-directional/provider/Provider%20A%2FB/version/1.0%2Bbeta/consumer-contract-verification-results",
        {
          method: "GET",
          errorContext: "Get BDCT Consumer Contract Verification Results",
        },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Get BDCT Consumer Contract Verification Results Failed"),
      );

      await expect(
        api.getBiDirectionalConsumerContractVerificationResults({
          providerName: "Unknown",
          providerVersionNumber: "1.0.0",
        }),
      ).rejects.toThrow(
        "Get BDCT Consumer Contract Verification Results Failed",
      );
    });
  });

  describe("getBiDirectionalCrossContractVerificationResults", () => {
    it("should fetch BDCT cross-contract verification results", async () => {
      const mockResponse = { outcome: "passed" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getBiDirectionalCrossContractVerificationResults(
        {
          providerName: "ProviderA",
          providerVersionNumber: "1.0.0",
        },
      );

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/contracts/bi-directional/provider/ProviderA/version/1.0.0/cross-contract-verification-results",
        {
          method: "GET",
          errorContext: "Get BDCT Cross-Contract Verification Results",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode provider name and version", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getBiDirectionalCrossContractVerificationResults({
        providerName: "Provider A/B",
        providerVersionNumber: "1.0+beta",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/contracts/bi-directional/provider/Provider%20A%2FB/version/1.0%2Bbeta/cross-contract-verification-results",
        {
          method: "GET",
          errorContext: "Get BDCT Cross-Contract Verification Results",
        },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Get BDCT Cross-Contract Verification Results Failed"),
      );

      await expect(
        api.getBiDirectionalCrossContractVerificationResults({
          providerName: "Unknown",
          providerVersionNumber: "1.0.0",
        }),
      ).rejects.toThrow("Get BDCT Cross-Contract Verification Results Failed");
    });
  });

  describe("getBiDirectionalConsumerContractByConsumer", () => {
    it("should fetch BDCT consumer contract by consumer", async () => {
      const mockResponse = { pact: {} };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getBiDirectionalConsumerContractByConsumer({
        providerName: "ProviderA",
        providerVersionNumber: "1.0.0",
        consumerName: "ConsumerA",
        consumerVersionNumber: "2.0.0",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/contracts/bi-directional/provider/ProviderA/version/1.0.0/consumer/ConsumerA/version/2.0.0/consumer-contract",
        {
          method: "GET",
          errorContext: "Get BDCT Consumer Contract (by consumer version)",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode all four path params", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getBiDirectionalConsumerContractByConsumer({
        providerName: "Provider A/B",
        providerVersionNumber: "1.0+beta",
        consumerName: "Consumer X/Y",
        consumerVersionNumber: "2.0+rc",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/contracts/bi-directional/provider/Provider%20A%2FB/version/1.0%2Bbeta/consumer/Consumer%20X%2FY/version/2.0%2Brc/consumer-contract",
        {
          method: "GET",
          errorContext: "Get BDCT Consumer Contract (by consumer version)",
        },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError(
          "Get BDCT Consumer Contract (by consumer version) Failed",
        ),
      );

      await expect(
        api.getBiDirectionalConsumerContractByConsumer({
          providerName: "P",
          providerVersionNumber: "1",
          consumerName: "C",
          consumerVersionNumber: "1",
        }),
      ).rejects.toThrow(
        "Get BDCT Consumer Contract (by consumer version) Failed",
      );
    });
  });

  describe("getBiDirectionalProviderContractByConsumer", () => {
    it("should fetch BDCT provider contract by consumer", async () => {
      const mockResponse = { spec: {} };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getBiDirectionalProviderContractByConsumer({
        providerName: "ProviderA",
        providerVersionNumber: "1.0.0",
        consumerName: "ConsumerA",
        consumerVersionNumber: "2.0.0",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/contracts/bi-directional/provider/ProviderA/version/1.0.0/consumer/ConsumerA/version/2.0.0/provider-contract",
        {
          method: "GET",
          errorContext: "Get BDCT Provider Contract (by consumer version)",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode all four path params", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getBiDirectionalProviderContractByConsumer({
        providerName: "Provider A/B",
        providerVersionNumber: "1.0+beta",
        consumerName: "Consumer X/Y",
        consumerVersionNumber: "2.0+rc",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/contracts/bi-directional/provider/Provider%20A%2FB/version/1.0%2Bbeta/consumer/Consumer%20X%2FY/version/2.0%2Brc/provider-contract",
        {
          method: "GET",
          errorContext: "Get BDCT Provider Contract (by consumer version)",
        },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError(
          "Get BDCT Provider Contract (by consumer version) Failed",
        ),
      );

      await expect(
        api.getBiDirectionalProviderContractByConsumer({
          providerName: "P",
          providerVersionNumber: "1",
          consumerName: "C",
          consumerVersionNumber: "1",
        }),
      ).rejects.toThrow(
        "Get BDCT Provider Contract (by consumer version) Failed",
      );
    });
  });

  describe("getBiDirectionalProviderContractVerificationResultsByConsumer", () => {
    it("should fetch BDCT provider verification results by consumer", async () => {
      const mockResponse = { results: {} };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result =
        await api.getBiDirectionalProviderContractVerificationResultsByConsumer(
          {
            providerName: "ProviderA",
            providerVersionNumber: "1.0.0",
            consumerName: "ConsumerA",
            consumerVersionNumber: "2.0.0",
          },
        );

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/contracts/bi-directional/provider/ProviderA/version/1.0.0/consumer/ConsumerA/version/2.0.0/provider-contract-verification-results",
        {
          method: "GET",
          errorContext:
            "Get BDCT Provider Contract Verification Results (by consumer version)",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode all four path params", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getBiDirectionalProviderContractVerificationResultsByConsumer({
        providerName: "Provider A/B",
        providerVersionNumber: "1.0+beta",
        consumerName: "Consumer X/Y",
        consumerVersionNumber: "2.0+rc",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/contracts/bi-directional/provider/Provider%20A%2FB/version/1.0%2Bbeta/consumer/Consumer%20X%2FY/version/2.0%2Brc/provider-contract-verification-results",
        {
          method: "GET",
          errorContext:
            "Get BDCT Provider Contract Verification Results (by consumer version)",
        },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError(
          "Get BDCT Provider Contract Verification Results (by consumer version) Failed",
        ),
      );

      await expect(
        api.getBiDirectionalProviderContractVerificationResultsByConsumer({
          providerName: "P",
          providerVersionNumber: "1",
          consumerName: "C",
          consumerVersionNumber: "1",
        }),
      ).rejects.toThrow(
        "Get BDCT Provider Contract Verification Results (by consumer version) Failed",
      );
    });
  });

  describe("getBiDirectionalConsumerContractVerificationResultsByConsumer", () => {
    it("should fetch BDCT consumer verification results by consumer", async () => {
      const mockResponse = { results: {} };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result =
        await api.getBiDirectionalConsumerContractVerificationResultsByConsumer(
          {
            providerName: "ProviderA",
            providerVersionNumber: "1.0.0",
            consumerName: "ConsumerA",
            consumerVersionNumber: "2.0.0",
          },
        );

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/contracts/bi-directional/provider/ProviderA/version/1.0.0/consumer/ConsumerA/version/2.0.0/consumer-contract-verification-results",
        {
          method: "GET",
          errorContext:
            "Get BDCT Consumer Contract Verification Results (by consumer version)",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode all four path params", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getBiDirectionalConsumerContractVerificationResultsByConsumer({
        providerName: "Provider A/B",
        providerVersionNumber: "1.0+beta",
        consumerName: "Consumer X/Y",
        consumerVersionNumber: "2.0+rc",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/contracts/bi-directional/provider/Provider%20A%2FB/version/1.0%2Bbeta/consumer/Consumer%20X%2FY/version/2.0%2Brc/consumer-contract-verification-results",
        {
          method: "GET",
          errorContext:
            "Get BDCT Consumer Contract Verification Results (by consumer version)",
        },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError(
          "Get BDCT Consumer Contract Verification Results (by consumer version) Failed",
        ),
      );

      await expect(
        api.getBiDirectionalConsumerContractVerificationResultsByConsumer({
          providerName: "P",
          providerVersionNumber: "1",
          consumerName: "C",
          consumerVersionNumber: "1",
        }),
      ).rejects.toThrow(
        "Get BDCT Consumer Contract Verification Results (by consumer version) Failed",
      );
    });
  });

  describe("getBiDirectionalCrossContractVerificationResultsByConsumer", () => {
    it("should fetch BDCT cross-contract verification results by consumer", async () => {
      const mockResponse = { outcome: "passed" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result =
        await api.getBiDirectionalCrossContractVerificationResultsByConsumer({
          providerName: "ProviderA",
          providerVersionNumber: "1.0.0",
          consumerName: "ConsumerA",
          consumerVersionNumber: "2.0.0",
        });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/contracts/bi-directional/provider/ProviderA/version/1.0.0/consumer/ConsumerA/version/2.0.0/cross-contract-verification-results",
        {
          method: "GET",
          errorContext:
            "Get BDCT Cross-Contract Verification Results (by consumer version)",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode all four path params", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getBiDirectionalCrossContractVerificationResultsByConsumer({
        providerName: "Provider A/B",
        providerVersionNumber: "1.0+beta",
        consumerName: "Consumer X/Y",
        consumerVersionNumber: "2.0+rc",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/contracts/bi-directional/provider/Provider%20A%2FB/version/1.0%2Bbeta/consumer/Consumer%20X%2FY/version/2.0%2Brc/cross-contract-verification-results",
        {
          method: "GET",
          errorContext:
            "Get BDCT Cross-Contract Verification Results (by consumer version)",
        },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError(
          "Get BDCT Cross-Contract Verification Results (by consumer version) Failed",
        ),
      );

      await expect(
        api.getBiDirectionalCrossContractVerificationResultsByConsumer({
          providerName: "P",
          providerVersionNumber: "1",
          consumerName: "C",
          consumerVersionNumber: "1",
        }),
      ).rejects.toThrow(
        "Get BDCT Cross-Contract Verification Results (by consumer version) Failed",
      );
    });
  });

  describe("listIntegrations", () => {
    it("should list all integrations", async () => {
      const mockResponse = { integrations: [] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.listIntegrations();

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/integrations",
        { method: "GET", errorContext: "List Integrations" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError(
          "List Integrations Failed - status: 500 Internal Server Error",
        ),
      );

      await expect(api.listIntegrations()).rejects.toThrow(
        "List Integrations Failed - status: 500 Internal Server Error",
      );
    });
  });

  describe("getPacticipantNetwork", () => {
    it("should fetch the pacticipant network", async () => {
      const mockResponse = { nodes: [], links: [] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getPacticipantNetwork({
        pacticipantName: "ServiceA",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipant/ServiceA/network",
        { method: "GET", errorContext: "Get Pacticipant Network" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode the pacticipant name", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getPacticipantNetwork({ pacticipantName: "Service A/B" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipant/Service%20A%2FB/network",
        { method: "GET", errorContext: "Get Pacticipant Network" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Get Pacticipant Network Failed - status: 404 Not Found"),
      );

      await expect(
        api.getPacticipantNetwork({ pacticipantName: "Unknown" }),
      ).rejects.toThrow(
        "Get Pacticipant Network Failed - status: 404 Not Found",
      );
    });
  });

  describe("getIntegrationsByTeam", () => {
    it("should fetch integrations for a team", async () => {
      const mockResponse = { integrations: [] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getIntegrationsByTeam({
        teamId: "team-uuid-123",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/integrations/team/team-uuid-123",
        { method: "GET", errorContext: "Get Integrations by Team" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode the team ID", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getIntegrationsByTeam({ teamId: "team/id with spaces" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/integrations/team/team%2Fid%20with%20spaces",
        { method: "GET", errorContext: "Get Integrations by Team" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError(
          "Get Integrations by Team Failed - status: 404 Not Found",
        ),
      );

      await expect(
        api.getIntegrationsByTeam({ teamId: "nonexistent" }),
      ).rejects.toThrow(
        "Get Integrations by Team Failed - status: 404 Not Found",
      );
    });
  });

  describe("deleteIntegration", () => {
    it("should delete a specific integration", async () => {
      mockHttp.fetch.mockResolvedValueOnce(undefined);

      await api.deleteIntegration({
        providerName: "ProviderA",
        consumerName: "ConsumerA",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/integrations/provider/ProviderA/consumer/ConsumerA",
        { method: "DELETE", errorContext: "Delete Integration" },
      );
    });

    it("should URL-encode provider and consumer names", async () => {
      mockHttp.fetch.mockResolvedValueOnce(undefined);

      await api.deleteIntegration({
        providerName: "Provider A/B",
        consumerName: "Consumer X/Y",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/integrations/provider/Provider%20A%2FB/consumer/Consumer%20X%2FY",
        { method: "DELETE", errorContext: "Delete Integration" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Delete Integration Failed - status: 404 Not Found"),
      );

      await expect(
        api.deleteIntegration({
          providerName: "Unknown",
          consumerName: "Unknown",
        }),
      ).rejects.toThrow("Delete Integration Failed - status: 404 Not Found");
    });
  });

  describe("deleteAllIntegrations", () => {
    it("should delete all integrations", async () => {
      mockHttp.fetch.mockResolvedValueOnce(undefined);

      await api.deleteAllIntegrations();

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/integrations",
        { method: "DELETE", errorContext: "Delete All Integrations" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Delete All Integrations Failed - status: 403 Forbidden"),
      );

      await expect(api.deleteAllIntegrations()).rejects.toThrow(
        "Delete All Integrations Failed - status: 403 Forbidden",
      );
    });
  });

  describe("handlers", () => {
    it("should expose all 21 handler keys", () => {
      const handlers = api.handlers;
      const expectedKeys = [
        "getProviderStates",
        "canIDeploy",
        "getMatrix",
        "publishContracts",
        "publishProviderContract",
        "getPactsForVerification",
        "getBiDirectionalProviderContract",
        "getBiDirectionalProviderContractVerificationResults",
        "getBiDirectionalConsumerContract",
        "getBiDirectionalConsumerContractVerificationResults",
        "getBiDirectionalCrossContractVerificationResults",
        "getBiDirectionalConsumerContractByConsumer",
        "getBiDirectionalProviderContractByConsumer",
        "getBiDirectionalProviderContractVerificationResultsByConsumer",
        "getBiDirectionalConsumerContractVerificationResultsByConsumer",
        "getBiDirectionalCrossContractVerificationResultsByConsumer",
        "listIntegrations",
        "getPacticipantNetwork",
        "getIntegrationsByTeam",
        "deleteIntegration",
        "deleteAllIntegrations",
      ];

      expect(Object.keys(handlers)).toEqual(
        expect.arrayContaining(expectedKeys),
      );
      expect(Object.keys(handlers).length).toBe(21);
    });

    it("should bind handlers to the ContractApi instance", async () => {
      const mockResponse = { providerStates: [] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const { getProviderStates } = api.handlers;
      const result = await getProviderStates({ provider: "ProviderA" });

      expect(result).toEqual(mockResponse);
    });
  });
});
