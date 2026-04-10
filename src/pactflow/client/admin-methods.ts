import type {
  AdminRole,
  AdminRoleIdInput,
  AdminRolesResponse,
  AdminTeam,
  AdminTeamIdInput,
  AdminTeamsResponse,
  AdminUser,
  AdminUserIdInput,
  AdminUsersResponse,
  CreateAdminUserInput,
  CreateRoleInput,
  CreateSystemAccountInput,
  CreateTeamInput,
  GetSystemAccountTokensInput,
  InviteUsersInput,
  ListAdminTeamsInput,
  ListAdminUsersInput,
  PatchTeamUsersInput,
  PermissionsResponse,
  SetTeamUsersInput,
  SetUserRolesInput,
  SystemAccount,
  SystemAccountTokensResponse,
  TeamUserIdInput,
  TeamUsersResponse,
  UpdateAdminUserInput,
  UpdateRoleInput,
  UpdateTeamInput,
  UserRoleInput,
} from "./base";
import { PactflowBaseClient } from "./base-client";
import { toQueryString } from "./utils";

export abstract class PactflowAdminMethods extends PactflowBaseClient {
  /**
   * Lists all users in the workspace with optional filtering and pagination (admin).
   *
   * @param params - Optional `active` flag, `q` (name/email search), `userType`,
   *   `page`, and `size`.
   * @returns Paginated list of user accounts.
   * @throws ToolError if the request fails.
   */
  async listAdminUsers(
    params: ListAdminUsersInput,
  ): Promise<AdminUsersResponse> {
    return await this.fetchJson<AdminUsersResponse>(
      `${this.baseUrl}/admin/users${toQueryString({
        active: params.active,
        q: params.q,
        userType: params.userType,
        page: params.page,
        size: params.size,
      })}`,
      { method: "GET", errorContext: "List Admin Users" },
    );
  }

  /**
   * Retrieves a user's full profile by UUID (admin).
   *
   * @param params - `userId`: UUID of the user.
   * @returns User profile including roles and active status.
   * @throws ToolError if the user is not found or the request fails.
   */
  async getAdminUser({ userId }: AdminUserIdInput): Promise<AdminUser> {
    return await this.fetchJson<AdminUser>(
      `${this.baseUrl}/admin/users/${encodeURIComponent(userId)}`,
      { method: "GET", errorContext: "Get Admin User" },
    );
  }

  /**
   * Creates a new user account in the workspace (admin).
   *
   * @param body - User name, email, and optional SSO identity fields.
   * @returns The created user resource.
   * @throws ToolError if the request fails.
   */
  async createAdminUser(body: CreateAdminUserInput): Promise<AdminUser> {
    return await this.fetchJson<AdminUser>(`${this.baseUrl}/admin/users`, {
      method: "POST",
      body,
      errorContext: "Create Admin User",
    });
  }

  /**
   * Replaces a user's profile (admin). Can also deactivate the user.
   *
   * @param params - `userId` (UUID) plus updated name, email, active flag, and SSO fields.
   * @returns The updated user resource.
   * @throws ToolError if the user is not found or the request fails.
   */
  async updateAdminUser({
    userId,
    ...body
  }: UpdateAdminUserInput): Promise<AdminUser> {
    return await this.fetchJson<AdminUser>(
      `${this.baseUrl}/admin/users/${encodeURIComponent(userId)}`,
      { method: "PUT", body, errorContext: "Update Admin User" },
    );
  }

  /**
   * Permanently deletes a user account from the workspace (admin).
   *
   * @param params - `userId`: UUID of the user to delete.
   * @throws ToolError if the user is not found or the request fails.
   */
  async deleteAdminUser({ userId }: AdminUserIdInput): Promise<void> {
    return await this.fetchJson<void>(
      `${this.baseUrl}/admin/users/${encodeURIComponent(userId)}`,
      { method: "DELETE", errorContext: "Delete Admin User" },
    );
  }

  /**
   * Sends invitation emails to one or more new users (admin).
   *
   * @param params - `users`: Array of objects with email and optional name.
   * @throws ToolError if the request fails.
   */
  async inviteUsers({ users }: InviteUsersInput): Promise<void> {
    return await this.fetchJson<void>(
      `${this.baseUrl}/admin/users/invite-users`,
      { method: "POST", body: { users }, errorContext: "Invite Users" },
    );
  }

  /**
   * Fully replaces the roles assigned to a user (admin).
   * All existing roles are removed; the provided list becomes the new set.
   *
   * @param params - `userId` (UUID) and `roles` array of role UUIDs.
   * @throws ToolError if the user is not found or the request fails.
   */
  async setUserRoles({ userId, roles }: SetUserRolesInput): Promise<void> {
    return await this.fetchJson<void>(
      `${this.baseUrl}/admin/users/${encodeURIComponent(userId)}/roles`,
      { method: "PUT", body: { roles }, errorContext: "Set User Roles" },
    );
  }

  /**
   * Grants a single additional role to a user without affecting their existing roles (admin).
   *
   * @param params - `userId` and `roleId` UUIDs.
   * @throws ToolError if the user or role is not found, or the request fails.
   */
  async addRoleToUser({ userId, roleId }: UserRoleInput): Promise<void> {
    return await this.fetchJson<void>(
      `${this.baseUrl}/admin/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleId)}`,
      { method: "PUT", body: {}, errorContext: "Add Role to User" },
    );
  }

  /**
   * Revokes a specific role from a user without affecting their other roles (admin).
   *
   * @param params - `userId` and `roleId` UUIDs.
   * @throws ToolError if the user or role is not found, or the request fails.
   */
  async removeRoleFromUser({ userId, roleId }: UserRoleInput): Promise<void> {
    return await this.fetchJson<void>(
      `${this.baseUrl}/admin/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleId)}`,
      { method: "DELETE", errorContext: "Remove Role from User" },
    );
  }

  // ─── Admin Teams ─────────────────────────────────────────────────────────────

  /**
   * Lists all teams in the workspace with optional name filtering and pagination (admin).
   *
   * @param params - Optional `q` (name search), `page`, and `size`.
   * @returns Paginated list of teams.
   * @throws ToolError if the request fails.
   */
  async listAdminTeams(
    params: ListAdminTeamsInput,
  ): Promise<AdminTeamsResponse> {
    return await this.fetchJson<AdminTeamsResponse>(
      `${this.baseUrl}/admin/teams${toQueryString({ q: params.q, page: params.page, size: params.size })}`,
      { method: "GET", errorContext: "List Admin Teams" },
    );
  }

  /**
   * Retrieves the full configuration of a team by UUID (admin).
   *
   * @param params - `teamId`: UUID of the team.
   * @returns Team details including name, members, environments, and pacticipants.
   * @throws ToolError if the team is not found or the request fails.
   */
  async getAdminTeam({ teamId }: AdminTeamIdInput): Promise<AdminTeam> {
    return await this.fetchJson<AdminTeam>(
      `${this.baseUrl}/admin/teams/${encodeURIComponent(teamId)}`,
      { method: "GET", errorContext: "Get Admin Team" },
    );
  }

  /**
   * Creates a new team in the workspace (admin).
   *
   * @param body - Team name and optional administrators, environments, and pacticipants.
   * @returns The created team resource.
   * @throws ToolError if the request fails.
   */
  async createAdminTeam(body: CreateTeamInput): Promise<AdminTeam> {
    return await this.fetchJson<AdminTeam>(`${this.baseUrl}/admin/teams`, {
      method: "POST",
      body,
      errorContext: "Create Admin Team",
    });
  }

  /**
   * Fully replaces a team's configuration (admin).
   *
   * @param params - `teamId` (UUID) plus updated name, administrators, environments,
   *   and pacticipant assignments.
   * @throws ToolError if the team is not found or the request fails.
   */
  async updateAdminTeam({
    teamId,
    ...body
  }: UpdateTeamInput): Promise<AdminTeam> {
    return await this.fetchJson<AdminTeam>(
      `${this.baseUrl}/admin/teams/${encodeURIComponent(teamId)}`,
      { method: "PUT", body, errorContext: "Update Admin Team" },
    );
  }

  /**
   * Permanently deletes a team from the workspace (admin). Members are not deleted.
   *
   * @param params - `teamId`: UUID of the team to delete.
   * @throws ToolError if the team is not found or the request fails.
   */
  async deleteAdminTeam({ teamId }: AdminTeamIdInput): Promise<void> {
    return await this.fetchJson<void>(
      `${this.baseUrl}/admin/teams/${encodeURIComponent(teamId)}`,
      { method: "DELETE", errorContext: "Delete Admin Team" },
    );
  }

  /**
   * Lists all user members of a specific team (admin).
   *
   * @param params - `teamId`: UUID of the team.
   * @returns List of users in the team.
   * @throws ToolError if the team is not found or the request fails.
   */
  async listTeamUsers({
    teamId,
  }: AdminTeamIdInput): Promise<TeamUsersResponse> {
    return await this.fetchJson<TeamUsersResponse>(
      `${this.baseUrl}/admin/teams/${encodeURIComponent(teamId)}/users`,
      { method: "GET", errorContext: "List Team Users" },
    );
  }

  /**
   * Verifies whether a specific user is a member of a team (admin).
   * Returns 404 if the user is not in the team.
   *
   * @param params - `teamId` and `userId` UUIDs.
   * @throws ToolError if not found or the request fails.
   */
  async getTeamUser({ teamId, userId }: TeamUserIdInput): Promise<AdminUser> {
    return await this.fetchJson<AdminUser>(
      `${this.baseUrl}/admin/teams/${encodeURIComponent(teamId)}/users/${encodeURIComponent(userId)}`,
      { method: "GET", errorContext: "Get Team User" },
    );
  }

  /**
   * Fully replaces the members of a team (admin).
   * All existing members are removed; the provided UUID list becomes the new membership.
   *
   * @param params - `teamId` (UUID) and `uuids` array of user UUIDs.
   * @throws ToolError if the team is not found or the request fails.
   */
  async setTeamUsers({ teamId, uuids }: SetTeamUsersInput): Promise<void> {
    return await this.fetchJson<void>(
      `${this.baseUrl}/admin/teams/${encodeURIComponent(teamId)}/users`,
      { method: "PUT", body: { uuids }, errorContext: "Set Team Users" },
    );
  }

  /**
   * Adds or removes individual users from a team using JSON Patch semantics (admin).
   *
   * @param params - `teamId` (UUID) and `operations` array of JSON Patch ops (add/remove).
   * @throws ToolError if the team is not found or the request fails.
   */
  async patchTeamUsers({
    teamId,
    operations,
  }: PatchTeamUsersInput): Promise<void> {
    return await this.fetchJson<void>(
      `${this.baseUrl}/admin/teams/${encodeURIComponent(teamId)}/users`,
      { method: "PATCH", body: operations, errorContext: "Patch Team Users" },
    );
  }

  /**
   * Removes a specific user from a team (admin).
   *
   * @param params - `teamId` and `userId` UUIDs.
   * @throws ToolError if not found or the request fails.
   */
  async removeUserFromTeam({ teamId, userId }: TeamUserIdInput): Promise<void> {
    return await this.fetchJson<void>(
      `${this.baseUrl}/admin/teams/${encodeURIComponent(teamId)}/users/${encodeURIComponent(userId)}`,
      { method: "DELETE", errorContext: "Remove User from Team" },
    );
  }

  // ─── Admin Roles & Permissions ──────────────────────────────────────────────

  /**
   * Lists all roles defined in the workspace (admin).
   *
   * @returns All role definitions and their associated permission scopes.
   * @throws ToolError if the request fails.
   */
  async listAdminRoles(): Promise<AdminRolesResponse> {
    return await this.fetchJson<AdminRolesResponse>(
      `${this.baseUrl}/admin/roles`,
      { method: "GET", errorContext: "List Admin Roles" },
    );
  }

  /**
   * Retrieves a role's name, description, and full permission set by UUID (admin).
   *
   * @param params - `roleId`: UUID of the role.
   * @throws ToolError if the role is not found or the request fails.
   */
  async getAdminRole({ roleId }: AdminRoleIdInput): Promise<AdminRole> {
    return await this.fetchJson<AdminRole>(
      `${this.baseUrl}/admin/roles/${encodeURIComponent(roleId)}`,
      { method: "GET", errorContext: "Get Admin Role" },
    );
  }

  /**
   * Creates a custom role with a tailored set of permission scopes (admin).
   *
   * @param body - Role name, optional description, and array of permission scope strings.
   * @returns The created role resource.
   * @throws ToolError if the request fails.
   */
  async createAdminRole(body: CreateRoleInput): Promise<AdminRole> {
    return await this.fetchJson<AdminRole>(`${this.baseUrl}/admin/roles`, {
      method: "POST",
      body,
      errorContext: "Create Admin Role",
    });
  }

  /**
   * Updates an existing role's name and/or permission set (admin).
   * Changes affect all users currently assigned the role.
   *
   * @param params - `roleId` (UUID) plus updated name, description, and permissions.
   * @throws ToolError if the role is not found or the request fails.
   */
  async updateAdminRole({
    roleId,
    ...body
  }: UpdateRoleInput): Promise<AdminRole> {
    return await this.fetchJson<AdminRole>(
      `${this.baseUrl}/admin/roles/${encodeURIComponent(roleId)}`,
      { method: "PUT", body, errorContext: "Update Admin Role" },
    );
  }

  /**
   * Permanently deletes a role (admin). Users assigned this role will lose its permissions.
   *
   * @param params - `roleId`: UUID of the role to delete.
   * @throws ToolError if the role is not found or the request fails.
   */
  async deleteAdminRole({ roleId }: AdminRoleIdInput): Promise<void> {
    return await this.fetchJson<void>(
      `${this.baseUrl}/admin/roles/${encodeURIComponent(roleId)}`,
      { method: "DELETE", errorContext: "Delete Admin Role" },
    );
  }

  /**
   * Resets all roles to factory defaults (admin).
   * Custom roles are removed; built-in roles are restored to their original permissions.
   *
   * @throws ToolError if the request fails.
   */
  async resetAdminRoles(): Promise<void> {
    return await this.fetchJson<void>(`${this.baseUrl}/admin/roles/reset`, {
      method: "POST",
      body: {},
      errorContext: "Reset Admin Roles",
    });
  }

  /**
   * Lists all permission scopes available to assign to roles (admin).
   *
   * @returns All permission scope definitions.
   * @throws ToolError if the request fails.
   */
  async listAdminPermissions(): Promise<PermissionsResponse> {
    return await this.fetchJson<PermissionsResponse>(
      `${this.baseUrl}/admin/permissions`,
      { method: "GET", errorContext: "List Admin Permissions" },
    );
  }

  /**
   * Creates a machine/service account that authenticates via API token (admin).
   *
   * @param body - Account name and optional description.
   * @returns The created system account resource.
   * @throws ToolError if the request fails.
   */
  async createSystemAccount(
    body: CreateSystemAccountInput,
  ): Promise<SystemAccount> {
    return await this.fetchJson<SystemAccount>(
      `${this.baseUrl}/admin/system-accounts`,
      { method: "POST", body, errorContext: "Create System Account" },
    );
  }

  /**
   * Retrieves the API tokens associated with a system account (admin).
   *
   * @param params - `accountId`: UUID of the system account.
   * @returns Token list for use in CI/CD pipelines.
   * @throws ToolError if the account is not found or the request fails.
   */
  async getSystemAccountTokens({
    accountId,
  }: GetSystemAccountTokensInput): Promise<SystemAccountTokensResponse> {
    return await this.fetchJson<SystemAccountTokensResponse>(
      `${this.baseUrl}/admin/system-accounts/${encodeURIComponent(accountId)}/tokens`,
      { method: "GET", errorContext: "Get System Account Tokens" },
    );
  }
}
