/**
 * Pacticipant, branch, version and label schemas: tool inputs, API responses (output schemas) and the types derived from them.
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
  EmbeddedLinkOutputSchema,
  EmbeddedNamedOutputSchema,
  EmbeddedTeamOutputSchema,
  EmptyOutputSchema,
  named,
  PacticipantVersionWithoutLinksOutputSchema,
  PageOutputSchema,
  PaginationSchema,
} from "./common";

export const PacticipantOutputSchema = named(
  "Pacticipant",
  z.looseObject({
    createdAt: z.string().optional(),
    displayName: z.string().optional(),
    mainBranch: z.string().optional(),
    name: z.string().optional(),
    repositoryName: z.string().optional(),
    repositoryNamespace: z.string().optional(),
    repositoryUrl: z.string().optional(),
    updatedAt: z.string().optional(),
    title: z.string().optional(),
    _embedded: z
      .looseObject({
        "latest-version": z
          .looseObject({
            number: z.string().optional(),
            title: z.string().optional(),
            name: z.string().optional(),
          })
          .describe("Use latestVersion")
          .optional(),
        labels: z.array(EmbeddedNamedOutputSchema).optional(),
        latestVersion: z
          .looseObject({
            number: z.string().optional(),
            _links: z
              .looseObject({
                self: EmbeddedLinkOutputSchema.optional(),
              })
              .optional(),
          })
          .optional(),
        teams: z
          .array(EmbeddedTeamOutputSchema)
          .describe(
            "The teams this pacticipant belongs to. Always embedded on the single pacticipant endpoint, and on the collection endpoint when requested via ?include=teams.",
          )
          .optional(),
      })
      .optional(),
    _links: z
      .looseObject({
        "pb:branch-version": EmbeddedLinkOutputSchema.optional(),
        "pb:branches": EmbeddedLinkOutputSchema.optional(),
        "pb:can-i-deploy-badge": EmbeddedLinkOutputSchema.optional(),
        "pb:can-i-deploy-branch-to-environment-badge":
          EmbeddedLinkOutputSchema.optional(),
        "pb:label": EmbeddedLinkOutputSchema.optional(),
        "pb:teams": z
          .array(EmbeddedLinkOutputSchema)
          .describe(
            "Links to the admin team resource for each team this pacticipant belongs to. Present whenever the teams are embedded.",
          )
          .optional(),
        "pb:version": EmbeddedLinkOutputSchema.optional(),
        "pb:version-tag": EmbeddedLinkOutputSchema.optional(),
        "pb:versions": EmbeddedLinkOutputSchema.optional(),
        curies: z.array(EmbeddedLinkOutputSchema).optional(),
        self: EmbeddedLinkOutputSchema.optional(),
        versions: EmbeddedLinkOutputSchema.optional(),
      })
      .optional(),
  }),
);

export const PacticipantsOutputSchema = z.looseObject({
  page: PageOutputSchema.optional(),
  pacticipants: z.array(PacticipantOutputSchema).optional(),
  _embedded: z
    .looseObject({
      pacticipants: z.array(PacticipantOutputSchema).optional(),
    })
    .optional(),
  _links: z
    .looseObject({
      self: EmbeddedLinkOutputSchema.optional(),
      next: EmbeddedLinkOutputSchema.optional(),
      previous: EmbeddedLinkOutputSchema.optional(),
      "pb:pacticipants-with-label": EmbeddedLinkOutputSchema.optional(),
      "pb:pacticipants": z.array(EmbeddedLinkOutputSchema).optional(),
      pacticipants: z.array(EmbeddedLinkOutputSchema).optional(),
    })
    .optional(),
});

export const BranchOutputSchema = named(
  "Branch",
  z.looseObject({
    name: z.string().optional(),
    createdAt: z.string().optional(),
    _links: z
      .looseObject({
        self: EmbeddedLinkOutputSchema.optional(),
        "pb:latest-version": EmbeddedLinkOutputSchema.optional(),
      })
      .optional(),
  }),
);

export const BranchesOutputSchema = z.looseObject({
  page: PageOutputSchema.optional(),
  _embedded: z
    .looseObject({
      branches: z.array(BranchOutputSchema).optional(),
    })
    .optional(),
  _links: z
    .looseObject({
      self: EmbeddedLinkOutputSchema.optional(),
      "pb:branches": z.array(EmbeddedLinkOutputSchema).optional(),
      next: EmbeddedLinkOutputSchema.optional(),
      previous: EmbeddedLinkOutputSchema.optional(),
    })
    .optional(),
});

const PacticipantVersionLinks = {
  "pb:latest-verification-results-where-pacticipant-is-consumer":
    EmbeddedLinkOutputSchema.optional(),
  "pb:pact-versions": z.array(EmbeddedLinkOutputSchema).optional(),
  "pb:pacticipant": EmbeddedLinkOutputSchema.optional(),
  "pb:tag": EmbeddedLinkOutputSchema.optional(),
  curies: z.array(EmbeddedLinkOutputSchema).optional(),
  self: EmbeddedLinkOutputSchema.optional(),
};

export const PacticipantVersionInCollectionOutputSchema = named(
  "PacticipantVersionInCollection",
  PacticipantVersionWithoutLinksOutputSchema.extend({
    _links: z.looseObject(PacticipantVersionLinks).optional(),
  }),
);

export const PacticipantVersionsOutputSchema = z.looseObject({
  page: PageOutputSchema.optional(),
  _embedded: z
    .looseObject({
      versions: z.array(PacticipantVersionInCollectionOutputSchema).optional(),
    })
    .optional(),
  _links: z
    .looseObject({
      "pb:pacticipant": EmbeddedLinkOutputSchema.optional(),
      "pb:versions": z.array(EmbeddedLinkOutputSchema).optional(),
      next: EmbeddedLinkOutputSchema.optional(),
      pacticipant: EmbeddedLinkOutputSchema.optional(),
      previous: EmbeddedLinkOutputSchema.optional(),
      self: EmbeddedLinkOutputSchema.optional(),
      versions: z
        .array(EmbeddedLinkOutputSchema)
        .describe("Use pb:versions")
        .optional(),
    })
    .optional(),
});

export const PacticipantVersionOutputSchema =
  PacticipantVersionWithoutLinksOutputSchema.extend({
    _links: z
      .looseObject({
        ...PacticipantVersionLinks,
        "pb:record-deployment": z.array(EmbeddedLinkOutputSchema).optional(),
        "pb:record-release": z.array(EmbeddedLinkOutputSchema).optional(),
      })
      .optional(),
  });

export const LabelOutputSchema = named(
  "Label",
  z.looseObject({
    name: z.string().optional(),
  }),
);

export const LabelsOutputSchema = z.looseObject({
  page: PageOutputSchema.optional(),
  _embedded: z
    .looseObject({
      labels: z.array(LabelOutputSchema).optional(),
    })
    .optional(),
  _links: z
    .looseObject({
      self: EmbeddedLinkOutputSchema.optional(),
      next: EmbeddedLinkOutputSchema.optional(),
      previous: EmbeddedLinkOutputSchema.optional(),
    })
    .optional(),
});

export const PacticipantLabelOutputSchema = z.looseObject({
  name: z.string().optional(),
  createdAt: z.string().optional(),
  _links: z
    .looseObject({
      self: z
        .looseObject({
          title: z.string().optional(),
          name: z.string().optional(),
          href: z.string().optional(),
        })
        .optional(),
      pacticipant: z
        .looseObject({
          title: z.string().optional(),
          name: z.string().optional(),
          href: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

export const GetPacticipantSchema = z.object({
  pacticipantName: z
    .string()
    .describe("Name of the pacticipant (application or service)"),
});

export const ListBranchesSchema = z.object({
  pacticipantName: z.string().describe("Name of the pacticipant"),
  q: z.string().optional().describe("Filter branches by name"),
  pageNumber: z.number().default(1).optional().describe("Page number"),
  pageSize: z.number().default(5).optional().describe("Results per page"),
});

export const ListVersionsSchema = z.object({
  pacticipantName: z.string().describe("Name of the pacticipant"),
  pageNumber: z.number().default(1).optional().describe("Page number"),
  pageSize: z.number().default(5).optional().describe("Results per page"),
});

export const GetVersionSchema = z.object({
  pacticipantName: z.string().describe("Name of the pacticipant"),
  versionNumber: z.string().describe("Version number to retrieve"),
});

export const GetLatestVersionSchema = z.object({
  pacticipantName: z.string().describe("Name of the pacticipant"),
  tag: z
    .string()
    .optional()
    .describe(
      "Tag to filter by. If omitted, returns the overall latest version.",
    ),
});

export const GetLabelSchema = z.object({
  pacticipantName: z.string().describe("Name of the pacticipant"),
  labelName: z.string().describe("Name of the label"),
});

export const LabelByNameSchema = z
  .object({
    labelName: z.string().describe("Label name to filter by"),
  })
  .extend(PaginationSchema.shape);

export const UpdatePacticipantSchema = z.object({
  pacticipantName: z.string().describe("Name of the pacticipant to update"),
  displayName: z.string().optional().describe("Human-readable display name"),
  mainBranch: z
    .string()
    .optional()
    .describe("Name of the main/trunk branch (e.g. 'main')"),
  repositoryName: z.string().optional().describe("Repository name"),
  repositoryNamespace: z
    .string()
    .optional()
    .describe("Repository namespace/organisation"),
  repositoryUrl: z.string().optional().describe("URL of the source repository"),
});

export const UpdateVersionSchema = z.object({
  pacticipantName: z.string().describe("Name of the pacticipant"),
  versionNumber: z.string().describe("Version number to update"),
  buildUrl: z
    .string()
    .optional()
    .describe("URL of the CI build that produced this version"),
});

export const GetBranchVersionsSchema = z.object({
  pacticipantName: z.string().describe("Name of the pacticipant"),
  branchName: z.string().describe("Name of the branch"),
  pageNumber: z.number().default(1).optional().describe("Page number"),
  pageSize: z.number().default(5).optional().describe("Results per page"),
});

export type GetLabelInput = z.infer<typeof GetLabelSchema>;

export type LabelByNameInput = z.infer<typeof LabelByNameSchema>;

export type UpdatePacticipantInput = z.infer<typeof UpdatePacticipantSchema>;

export type UpdateVersionInput = z.infer<typeof UpdateVersionSchema>;

export type GetBranchVersionsInput = z.infer<typeof GetBranchVersionsSchema>;

export const CreatePacticipantSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe("Name of the pacticipant (cannot be changed after creation)"),
  displayName: z.string().optional().describe("Human-readable display name"),
  mainBranch: z
    .string()
    .optional()
    .describe("Name of the main/trunk branch (e.g. 'main')"),
  repositoryName: z.string().optional().describe("Repository name"),
  repositoryNamespace: z
    .string()
    .optional()
    .describe("Repository namespace/organisation"),
  repositoryUrl: z.string().optional().describe("URL of the source repository"),
});

export type CreatePacticipantInput = z.infer<typeof CreatePacticipantSchema>;

export const DeletePacticipantSchema = z.object({
  pacticipantName: z.string().describe("Name of the pacticipant to delete"),
});

export type DeletePacticipantInput = z.infer<typeof DeletePacticipantSchema>;

export const GetBranchSchema = z.object({
  pacticipantName: z.string().describe("Name of the pacticipant"),
  branchName: z.string().describe("Name of the branch"),
});

export type GetBranchInput = z.infer<typeof GetBranchSchema>;

export const DeleteBranchSchema = z.object({
  pacticipantName: z.string().describe("Name of the pacticipant"),
  branchName: z.string().describe("Name of the branch to delete"),
});

export type DeleteBranchInput = z.infer<typeof DeleteBranchSchema>;

export const ManageLabelSchema = z.object({
  pacticipantName: z.string().describe("Name of the pacticipant"),
  labelName: z.string().describe("Name of the label"),
});

export type ManageLabelInput = z.infer<typeof ManageLabelSchema>;

export type GetPacticipantInput = z.infer<typeof GetPacticipantSchema>;

export type ListBranchesInput = z.infer<typeof ListBranchesSchema>;

export type ListVersionsInput = z.infer<typeof ListVersionsSchema>;

export type GetVersionInput = z.infer<typeof GetVersionSchema>;

export type GetLatestVersionInput = z.infer<typeof GetLatestVersionSchema>;

/** Output schema of each pacticipant handler, keyed by handler name. */
export const PACTICIPANT_OUTPUT_SCHEMAS = {
  listPacticipants: PacticipantsOutputSchema,
  getPacticipant: PacticipantOutputSchema,
  listBranches: BranchesOutputSchema,
  listVersions: PacticipantVersionsOutputSchema,
  getVersion: PacticipantVersionOutputSchema,
  getLatestVersion: PacticipantVersionOutputSchema,
  listLabels: LabelsOutputSchema,
  getPacticipantLabel: PacticipantLabelOutputSchema,
  listPacticipantsByLabel: PacticipantsOutputSchema,
  updatePacticipant: PacticipantOutputSchema,
  patchPacticipant: PacticipantOutputSchema,
  updateVersion: PacticipantVersionOutputSchema,
  getBranchVersions: PacticipantVersionsOutputSchema,
  createPacticipant: PacticipantOutputSchema,
  getBranch: BranchOutputSchema,
  addLabel: PacticipantLabelOutputSchema,
  deleteBranch: EmptyOutputSchema,
  deletePacticipant: EmptyOutputSchema,
  removeLabel: EmptyOutputSchema,
};

export type PacticipantsListResponse = z.infer<
  (typeof PACTICIPANT_OUTPUT_SCHEMAS)["listPacticipants"]
>;

export type PacticipantResponse = z.infer<
  (typeof PACTICIPANT_OUTPUT_SCHEMAS)["getPacticipant"]
>;

export type BranchesListResponse = z.infer<
  (typeof PACTICIPANT_OUTPUT_SCHEMAS)["listBranches"]
>;

export type BranchResponse = z.infer<
  (typeof PACTICIPANT_OUTPUT_SCHEMAS)["getBranch"]
>;

export type BranchVersionsResponse = z.infer<
  (typeof PACTICIPANT_OUTPUT_SCHEMAS)["getBranchVersions"]
>;

export type VersionsListResponse = z.infer<
  (typeof PACTICIPANT_OUTPUT_SCHEMAS)["listVersions"]
>;

export type VersionResponse = z.infer<
  (typeof PACTICIPANT_OUTPUT_SCHEMAS)["getVersion"]
>;

export type LabelsListResponse = z.infer<
  (typeof PACTICIPANT_OUTPUT_SCHEMAS)["listLabels"]
>;

export type LabelResponse = z.infer<
  (typeof PACTICIPANT_OUTPUT_SCHEMAS)["getPacticipantLabel"]
>;

export type PacticipantsByLabelResponse = z.infer<
  (typeof PACTICIPANT_OUTPUT_SCHEMAS)["listPacticipantsByLabel"]
>;
