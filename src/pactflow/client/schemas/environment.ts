/**
 * Environment, deployment and release schemas: tool inputs, API responses (output schemas) and the types derived from them.
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
  EmbeddedDeployedVersionOutputSchema,
  EmbeddedLinkOutputSchema,
  EmbeddedReleasedVersionOutputSchema,
  EmptyOutputSchema,
  EnvironmentOutputSchema,
  PaginationSchema,
} from "./common";

export const EnvironmentsOutputSchema = z.looseObject({
  _embedded: z
    .looseObject({
      environments: z.array(EnvironmentOutputSchema).optional(),
    })
    .optional(),
  _links: z
    .looseObject({
      self: EmbeddedLinkOutputSchema.optional(),
      "pb:environments": z.array(EmbeddedLinkOutputSchema).optional(),
    })
    .optional(),
});

export const DeployedVersionsOutputSchema = z.looseObject({
  _embedded: z
    .looseObject({
      deployedVersions: z.array(EmbeddedDeployedVersionOutputSchema).optional(),
    })
    .optional(),
  _links: z
    .looseObject({
      self: EmbeddedLinkOutputSchema.optional(),
    })
    .optional(),
});

export const ReleasedVersionsOutputSchema = z.looseObject({
  _embedded: z
    .looseObject({
      releasedVersions: z.array(EmbeddedReleasedVersionOutputSchema).optional(),
    })
    .optional(),
  _links: z
    .looseObject({
      self: EmbeddedLinkOutputSchema.optional(),
    })
    .optional(),
});

export const GetEnvironmentSchema = z.object({
  environmentId: z.string().describe("UUID of the environment"),
});

export const RecordDeploymentSchema = z.object({
  pacticipantName: z
    .string()
    .describe("Name of the pacticipant that was deployed"),
  versionNumber: z.string().describe("Version number that was deployed"),
  environmentId: z.string().describe("UUID of the target environment"),
  applicationInstance: z
    .string()
    .optional()
    .describe(
      "Identifies a specific instance when multiple instances of the same application are deployed to the same environment (e.g. 'blue', 'green')",
    ),
});

export const GetCurrentlyDeployedSchema = z
  .object({
    environmentId: z.string().describe("UUID of the environment"),
  })
  .extend(PaginationSchema.shape);

export const RecordReleaseSchema = z.object({
  pacticipantName: z
    .string()
    .describe("Name of the pacticipant that was released"),
  versionNumber: z.string().describe("Version number that was released"),
  environmentId: z.string().describe("UUID of the target environment"),
});

export const GetCurrentlySupportedSchema = z
  .object({
    environmentId: z.string().describe("UUID of the environment"),
  })
  .extend(PaginationSchema.shape);

export const GetVersionDeployedSchema = z
  .object({
    pacticipantName: z.string().describe("Name of the pacticipant"),
    versionNumber: z.string().describe("Version number"),
    environmentId: z.string().describe("UUID of the environment"),
  })
  .extend(PaginationSchema.shape);

export type GetVersionDeployedInput = z.infer<typeof GetVersionDeployedSchema>;

export const CreateEnvironmentSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe("Unique name for the environment (e.g. 'production', 'staging')"),
  production: z.boolean().describe("Whether this is a production environment"),
  displayName: z.string().optional().describe("Human-readable display name"),
  teamUuids: z
    .array(z.string().uuid())
    .optional()
    .describe("UUIDs of teams that own this environment"),
});

export type CreateEnvironmentInput = z.infer<typeof CreateEnvironmentSchema>;

export const UpdateEnvironmentSchema = z.object({
  environmentId: z.string().describe("UUID of the environment to update"),
  name: z.string().min(1).describe("Unique name for the environment"),
  production: z.boolean().describe("Whether this is a production environment"),
  displayName: z.string().optional().describe("Human-readable display name"),
  teamUuids: z
    .array(z.string().uuid())
    .optional()
    .describe("UUIDs of teams that own this environment"),
});

export type UpdateEnvironmentInput = z.infer<typeof UpdateEnvironmentSchema>;

export type GetEnvironmentInput = z.infer<typeof GetEnvironmentSchema>;

export type RecordDeploymentInput = z.infer<typeof RecordDeploymentSchema>;

export type GetCurrentlyDeployedInput = z.infer<
  typeof GetCurrentlyDeployedSchema
>;

export type RecordReleaseInput = z.infer<typeof RecordReleaseSchema>;

export type GetCurrentlySupportedInput = z.infer<
  typeof GetCurrentlySupportedSchema
>;

/** Output schema of each environment handler, keyed by handler name. */
export const ENVIRONMENT_OUTPUT_SCHEMAS = {
  listEnvironments: EnvironmentsOutputSchema,
  getEnvironment: EnvironmentOutputSchema,
  recordDeployment: EmbeddedDeployedVersionOutputSchema,
  getCurrentlyDeployed: DeployedVersionsOutputSchema,
  recordRelease: EmbeddedReleasedVersionOutputSchema,
  getCurrentlySupported: ReleasedVersionsOutputSchema,
  getDeployedVersions: DeployedVersionsOutputSchema,
  getReleasedVersions: ReleasedVersionsOutputSchema,
  createEnvironment: EnvironmentOutputSchema,
  updateEnvironment: EnvironmentOutputSchema,
  deleteEnvironment: EmptyOutputSchema,
};

export type EnvironmentsListResponse = z.infer<
  (typeof ENVIRONMENT_OUTPUT_SCHEMAS)["listEnvironments"]
>;

export type EnvironmentResponse = z.infer<
  (typeof ENVIRONMENT_OUTPUT_SCHEMAS)["getEnvironment"]
>;

export type DeploymentResponse = z.infer<
  (typeof ENVIRONMENT_OUTPUT_SCHEMAS)["recordDeployment"]
>;

export type CurrentlyDeployedResponse = z.infer<
  (typeof ENVIRONMENT_OUTPUT_SCHEMAS)["getCurrentlyDeployed"]
>;

export type DeployedVersionsResponse = z.infer<
  (typeof ENVIRONMENT_OUTPUT_SCHEMAS)["getDeployedVersions"]
>;

export type ReleaseResponse = z.infer<
  (typeof ENVIRONMENT_OUTPUT_SCHEMAS)["recordRelease"]
>;

export type CurrentlySupportedResponse = z.infer<
  (typeof ENVIRONMENT_OUTPUT_SCHEMAS)["getCurrentlySupported"]
>;

export type ReleasedVersionsResponse = z.infer<
  (typeof ENVIRONMENT_OUTPUT_SCHEMAS)["getReleasedVersions"]
>;
