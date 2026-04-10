import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { PactflowClient } from "../../../pactflow/client";

const fetchMock = createFetchMock(vi);

async function createConfiguredClient(config: {
  token?: string;
  username?: string;
  password?: string;
}): Promise<PactflowClient> {
  const client = new PactflowClient();
  const mockServer = { server: vi.fn() } as any;
  await client.configure(mockServer, {
    base_url: "https://example.com",
    token: config.token,
    username: config.username,
    password: config.password,
  });
  return client;
}

describe("PactFlowClient", () => {
  let client: PactflowClient;

  beforeEach(async () => {
    vi.clearAllMocks();
    fetchMock.enableMocks();
    fetchMock.resetMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    fetchMock.disableMocks();
  });

  describe("API Methods", () => {
    beforeEach(async () => {
      client = await createConfiguredClient({ token: "test-token" });
    });

    describe("listAdminUsers", () => {
      it("should list admin users with no filters", async () => {
        const mockResponse = {
          _embedded: { users: [{ uuid: "user-uuid-1" }] },
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.listAdminUsers({});

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/users",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result._embedded?.users).toHaveLength(1);
      });

      it("should pass filter parameters as query string", async () => {
        fetchMock.mockResponseOnce(
          JSON.stringify({ _embedded: { users: [] } }),
        );

        await client.listAdminUsers({
          active: true,
          q: "alice",
          page: 1,
          size: 10,
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/users?active=true&q=alice&page=1&size=10",
          { method: "GET", headers: client.requestHeaders },
        );
      });
    });

    describe("getAdminUser", () => {
      it("should retrieve a user by UUID", async () => {
        const mockResponse = {
          uuid: "user-uuid-1",
          email: "admin@example.com",
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getAdminUser({ userId: "user-uuid-1" });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/users/user-uuid-1",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.email).toBe("admin@example.com");
      });
    });

    describe("createAdminUser", () => {
      it("should create a new admin user", async () => {
        const mockResponse = { uuid: "user-uuid-2", email: "new@example.com" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.createAdminUser({
          email: "new@example.com",
          name: "New User",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/users",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify({
              email: "new@example.com",
              name: "New User",
            }),
          },
        );
        expect(result.uuid).toBe("user-uuid-2");
      });
    });

    describe("updateAdminUser", () => {
      it("should update a user profile", async () => {
        const mockResponse = { uuid: "user-uuid-1", active: false };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        await client.updateAdminUser({
          userId: "user-uuid-1",
          name: "Updated Name",
          active: false,
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/users/user-uuid-1",
          {
            method: "PUT",
            headers: client.requestHeaders,
            body: JSON.stringify({ name: "Updated Name", active: false }),
          },
        );
      });
    });

    describe("deleteAdminUser", () => {
      it("should delete a user", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        await client.deleteAdminUser({ userId: "user-uuid-1" });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/users/user-uuid-1",
          { method: "DELETE", headers: client.requestHeaders },
        );
      });
    });

    describe("inviteUsers", () => {
      it("should send invitations to new users", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        await client.inviteUsers({
          users: [
            { email: "a@example.com", name: "User A" },
            { email: "b@example.com", name: "User B" },
          ],
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/users/invite-users",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify({
              users: [
                { email: "a@example.com", name: "User A" },
                { email: "b@example.com", name: "User B" },
              ],
            }),
          },
        );
      });
    });

    describe("setUserRoles", () => {
      it("should replace all roles for a user", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        // roles is an array of role UUID strings
        await client.setUserRoles({
          userId: "user-uuid-1",
          roles: ["role-uuid-1", "role-uuid-2"],
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/users/user-uuid-1/roles",
          {
            method: "PUT",
            headers: client.requestHeaders,
            body: JSON.stringify({
              roles: ["role-uuid-1", "role-uuid-2"],
            }),
          },
        );
      });
    });

    describe("addRoleToUser", () => {
      it("should add a role to a user", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        await client.addRoleToUser({
          userId: "user-uuid-1",
          roleId: "role-uuid-1",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/users/user-uuid-1/roles/role-uuid-1",
          {
            method: "PUT",
            headers: client.requestHeaders,
            body: JSON.stringify({}),
          },
        );
      });
    });

    describe("removeRoleFromUser", () => {
      it("should remove a role from a user", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        await client.removeRoleFromUser({
          userId: "user-uuid-1",
          roleId: "role-uuid-1",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/users/user-uuid-1/roles/role-uuid-1",
          { method: "DELETE", headers: client.requestHeaders },
        );
      });
    });

    describe("listAdminTeams", () => {
      it("should list all teams with no filters", async () => {
        const mockResponse = {
          _embedded: { teams: [{ uuid: "team-uuid-1", name: "Infra" }] },
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.listAdminTeams({});

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/teams",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result._embedded?.teams).toHaveLength(1);
      });

      it("should pass query filters", async () => {
        fetchMock.mockResponseOnce(
          JSON.stringify({ _embedded: { teams: [] } }),
        );

        await client.listAdminTeams({ q: "infra", page: 2, size: 5 });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/teams?q=infra&page=2&size=5",
          { method: "GET", headers: client.requestHeaders },
        );
      });
    });

    describe("getAdminTeam", () => {
      it("should retrieve a team by UUID", async () => {
        const mockResponse = { uuid: "team-uuid-1", name: "Infra" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getAdminTeam({ teamId: "team-uuid-1" });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/teams/team-uuid-1",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.name).toBe("Infra");
      });
    });

    describe("createAdminTeam", () => {
      it("should create a new team", async () => {
        const mockResponse = { uuid: "team-uuid-2", name: "Platform" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.createAdminTeam({ name: "Platform" });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/teams",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify({ name: "Platform" }),
          },
        );
        expect(result.uuid).toBe("team-uuid-2");
      });
    });

    describe("updateAdminTeam", () => {
      it("should update a team", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ uuid: "team-uuid-1" }));

        await client.updateAdminTeam({
          teamId: "team-uuid-1",
          name: "Infra v2",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/teams/team-uuid-1",
          {
            method: "PUT",
            headers: client.requestHeaders,
            body: JSON.stringify({ name: "Infra v2" }),
          },
        );
      });
    });

    describe("deleteAdminTeam", () => {
      it("should delete a team", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        await client.deleteAdminTeam({ teamId: "team-uuid-1" });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/teams/team-uuid-1",
          { method: "DELETE", headers: client.requestHeaders },
        );
      });
    });

    describe("listTeamUsers", () => {
      it("should list all users in a team", async () => {
        // TeamUsersResponse._embedded.users (not teamMembers)
        const mockResponse = {
          _embedded: {
            users: [{ uuid: "user-uuid-1", email: "a@example.com" }],
          },
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.listTeamUsers({ teamId: "team-uuid-1" });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/teams/team-uuid-1/users",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result._embedded?.users).toHaveLength(1);
      });
    });

    describe("getTeamUser", () => {
      it("should verify team membership for a user", async () => {
        const mockResponse = { uuid: "user-uuid-1" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        await client.getTeamUser({
          teamId: "team-uuid-1",
          userId: "user-uuid-1",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/teams/team-uuid-1/users/user-uuid-1",
          { method: "GET", headers: client.requestHeaders },
        );
      });

      it("should throw for non-member user", async () => {
        fetchMock.mockResponseOnce("Not Found", {
          status: 404,
          statusText: "Not Found",
        });
        await expect(
          client.getTeamUser({ teamId: "team-uuid-1", userId: "unknown" }),
        ).rejects.toThrow("Get Team User Failed - status: 404 Not Found");
      });
    });

    describe("setTeamUsers", () => {
      it("should replace all team members", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        await client.setTeamUsers({
          teamId: "team-uuid-1",
          uuids: ["user-uuid-1", "user-uuid-2"],
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/teams/team-uuid-1/users",
          {
            method: "PUT",
            headers: client.requestHeaders,
            body: JSON.stringify({ uuids: ["user-uuid-1", "user-uuid-2"] }),
          },
        );
      });
    });

    describe("patchTeamUsers", () => {
      it("should apply JSON Patch operations to team membership", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        // path must be "/users" and value is required per schema
        const operations = [
          {
            op: "add" as const,
            path: "/users" as const,
            value: { uuid: "10000000-0000-0000-0000-000000000003" },
          },
          {
            op: "remove" as const,
            path: "/users" as const,
            value: { uuid: "10000000-0000-0000-0000-000000000001" },
          },
        ];
        await client.patchTeamUsers({
          teamId: "team-uuid-1",
          operations,
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/teams/team-uuid-1/users",
          {
            method: "PATCH",
            headers: client.requestHeaders,
            body: JSON.stringify(operations),
          },
        );
      });
    });

    describe("removeUserFromTeam", () => {
      it("should remove a user from a team", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        await client.removeUserFromTeam({
          teamId: "team-uuid-1",
          userId: "user-uuid-1",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/teams/team-uuid-1/users/user-uuid-1",
          { method: "DELETE", headers: client.requestHeaders },
        );
      });
    });

    describe("listAdminRoles", () => {
      it("should list all roles", async () => {
        const mockResponse = {
          _embedded: {
            roles: [{ uuid: "role-uuid-1", name: "Administrator" }],
          },
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.listAdminRoles();

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/roles",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result._embedded?.roles).toHaveLength(1);
      });
    });

    describe("getAdminRole", () => {
      it("should retrieve a role by UUID", async () => {
        // permissions is PermissionSchema[] = { scope: string }[]
        const mockResponse = {
          uuid: "role-uuid-1",
          name: "Administrator",
          permissions: [
            { scope: "contract:read" },
            { scope: "contract:write" },
          ],
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getAdminRole({ roleId: "role-uuid-1" });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/roles/role-uuid-1",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result.name).toBe("Administrator");
      });
    });

    describe("createAdminRole", () => {
      it("should create a new role", async () => {
        const mockResponse = { uuid: "role-uuid-2", name: "ReadOnly" };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        // permissions is { scope: string }[] per CreateRoleInput
        const result = await client.createAdminRole({
          name: "ReadOnly",
          permissions: [{ scope: "contract:read" }],
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/roles",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify({
              name: "ReadOnly",
              permissions: [{ scope: "contract:read" }],
            }),
          },
        );
        expect(result.uuid).toBe("role-uuid-2");
      });
    });

    describe("updateAdminRole", () => {
      it("should update a role", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ uuid: "role-uuid-1" }));

        // permissions is { scope: string }[] per UpdateRoleInput
        await client.updateAdminRole({
          roleId: "role-uuid-1",
          name: "Super Admin",
          permissions: [
            { scope: "contract:read" },
            { scope: "contract:write" },
            { scope: "admin:users" },
          ],
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/roles/role-uuid-1",
          {
            method: "PUT",
            headers: client.requestHeaders,
            body: JSON.stringify({
              name: "Super Admin",
              permissions: [
                { scope: "contract:read" },
                { scope: "contract:write" },
                { scope: "admin:users" },
              ],
            }),
          },
        );
      });
    });

    describe("deleteAdminRole", () => {
      it("should delete a role", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        await client.deleteAdminRole({ roleId: "role-uuid-1" });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/roles/role-uuid-1",
          { method: "DELETE", headers: client.requestHeaders },
        );
      });
    });

    describe("resetAdminRoles", () => {
      it("should reset all roles to factory defaults", async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}));

        await client.resetAdminRoles();

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/roles/reset",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify({}),
          },
        );
      });
    });

    describe("listAdminPermissions", () => {
      it("should list all available permission scopes", async () => {
        // PermissionsResponse._embedded.permissions = { scope: string }[]
        const mockResponse = {
          _embedded: {
            permissions: [
              { scope: "contract:read" },
              { scope: "contract:write" },
            ],
          },
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.listAdminPermissions();

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/permissions",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result._embedded?.permissions).toHaveLength(2);
      });
    });

    describe("createSystemAccount", () => {
      it("should create a new system account", async () => {
        const mockResponse = {
          uuid: "sys-uuid-1",
          name: "CI Bot",
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        // CreateSystemAccountInput only has { name: string }
        const result = await client.createSystemAccount({
          name: "CI Bot",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/system-accounts",
          {
            method: "POST",
            headers: client.requestHeaders,
            body: JSON.stringify({ name: "CI Bot" }),
          },
        );
        expect(result.uuid).toBe("sys-uuid-1");
      });
    });

    describe("getSystemAccountTokens", () => {
      it("should retrieve tokens for a system account", async () => {
        // SystemAccountTokensResponse._embedded.items (not tokens)
        const mockResponse = {
          _embedded: {
            items: [{ uuid: "tok-uuid-1", description: "Default token" }],
          },
        };
        fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

        const result = await client.getSystemAccountTokens({
          accountId: "sys-uuid-1",
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "https://example.com/admin/system-accounts/sys-uuid-1/tokens",
          { method: "GET", headers: client.requestHeaders },
        );
        expect(result._embedded?.items).toHaveLength(1);
      });

      it("should handle not found errors", async () => {
        fetchMock.mockResponseOnce("Not Found", {
          status: 404,
          statusText: "Not Found",
        });
        await expect(
          client.getSystemAccountTokens({ accountId: "missing-uuid" }),
        ).rejects.toThrow(
          "Get System Account Tokens Failed - status: 404 Not Found",
        );
      });
    });
  });
});
