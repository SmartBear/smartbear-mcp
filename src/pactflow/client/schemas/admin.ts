/**
 * Admin, user, team, role, secret, token and audit schemas: tool inputs, API responses (output schemas) and the types derived from them.
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
  EmbeddedEnvironmentOutputSchema,
  EmbeddedLinkOutputSchema,
  EmbeddedNamedOutputSchema,
  EmptyOutputSchema,
  named,
  PageOutputSchema,
  PaginationSchema,
} from "./common";

export const MetricsOutputSchema = z.looseObject({
  crossContractComparisons: z
    .looseObject({
      count: z.number().optional(),
    })
    .optional(),
  deployedVersions: z
    .looseObject({
      count: z.number().optional(),
      userCreatedCount: z.number().optional(),
      currentlyDeployedCount: z.number().optional(),
    })
    .optional(),
  environments: z
    .looseObject({
      count: z.number().optional(),
    })
    .optional(),
  interactions: z
    .looseObject({
      latestInteractionsAndMessagesCount: z.number().optional(),
      latestInteractionsCount: z.number().optional(),
      latestMessagesCount: z.number().optional(),
    })
    .optional(),
  integrations: z
    .looseObject({
      count: z.number().optional(),
    })
    .optional(),
  matrix: z
    .looseObject({
      count: z
        .number()
        .describe(
          "Hardcoded to -1 by current brokers (calculating it was too slow); older brokers return the real count.",
        )
        .optional(),
    })
    .optional(),
  pactPublications: z
    .looseObject({
      count: z.number().optional(),
      first: z.string().nullable().optional(),
      last: z.string().nullable().optional(),
    })
    .optional(),
  pactVersions: z
    .looseObject({
      count: z.number().optional(),
    })
    .optional(),
  pactRevisionsPerConsumerVersion: z
    .looseObject({
      distribution: z.looseObject({}).optional(),
    })
    .optional(),
  pacticipants: z
    .looseObject({
      count: z.number().optional(),
      withMainBranchSetCount: z.number().optional(),
    })
    .optional(),
  pacticipantVersions: z
    .looseObject({
      count: z.number().optional(),
      withUserCreatedBranchCount: z.number().optional(),
      withBranchCount: z.number().optional(),
      withBranchSetCount: z.number().optional(),
    })
    .optional(),
  providerContractPublications: z
    .looseObject({
      count: z.number().optional(),
    })
    .optional(),
  providerContractVersions: z
    .looseObject({
      count: z.number().optional(),
    })
    .optional(),
  providerContractSelfVerifications: z
    .looseObject({
      count: z.number().optional(),
    })
    .optional(),
  releasedVersions: z
    .looseObject({
      count: z.number().optional(),
      currentlySupportedCount: z.number().optional(),
    })
    .optional(),
  secrets: z
    .looseObject({
      count: z.number().optional(),
      countsByTeam: z.array(z.number()).optional(),
    })
    .optional(),
  tags: z
    .looseObject({
      count: z.number().optional(),
      distinctCount: z.number().optional(),
      distinctWithPacticipantCount: z.number().optional(),
    })
    .optional(),
  teams: z
    .looseObject({
      count: z.number().optional(),
    })
    .optional(),
  triggeredWebhooks: z
    .looseObject({
      count: z.number().optional(),
    })
    .optional(),
  users: z
    .looseObject({
      activeRegularCount: z.number().optional(),
      activeSystemCount: z.number().optional(),
    })
    .optional(),
  verificationResults: z
    .looseObject({
      count: z.number().optional(),
      successCount: z.number().optional(),
      failureCount: z.number().optional(),
      distinctCount: z.number().optional(),
      first: z.string().nullable().optional(),
      last: z.string().nullable().optional(),
    })
    .optional(),
  verificationResultsPerPactVersion: z
    .looseObject({
      distribution: z.looseObject({}).optional(),
    })
    .optional(),
  webhookExecutions: z
    .looseObject({
      count: z.number().optional(),
    })
    .optional(),
  webhooks: z
    .looseObject({
      count: z.number().optional(),
    })
    .optional(),
});

export const TeamMetricsOutputSchema = z.looseObject({
  teams: z
    .array(
      z.looseObject({
        name: z.string().optional(),
        metrics: z
          .looseObject({
            interactions: z
              .looseObject({
                latestInteractionsCount: z.number().optional(),
                latestMessagesCount: z.number().optional(),
              })
              .optional(),
            pacticipants: z
              .looseObject({
                count: z.number().optional(),
              })
              .optional(),
            integrations: z
              .looseObject({
                count: z.number().optional(),
              })
              .optional(),
            pactPublications: z
              .looseObject({
                count: z.number().optional(),
                first: z.string().nullable().optional(),
                last: z.string().nullable().optional(),
              })
              .optional(),
            pactVersions: z
              .looseObject({
                count: z.number().optional(),
              })
              .optional(),
            verificationResults: z
              .looseObject({
                count: z.number().optional(),
                successCount: z.number().optional(),
                failureCount: z.number().optional(),
                first: z.string().nullable().optional(),
                last: z.string().nullable().optional(),
              })
              .optional(),
            users: z
              .looseObject({
                activeRegularCount: z.number().optional(),
                activeSystemCount: z.number().optional(),
              })
              .optional(),
            webhooks: z
              .looseObject({
                count: z.number().optional(),
              })
              .optional(),
            webhookExecutions: z
              .looseObject({
                count: z.number().optional(),
              })
              .optional(),
            triggeredWebhooks: z
              .looseObject({
                count: z.number().optional(),
              })
              .optional(),
            secrets: z
              .looseObject({
                count: z.number().optional(),
              })
              .optional(),
            environments: z
              .looseObject({
                count: z.number().optional(),
              })
              .optional(),
            providerContractPublications: z
              .looseObject({
                count: z.number().optional(),
              })
              .optional(),
            providerContractVersions: z
              .looseObject({
                count: z.number().optional(),
              })
              .optional(),
            providerContractSelfVerifications: z
              .looseObject({
                count: z.number().optional(),
              })
              .optional(),
            deployedVersions: z
              .looseObject({
                count: z.number().optional(),
                currentlyDeployedCount: z.number().optional(),
              })
              .optional(),
            releasedVersions: z
              .looseObject({
                count: z.number().optional(),
                currentlySupportedCount: z.number().optional(),
              })
              .optional(),
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

export const EmbeddedUserOutputSchema = named(
  "EmbeddedUser",
  z.looseObject({
    active: z.boolean().optional(),
    email: z.string().optional(),
    firstName: z.string().optional(),
    identityProviderId: z.string().optional(),
    lastName: z.string().optional(),
    name: z.string().optional(),
    uuid: z.string().optional(),
    _links: z
      .looseObject({
        self: EmbeddedLinkOutputSchema.optional(),
      })
      .optional(),
  }),
);

export const EmbeddedTeamUserOutputSchema = named(
  "EmbeddedTeamUser",
  z.looseObject({
    active: z.boolean().optional(),
    email: z.string().optional(),
    firstName: z.string().optional(),
    identityProviderId: z.string().optional(),
    lastName: z.string().optional(),
    name: z.string().optional(),
    uuid: z.string().optional(),
    type: z.union([z.literal(0), z.literal(1)]).optional(),
    typeDescription: z.string().optional(),
    _links: z
      .looseObject({
        self: EmbeddedLinkOutputSchema.optional(),
      })
      .optional(),
  }),
);

export const TeamOutputSchema = named(
  "Team",
  z.looseObject({
    createdAt: z.string().optional(),
    name: z.string().optional(),
    numberOfMembers: z.number().optional(),
    updatedAt: z.string().optional(),
    uuid: z.string().optional(),
    isDefault: z.boolean().optional(),
    _embedded: z
      .looseObject({
        administrators: z.array(EmbeddedUserOutputSchema).optional(),
        environments: z.array(EmbeddedEnvironmentOutputSchema).optional(),
        members: z.array(EmbeddedTeamUserOutputSchema).optional(),
        pacticipants: z.array(EmbeddedNamedOutputSchema).optional(),
      })
      .optional(),
    _links: z
      .looseObject({
        self: EmbeddedLinkOutputSchema.optional(),
      })
      .optional(),
  }),
);

export const SecretOutputSchema = named(
  "Secret",
  z.looseObject({
    createdAt: z.string().optional(),
    description: z.string().nullable().optional(),
    name: z.string().optional(),
    teamUuid: z
      .string()
      .nullable()
      .describe(
        'Where no team is provided, the secret is not attached to a team and can only be modified by users with the "secret:manage:*" permission.',
      )
      .optional(),
    updatedAt: z.string().optional(),
    uuid: z.string().optional(),
    _embedded: z
      .looseObject({
        team: TeamOutputSchema.optional(),
      })
      .optional(),
    _links: z
      .looseObject({
        self: EmbeddedLinkOutputSchema.optional(),
      })
      .optional(),
  }),
);

export const SecretsOutputSchema = z.looseObject({
  _embedded: z
    .looseObject({
      secrets: z.array(SecretOutputSchema).optional(),
    })
    .optional(),
  _links: z
    .looseObject({
      self: EmbeddedLinkOutputSchema.optional(),
    })
    .optional(),
});

export const PermissionOutputSchema = named(
  "Permission",
  z.looseObject({
    description: z.string().optional(),
    group: z.string().optional(),
    label: z.string().optional(),
    scope: z.string().optional(),
    uuid: z.string().optional(),
  }),
);

export const UserRoleOutputSchema = named(
  "UserRole",
  z.looseObject({
    name: z.string().optional(),
    permissions: z.array(PermissionOutputSchema).optional(),
    uuid: z.string().optional(),
    _links: z
      .looseObject({
        self: EmbeddedLinkOutputSchema.optional(),
      })
      .optional(),
  }),
);

export const UserTeamOutputSchema = named(
  "UserTeam",
  z.looseObject({
    name: z.string().optional(),
    uuid: z.string().optional(),
    _links: z
      .looseObject({
        self: EmbeddedLinkOutputSchema.optional(),
        "pf:membership": EmbeddedLinkOutputSchema.optional(),
        "pf:integrations": EmbeddedLinkOutputSchema.optional(),
      })
      .optional(),
  }),
);

export const UserOutputSchema = named(
  "User",
  z.looseObject({
    active: z.boolean().optional(),
    authenticationSource: z.string().optional(),
    createdAt: z.string().optional(),
    email: z.string().optional(),
    externalId: z.string().optional(),
    externalIdpId: z.string().optional(),
    externalIdpUsername: z.string().optional(),
    firstName: z.string().optional(),
    identityProviderId: z.string().optional(),
    lastLogin: z.string().optional(),
    lastName: z.string().optional(),
    lastTimeTokenAccessed: z.string().optional(),
    name: z.string().optional(),
    seatType: z.string().optional(),
    type: z.union([z.literal(0), z.literal(1)]).optional(),
    typeDescription: z.string().optional(),
    updatedAt: z.string().optional(),
    uuid: z.string().optional(),
    _links: z
      .looseObject({
        self: EmbeddedLinkOutputSchema.optional(),
        "pf:tokens": EmbeddedLinkOutputSchema.optional(),
      })
      .optional(),
    _embedded: z
      .looseObject({
        roles: z.array(UserRoleOutputSchema).optional(),
        teams: z.array(UserTeamOutputSchema).optional(),
      })
      .optional(),
  }),
);

export const TokenOutputSchema = named(
  "Token",
  z.looseObject({
    description: z.string().optional(),
    expires: z.string().optional(),
    lastUsed: z.string().optional(),
    readOnly: z.boolean().optional(),
    uuid: z.string().optional(),
    value: z.string().optional(),
    _links: z
      .looseObject({
        self: EmbeddedLinkOutputSchema.optional(),
        "pb:regenerate": EmbeddedLinkOutputSchema.optional(),
      })
      .optional(),
  }),
);

export const TokensOutputSchema = z.looseObject({
  _embedded: z
    .looseObject({
      items: z.array(TokenOutputSchema).optional(),
    })
    .optional(),
  _links: z
    .looseObject({
      self: EmbeddedLinkOutputSchema.optional(),
    })
    .optional(),
});

export const PreferenceOutputSchema = named(
  "Preference",
  z.looseObject({
    name: z.string().optional(),
    uuid: z.string().optional(),
    value: z.unknown().optional(),
    _links: z
      .looseObject({
        self: EmbeddedLinkOutputSchema.optional(),
      })
      .optional(),
  }),
);

export const PreferencesOutputSchema = z.looseObject({
  _embedded: z
    .looseObject({
      preferences: z.array(PreferenceOutputSchema).optional(),
    })
    .optional(),
  _links: z
    .looseObject({
      self: EmbeddedLinkOutputSchema.optional(),
    })
    .optional(),
});

export const HttpRequestPayloadOutputSchema = named(
  "HttpRequestPayload",
  z.looseObject({
    method: z.string().optional(),
    path: z.string().optional(),
    queryString: z.string().optional(),
    referer: z.string().nullable().optional(),
    remoteHost: z.string().nullable().optional(),
    remoteAddress: z.string().optional(),
    requestId: z.string().optional(),
    userAgent: z.string().optional(),
  }),
);

export const HttpAuditResponseOutputSchema = named(
  "HttpAuditResponse",
  z.looseObject({
    status: z.number().optional(),
  }),
);

export const HttpAuditEventOutputSchema = named(
  "HttpAuditEvent",
  z.looseObject({
    name: z.string().optional(),
    payload: HttpRequestPayloadOutputSchema.optional(),
    response: HttpAuditResponseOutputSchema.optional(),
    timestamp: z.string().optional(),
    tokenUuid: z.string().optional(),
    type: z.string().optional(),
    username: z.string().optional(),
    userEmail: z.string().optional(),
    userUuid: z.string().optional(),
    uuid: z.string().optional(),
  }),
);

export const AuthFailureEventOutputSchema = named(
  "AuthFailureEvent",
  z.looseObject({
    payload: HttpRequestPayloadOutputSchema.optional(),
    timestamp: z.string().optional(),
    tokenUuid: z.string().optional(),
    type: z.string().optional(),
    username: z.string().optional(),
    userEmail: z.string().optional(),
    userUuid: z.string().optional(),
    uuid: z.string().optional(),
  }),
);

export const CustomPayloadOutputSchema = named(
  "CustomPayload",
  z.looseObject({
    identityProviderId: z.string().optional(),
  }),
);

export const CustomEventOutputSchema = named(
  "CustomEvent",
  z.looseObject({
    payload: CustomPayloadOutputSchema.optional(),
    timestamp: z.string().optional(),
    tokenUuid: z.string().optional(),
    type: z.string().optional(),
    username: z.string().optional(),
    userEmail: z.string().optional(),
    userUuid: z.string().optional(),
    uuid: z.string().optional(),
  }),
);

export const AuditEventsOutputSchema = z.looseObject({
  events: z
    .array(
      z.union([
        HttpAuditEventOutputSchema,
        AuthFailureEventOutputSchema,
        CustomEventOutputSchema,
      ]),
    )
    .optional(),
  _links: z
    .looseObject({
      self: EmbeddedLinkOutputSchema.optional(),
      next: z
        .looseObject({
          href: z.string().optional(),
          name: z.string().optional(),
          templated: z.boolean().optional(),
          title: z.string().optional(),
        })
        .optional(),
      previous: z
        .looseObject({
          href: z.string().optional(),
          name: z.string().optional(),
          templated: z.boolean().optional(),
          title: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  page: z
    .looseObject({
      number: z.number().optional(),
      size: z.number().optional(),
      totalElements: z.number().optional(),
      totalPages: z.number().optional(),
    })
    .optional(),
});

export const UsersOutputSchema = z.looseObject({
  page: PageOutputSchema.optional(),
  users: z.array(UserOutputSchema).optional(),
  _links: z
    .looseObject({
      self: EmbeddedLinkOutputSchema.optional(),
      next: EmbeddedLinkOutputSchema.optional(),
      previous: EmbeddedLinkOutputSchema.optional(),
    })
    .optional(),
});

export const InvitedUsersOutputSchema = z.looseObject({
  users: z.array(UserOutputSchema).optional(),
  _links: z
    .looseObject({
      self: EmbeddedLinkOutputSchema.optional(),
    })
    .optional(),
});

export const TeamInCollectionOutputSchema = named(
  "TeamInCollection",
  z.looseObject({
    createdAt: z.string().optional(),
    name: z.string().optional(),
    numberOfMembers: z.number().optional(),
    updatedAt: z.string().optional(),
    uuid: z.string().optional(),
    isDefault: z.boolean().optional(),
    _links: z
      .looseObject({
        self: EmbeddedLinkOutputSchema.optional(),
      })
      .optional(),
  }),
);

export const TeamsOutputSchema = z.looseObject({
  page: PageOutputSchema.optional(),
  teams: z.array(TeamInCollectionOutputSchema).optional(),
  _links: z
    .looseObject({
      self: EmbeddedLinkOutputSchema.optional(),
      next: EmbeddedLinkOutputSchema.optional(),
      previous: EmbeddedLinkOutputSchema.optional(),
    })
    .optional(),
});

export const CreatedTeamOutputSchema = z.looseObject({
  createdAt: z.string().optional(),
  name: z.string().optional(),
  numberOfMembers: z.number().optional(),
  updatedAt: z.string().optional(),
  uuid: z.string().optional(),
  _embedded: z
    .looseObject({
      administrators: z.array(EmbeddedUserOutputSchema).optional(),
      environments: z.array(EmbeddedEnvironmentOutputSchema).optional(),
      pacticipants: z.array(EmbeddedNamedOutputSchema).optional(),
    })
    .optional(),
  _links: z
    .looseObject({
      self: EmbeddedLinkOutputSchema.optional(),
    })
    .optional(),
});

export const TeamUsersOutputSchema = z.looseObject({
  _embedded: z
    .looseObject({
      users: z.array(EmbeddedTeamUserOutputSchema).optional(),
    })
    .optional(),
  _links: z
    .looseObject({
      self: EmbeddedLinkOutputSchema.optional(),
    })
    .optional(),
});

export const TeamUserOutputSchema = z.looseObject({
  _embedded: z
    .looseObject({
      user: UserOutputSchema.optional(),
    })
    .optional(),
  _links: z
    .looseObject({
      self: EmbeddedLinkOutputSchema.optional(),
    })
    .optional(),
});

export const RoleOutputSchema = named(
  "Role",
  z.looseObject({
    created: z.string().optional(),
    description: z.string().optional(),
    name: z.string().optional(),
    permissions: z.array(PermissionOutputSchema).optional(),
    systemDefined: z.boolean().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    uuid: z.string().optional(),
    _actions: z.array(ActionOutputSchema).optional(),
    _links: z
      .looseObject({
        self: EmbeddedLinkOutputSchema.optional(),
      })
      .optional(),
  }),
);

export const RolesOutputSchema = z.looseObject({
  _embedded: z
    .looseObject({
      roles: z.array(RoleOutputSchema).optional(),
    })
    .optional(),
  _links: z
    .looseObject({
      self: EmbeddedLinkOutputSchema.optional(),
      "pf:reset": EmbeddedLinkOutputSchema.optional(),
    })
    .optional(),
});

export const PermissionsOutputSchema = z.looseObject({
  permissions: z.array(PermissionOutputSchema).optional(),
  _links: z
    .looseObject({
      self: EmbeddedLinkOutputSchema.optional(),
    })
    .optional(),
});

export const CreateSecretSchema = z.object({
  name: z.string().min(1).describe("Name of the secret"),
  value: z.string().min(1).describe("Value of the secret"),
  description: z
    .string()
    .nullable()
    .optional()
    .describe("Description of the secret"),
  teamUuid: z
    .string()
    .uuid()
    .optional()
    .describe("UUID of the owning team (cannot be changed after creation)"),
});

export type CreateSecretInput = z.infer<typeof CreateSecretSchema>;

export const UpdateSecretSchema = z.object({
  secretId: z.string().describe("UUID of the secret to update"),
  name: z.string().optional().describe("New name for the secret"),
  value: z.string().optional().describe("New value for the secret"),
  description: z.string().nullable().optional().describe("New description"),
});

export type UpdateSecretInput = z.infer<typeof UpdateSecretSchema>;

export const SecretIdSchema = z.object({
  secretId: z.string().describe("UUID of the secret"),
});

export type SecretIdInput = z.infer<typeof SecretIdSchema>;

export const RegenerateTokenSchema = z.object({
  tokenId: z.string().describe("ID of the token to regenerate"),
});

export type RegenerateTokenInput = z.infer<typeof RegenerateTokenSchema>;

export const AuditSchema = z.object({
  since: z
    .string()
    .optional()
    .describe("Only include events at or after this ISO 8601 timestamp"),
  userUuid: z
    .string()
    .uuid()
    .optional()
    .describe("Filter events by PactFlow user UUID"),
  type: z
    .string()
    .optional()
    .describe("Filter events by type (e.g. 'pact_publication')"),
  sort: z
    .string()
    .optional()
    .describe("Sort order: '+timestamp' (asc, default) or '-timestamp' (desc)"),
  from: z
    .string()
    .optional()
    .describe(
      "Start result set from this audit event UUID (keyset pagination)",
    ),
  pageNumber: z
    .number()
    .int()
    .min(1)
    .default(1)
    .optional()
    .describe("Page number"),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(5)
    .optional()
    .describe("Results per page (max 100)"),
});

export type AuditInput = z.infer<typeof AuditSchema>;

export const ListAdminUsersSchema = z.object({
  active: z.boolean().optional().describe("Filter by active/inactive status"),
  q: z.string().optional().describe("Filter by name or email"),
  userType: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("0 = regular users, 1 = system accounts"),
  page: z.number().default(1).optional().describe("Page number"),
  size: z.number().default(5).optional().describe("Results per page"),
});

export type ListAdminUsersInput = z.infer<typeof ListAdminUsersSchema>;

export const AdminUserIdSchema = z.object({
  userId: z.string().describe("UUID of the user"),
});

export type AdminUserIdInput = z.infer<typeof AdminUserIdSchema>;

export const CreateAdminUserSchema = z.object({
  email: z.string().describe("Email address of the new user"),
  name: z.string().describe("Display name of the new user"),
  firstName: z.string().optional().describe("First name"),
  lastName: z.string().optional().describe("Last name"),
  externalIdpId: z
    .string()
    .optional()
    .describe("External identity provider ID (for SAML/SSO)"),
  externalIdpUsername: z
    .string()
    .optional()
    .describe("External IdP username (for SAML/SSO)"),
});

export type CreateAdminUserInput = z.infer<typeof CreateAdminUserSchema>;

export const UpdateAdminUserSchema = z.object({
  userId: z.string().describe("UUID of the user to update"),
  active: z.boolean().optional().describe("Whether the user is active"),
  email: z.string().optional().describe("New email address"),
  firstName: z.string().optional().describe("First name"),
  lastName: z.string().optional().describe("Last name"),
  name: z.string().optional().describe("Display name"),
});

export type UpdateAdminUserInput = z.infer<typeof UpdateAdminUserSchema>;

export const InviteUsersSchema = z.object({
  users: z
    .array(
      z.object({
        email: z.string().describe("Email address"),
        name: z.string().min(1).describe("Display name"),
      }),
    )
    .min(1)
    .describe("List of users to invite"),
});

export type InviteUsersInput = z.infer<typeof InviteUsersSchema>;

export const SetUserRolesSchema = z.object({
  userId: z.string().describe("UUID of the user"),
  roles: z.array(z.string()).describe("Array of role UUIDs to assign"),
});

export type SetUserRolesInput = z.infer<typeof SetUserRolesSchema>;

export const UserRoleSchema = z.object({
  userId: z.string().describe("UUID of the user"),
  roleId: z.string().describe("UUID of the role"),
});

export type UserRoleInput = z.infer<typeof UserRoleSchema>;

export const ListAdminTeamsSchema = z.object({
  q: z.string().optional().describe("Filter teams by name"),
  page: z.number().default(1).optional().describe("Page number"),
  size: z.number().default(5).optional().describe("Results per page"),
});

export type ListAdminTeamsInput = z.infer<typeof ListAdminTeamsSchema>;

export const AdminTeamIdSchema = z.object({
  teamId: z.string().describe("UUID of the team"),
});

export type AdminTeamIdInput = z.infer<typeof AdminTeamIdSchema>;

export const ListTeamUsersSchema = AdminTeamIdSchema.extend(
  PaginationSchema.shape,
);

export const CreateTeamSchema = z.object({
  name: z.string().min(1).describe("Name of the team"),
  administratorUuids: z
    .array(z.string().uuid())
    .optional()
    .describe("UUIDs of team administrators"),
  environmentUuids: z
    .array(z.string().uuid())
    .optional()
    .describe("UUIDs of environments assigned to this team"),
  pacticipantNames: z
    .array(z.string().min(1))
    .optional()
    .describe("Names of pacticipants assigned to this team"),
});

export type CreateTeamInput = z.infer<typeof CreateTeamSchema>;

export const UpdateTeamSchema = z.object({
  teamId: z.string().describe("UUID of the team to update"),
  name: z.string().min(1).describe("Name of the team"),
  administratorUuids: z
    .array(z.string().uuid())
    .optional()
    .describe("UUIDs of team administrators"),
  environmentUuids: z
    .array(z.string().uuid())
    .optional()
    .describe("UUIDs of environments assigned to this team"),
  pacticipantNames: z
    .array(z.string().min(1))
    .optional()
    .describe("Names of pacticipants assigned to this team"),
});

export type UpdateTeamInput = z.infer<typeof UpdateTeamSchema>;

export const TeamUserIdSchema = z.object({
  teamId: z.string().describe("UUID of the team"),
  userId: z.string().describe("UUID of the user"),
});

export type TeamUserIdInput = z.infer<typeof TeamUserIdSchema>;

export const PatchTeamUsersSchema = z.object({
  teamId: z.string().describe("UUID of the team"),
  operations: z
    .array(
      z.object({
        op: z.enum(["add", "remove"]).describe("Operation: 'add' or 'remove'"),
        path: z
          .literal("/users")
          .describe("JSON Patch path (must be '/users')"),
        value: z.object({
          uuid: z.string().uuid().describe("UUID of the user"),
        }),
      }),
    )
    .describe("JSON Patch operations to apply"),
});

export type PatchTeamUsersInput = z.infer<typeof PatchTeamUsersSchema>;

export const SetTeamUsersSchema = z.object({
  teamId: z.string().describe("UUID of the team"),
  uuids: z
    .array(z.string().uuid())
    .describe("UUIDs of users to set as team members (replaces existing)"),
});

export type SetTeamUsersInput = z.infer<typeof SetTeamUsersSchema>;

export const AdminRoleIdSchema = z.object({
  roleId: z.string().describe("UUID of the role"),
});

export type AdminRoleIdInput = z.infer<typeof AdminRoleIdSchema>;

export const CreateRoleSchema = z.object({
  name: z.string().min(1).describe("Name of the role"),
  permissions: z
    .array(
      z.object({
        scope: z
          .string()
          .describe("Permission scope (e.g. 'webhook:read', 'user:manage')"),
      }),
    )
    .describe("Permissions granted by this role"),
  description: z.string().optional().describe("Description of the role"),
});

export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;

export const UpdateRoleSchema = z.object({
  roleId: z.string().describe("UUID of the role to update"),
  name: z.string().min(1).describe("Name of the role"),
  permissions: z
    .array(
      z.object({
        scope: z.string().describe("Permission scope"),
      }),
    )
    .describe("Permissions granted by this role"),
  description: z.string().optional().describe("Description of the role"),
});

export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;

export const CreateSystemAccountSchema = z.object({
  name: z.string().min(1).describe("Name of the system account"),
});

export type CreateSystemAccountInput = z.infer<
  typeof CreateSystemAccountSchema
>;

export const GetSystemAccountTokensSchema = z
  .object({
    accountId: z.string().describe("UUID of the system account"),
  })
  .extend(PaginationSchema.shape);

export type GetSystemAccountTokensInput = z.infer<
  typeof GetSystemAccountTokensSchema
>;

/** Output schema of each admin handler, keyed by handler name. */
export const ADMIN_OUTPUT_SCHEMAS = {
  getMetrics: MetricsOutputSchema,
  getTeamMetrics: TeamMetricsOutputSchema,
  listSecrets: SecretsOutputSchema,
  getSecret: SecretOutputSchema,
  createSecret: SecretOutputSchema,
  updateSecret: SecretOutputSchema,
  getCurrentUser: UserOutputSchema,
  listTokens: TokensOutputSchema,
  regenerateToken: TokenOutputSchema,
  getUserPreferences: PreferencesOutputSchema,
  getSystemPreferences: PreferencesOutputSchema,
  getAuditLog: AuditEventsOutputSchema,
  listAdminUsers: UsersOutputSchema,
  getAdminUser: UserOutputSchema,
  createAdminUser: UserOutputSchema,
  updateAdminUser: UserOutputSchema,
  inviteUsers: InvitedUsersOutputSchema,
  listAdminTeams: TeamsOutputSchema,
  getAdminTeam: TeamOutputSchema,
  createAdminTeam: CreatedTeamOutputSchema,
  updateAdminTeam: CreatedTeamOutputSchema,
  listTeamUsers: TeamUsersOutputSchema,
  getTeamUser: TeamUserOutputSchema,
  setTeamUsers: TeamUsersOutputSchema,
  patchTeamUsers: TeamUsersOutputSchema,
  listAdminRoles: RolesOutputSchema,
  getAdminRole: RoleOutputSchema,
  createAdminRole: RoleOutputSchema,
  updateAdminRole: RoleOutputSchema,
  resetAdminRoles: RolesOutputSchema,
  listAdminPermissions: PermissionsOutputSchema,
  createSystemAccount: UserOutputSchema,
  getSystemAccountTokens: TokensOutputSchema,
  deleteSecret: EmptyOutputSchema,
  deleteAdminUser: EmptyOutputSchema,
  setUserRoles: EmptyOutputSchema,
  addRoleToUser: EmptyOutputSchema,
  removeRoleFromUser: EmptyOutputSchema,
  deleteAdminTeam: EmptyOutputSchema,
  removeUserFromTeam: EmptyOutputSchema,
  deleteAdminRole: EmptyOutputSchema,
};

export type SecretsListResponse = z.infer<
  (typeof ADMIN_OUTPUT_SCHEMAS)["listSecrets"]
>;

export type SecretResponse = z.infer<
  (typeof ADMIN_OUTPUT_SCHEMAS)["getSecret"]
>;

export type CurrentUserResponse = z.infer<
  (typeof ADMIN_OUTPUT_SCHEMAS)["getCurrentUser"]
>;

export type TokensListResponse = z.infer<
  (typeof ADMIN_OUTPUT_SCHEMAS)["listTokens"]
>;

export type TokenResponse = z.infer<
  (typeof ADMIN_OUTPUT_SCHEMAS)["regenerateToken"]
>;

export type PreferencesResponse = z.infer<
  (typeof ADMIN_OUTPUT_SCHEMAS)["getUserPreferences"]
>;

export type AuditLogResponse = z.infer<
  (typeof ADMIN_OUTPUT_SCHEMAS)["getAuditLog"]
>;

export type AdminUsersListResponse = z.infer<
  (typeof ADMIN_OUTPUT_SCHEMAS)["listAdminUsers"]
>;

export type AdminUserResponse = z.infer<
  (typeof ADMIN_OUTPUT_SCHEMAS)["getAdminUser"]
>;

export type InviteUsersResponse = z.infer<
  (typeof ADMIN_OUTPUT_SCHEMAS)["inviteUsers"]
>;

export type AdminTeamsListResponse = z.infer<
  (typeof ADMIN_OUTPUT_SCHEMAS)["listAdminTeams"]
>;

export type AdminTeamResponse = z.infer<
  (typeof ADMIN_OUTPUT_SCHEMAS)["getAdminTeam"]
>;

export type TeamUsersListResponse = z.infer<
  (typeof ADMIN_OUTPUT_SCHEMAS)["listTeamUsers"]
>;

export type TeamUserResponse = z.infer<
  (typeof ADMIN_OUTPUT_SCHEMAS)["getTeamUser"]
>;

export type TeamUsersResponse = z.infer<
  (typeof ADMIN_OUTPUT_SCHEMAS)["setTeamUsers"]
>;

export type AdminRolesListResponse = z.infer<
  (typeof ADMIN_OUTPUT_SCHEMAS)["listAdminRoles"]
>;

export type AdminRoleResponse = z.infer<
  (typeof ADMIN_OUTPUT_SCHEMAS)["getAdminRole"]
>;

export type AdminPermissionsListResponse = z.infer<
  (typeof ADMIN_OUTPUT_SCHEMAS)["listAdminPermissions"]
>;

export type SystemAccountResponse = z.infer<
  (typeof ADMIN_OUTPUT_SCHEMAS)["createSystemAccount"]
>;

export type SystemAccountTokensResponse = z.infer<
  (typeof ADMIN_OUTPUT_SCHEMAS)["getSystemAccountTokens"]
>;

export type MetricsResponse = z.infer<
  (typeof ADMIN_OUTPUT_SCHEMAS)["getMetrics"]
>;

export type TeamMetricsResponse = z.infer<
  (typeof ADMIN_OUTPUT_SCHEMAS)["getTeamMetrics"]
>;
