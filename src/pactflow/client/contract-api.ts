import type {
  BiDirectionalConsumerContractByConsumerResponse,
  BiDirectionalConsumerContractResponse,
  BiDirectionalConsumerContractVerificationResultsByConsumerResponse,
  BiDirectionalConsumerContractVerificationResultsResponse,
  BiDirectionalCrossContractVerificationResultsByConsumerResponse,
  BiDirectionalCrossContractVerificationResultsResponse,
  BiDirectionalProviderContractByConsumerResponse,
  BiDirectionalProviderContractResponse,
  BiDirectionalProviderContractVerificationResultsByConsumerResponse,
  BiDirectionalProviderContractVerificationResultsResponse,
  CanIDeployInput,
  CanIDeployResponse,
  DeleteIntegrationInput,
  GetBiDirectionalConsumerProviderVersionInput,
  GetBiDirectionalProviderVersionInput,
  GetIntegrationsByTeamInput,
  GetPacticipantNetworkInput,
  GetPactsForVerificationInput,
  IntegrationsByTeamResponse,
  IntegrationsListResponse,
  MatrixInput,
  MatrixResponse,
  PacticipantNetworkResponse,
  PactsForVerificationResponse,
  ProviderStatesResponse,
  PublishConsumerContractsInput,
  PublishContractsResponse,
  PublishProviderContractInput,
  PublishProviderContractResponse,
} from "./base";
import type { HttpClient } from "./http-client";

export class ContractApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Retrieves all provider states declared by a provider's pact tests.
   */
  async getProviderStates({
    provider,
  }: {
    provider: string;
  }): Promise<ProviderStatesResponse> {
    const uri_encoded_provider_name = encodeURIComponent(provider);
    return await this.http.fetch<ProviderStatesResponse>(
      `${this.http.baseUrl}/pacts/provider/${uri_encoded_provider_name}/provider-states`,
      {
        method: "GET",
        errorContext: "Get Provider States",
      },
    );
  }

  /**
   * Checks if a given pacticipant version is safe to deploy to a specified environment.
   */
  async canIDeploy(body: CanIDeployInput): Promise<CanIDeployResponse> {
    const { pacticipant, version, environment } = body;
    const queryParams = new URLSearchParams({
      pacticipant,
      version,
      environment,
    });
    const url = `${this.http.baseUrl}/can-i-deploy?${queryParams.toString()}`;

    return await this.http.fetch<CanIDeployResponse>(url, {
      method: "GET",
      errorContext: "Can-I-Deploy Request",
    });
  }

  /**
   * Retrieves the matrix of pact verification results for the specified pacticipants.
   */
  async getMatrix(body: MatrixInput): Promise<MatrixResponse> {
    const { q, latestby, limit } = body;

    // Build query parameters manually to avoid URL encoding of square brackets
    const queryParts: string[] = [];

    // Add optional parameters
    if (latestby) {
      queryParts.push(`latestby=${encodeURIComponent(latestby)}`);
    }
    if (limit !== undefined) {
      queryParts.push(`limit=${limit}`);
    }

    // Add the q parameters (pacticipant selectors)
    q.forEach((selector) => {
      queryParts.push(
        `q[]pacticipant=${encodeURIComponent(selector.pacticipant)}`,
      );

      if (selector.version) {
        queryParts.push(`q[]version=${encodeURIComponent(selector.version)}`);
      }

      if (selector.branch) {
        queryParts.push(`q[]branch=${encodeURIComponent(selector.branch)}`);
      }
      if (selector.environment) {
        queryParts.push(
          `q[]environment=${encodeURIComponent(selector.environment)}`,
        );
      }
      if (selector.latest !== undefined) {
        queryParts.push(`q[]latest=${selector.latest}`);
      }
      if (selector.tag) {
        queryParts.push(`q[]tag=${encodeURIComponent(selector.tag)}`);
      }
      if (selector.mainBranch !== undefined) {
        queryParts.push(`q[]mainBranch=${selector.mainBranch}`);
      }
    });

    const url = `${this.http.baseUrl}/matrix?${queryParts.join("&")}`;

    return await this.http.fetch<MatrixResponse>(url, {
      method: "GET",
      errorContext: "Matrix Request",
    });
  }

  /**
   * Publishes consumer contracts (pacts) to PactFlow.
   */
  async publishContracts(
    body: PublishConsumerContractsInput,
  ): Promise<PublishContractsResponse> {
    return await this.http.fetch<PublishContractsResponse>(
      `${this.http.baseUrl}/contracts/publish`,
      {
        method: "POST",
        body,
        errorContext: "Publish Consumer Contracts",
      },
    );
  }

  /**
   * Publishes a provider OpenAPI or AsyncAPI contract and its self-verification results
   * to PactFlow for use in Bi-Directional Contract Testing.
   */
  async publishProviderContract({
    providerName,
    ...body
  }: PublishProviderContractInput): Promise<PublishProviderContractResponse> {
    return await this.http.fetch<PublishProviderContractResponse>(
      `${this.http.baseUrl}/provider-contracts/provider/${encodeURIComponent(providerName)}/publish`,
      { method: "POST", body, errorContext: "Publish Provider Contract" },
    );
  }

  /**
   * Retrieves the set of consumer pacts a provider should verify in its current CI run.
   */
  async getPactsForVerification({
    providerName,
    ...body
  }: GetPactsForVerificationInput): Promise<PactsForVerificationResponse> {
    return await this.http.fetch<PactsForVerificationResponse>(
      `${this.http.baseUrl}/pacts/provider/${encodeURIComponent(providerName)}/for-verification`,
      { method: "POST", body, errorContext: "Get Pacts for Verification" },
    );
  }

  /**
   * Fetches the provider OpenAPI contract for a given provider version in BDCT.
   */
  async getBiDirectionalProviderContract({
    providerName,
    providerVersionNumber,
  }: GetBiDirectionalProviderVersionInput): Promise<BiDirectionalProviderContractResponse> {
    return await this.http.fetch<BiDirectionalProviderContractResponse>(
      `${this.http.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/provider-contract`,
      { method: "GET", errorContext: "Get BDCT Provider Contract" },
    );
  }

  /**
   * Fetches the self-verification results for a provider contract version in BDCT.
   */
  async getBiDirectionalProviderContractVerificationResults({
    providerName,
    providerVersionNumber,
  }: GetBiDirectionalProviderVersionInput): Promise<BiDirectionalProviderContractVerificationResultsResponse> {
    return await this.http.fetch<BiDirectionalProviderContractVerificationResultsResponse>(
      `${this.http.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/provider-contract-verification-results`,
      {
        method: "GET",
        errorContext: "Get BDCT Provider Contract Verification Results",
      },
    );
  }

  /**
   * Fetches all consumer Pact contracts relevant to a given provider version in BDCT.
   */
  async getBiDirectionalConsumerContract({
    providerName,
    providerVersionNumber,
  }: GetBiDirectionalProviderVersionInput): Promise<BiDirectionalConsumerContractResponse> {
    return await this.http.fetch<BiDirectionalConsumerContractResponse>(
      `${this.http.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/consumer-contract`,
      { method: "GET", errorContext: "Get BDCT Consumer Contract" },
    );
  }

  /**
   * Fetches the consumer contract verification results for a given provider version in BDCT.
   */
  async getBiDirectionalConsumerContractVerificationResults({
    providerName,
    providerVersionNumber,
  }: GetBiDirectionalProviderVersionInput): Promise<BiDirectionalConsumerContractVerificationResultsResponse> {
    return await this.http.fetch<BiDirectionalConsumerContractVerificationResultsResponse>(
      `${this.http.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/consumer-contract-verification-results`,
      {
        method: "GET",
        errorContext: "Get BDCT Consumer Contract Verification Results",
      },
    );
  }

  /**
   * Fetches the cross-contract verification results for a given provider version in BDCT.
   */
  async getBiDirectionalCrossContractVerificationResults({
    providerName,
    providerVersionNumber,
  }: GetBiDirectionalProviderVersionInput): Promise<BiDirectionalCrossContractVerificationResultsResponse> {
    return await this.http.fetch<BiDirectionalCrossContractVerificationResultsResponse>(
      `${this.http.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/cross-contract-verification-results`,
      {
        method: "GET",
        errorContext: "Get BDCT Cross-Contract Verification Results",
      },
    );
  }

  /**
   * Fetches the consumer Pact contract for a specific consumer-provider version pair in BDCT.
   */
  async getBiDirectionalConsumerContractByConsumer({
    providerName,
    providerVersionNumber,
    consumerName,
    consumerVersionNumber,
  }: GetBiDirectionalConsumerProviderVersionInput): Promise<BiDirectionalConsumerContractByConsumerResponse> {
    return await this.http.fetch<BiDirectionalConsumerContractByConsumerResponse>(
      `${this.http.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/consumer/${encodeURIComponent(consumerName)}/version/${encodeURIComponent(consumerVersionNumber)}/consumer-contract`,
      {
        method: "GET",
        errorContext: "Get BDCT Consumer Contract (by consumer version)",
      },
    );
  }

  /**
   * Fetches the provider OpenAPI contract for a specific consumer-provider version pair in BDCT.
   */
  async getBiDirectionalProviderContractByConsumer({
    providerName,
    providerVersionNumber,
    consumerName,
    consumerVersionNumber,
  }: GetBiDirectionalConsumerProviderVersionInput): Promise<BiDirectionalProviderContractByConsumerResponse> {
    return await this.http.fetch<BiDirectionalProviderContractByConsumerResponse>(
      `${this.http.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/consumer/${encodeURIComponent(consumerName)}/version/${encodeURIComponent(consumerVersionNumber)}/provider-contract`,
      {
        method: "GET",
        errorContext: "Get BDCT Provider Contract (by consumer version)",
      },
    );
  }

  /**
   * Fetches the provider contract self-verification results for a specific
   * consumer-provider version pair in BDCT.
   */
  async getBiDirectionalProviderContractVerificationResultsByConsumer({
    providerName,
    providerVersionNumber,
    consumerName,
    consumerVersionNumber,
  }: GetBiDirectionalConsumerProviderVersionInput): Promise<BiDirectionalProviderContractVerificationResultsByConsumerResponse> {
    return await this.http.fetch<BiDirectionalProviderContractVerificationResultsByConsumerResponse>(
      `${this.http.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/consumer/${encodeURIComponent(consumerName)}/version/${encodeURIComponent(consumerVersionNumber)}/provider-contract-verification-results`,
      {
        method: "GET",
        errorContext:
          "Get BDCT Provider Contract Verification Results (by consumer version)",
      },
    );
  }

  /**
   * Fetches the consumer contract verification results for a specific
   * consumer-provider version pair in BDCT.
   */
  async getBiDirectionalConsumerContractVerificationResultsByConsumer({
    providerName,
    providerVersionNumber,
    consumerName,
    consumerVersionNumber,
  }: GetBiDirectionalConsumerProviderVersionInput): Promise<BiDirectionalConsumerContractVerificationResultsByConsumerResponse> {
    return await this.http.fetch<BiDirectionalConsumerContractVerificationResultsByConsumerResponse>(
      `${this.http.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/consumer/${encodeURIComponent(consumerName)}/version/${encodeURIComponent(consumerVersionNumber)}/consumer-contract-verification-results`,
      {
        method: "GET",
        errorContext:
          "Get BDCT Consumer Contract Verification Results (by consumer version)",
      },
    );
  }

  /**
   * Fetches the cross-contract verification results for a specific
   * consumer-provider version pair in BDCT.
   */
  async getBiDirectionalCrossContractVerificationResultsByConsumer({
    providerName,
    providerVersionNumber,
    consumerName,
    consumerVersionNumber,
  }: GetBiDirectionalConsumerProviderVersionInput): Promise<BiDirectionalCrossContractVerificationResultsByConsumerResponse> {
    return await this.http.fetch<BiDirectionalCrossContractVerificationResultsByConsumerResponse>(
      `${this.http.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/consumer/${encodeURIComponent(consumerName)}/version/${encodeURIComponent(consumerVersionNumber)}/cross-contract-verification-results`,
      {
        method: "GET",
        errorContext:
          "Get BDCT Cross-Contract Verification Results (by consumer version)",
      },
    );
  }

  /**
   * Retrieves all consumer-provider integrations registered in the workspace.
   */
  async listIntegrations(): Promise<IntegrationsListResponse> {
    return await this.http.fetch<IntegrationsListResponse>(
      `${this.http.baseUrl}/integrations`,
      {
        method: "GET",
        errorContext: "List Integrations",
      },
    );
  }

  /**
   * Retrieves the integration network graph for a specific pacticipant.
   */
  async getPacticipantNetwork({
    pacticipantName,
  }: GetPacticipantNetworkInput): Promise<PacticipantNetworkResponse> {
    return await this.http.fetch<PacticipantNetworkResponse>(
      `${this.http.baseUrl}/pacticipant/${encodeURIComponent(pacticipantName)}/network`,
      { method: "GET", errorContext: "Get Pacticipant Network" },
    );
  }

  /**
   * Retrieves all integrations associated with a team.
   */
  async getIntegrationsByTeam({
    teamId,
  }: GetIntegrationsByTeamInput): Promise<IntegrationsByTeamResponse> {
    return await this.http.fetch<IntegrationsByTeamResponse>(
      `${this.http.baseUrl}/integrations/team/${encodeURIComponent(teamId)}`,
      {
        method: "GET",
        errorContext: "Get Integrations by Team",
      },
    );
  }

  /**
   * Deletes the integration (pact relationship) between a specific consumer and provider.
   */
  async deleteIntegration({
    providerName,
    consumerName,
  }: DeleteIntegrationInput): Promise<void> {
    return await this.http.fetch<void>(
      `${this.http.baseUrl}/integrations/provider/${encodeURIComponent(providerName)}/consumer/${encodeURIComponent(consumerName)}`,
      { method: "DELETE", errorContext: "Delete Integration" },
    );
  }

  /**
   * Deletes all consumer-provider integrations in the workspace. Use with caution.
   */
  async deleteAllIntegrations(): Promise<void> {
    return await this.http.fetch<void>(`${this.http.baseUrl}/integrations`, {
      method: "DELETE",
      errorContext: "Delete All Integrations",
    });
  }

  get handlers(): Record<string, (...args: any[]) => Promise<any>> {
    return {
      getProviderStates: this.getProviderStates.bind(this),
      canIDeploy: this.canIDeploy.bind(this),
      getMatrix: this.getMatrix.bind(this),
      publishContracts: this.publishContracts.bind(this),
      publishProviderContract: this.publishProviderContract.bind(this),
      getPactsForVerification: this.getPactsForVerification.bind(this),
      getBiDirectionalProviderContract:
        this.getBiDirectionalProviderContract.bind(this),
      getBiDirectionalProviderContractVerificationResults:
        this.getBiDirectionalProviderContractVerificationResults.bind(this),
      getBiDirectionalConsumerContract:
        this.getBiDirectionalConsumerContract.bind(this),
      getBiDirectionalConsumerContractVerificationResults:
        this.getBiDirectionalConsumerContractVerificationResults.bind(this),
      getBiDirectionalCrossContractVerificationResults:
        this.getBiDirectionalCrossContractVerificationResults.bind(this),
      getBiDirectionalConsumerContractByConsumer:
        this.getBiDirectionalConsumerContractByConsumer.bind(this),
      getBiDirectionalProviderContractByConsumer:
        this.getBiDirectionalProviderContractByConsumer.bind(this),
      getBiDirectionalProviderContractVerificationResultsByConsumer:
        this.getBiDirectionalProviderContractVerificationResultsByConsumer.bind(
          this,
        ),
      getBiDirectionalConsumerContractVerificationResultsByConsumer:
        this.getBiDirectionalConsumerContractVerificationResultsByConsumer.bind(
          this,
        ),
      getBiDirectionalCrossContractVerificationResultsByConsumer:
        this.getBiDirectionalCrossContractVerificationResultsByConsumer.bind(
          this,
        ),
      listIntegrations: this.listIntegrations.bind(this),
      getPacticipantNetwork: this.getPacticipantNetwork.bind(this),
      getIntegrationsByTeam: this.getIntegrationsByTeam.bind(this),
      deleteIntegration: this.deleteIntegration.bind(this),
      deleteAllIntegrations: this.deleteAllIntegrations.bind(this),
    };
  }
}
