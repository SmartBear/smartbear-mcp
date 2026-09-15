import type {
  AdminPermissionsListResponse,
  AdminRoleIdInput,
  AdminRoleResponse,
  AdminRolesListResponse,
  AdminTeamIdInput,
  AdminTeamResponse,
  AdminTeamsListResponse,
  AdminUserIdInput,
  AdminUserResponse,
  AdminUsersListResponse,
  AuditInput,
  AuditLogResponse,
  CreateAdminUserInput,
  CreateRoleInput,
  CreateSecretInput,
  CreateSystemAccountInput,
  CreateTeamInput,
  CurrentUserResponse,
  GetSystemAccountTokensInput,
  InviteUsersInput,
  InviteUsersResponse,
  ListAdminTeamsInput,
  ListAdminUsersInput,
  MetricsResponse,
  PatchTeamUsersInput,
  PreferencesResponse,
  RegenerateTokenInput,
  SecretIdInput,
  SecretResponse,
  SecretsListResponse,
  SetTeamUsersInput,
  SetUserRolesInput,
  SystemAccountResponse,
  SystemAccountTokensResponse,
  TeamMetricsResponse,
  TeamUserIdInput,
  TeamUserResponse,
  TeamUsersListResponse,
  TeamUsersResponse,
  TokenResponse,
  TokensListResponse,
  UpdateAdminUserInput,
  UpdateRoleInput,
  UpdateSecretInput,
  UpdateTeamInput,
  UserRoleInput,
  UserRolesResponse,
} from "./base";
import type { HttpClient } from "./http-client";

export class AdminApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Retrieves workspace-wide metrics.
   */
  async getMetrics(): Promise<MetricsResponse> {
    return await this.http.fetch<MetricsResponse>(
      `${this.http.baseUrl}/metrics`,
      { method: "GET", errorContext: "Get Metrics" },
    );
  }

  /**
   * Retrieves metrics for all teams.
   */
  async getTeamMetrics(): Promise<TeamMetricsResponse> {
    return await this.http.fetch<TeamMetricsResponse>(
      `${this.http.baseUrl}/metrics/teams`,
      { method: "GET", errorContext: "Get Team Metrics" },
    );
  }

  /**
   * Lists all secrets in the workspace.
   */
  async listSecrets(): Promise<SecretsListResponse> {
    return await this.http.fetch<SecretsListResponse>(
      `${this.http.baseUrl}/secrets`,
      { method: "GET", errorContext: "List Secrets" },
    );
  }

  /**
   * Retrieves metadata for a specific secret by UUID (value is not returned).
   */
  async getSecret({ secretId }: SecretIdInput): Promise<SecretResponse> {
    return await this.http.fetch<SecretResponse>(
      `${this.http.baseUrl}/secrets/${encodeURIComponent(secretId)}`,
      { method: "GET", errorContext: "Get Secret" },
    );
  }

  /**
   * Creates a new secret for use in webhook configurations.
   */
  async createSecret({ ...body }: CreateSecretInput): Promise<SecretResponse> {
    return await this.http.fetch<SecretResponse>(
      `${this.http.baseUrl}/secrets`,
      { method: "POST", body, errorContext: "Create Secret" },
    );
  }

  /**
   * Replaces the value and/or description of an existing secret.
   */
  async updateSecret({
    secretId,
    ...body
  }: UpdateSecretInput): Promise<SecretResponse> {
    return await this.http.fetch<SecretResponse>(
      `${this.http.baseUrl}/secrets/${encodeURIComponent(secretId)}`,
      { method: "PUT", body, errorContext: "Update Secret" },
    );
  }

  /**
   * Permanently deletes a secret from the workspace.
   */
  async deleteSecret({ secretId }: SecretIdInput): Promise<void> {
    return await this.http.fetch<void>(
      `${this.http.baseUrl}/secrets/${encodeURIComponent(secretId)}`,
      { method: "DELETE", errorContext: "Delete Secret" },
    );
  }

  /**
   * Retrieves the profile of the currently authenticated user.
   */
  async getCurrentUser(): Promise<CurrentUserResponse> {
    return await this.http.fetch<CurrentUserResponse>(
      `${this.http.baseUrl}/user`,
      { method: "GET", errorContext: "Get Current User" },
    );
  }

  /**
   * Lists all API tokens associated with the current user's account.
   */
  async listTokens(): Promise<TokensListResponse> {
    return await this.http.fetch<TokensListResponse>(
      `${this.http.baseUrl}/settings/tokens`,
      { method: "GET", errorContext: "List Tokens" },
    );
  }

  /**
   * Regenerates (rotates) an API token, invalidating the previous value.
   */
  async regenerateToken({
    tokenId,
  }: RegenerateTokenInput): Promise<TokenResponse> {
    return await this.http.fetch<TokenResponse>(
      `${this.http.baseUrl}/settings/tokens/${encodeURIComponent(tokenId)}/regenerate`,
      { method: "POST", body: {}, errorContext: "Regenerate Token" },
    );
  }

  /**
   * Retrieves UI and notification preferences for the currently authenticated user.
   */
  async getUserPreferences(): Promise<PreferencesResponse> {
    return await this.http.fetch<PreferencesResponse>(
      `${this.http.baseUrl}/preferences/current-user`,
      { method: "GET", errorContext: "Get User Preferences" },
    );
  }

  /**
   * Retrieves workspace-level system preferences and configuration.
   */
  async getSystemPreferences(): Promise<PreferencesResponse> {
    return await this.http.fetch<PreferencesResponse>(
      `${this.http.baseUrl}/preferences/system`,
      { method: "GET", errorContext: "Get System Preferences" },
    );
  }

  /**
   * Retrieves the workspace audit log with optional filtering and pagination.
   */
  async getAuditLog(params: AuditInput): Promise<AuditLogResponse> {
    const queryParams = new URLSearchParams();
    if (params.since) queryParams.set("since", params.since);
    if (params.userUuid) queryParams.set("userUuid", params.userUuid);
    if (params.type) queryParams.set("type", params.type);
    if (params.sort) queryParams.set("sort", params.sort);
    if (params.from) queryParams.set("from", params.from);
    if (params.pageNumber)
      queryParams.set("pageNumber", String(params.pageNumber));
    if (params.pageSize) queryParams.set("pageSize", String(params.pageSize));
    const qs = queryParams.toString();
    return await this.http.fetch<AuditLogResponse>(
      `${this.http.baseUrl}/audit${qs ? `?${qs}` : ""}`,
      { method: "GET", errorContext: "Get Audit Log" },
    );
  }

  /**
   * Lists all users in the workspace with optional filtering and pagination (admin).
   */
  async listAdminUsers(
    params: ListAdminUsersInput,
  ): Promise<AdminUsersListResponse> {
    const queryParams = new URLSearchParams();
    if (params.active !== undefined)
      queryParams.set("active", String(params.active));
    if (params.q) queryParams.set("q", params.q);
    if (params.userType !== undefined)
      queryParams.set("userType", String(params.userType));
    if (params.page) queryParams.set("page", String(params.page));
    if (params.size) queryParams.set("size", String(params.size));
    const qs = queryParams.toString();
    return await this.http.fetch<AdminUsersListResponse>(
      `${this.http.baseUrl}/admin/users${qs ? `?${qs}` : ""}`,
      { method: "GET", errorContext: "List Admin Users" },
    );
  }

  /**
   * Retrieves a user's full profile by UUID (admin).
   */
  async getAdminUser({ userId }: AdminUserIdInput): Promise<AdminUserResponse> {
    return await this.http.fetch<AdminUserResponse>(
      `${this.http.baseUrl}/admin/users/${encodeURIComponent(userId)}`,
      { method: "GET", errorContext: "Get Admin User" },
    );
  }

  /**
   * Creates a new user account in the workspace (admin).
   */
  async createAdminUser({
    ...body
  }: CreateAdminUserInput): Promise<AdminUserResponse> {
    return await this.http.fetch<AdminUserResponse>(
      `${this.http.baseUrl}/admin/users`,
      { method: "POST", body, errorContext: "Create Admin User" },
    );
  }

  /**
   * Replaces a user's profile (admin).
   */
  async updateAdminUser({
    userId,
    ...body
  }: UpdateAdminUserInput): Promise<AdminUserResponse> {
    return await this.http.fetch<AdminUserResponse>(
      `${this.http.baseUrl}/admin/users/${encodeURIComponent(userId)}`,
      { method: "PUT", body, errorContext: "Update Admin User" },
    );
  }

  /**
   * Permanently deletes a user account from the workspace (admin).
   */
  async deleteAdminUser({ userId }: AdminUserIdInput): Promise<void> {
    return await this.http.fetch<void>(
      `${this.http.baseUrl}/admin/users/${encodeURIComponent(userId)}`,
      { method: "DELETE", errorContext: "Delete Admin User" },
    );
  }

  /**
   * Sends invitation emails to one or more new users (admin).
   */
  async inviteUsers({ users }: InviteUsersInput): Promise<InviteUsersResponse> {
    return await this.http.fetch<InviteUsersResponse>(
      `${this.http.baseUrl}/admin/users/invite-users`,
      { method: "POST", body: { users }, errorContext: "Invite Users" },
    );
  }

  /**
   * Fully replaces the roles assigned to a user (admin).
   */
  async setUserRoles({
    userId,
    roles,
  }: SetUserRolesInput): Promise<UserRolesResponse> {
    return await this.http.fetch<UserRolesResponse>(
      `${this.http.baseUrl}/admin/users/${encodeURIComponent(userId)}/roles`,
      { method: "PUT", body: { roles }, errorContext: "Set User Roles" },
    );
  }

  /**
   * Grants a single additional role to a user without affecting their existing roles (admin).
   */
  async addRoleToUser({
    userId,
    roleId,
  }: UserRoleInput): Promise<UserRolesResponse> {
    return await this.http.fetch<UserRolesResponse>(
      `${this.http.baseUrl}/admin/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleId)}`,
      { method: "PUT", body: {}, errorContext: "Add Role to User" },
    );
  }

  /**
   * Revokes a specific role from a user without affecting their other roles (admin).
   */
  async removeRoleFromUser({ userId, roleId }: UserRoleInput): Promise<void> {
    return await this.http.fetch<void>(
      `${this.http.baseUrl}/admin/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleId)}`,
      { method: "DELETE", errorContext: "Remove Role from User" },
    );
  }

  /**
   * Lists all teams in the workspace with optional name filtering and pagination (admin).
   */
  async listAdminTeams(
    params: ListAdminTeamsInput,
  ): Promise<AdminTeamsListResponse> {
    const queryParams = new URLSearchParams();
    if (params.q) queryParams.set("q", params.q);
    if (params.page) queryParams.set("page", String(params.page));
    if (params.size) queryParams.set("size", String(params.size));
    const qs = queryParams.toString();
    return await this.http.fetch<AdminTeamsListResponse>(
      `${this.http.baseUrl}/admin/teams${qs ? `?${qs}` : ""}`,
      { method: "GET", errorContext: "List Admin Teams" },
    );
  }

  /**
   * Retrieves the full configuration of a team by UUID (admin).
   */
  async getAdminTeam({ teamId }: AdminTeamIdInput): Promise<AdminTeamResponse> {
    return await this.http.fetch<AdminTeamResponse>(
      `${this.http.baseUrl}/admin/teams/${encodeURIComponent(teamId)}`,
      { method: "GET", errorContext: "Get Admin Team" },
    );
  }

  /**
   * Creates a new team in the workspace (admin).
   */
  async createAdminTeam({
    ...body
  }: CreateTeamInput): Promise<AdminTeamResponse> {
    return await this.http.fetch<AdminTeamResponse>(
      `${this.http.baseUrl}/admin/teams`,
      { method: "POST", body, errorContext: "Create Admin Team" },
    );
  }

  /**
   * Fully replaces a team's configuration (admin).
   */
  async updateAdminTeam({
    teamId,
    ...body
  }: UpdateTeamInput): Promise<AdminTeamResponse> {
    return await this.http.fetch<AdminTeamResponse>(
      `${this.http.baseUrl}/admin/teams/${encodeURIComponent(teamId)}`,
      { method: "PUT", body, errorContext: "Update Admin Team" },
    );
  }

  /**
   * Permanently deletes a team from the workspace (admin).
   */
  async deleteAdminTeam({ teamId }: AdminTeamIdInput): Promise<void> {
    return await this.http.fetch<void>(
      `${this.http.baseUrl}/admin/teams/${encodeURIComponent(teamId)}`,
      { method: "DELETE", errorContext: "Delete Admin Team" },
    );
  }

  /**
   * Lists all user members of a specific team (admin).
   */
  async listTeamUsers({
    teamId,
  }: AdminTeamIdInput): Promise<TeamUsersListResponse> {
    return await this.http.fetch<TeamUsersListResponse>(
      `${this.http.baseUrl}/admin/teams/${encodeURIComponent(teamId)}/users`,
      { method: "GET", errorContext: "List Team Users" },
    );
  }

  /**
   * Verifies whether a specific user is a member of a team (admin).
   */
  async getTeamUser({
    teamId,
    userId,
  }: TeamUserIdInput): Promise<TeamUserResponse> {
    return await this.http.fetch<TeamUserResponse>(
      `${this.http.baseUrl}/admin/teams/${encodeURIComponent(teamId)}/users/${encodeURIComponent(userId)}`,
      { method: "GET", errorContext: "Get Team User" },
    );
  }

  /**
   * Fully replaces the members of a team (admin).
   */
  async setTeamUsers({
    teamId,
    uuids,
  }: SetTeamUsersInput): Promise<TeamUsersResponse> {
    return await this.http.fetch<TeamUsersResponse>(
      `${this.http.baseUrl}/admin/teams/${encodeURIComponent(teamId)}/users`,
      { method: "PUT", body: { users: uuids }, errorContext: "Set Team Users" },
    );
  }

  /**
   * Adds or removes individual users from a team using JSON Patch semantics (admin).
   */
  async patchTeamUsers({
    teamId,
    operations,
  }: PatchTeamUsersInput): Promise<TeamUsersResponse> {
    return await this.http.fetch<TeamUsersResponse>(
      `${this.http.baseUrl}/admin/teams/${encodeURIComponent(teamId)}/users`,
      {
        method: "PATCH",
        body: operations,
        errorContext: "Patch Team Users",
      },
    );
  }

  /**
   * Removes a specific user from a team (admin).
   */
  async removeUserFromTeam({ teamId, userId }: TeamUserIdInput): Promise<void> {
    return await this.http.fetch<void>(
      `${this.http.baseUrl}/admin/teams/${encodeURIComponent(teamId)}/users/${encodeURIComponent(userId)}`,
      { method: "DELETE", errorContext: "Remove User from Team" },
    );
  }

  /**
   * Lists all roles defined in the workspace (admin).
   */
  async listAdminRoles(): Promise<AdminRolesListResponse> {
    return await this.http.fetch<AdminRolesListResponse>(
      `${this.http.baseUrl}/admin/roles`,
      { method: "GET", errorContext: "List Admin Roles" },
    );
  }

  /**
   * Retrieves a role's name, description, and full permission set by UUID (admin).
   */
  async getAdminRole({ roleId }: AdminRoleIdInput): Promise<AdminRoleResponse> {
    return await this.http.fetch<AdminRoleResponse>(
      `${this.http.baseUrl}/admin/roles/${encodeURIComponent(roleId)}`,
      { method: "GET", errorContext: "Get Admin Role" },
    );
  }

  /**
   * Creates a custom role with a tailored set of permission scopes (admin).
   */
  async createAdminRole({
    ...body
  }: CreateRoleInput): Promise<AdminRoleResponse> {
    return await this.http.fetch<AdminRoleResponse>(
      `${this.http.baseUrl}/admin/roles`,
      { method: "POST", body, errorContext: "Create Admin Role" },
    );
  }

  /**
   * Updates an existing role's name and/or permission set (admin).
   */
  async updateAdminRole({
    roleId,
    ...body
  }: UpdateRoleInput): Promise<AdminRoleResponse> {
    return await this.http.fetch<AdminRoleResponse>(
      `${this.http.baseUrl}/admin/roles/${encodeURIComponent(roleId)}`,
      { method: "PUT", body, errorContext: "Update Admin Role" },
    );
  }

  /**
   * Permanently deletes a role (admin).
   */
  async deleteAdminRole({ roleId }: AdminRoleIdInput): Promise<void> {
    return await this.http.fetch<void>(
      `${this.http.baseUrl}/admin/roles/${encodeURIComponent(roleId)}`,
      { method: "DELETE", errorContext: "Delete Admin Role" },
    );
  }

  /**
   * Resets all roles to factory defaults (admin).
   */
  async resetAdminRoles(): Promise<AdminRolesListResponse> {
    return await this.http.fetch<AdminRolesListResponse>(
      `${this.http.baseUrl}/admin/roles/reset`,
      { method: "POST", body: {}, errorContext: "Reset Admin Roles" },
    );
  }

  /**
   * Lists all permission scopes available to assign to roles (admin).
   */
  async listAdminPermissions(): Promise<AdminPermissionsListResponse> {
    return await this.http.fetch<AdminPermissionsListResponse>(
      `${this.http.baseUrl}/admin/permissions`,
      { method: "GET", errorContext: "List Admin Permissions" },
    );
  }

  /**
   * Creates a machine/service account that authenticates via API token (admin).
   */
  async createSystemAccount({
    ...body
  }: CreateSystemAccountInput): Promise<SystemAccountResponse> {
    return await this.http.fetch<SystemAccountResponse>(
      `${this.http.baseUrl}/admin/system-accounts`,
      { method: "POST", body, errorContext: "Create System Account" },
    );
  }

  /**
   * Retrieves the API tokens associated with a system account (admin).
   */
  async getSystemAccountTokens({
    accountId,
  }: GetSystemAccountTokensInput): Promise<SystemAccountTokensResponse> {
    return await this.http.fetch<SystemAccountTokensResponse>(
      `${this.http.baseUrl}/admin/system-accounts/${encodeURIComponent(accountId)}/tokens`,
      { method: "GET", errorContext: "Get System Account Tokens" },
    );
  }

  get handlers(): Record<string, (...args: any[]) => Promise<any>> {
    return {
      getMetrics: this.getMetrics.bind(this),
      getTeamMetrics: this.getTeamMetrics.bind(this),
      listSecrets: this.listSecrets.bind(this),
      getSecret: this.getSecret.bind(this),
      createSecret: this.createSecret.bind(this),
      updateSecret: this.updateSecret.bind(this),
      deleteSecret: this.deleteSecret.bind(this),
      getCurrentUser: this.getCurrentUser.bind(this),
      listTokens: this.listTokens.bind(this),
      regenerateToken: this.regenerateToken.bind(this),
      getUserPreferences: this.getUserPreferences.bind(this),
      getSystemPreferences: this.getSystemPreferences.bind(this),
      getAuditLog: this.getAuditLog.bind(this),
      listAdminUsers: this.listAdminUsers.bind(this),
      getAdminUser: this.getAdminUser.bind(this),
      createAdminUser: this.createAdminUser.bind(this),
      updateAdminUser: this.updateAdminUser.bind(this),
      deleteAdminUser: this.deleteAdminUser.bind(this),
      inviteUsers: this.inviteUsers.bind(this),
      setUserRoles: this.setUserRoles.bind(this),
      addRoleToUser: this.addRoleToUser.bind(this),
      removeRoleFromUser: this.removeRoleFromUser.bind(this),
      listAdminTeams: this.listAdminTeams.bind(this),
      getAdminTeam: this.getAdminTeam.bind(this),
      createAdminTeam: this.createAdminTeam.bind(this),
      updateAdminTeam: this.updateAdminTeam.bind(this),
      deleteAdminTeam: this.deleteAdminTeam.bind(this),
      listTeamUsers: this.listTeamUsers.bind(this),
      getTeamUser: this.getTeamUser.bind(this),
      setTeamUsers: this.setTeamUsers.bind(this),
      patchTeamUsers: this.patchTeamUsers.bind(this),
      removeUserFromTeam: this.removeUserFromTeam.bind(this),
      listAdminRoles: this.listAdminRoles.bind(this),
      getAdminRole: this.getAdminRole.bind(this),
      createAdminRole: this.createAdminRole.bind(this),
      updateAdminRole: this.updateAdminRole.bind(this),
      deleteAdminRole: this.deleteAdminRole.bind(this),
      resetAdminRoles: this.resetAdminRoles.bind(this),
      listAdminPermissions: this.listAdminPermissions.bind(this),
      createSystemAccount: this.createSystemAccount.bind(this),
      getSystemAccountTokens: this.getSystemAccountTokens.bind(this),
    };
  }
}
