import type {
  BdctConsumerContract,
  BdctCrossContractVerificationResults,
  BdctProviderContract,
  BdctVerificationResults,
  CanIDeployInput,
  CanIDeployResponse,
  DeleteIntegrationInput,
  GetBiDirectionalConsumerProviderVersionInput,
  GetBiDirectionalProviderVersionInput,
  GetIntegrationsByTeamInput,
  GetLabelInput,
  GetPacticipantNetworkInput,
  GetPactsForVerificationInput,
  IntegrationsResponse,
  Label,
  LabelByNameInput,
  LabelsResponse,
  ManageLabelInput,
  MatrixInput,
  MatrixResponse,
  PacticipantNetwork,
  PacticipantsByLabelResponse,
  PactsForVerificationResponse,
  ProviderStatesResponse,
  PublishConsumerContractsInput,
  PublishContractsResponse,
  PublishProviderContractInput,
  PublishProviderContractResponse,
} from "./base";
import { PactflowBaseClient } from "./base-client";
import { toQueryString } from "./utils";

export abstract class PactflowContractMethods extends PactflowBaseClient {
  /**
   * Retrieves all provider states declared by a provider's pact tests.
   *
   * @param params - `provider`: The name of the provider.
   * @returns List of provider state strings the provider supports.
   * @throws ToolError if the request fails.
   */
  async getProviderStates({
    provider,
  }: {
    provider: string;
  }): Promise<ProviderStatesResponse> {
    return await this.fetchJson<ProviderStatesResponse>(
      `${this.baseUrl}/pacts/provider/${encodeURIComponent(provider)}/provider-states`,
      { method: "GET", errorContext: "Get Provider States" },
    );
  }

  /**
   * Checks if a given pacticipant version is safe to deploy to a specified environment.
   *
   * @param body - Input containing `pacticipant`, `version`, and `environment`.
   * @returns CanIDeployResponse containing deployment decision and verification results.
   * @throws ToolError if the request fails.
   */
  async canIDeploy({
    pacticipant,
    version,
    environment,
  }: CanIDeployInput): Promise<CanIDeployResponse> {
    return await this.fetchJson<CanIDeployResponse>(
      `${this.baseUrl}/can-i-deploy${toQueryString({ pacticipant, version, environment })}`,
      { method: "GET", errorContext: "Can-I-Deploy Request" },
    );
  }

  /**
   * Retrieves the matrix of pact verification results for the specified pacticipants.
   *
   * @param body - Matrix query parameters including pacticipants, versions, environments, etc.
   * @returns MatrixResponse containing the verification matrix, notices, and summary.
   * @throws ToolError if the request fails.
   */
  async getMatrix(body: MatrixInput): Promise<MatrixResponse> {
    const { q, latestby, limit } = body;
    const queryParts: string[] = [];

    if (latestby) {
      queryParts.push(`latestby=${encodeURIComponent(latestby)}`);
    }
    if (limit !== undefined) {
      queryParts.push(`limit=${limit}`);
    }

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

    return await this.fetchJson<MatrixResponse>(
      `${this.baseUrl}/matrix?${queryParts.join("&")}`,
      { method: "GET", errorContext: "Matrix Request" },
    );
  }

  /**
   * Publishes one or more consumer Pact contracts to the Pact Broker or PactFlow.
   *
   * @param body - Consumer name, version number, contract files (base64-encoded),
   *   and optional branch/tag metadata.
   * @returns Publication result including the pacticipant version number.
   * @throws ToolError if the request fails.
   */
  async publishContracts(
    body: PublishConsumerContractsInput,
  ): Promise<PublishContractsResponse> {
    return await this.fetchJson<PublishContractsResponse>(
      `${this.baseUrl}/contracts/publish`,
      {
        method: "POST",
        body,
        errorContext: "Publish Consumer Contracts",
      },
    );
  }

  /**
   * Publishes a provider OpenAPI contract and its self-verification results to PactFlow
   * for use in Bi-Directional Contract Testing.
   *
   * @param params - `providerName`, version number, base64-encoded OpenAPI spec,
   *   content type, and self-verification results.
   * @returns Publication result.
   * @throws ToolError if the request fails.
   */
  async publishProviderContract({
    providerName,
    ...body
  }: PublishProviderContractInput): Promise<PublishProviderContractResponse> {
    return await this.fetchJson<PublishProviderContractResponse>(
      `${this.baseUrl}/provider-contracts/provider/${encodeURIComponent(providerName)}/publish`,
      { method: "POST", body, errorContext: "Publish Provider Contract" },
    );
  }

  /**
   * Retrieves the set of consumer pacts a provider should verify in its current CI run.
   *
   * @param params - `providerName`, consumer version selectors, pending/WIP flags,
   *   and optional provider branch/tag context.
   * @returns List of pact URLs and metadata the provider must verify.
   * @throws ToolError if the request fails.
   */
  async getPactsForVerification({
    providerName,
    ...body
  }: GetPactsForVerificationInput): Promise<PactsForVerificationResponse> {
    return await this.fetchJson<PactsForVerificationResponse>(
      `${this.baseUrl}/pacts/provider/${encodeURIComponent(providerName)}/for-verification`,
      { method: "POST", body, errorContext: "Get Pacts for Verification" },
    );
  }

  /**
   * Fetches the provider OpenAPI contract for a given provider version in BDCT.
   *
   * @param params - `providerName` and `providerVersionNumber`.
   * @returns The published OpenAPI spec and its verification status.
   * @throws ToolError if the request fails.
   */
  async getBiDirectionalProviderContract({
    providerName,
    providerVersionNumber,
  }: GetBiDirectionalProviderVersionInput): Promise<BdctProviderContract> {
    return await this.fetchJson<BdctProviderContract>(
      `${this.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/provider-contract`,
      { method: "GET", errorContext: "Get BDCT Provider Contract" },
    );
  }

  /**
   * Fetches the self-verification results for a provider contract version in BDCT.
   *
   * @param params - `providerName` and `providerVersionNumber`.
   * @returns The results of the tool (e.g. Dredd, Schemathesis) that verified the provider.
   * @throws ToolError if the request fails.
   */
  async getBiDirectionalProviderContractVerificationResults({
    providerName,
    providerVersionNumber,
  }: GetBiDirectionalProviderVersionInput): Promise<BdctVerificationResults> {
    return await this.fetchJson<BdctVerificationResults>(
      `${this.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/provider-contract-verification-results`,
      {
        method: "GET",
        errorContext: "Get BDCT Provider Contract Verification Results",
      },
    );
  }

  /**
   * Fetches all consumer Pact contracts relevant to a given provider version in BDCT.
   *
   * @param params - `providerName` and `providerVersionNumber`.
   * @returns Consumer contracts compared against the provider's OpenAPI spec.
   * @throws ToolError if the request fails.
   */
  async getBiDirectionalConsumerContract({
    providerName,
    providerVersionNumber,
  }: GetBiDirectionalProviderVersionInput): Promise<BdctConsumerContract> {
    return await this.fetchJson<BdctConsumerContract>(
      `${this.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/consumer-contract`,
      { method: "GET", errorContext: "Get BDCT Consumer Contract" },
    );
  }

  /**
   * Fetches the consumer contract verification results for a given provider version in BDCT.
   *
   * @param params - `providerName` and `providerVersionNumber`.
   * @returns Results of comparing all consumer pacts against the provider's OpenAPI spec.
   * @throws ToolError if the request fails.
   */
  async getBiDirectionalConsumerContractVerificationResults({
    providerName,
    providerVersionNumber,
  }: GetBiDirectionalProviderVersionInput): Promise<BdctVerificationResults> {
    return await this.fetchJson<BdctVerificationResults>(
      `${this.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/consumer-contract-verification-results`,
      {
        method: "GET",
        errorContext: "Get BDCT Consumer Contract Verification Results",
      },
    );
  }

  /**
   * Fetches the cross-contract verification results for a given provider version in BDCT.
   *
   * @param params - `providerName` and `providerVersionNumber`.
   * @returns Combined outcome of PactFlow's automated comparison of the provider spec
   *   against all relevant consumer pacts.
   * @throws ToolError if the request fails.
   */
  async getBiDirectionalCrossContractVerificationResults({
    providerName,
    providerVersionNumber,
  }: GetBiDirectionalProviderVersionInput): Promise<BdctCrossContractVerificationResults> {
    return await this.fetchJson<BdctCrossContractVerificationResults>(
      `${this.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/cross-contract-verification-results`,
      {
        method: "GET",
        errorContext: "Get BDCT Cross-Contract Verification Results",
      },
    );
  }

  /**
   * Fetches the consumer Pact contract for a specific consumer-provider version pair in BDCT.
   *
   * @param params - `providerName`, `providerVersionNumber`, `consumerName`,
   *   and `consumerVersionNumber`.
   * @returns The Pact contract published by the specified consumer version.
   * @throws ToolError if the request fails.
   */
  async getBiDirectionalConsumerContractByConsumer({
    providerName,
    providerVersionNumber,
    consumerName,
    consumerVersionNumber,
  }: GetBiDirectionalConsumerProviderVersionInput): Promise<BdctConsumerContract> {
    return await this.fetchJson<BdctConsumerContract>(
      `${this.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/consumer/${encodeURIComponent(consumerName)}/version/${encodeURIComponent(consumerVersionNumber)}/consumer-contract`,
      {
        method: "GET",
        errorContext: "Get BDCT Consumer Contract (by consumer version)",
      },
    );
  }

  /**
   * Fetches the provider OpenAPI contract for a specific consumer-provider version pair in BDCT.
   *
   * @param params - `providerName`, `providerVersionNumber`, `consumerName`,
   *   and `consumerVersionNumber`.
   * @returns The provider's OpenAPI spec in the context of the given consumer version.
   * @throws ToolError if the request fails.
   */
  async getBiDirectionalProviderContractByConsumer({
    providerName,
    providerVersionNumber,
    consumerName,
    consumerVersionNumber,
  }: GetBiDirectionalConsumerProviderVersionInput): Promise<BdctProviderContract> {
    return await this.fetchJson<BdctProviderContract>(
      `${this.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/consumer/${encodeURIComponent(consumerName)}/version/${encodeURIComponent(consumerVersionNumber)}/provider-contract`,
      {
        method: "GET",
        errorContext: "Get BDCT Provider Contract (by consumer version)",
      },
    );
  }

  /**
   * Fetches the provider contract self-verification results for a specific
   * consumer-provider version pair in BDCT.
   *
   * @param params - `providerName`, `providerVersionNumber`, `consumerName`,
   *   and `consumerVersionNumber`.
   * @returns Provider self-verification results scoped to the given consumer version.
   * @throws ToolError if the request fails.
   */
  async getBiDirectionalProviderContractVerificationResultsByConsumer({
    providerName,
    providerVersionNumber,
    consumerName,
    consumerVersionNumber,
  }: GetBiDirectionalConsumerProviderVersionInput): Promise<BdctVerificationResults> {
    return await this.fetchJson<BdctVerificationResults>(
      `${this.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/consumer/${encodeURIComponent(consumerName)}/version/${encodeURIComponent(consumerVersionNumber)}/provider-contract-verification-results`,
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
   *
   * @param params - `providerName`, `providerVersionNumber`, `consumerName`,
   *   and `consumerVersionNumber`.
   * @returns Results of comparing the specific consumer pact against the provider's OpenAPI spec.
   * @throws ToolError if the request fails.
   */
  async getBiDirectionalConsumerContractVerificationResultsByConsumer({
    providerName,
    providerVersionNumber,
    consumerName,
    consumerVersionNumber,
  }: GetBiDirectionalConsumerProviderVersionInput): Promise<BdctVerificationResults> {
    return await this.fetchJson<BdctVerificationResults>(
      `${this.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/consumer/${encodeURIComponent(consumerName)}/version/${encodeURIComponent(consumerVersionNumber)}/consumer-contract-verification-results`,
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
   *
   * @param params - `providerName`, `providerVersionNumber`, `consumerName`,
   *   and `consumerVersionNumber`.
   * @returns The precise cross-contract comparison outcome for the given pairing.
   * @throws ToolError if the request fails.
   */
  async getBiDirectionalCrossContractVerificationResultsByConsumer({
    providerName,
    providerVersionNumber,
    consumerName,
    consumerVersionNumber,
  }: GetBiDirectionalConsumerProviderVersionInput): Promise<BdctCrossContractVerificationResults> {
    return await this.fetchJson<BdctCrossContractVerificationResults>(
      `${this.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/consumer/${encodeURIComponent(consumerName)}/version/${encodeURIComponent(consumerVersionNumber)}/cross-contract-verification-results`,
      {
        method: "GET",
        errorContext:
          "Get BDCT Cross-Contract Verification Results (by consumer version)",
      },
    );
  }

  /**
   * Retrieves all consumer-provider integrations registered in the workspace.
   *
   * @returns List of all consumer-provider pairings that have pacts published.
   * @throws ToolError if the request fails.
   */
  async listIntegrations(): Promise<IntegrationsResponse> {
    return await this.fetchJson<IntegrationsResponse>(
      `${this.baseUrl}/integrations`,
      { method: "GET", errorContext: "List Integrations" },
    );
  }

  /**
   * Retrieves the integration network graph for a specific pacticipant.
   *
   * @param params - `pacticipantName`: The name of the pacticipant.
   * @returns Network graph of consumer-provider relationships for the pacticipant.
   * @throws ToolError if the request fails.
   */
  async getPacticipantNetwork({
    pacticipantName,
  }: GetPacticipantNetworkInput): Promise<PacticipantNetwork> {
    return await this.fetchJson<PacticipantNetwork>(
      `${this.baseUrl}/pacticipant/${encodeURIComponent(pacticipantName)}/network`,
      { method: "GET", errorContext: "Get Pacticipant Network" },
    );
  }

  /**
   * Retrieves all labels used across the workspace, with optional pagination.
   *
   * @param params - Optional `pageNumber` and `pageSize`.
   * @returns List of every label applied to any pacticipant.
   * @throws ToolError if the request fails.
   */
  async listLabels(params?: {
    pageNumber?: number;
    pageSize?: number;
  }): Promise<LabelsResponse> {
    return await this.fetchJson<LabelsResponse>(
      `${this.baseUrl}/labels${toQueryString({ page: params?.pageNumber, size: params?.pageSize })}`,
      { method: "GET", errorContext: "List Labels" },
    );
  }

  /**
   * Checks whether a specific label is applied to a pacticipant.
   *
   * @param params - `pacticipantName` and `labelName`.
   * @returns The label resource if it exists (404 if not applied).
   * @throws ToolError if the request fails.
   */
  async getPacticipantLabel({
    pacticipantName,
    labelName,
  }: GetLabelInput): Promise<Label> {
    return await this.fetchJson<Label>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/labels/${encodeURIComponent(labelName)}`,
      { method: "GET", errorContext: "Get Pacticipant Label" },
    );
  }

  /**
   * Retrieves all pacticipants that have a specific label applied.
   *
   * @param params - `labelName`: The label to filter by.
   * @returns List of pacticipants with the given label.
   * @throws ToolError if the request fails.
   */
  async listPacticipantsByLabel({
    labelName,
  }: LabelByNameInput): Promise<PacticipantsByLabelResponse> {
    return await this.fetchJson<PacticipantsByLabelResponse>(
      `${this.baseUrl}/pacticipants/label/${encodeURIComponent(labelName)}`,
      { method: "GET", errorContext: "List Pacticipants by Label" },
    );
  }

  /**
   * Applies a label to a pacticipant.
   *
   * @param params - `pacticipantName` and `labelName` to apply.
   * @returns The created label resource.
   * @throws ToolError if the request fails.
   */
  async addLabel({
    pacticipantName,
    labelName,
  }: ManageLabelInput): Promise<Label> {
    return await this.fetchJson<Label>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/labels/${encodeURIComponent(labelName)}`,
      { method: "PUT", body: {}, errorContext: "Add Label" },
    );
  }

  /**
   * Removes a label from a pacticipant.
   *
   * @param params - `pacticipantName` and `labelName` to remove.
   * @throws ToolError if the label or pacticipant is not found, or the request fails.
   */
  async removeLabel({
    pacticipantName,
    labelName,
  }: ManageLabelInput): Promise<void> {
    return await this.fetchJson<void>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/labels/${encodeURIComponent(labelName)}`,
      { method: "DELETE", errorContext: "Remove Label" },
    );
  }

  /**
   * Retrieves all consumer-provider integrations assigned to a specific team.
   *
   * @param params - `teamId`: UUID of the team.
   * @returns List of integrations associated with the team.
   * @throws ToolError if the request fails.
   */
  async getIntegrationsByTeam({
    teamId,
  }: GetIntegrationsByTeamInput): Promise<IntegrationsResponse> {
    return await this.fetchJson<IntegrationsResponse>(
      `${this.baseUrl}/integrations/team/${encodeURIComponent(teamId)}`,
      { method: "GET", errorContext: "Get Integrations by Team" },
    );
  }

  /**
   * Deletes the integration (pact relationship) between a specific consumer and provider.
   *
   * @param params - `providerName` and `consumerName`.
   * @throws ToolError if the integration is not found or the request fails.
   */
  async deleteIntegration({
    providerName,
    consumerName,
  }: DeleteIntegrationInput): Promise<void> {
    return await this.fetchJson<void>(
      `${this.baseUrl}/integrations/provider/${encodeURIComponent(providerName)}/consumer/${encodeURIComponent(consumerName)}`,
      { method: "DELETE", errorContext: "Delete Integration" },
    );
  }

  /**
   * Deletes all consumer-provider integrations in the workspace. Use with caution.
   *
   * @throws ToolError if the request fails.
   */
  async deleteAllIntegrations(): Promise<void> {
    return await this.fetchJson<void>(`${this.baseUrl}/integrations`, {
      method: "DELETE",
      errorContext: "Delete All Integrations",
    });
  }
}
