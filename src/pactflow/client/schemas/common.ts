/**
 * Schemas shared by more than one PactFlow API area.
 */
import { z } from "zod";

/**
 * Registers a schema under an id so the JSON Schema advertised to clients
 * references it from `$defs` instead of inlining it at every use. The registry
 * rejects an id registered twice (e.g. when a module is evaluated again), in
 * which case the schema is returned unnamed.
 */
export function named<T extends z.ZodType>(id: string, schema: T): T {
  try {
    return schema.meta({ id }) as T;
  } catch {
    return schema;
  }
}

export const EmbeddedLinkOutputSchema = named(
  "EmbeddedLink",
  z.looseObject({
    href: z.string().optional(),
    name: z.string().optional(),
    templated: z.boolean().optional(),
    title: z.string().optional(),
  }),
);

export const EmbeddedBranchVersionOutputSchema = named(
  "EmbeddedBranchVersion",
  z.looseObject({
    name: z.string().optional(),
    latest: z.boolean().optional(),
    _links: z
      .looseObject({
        self: EmbeddedLinkOutputSchema.optional(),
      })
      .optional(),
  }),
);

export const EmbeddedEnvironmentOutputSchema = named(
  "EmbeddedEnvironment",
  z.looseObject({
    displayName: z.string().optional(),
    name: z.string().optional(),
    production: z.boolean().optional(),
    uuid: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    _links: z
      .looseObject({
        self: EmbeddedLinkOutputSchema.optional(),
      })
      .optional(),
  }),
);

export const PageOutputSchema = named(
  "Page",
  z.looseObject({
    number: z.number().optional(),
    size: z.number().optional(),
    totalElements: z.number().optional(),
    totalPages: z.number().optional(),
  }),
);

export const EmbeddedTeamOutputSchema = named(
  "EmbeddedTeam",
  z.looseObject({
    isDefault: z.boolean().optional(),
    name: z.string().optional(),
    uuid: z.string().optional(),
    _links: z
      .looseObject({
        self: EmbeddedLinkOutputSchema.optional(),
      })
      .optional(),
  }),
);

export const EmbeddedNamedOutputSchema = named(
  "EmbeddedNamed",
  z.looseObject({
    name: z.string().optional(),
    _links: z
      .looseObject({
        self: EmbeddedLinkOutputSchema.optional(),
      })
      .optional(),
  }),
);

export const ContactOutputSchema = named(
  "Contact",
  z.looseObject({
    name: z.string().optional(),
    details: z.looseObject({}).optional(),
  }),
);

export const EnvironmentOutputSchema = named(
  "Environment",
  z.looseObject({
    createdAt: z.string().optional(),
    displayName: z.string().optional(),
    isDefault: z.boolean().optional(),
    name: z.string().optional(),
    production: z.boolean().optional(),
    updatedAt: z.string().optional(),
    uuid: z.string().optional(),
    contacts: z.array(ContactOutputSchema).optional(),
    teamUuids: z.array(z.string()).optional(),
    _embedded: z
      .looseObject({
        teams: z.array(EmbeddedTeamOutputSchema).optional(),
      })
      .optional(),
    _links: z
      .looseObject({
        self: EmbeddedLinkOutputSchema.optional(),
        "pb:currently-deployed-deployed-versions":
          EmbeddedLinkOutputSchema.optional(),
        "pb:currently-supported-released-versions":
          EmbeddedLinkOutputSchema.optional(),
        "pb:environments": EmbeddedLinkOutputSchema.optional(),
      })
      .optional(),
  }),
);

export const EmbeddedVersionOutputSchema = named(
  "EmbeddedVersion",
  z.looseObject({
    number: z.string().optional(),
    _links: z
      .looseObject({
        self: EmbeddedLinkOutputSchema.optional(),
      })
      .optional(),
  }),
);

export const EmbeddedDeployedVersionOutputSchema = named(
  "EmbeddedDeployedVersion",
  z.looseObject({
    uuid: z.string().optional(),
    target: z.string().optional(),
    createdAt: z.string().optional(),
    currentlyDeployed: z.boolean().optional(),
    applicationInstance: z.string().optional(),
    _links: z
      .looseObject({
        self: EmbeddedLinkOutputSchema.optional(),
      })
      .optional(),
    _embedded: z
      .looseObject({
        environment: EnvironmentOutputSchema.optional(),
        pacticipant: EmbeddedNamedOutputSchema.optional(),
        version: EmbeddedVersionOutputSchema.optional(),
      })
      .optional(),
  }),
);

export const EmbeddedReleasedVersionOutputSchema = named(
  "EmbeddedReleasedVersion",
  z.looseObject({
    uuid: z.string().optional(),
    createdAt: z.string().optional(),
    currentlySupported: z.boolean().optional(),
    _links: z
      .looseObject({
        self: EmbeddedLinkOutputSchema.optional(),
      })
      .optional(),
    _embedded: z
      .looseObject({
        environment: EnvironmentOutputSchema.optional(),
        pacticipant: EmbeddedNamedOutputSchema.optional(),
        version: EmbeddedVersionOutputSchema.optional(),
      })
      .optional(),
  }),
);

export const ActionOutputSchema = named(
  "Action",
  z.looseObject({
    name: z.string().optional(),
    title: z.string().optional(),
    method: z.string().optional(),
    href: z.string().optional(),
  }),
);

export const EmptyOutputSchema = z.object({
  success: z
    .literal(true)
    .describe("The operation completed; the API returns no body."),
});

export const PaginationSchema = z.object({
  pageNumber: z.number().default(1).optional().describe("Page number"),
  pageSize: z.number().default(5).optional().describe("Results per page"),
});

export const PaginationOutputSchema = z.object({
  pageNumber: z.number(),
  pageSize: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
});

export const PacticipantVersionWithoutLinksOutputSchema = named(
  "PacticipantVersionWithoutLinks",
  z.looseObject({
    createdAt: z.string().optional(),
    number: z.string().optional(),
    buildUrl: z
      .string()
      .describe(
        "Setting the buildUrl in the version resource is deprecated as it is now set when publishing consumer and provider contracts using the /contracts/publish and /provider-contracts/provider/{provider_name}/publish endpoints.",
      )
      .optional(),
    updatedAt: z.string().optional(),
    _embedded: z
      .looseObject({
        branchVersions: z.array(EmbeddedBranchVersionOutputSchema).optional(),
        tags: z.array(EmbeddedNamedOutputSchema).optional(),
        deployedVersions: z
          .array(EmbeddedDeployedVersionOutputSchema)
          .optional(),
        releasedVersions: z
          .array(EmbeddedReleasedVersionOutputSchema)
          .optional(),
      })
      .optional(),
  }),
);
