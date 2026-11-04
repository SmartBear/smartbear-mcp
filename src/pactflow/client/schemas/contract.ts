/**
 * Contract schemas (can-i-deploy, matrix, publishing, verification, BDCT, integrations): tool inputs, API responses (output schemas) and the types derived from them.
 *
 * Output schemas were written from the PactFlow OpenAPI description and are
 * maintained by hand; they are not generated, so update them when the API
 * changes. They are deliberately lenient: every property is optional, objects
 * accept extra fields and formats (uuid, date-time, ...) are not enforced. The
 * same tools also run against OSS Pact Brokers whose responses are a subset of
 * PactFlow's, and validation is advisory (see `advisoryOutputSchema`).
 */
import { z } from "zod";
import {
  ActionOutputSchema,
  EmbeddedBranchVersionOutputSchema,
  EmbeddedEnvironmentOutputSchema,
  EmbeddedLinkOutputSchema,
  EmbeddedNamedOutputSchema,
  EmbeddedVersionOutputSchema,
  EmptyOutputSchema,
  named,
  PacticipantVersionWithoutLinksOutputSchema,
  PageOutputSchema,
  PaginationSchema,
} from "./common";

export const MatrixPacticipantVersionOutputSchema = named(
  "MatrixPacticipantVersion",
  z.looseObject({
    branch: z.unknown().describe("Use branchVersions").optional(),
    branches: z
      .array(EmbeddedBranchVersionOutputSchema)
      .describe("Use branchVersions")
      .optional(),
    branchVersions: z.array(EmbeddedBranchVersionOutputSchema).optional(),
    environments: z.array(EmbeddedEnvironmentOutputSchema).optional(),
    _links: z
      .looseObject({
        self: EmbeddedLinkOutputSchema.optional(),
      })
      .optional(),
    number: z.string().optional(),
    tags: z
      .array(
        z.looseObject({
          latest: z.boolean().optional(),
          name: z.string().optional(),
          _links: z
            .looseObject({
              self: EmbeddedLinkOutputSchema.optional(),
            })
            .optional(),
        }),
      )
      .optional(),
  }),
);

export const MatrixPacticipantOutputSchema = named(
  "MatrixPacticipant",
  z.looseObject({
    name: z.unknown().optional(),
    version: MatrixPacticipantVersionOutputSchema.nullable().optional(),
    _links: z
      .looseObject({
        self: EmbeddedLinkOutputSchema.optional(),
      })
      .optional(),
  }),
);

export const NoticeOutputSchema = named(
  "Notice",
  z.looseObject({
    text: z.string().optional(),
    type: z
      .union([
        z.literal("info"),
        z.literal("debug"),
        z.literal("warning"),
        z.literal("prompt"),
        z.literal("success"),
        z.literal("error"),
      ])
      .optional(),
  }),
);

export const MatrixOutputSchema = z.looseObject({
  matrix: z
    .array(
      z.looseObject({
        consumer: MatrixPacticipantOutputSchema.optional(),
        pact: z
          .looseObject({
            createdAt: z.string().optional(),
            _links: z
              .looseObject({
                self: EmbeddedLinkOutputSchema.optional(),
                "pfi:ui": EmbeddedLinkOutputSchema.optional(),
              })
              .optional(),
          })
          .optional(),
        provider: MatrixPacticipantOutputSchema.optional(),
        verificationResult: z
          .looseObject({
            success: z.boolean().optional(),
            verifiedAt: z.string().optional(),
            _links: z
              .looseObject({
                self: EmbeddedLinkOutputSchema.optional(),
                "pfi:ui": EmbeddedLinkOutputSchema.optional(),
              })
              .optional(),
          })
          .nullable()
          .optional(),
      }),
    )
    .optional(),
  notices: z.array(NoticeOutputSchema).optional(),
  summary: z
    .looseObject({
      deployable: z
        .boolean()
        .nullable()
        .describe(
          "The property that indicates whether or not the pacticipant version is safe to deploy.",
        )
        .optional(),
      failed: z.number().optional(),
      reason: z.string().optional(),
      success: z.number().optional(),
      unknown: z.number().optional(),
    })
    .optional(),
});

export const PublishedConsumerContractOutputSchema = z.looseObject({
  notices: z.array(NoticeOutputSchema).optional(),
  _embedded: z
    .looseObject({
      pacticipant: EmbeddedNamedOutputSchema.optional(),
      version: EmbeddedVersionOutputSchema.optional(),
    })
    .optional(),
  _links: z
    .looseObject({
      "pb:pacticipant": EmbeddedLinkOutputSchema.optional(),
      "pb:pacticipant-version": EmbeddedLinkOutputSchema.optional(),
      "pb:pacticipant-version-tags": z
        .array(EmbeddedLinkOutputSchema)
        .optional(),
      "pb:contracts": z.array(EmbeddedLinkOutputSchema).optional(),
    })
    .optional(),
});

export const PublishedProviderContractOutputSchema = z.looseObject({
  notices: z.array(NoticeOutputSchema).optional(),
  _embedded: z
    .looseObject({
      pacticipant: EmbeddedNamedOutputSchema.optional(),
      version: EmbeddedVersionOutputSchema.optional(),
    })
    .optional(),
  _links: z
    .looseObject({
      "pf:provider-contract": EmbeddedLinkOutputSchema.optional(),
      "pb:pacticipant": EmbeddedLinkOutputSchema.optional(),
      "pb:pacticipant-version": EmbeddedLinkOutputSchema.optional(),
      "pb:pacticipant-version-tags": z
        .array(EmbeddedLinkOutputSchema)
        .optional(),
      "pb:branch-version": EmbeddedLinkOutputSchema.optional(),
    })
    .optional(),
});

export const VerifiablePactOutputSchema = named(
  "VerifiablePact",
  z.looseObject({
    shortDescription: z.string().optional(),
    verificationProperties: z
      .looseObject({
        pending: z.boolean().optional(),
        notices: z
          .array(
            z.looseObject({
              when: z.string().optional(),
              text: z.string().optional(),
            }),
          )
          .optional(),
        wip: z.boolean().optional(),
      })
      .optional(),
    _links: z
      .looseObject({
        self: EmbeddedLinkOutputSchema.optional(),
      })
      .optional(),
  }),
);

export const VerifiablePactsOutputSchema = z.looseObject({
  _embedded: z
    .looseObject({
      pacts: z.array(VerifiablePactOutputSchema).optional(),
    })
    .optional(),
  _links: z
    .looseObject({
      self: EmbeddedLinkOutputSchema.optional(),
    })
    .optional(),
});

export const ProviderContractVerificationResultsInProviderContractOutputSchema =
  named(
    "ProviderContractVerificationResultsInProviderContract",
    z.looseObject({
      success: z.boolean().optional(),
      content: z.string().optional(),
      contentType: z.string().optional(),
      verifier: z.string().optional(),
    }),
  );

export const VerificationSuccessOutputSchema = named(
  "VerificationSuccess",
  z.looseObject({
    success: z.boolean().optional(),
  }),
);

export const ProviderContractOutputSchema = named(
  "ProviderContract",
  z.looseObject({
    content: z.string().optional(),
    contentType: z.string().optional(),
    contractType: z.string().optional(),
    createdAt: z.string().optional(),
  }),
);

/** BDCT results share one envelope and differ in the verification results they embed. */
const bdctResult = (embedded: z.ZodRawShape) =>
  z.looseObject({
    verificationStatus: z.string().optional(),
    _actions: z.array(ActionOutputSchema).optional(),
    _embedded: z
      .looseObject({
        consumerVersion: PacticipantVersionWithoutLinksOutputSchema.optional(),
        providerVersion: PacticipantVersionWithoutLinksOutputSchema.optional(),
        ...embedded,
      })
      .optional(),
    _links: z.looseObject({}).optional(),
  });

export const CrossContractVerificationResultsInConsumerContractOutputSchema =
  named(
    "CrossContractVerificationResultsInConsumerContract",
    z.looseObject({
      success: z.boolean().optional(),
      results: z.looseObject({}).optional(),
      verificationDate: z.string().optional(),
      verifier: z.string().optional(),
      verifierVersion: z.string().optional(),
    }),
  );

export const ConsumerContractOutputSchema = named(
  "ConsumerContract",
  z.looseObject({
    content: z.string().optional(),
  }),
);

const providerEmbedded = {
  crossContractVerificationResults: VerificationSuccessOutputSchema.optional(),
  providerContractVerificationResults:
    ProviderContractVerificationResultsInProviderContractOutputSchema.optional(),
  consumerContractVerificationResults:
    VerificationSuccessOutputSchema.optional(),
};

const consumerEmbedded = {
  crossContractVerificationResults:
    CrossContractVerificationResultsInConsumerContractOutputSchema.optional(),
  providerContractVerificationResults:
    VerificationSuccessOutputSchema.optional(),
  consumerContractVerificationResults:
    VerificationSuccessOutputSchema.optional(),
};

export const BiDirectionalProviderContractOutputSchema = bdctResult({
  ...providerEmbedded,
  providerContract: ProviderContractOutputSchema.optional(),
});

export const BiDirectionalProviderContractVerificationResultsOutputSchema =
  bdctResult(providerEmbedded);

export const BiDirectionalConsumerContractOutputSchema = bdctResult({
  ...consumerEmbedded,
  consumerContract: ConsumerContractOutputSchema.optional(),
});

export const BiDirectionalConsumerContractVerificationResultsOutputSchema =
  bdctResult({
    ...consumerEmbedded,
    crossContractVerificationResults:
      VerificationSuccessOutputSchema.optional(),
  });

export const BiDirectionalCrossContractVerificationResultsOutputSchema =
  bdctResult(consumerEmbedded);

export const IntegrationOutputSchema = named(
  "Integration",
  z.looseObject({
    consumer: z
      .looseObject({
        name: z.string().optional(),
      })
      .optional(),
    provider: z
      .looseObject({
        name: z.string().optional(),
      })
      .optional(),
    verificationModes: z
      .array(z.union([z.literal("comparison"), z.literal("replay")]))
      .optional(),
    _links: z
      .looseObject({
        "pb:dashboard": EmbeddedLinkOutputSchema.optional(),
        "pb:matrix": EmbeddedLinkOutputSchema.optional(),
        "pb:group": EmbeddedLinkOutputSchema.optional(),
        "pb:delete_integration": EmbeddedLinkOutputSchema.optional(),
      })
      .optional(),
  }),
);

export const IntegrationsOutputSchema = z.looseObject({
  page: PageOutputSchema.optional(),
  _embedded: z
    .looseObject({
      integrations: z.array(IntegrationOutputSchema).optional(),
    })
    .optional(),
  _links: z
    .looseObject({
      self: EmbeddedLinkOutputSchema.optional(),
    })
    .optional(),
});

export const pacticipantIntegrationsOutputSchema = z.looseObject({
  integrations: z
    .array(
      z.looseObject({
        consumer: z
          .looseObject({
            name: z.string().optional(),
          })
          .optional(),
        provider: z
          .looseObject({
            name: z.string().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
  _links: z
    .looseObject({
      self: EmbeddedLinkOutputSchema.optional(),
    })
    .optional(),
});

export const ProviderStatesOutputSchema = z.looseObject({
  providerStates: z.array(
    z.looseObject({
      name: z.string(),
      params: z.record(z.string(), z.unknown()).nullable().optional(),
      consumers: z.array(z.string()),
    }),
  ),
});

export const CanIDeploySchema = z.object({
  pacticipant: z
    .string()
    .describe(
      "The name of the pacticipant (application/service) being evaluated for deployment",
    ),
  version: z
    .string()
    .describe(
      "The version of the pacticipant that you want to check if it's safe to deploy",
    ),
  environment: z
    .string()
    .describe(
      "The target environment where the pacticipant version will be deployed (e.g., 'production', 'staging', 'test')",
    ),
});

export const MatrixSchema = z.object({
  latestby: z
    .string()
    .optional()
    .describe(
      "This property removes the rows for the overridden pacts/verifications from the results. The options are cvp (show only the latest row for each consumer version and provider) and cvpv (show only the latest row each consumer version and provider version). For a can-i-deploy query with one selector, it should be set to cvp. For a can-i-deploy query with two selectors, it should be set to cvpv.",
    ),
  limit: z
    .number()
    .min(1)
    .max(1000)
    .default(100)
    .optional()
    .describe(
      "The limit on the number of results to return (1-1000, default: 100)",
    ),
  q: z
    .array(
      z.object({
        pacticipant: z
          .string()
          .describe("Name of the pacticipant (application)"),
        version: z.string().optional().describe("Version number"),
        branch: z
          .string()
          .optional()
          .describe("Name of the pacticipant version branch"),
        environment: z
          .string()
          .optional()
          .describe(
            "The name of the environment that the pacticipant version is deployed to",
          ),
        latest: z
          .boolean()
          .optional()
          .describe(
            "Used in conjunction with other properties to indicate whether the selector is describing the latest version from a branch/with a tag/for a pacticipant, or all of them. Note that when used with tags, the 'latest' is calculated using the creation date of the pacticipant version, NOT the creation date of the tag.",
          ),
        tag: z
          .string()
          .optional()
          .describe(
            "The name of the pacticipant version tag (superseded by branch and environments)",
          ),
        mainBranch: z
          .boolean()
          .optional()
          .describe(
            "Whether or not the version(s) described are from the main branch of the pacticipant, as set in the mainBranch property of the pacticipant resource.",
          ),
      }),
    )
    .min(1)
    .max(2),
});

export type CanIDeployInput = z.infer<typeof CanIDeploySchema>;

export type MatrixInput = z.infer<typeof MatrixSchema>;

export const PublishConsumerContractsSchema = z.object({
  pacticipantName: z
    .string()
    .min(1)
    .describe("Name of the consumer application"),
  pacticipantVersionNumber: z
    .string()
    .min(1)
    .describe("Version number of the consumer"),
  contracts: z
    .array(
      z.object({
        consumerName: z.string().describe("Consumer application name"),
        providerName: z.string().describe("Provider application name"),
        content: z.string().describe("Base64-encoded Pact JSON content"),
        contentType: z
          .literal("application/json")
          .describe("Content type (must be 'application/json')"),
        specification: z
          .literal("pact")
          .describe("Specification type (must be 'pact')"),
      }),
    )
    .describe("Contracts to publish"),
  tags: z
    .array(z.string())
    .optional()
    .describe("Version tags (e.g. 'main', 'staging')"),
  branch: z.string().optional().describe("Branch name of the consumer"),
  buildUrl: z
    .string()
    .optional()
    .describe("URL of the CI build that produced these contracts"),
});

export const PublishProviderContractSchema = z.object({
  providerName: z.string().describe("Name of the provider application"),
  pacticipantVersionNumber: z
    .string()
    .min(1)
    .describe("Version number of the provider"),
  contract: z
    .object({
      content: z
        .string()
        .describe("Base64-encoded OpenAPI or AsyncAPI specification content"),
      contentType: z
        .enum(["application/json", "application/yaml", "application/yml"])
        .describe("Content type of the spec"),
      specification: z
        .enum(["oas", "asyncapi"])
        .describe(
          "Specification type: 'oas' for OpenAPI or 'asyncapi' for AsyncAPI",
        ),
      selfVerificationResults: z
        .object({
          success: z.boolean().describe("Whether self-verification passed"),
          content: z
            .string()
            .optional()
            .describe("Verification results content (e.g. test output)"),
          contentType: z
            .string()
            .optional()
            .describe("Content type of the verification results"),
          verifier: z
            .string()
            .describe(
              "Name of the tool used for verification (e.g. 'dredd', 'schemathesis')",
            ),
          verifierVersion: z
            .string()
            .optional()
            .describe("Version of the verification tool"),
          format: z
            .string()
            .optional()
            .describe("Format of the verification results"),
        })
        .describe(
          "Results of self-verifying the provider against its own contract",
        ),
    })
    .describe(
      "Provider contract (OpenAPI or AsyncAPI spec) and verification details",
    ),
  tags: z.array(z.string()).optional().describe("Version tags"),
  branch: z.string().optional().describe("Branch name of the provider"),
  buildUrl: z.string().optional().describe("URL of the CI build"),
});

export const GetPactsForVerificationSchema = z.object({
  providerName: z.string().describe("Name of the provider to get pacts for"),
  consumerVersionSelectors: z
    .array(
      z.object({
        branch: z.string().optional().describe("Consumer branch name"),
        consumer: z.string().optional().describe("Consumer name"),
        deployed: z
          .boolean()
          .optional()
          .describe("Include versions that are currently deployed"),
        deployedOrReleased: z
          .boolean()
          .optional()
          .describe("Include versions that are currently deployed or released"),
        environment: z.string().optional().describe("Environment name"),
        fallbackBranch: z
          .string()
          .optional()
          .describe("Fallback branch if primary branch doesn't exist"),
        latest: z
          .boolean()
          .optional()
          .describe("Select only the latest version"),
        mainBranch: z
          .boolean()
          .optional()
          .describe("Select versions from the consumer's main branch"),
        matchingBranch: z
          .boolean()
          .optional()
          .describe(
            "Select versions from the branch that matches the provider branch",
          ),
        released: z
          .boolean()
          .optional()
          .describe("Include versions that are currently released"),
        tag: z.string().optional().describe("Tag name (legacy, prefer branch)"),
      }),
    )
    .optional()
    .describe("Selectors specifying which consumer versions to include"),
  includePendingStatus: z
    .boolean()
    .optional()
    .describe("Include the pending status in the results"),
  includeWipPactsSince: z
    .string()
    .optional()
    .describe("Include WIP pacts published since this date (ISO 8601)"),
  providerVersionBranch: z
    .string()
    .optional()
    .describe("Branch of the provider version being verified"),
  providerVersionTags: z
    .array(z.string())
    .optional()
    .describe("Tags for the provider version being verified"),
});

export const GetBiDirectionalProviderVersionSchema = z
  .object({
    providerName: z.string().describe("Name of the provider"),
    providerVersionNumber: z.string().describe("Provider version number"),
  })
  .extend(PaginationSchema.shape);

export const GetBiDirectionalConsumerProviderVersionSchema = z
  .object({
    providerName: z.string().describe("Name of the provider"),
    providerVersionNumber: z.string().describe("Provider version number"),
    consumerName: z.string().describe("Name of the consumer"),
    consumerVersionNumber: z.string().describe("Consumer version number"),
  })
  .extend(PaginationSchema.shape);

export type GetBiDirectionalProviderVersionInput = z.infer<
  typeof GetBiDirectionalProviderVersionSchema
>;

export type GetBiDirectionalConsumerProviderVersionInput = z.infer<
  typeof GetBiDirectionalConsumerProviderVersionSchema
>;

export const GetIntegrationsByTeamSchema = z
  .object({
    teamId: z.string().describe("UUID of the team"),
  })
  .extend(PaginationSchema.shape);

export type GetIntegrationsByTeamInput = z.infer<
  typeof GetIntegrationsByTeamSchema
>;

export const DeleteIntegrationSchema = z.object({
  providerName: z.string().describe("Name of the provider"),
  consumerName: z.string().describe("Name of the consumer"),
});

export type DeleteIntegrationInput = z.infer<typeof DeleteIntegrationSchema>;

export const GetPacticipantNetworkSchema = z
  .object({
    pacticipantName: z
      .string()
      .describe("Name of the pacticipant to get network for"),
  })
  .extend(PaginationSchema.shape);

export type PublishConsumerContractsInput = z.infer<
  typeof PublishConsumerContractsSchema
>;

export type PublishProviderContractInput = z.infer<
  typeof PublishProviderContractSchema
>;

export type GetPactsForVerificationInput = z.infer<
  typeof GetPactsForVerificationSchema
>;

export type GetPacticipantNetworkInput = z.infer<
  typeof GetPacticipantNetworkSchema
>;

/** Output schema of each contract handler, keyed by handler name. */
export const CONTRACT_OUTPUT_SCHEMAS = {
  canIDeploy: MatrixOutputSchema,
  getMatrix: MatrixOutputSchema,
  publishContracts: PublishedConsumerContractOutputSchema,
  publishProviderContract: PublishedProviderContractOutputSchema,
  getPactsForVerification: VerifiablePactsOutputSchema,
  getBiDirectionalProviderContract: BiDirectionalProviderContractOutputSchema,
  getBiDirectionalProviderContractVerificationResults:
    BiDirectionalProviderContractVerificationResultsOutputSchema,
  getBiDirectionalConsumerContract: BiDirectionalConsumerContractOutputSchema,
  getBiDirectionalConsumerContractVerificationResults:
    BiDirectionalConsumerContractVerificationResultsOutputSchema,
  getBiDirectionalCrossContractVerificationResults:
    BiDirectionalCrossContractVerificationResultsOutputSchema,
  getBiDirectionalConsumerContractByConsumer:
    BiDirectionalConsumerContractOutputSchema,
  getBiDirectionalProviderContractByConsumer:
    BiDirectionalProviderContractOutputSchema,
  getBiDirectionalProviderContractVerificationResultsByConsumer:
    BiDirectionalProviderContractVerificationResultsOutputSchema,
  getBiDirectionalConsumerContractVerificationResultsByConsumer:
    BiDirectionalConsumerContractVerificationResultsOutputSchema,
  getBiDirectionalCrossContractVerificationResultsByConsumer:
    BiDirectionalCrossContractVerificationResultsOutputSchema,
  listIntegrations: IntegrationsOutputSchema,
  getPacticipantNetwork: pacticipantIntegrationsOutputSchema,
  getIntegrationsByTeam: IntegrationsOutputSchema,
  getProviderStates: ProviderStatesOutputSchema,
  deleteIntegration: EmptyOutputSchema,
  deleteAllIntegrations: EmptyOutputSchema,
};

export type PublishContractsResponse = z.infer<
  (typeof CONTRACT_OUTPUT_SCHEMAS)["publishContracts"]
>;

export type PublishProviderContractResponse = z.infer<
  (typeof CONTRACT_OUTPUT_SCHEMAS)["publishProviderContract"]
>;

export type PactsForVerificationResponse = z.infer<
  (typeof CONTRACT_OUTPUT_SCHEMAS)["getPactsForVerification"]
>;

export type BiDirectionalProviderContractResponse = z.infer<
  (typeof CONTRACT_OUTPUT_SCHEMAS)["getBiDirectionalProviderContract"]
>;

export type BiDirectionalProviderContractVerificationResultsResponse = z.infer<
  (typeof CONTRACT_OUTPUT_SCHEMAS)["getBiDirectionalProviderContractVerificationResults"]
>;

export type BiDirectionalConsumerContractResponse = z.infer<
  (typeof CONTRACT_OUTPUT_SCHEMAS)["getBiDirectionalConsumerContract"]
>;

export type BiDirectionalConsumerContractVerificationResultsResponse = z.infer<
  (typeof CONTRACT_OUTPUT_SCHEMAS)["getBiDirectionalConsumerContractVerificationResults"]
>;

export type BiDirectionalCrossContractVerificationResultsResponse = z.infer<
  (typeof CONTRACT_OUTPUT_SCHEMAS)["getBiDirectionalCrossContractVerificationResults"]
>;

export type BiDirectionalConsumerContractByConsumerResponse = z.infer<
  (typeof CONTRACT_OUTPUT_SCHEMAS)["getBiDirectionalConsumerContractByConsumer"]
>;

export type BiDirectionalProviderContractByConsumerResponse = z.infer<
  (typeof CONTRACT_OUTPUT_SCHEMAS)["getBiDirectionalProviderContractByConsumer"]
>;

export type BiDirectionalProviderContractVerificationResultsByConsumerResponse =
  z.infer<
    (typeof CONTRACT_OUTPUT_SCHEMAS)["getBiDirectionalProviderContractVerificationResultsByConsumer"]
  >;

export type BiDirectionalConsumerContractVerificationResultsByConsumerResponse =
  z.infer<
    (typeof CONTRACT_OUTPUT_SCHEMAS)["getBiDirectionalConsumerContractVerificationResultsByConsumer"]
  >;

export type BiDirectionalCrossContractVerificationResultsByConsumerResponse =
  z.infer<
    (typeof CONTRACT_OUTPUT_SCHEMAS)["getBiDirectionalCrossContractVerificationResultsByConsumer"]
  >;

export type IntegrationsListResponse = z.infer<
  (typeof CONTRACT_OUTPUT_SCHEMAS)["listIntegrations"]
>;

export type IntegrationsByTeamResponse = z.infer<
  (typeof CONTRACT_OUTPUT_SCHEMAS)["getIntegrationsByTeam"]
>;

export type PacticipantNetworkResponse = z.infer<
  (typeof CONTRACT_OUTPUT_SCHEMAS)["getPacticipantNetwork"]
>;

export type ProviderStatesResponse = z.infer<
  (typeof CONTRACT_OUTPUT_SCHEMAS)["getProviderStates"]
>;

export type CanIDeployResponse = z.infer<
  (typeof CONTRACT_OUTPUT_SCHEMAS)["canIDeploy"]
>;

export type MatrixResponse = z.infer<
  (typeof CONTRACT_OUTPUT_SCHEMAS)["getMatrix"]
>;
