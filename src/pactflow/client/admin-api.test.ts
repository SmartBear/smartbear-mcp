import { describe, it, expect, beforeEach } from "vitest";
import { AdminApi } from "./admin-api";
import { createMockHttpClient } from "./test-helpers";
import { ToolError } from "../../common/tools";

describe("AdminApi", () => {
  let api: AdminApi;
  let mockHttp: ReturnType<typeof createMockHttpClient>;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    api = new AdminApi(mockHttp);
  });

  describe("getMetrics", () => {
    it("should call mockHttp.fetch (not raw fetch) and return metrics", async () => {
      const mockResponse = { pacticipants: 10, integrations: 5 };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getMetrics();

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/metrics",
        { method: "GET", errorContext: "Get Metrics" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Get Metrics Failed - status: 401 Unauthorized"),
      );

      await expect(api.getMetrics()).rejects.toThrow(
        "Get Metrics Failed - status: 401 Unauthorized",
      );
    });
  });

  describe("getTeamMetrics", () => {
    it("should call mockHttp.fetch (not raw fetch) and return team metrics", async () => {
      const mockResponse = { teams: [{ name: "team-a", pacticipants: 3 }] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getTeamMetrics();

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/metrics/teams",
        { method: "GET", errorContext: "Get Team Metrics" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Get Team Metrics Failed - status: 403 Forbidden"),
      );

      await expect(api.getTeamMetrics()).rejects.toThrow(
        "Get Team Metrics Failed - status: 403 Forbidden",
      );
    });
  });

  describe("listSecrets", () => {
    it("should retrieve all secrets", async () => {
      const mockResponse = { secrets: [{ uuid: "abc-123", name: "my-secret" }] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.listSecrets();

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/secrets",
        { method: "GET", errorContext: "List Secrets" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("List Secrets Failed - status: 403 Forbidden"),
      );

      await expect(api.listSecrets()).rejects.toThrow(
        "List Secrets Failed - status: 403 Forbidden",
      );
    });
  });

  describe("getSecret", () => {
    it("should retrieve a specific secret by ID", async () => {
      const mockResponse = { uuid: "abc-123", name: "my-secret" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getSecret({ secretId: "abc-123" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/secrets/abc-123",
        { method: "GET", errorContext: "Get Secret" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode secret ID with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getSecret({ secretId: "my secret/v2" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/secrets/my%20secret%2Fv2",
        { method: "GET", errorContext: "Get Secret" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Get Secret Failed - status: 404 Not Found"),
      );

      await expect(api.getSecret({ secretId: "missing" })).rejects.toThrow(
        "Get Secret Failed - status: 404 Not Found",
      );
    });
  });

  describe("createSecret", () => {
    it("should create a new secret", async () => {
      const mockResponse = { uuid: "new-uuid", name: "new-secret" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.createSecret({
        name: "new-secret",
        description: "A test secret",
        value: "secret-value",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/secrets",
        {
          method: "POST",
          body: { name: "new-secret", description: "A test secret", value: "secret-value" },
          errorContext: "Create Secret",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Create Secret Failed - status: 422 Unprocessable Entity"),
      );

      await expect(
        api.createSecret({ name: "bad", value: "v" }),
      ).rejects.toThrow("Create Secret Failed - status: 422 Unprocessable Entity");
    });
  });

  describe("updateSecret", () => {
    it("should update a secret", async () => {
      const mockResponse = { uuid: "abc-123", name: "updated-secret" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.updateSecret({
        secretId: "abc-123",
        name: "updated-secret",
        value: "new-value",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/secrets/abc-123",
        {
          method: "PUT",
          body: { name: "updated-secret", value: "new-value" },
          errorContext: "Update Secret",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode secret ID with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.updateSecret({ secretId: "my secret/v2", name: "x", value: "y" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/secrets/my%20secret%2Fv2",
        expect.objectContaining({ method: "PUT" }),
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Update Secret Failed - status: 404 Not Found"),
      );

      await expect(
        api.updateSecret({ secretId: "missing", name: "x", value: "y" }),
      ).rejects.toThrow("Update Secret Failed - status: 404 Not Found");
    });
  });

  describe("deleteSecret", () => {
    it("should delete a secret", async () => {
      mockHttp.fetch.mockResolvedValueOnce(undefined);

      await api.deleteSecret({ secretId: "abc-123" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/secrets/abc-123",
        { method: "DELETE", errorContext: "Delete Secret" },
      );
    });

    it("should URL-encode secret ID with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce(undefined);

      await api.deleteSecret({ secretId: "my secret/v2" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/secrets/my%20secret%2Fv2",
        { method: "DELETE", errorContext: "Delete Secret" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Delete Secret Failed - status: 404 Not Found"),
      );

      await expect(api.deleteSecret({ secretId: "missing" })).rejects.toThrow(
        "Delete Secret Failed - status: 404 Not Found",
      );
    });
  });

  describe("getCurrentUser", () => {
    it("should retrieve the current user profile", async () => {
      const mockResponse = { name: "Alice", email: "alice@example.com", active: true };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getCurrentUser();

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/user",
        { method: "GET", errorContext: "Get Current User" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Get Current User Failed - status: 401 Unauthorized"),
      );

      await expect(api.getCurrentUser()).rejects.toThrow(
        "Get Current User Failed - status: 401 Unauthorized",
      );
    });
  });

  describe("listTokens", () => {
    it("should list all API tokens", async () => {
      const mockResponse = { tokens: [{ uuid: "tok-1", description: "CI token" }] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.listTokens();

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/settings/tokens",
        { method: "GET", errorContext: "List Tokens" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("List Tokens Failed - status: 401 Unauthorized"),
      );

      await expect(api.listTokens()).rejects.toThrow(
        "List Tokens Failed - status: 401 Unauthorized",
      );
    });
  });

  describe("regenerateToken", () => {
    it("should regenerate a token by ID", async () => {
      const mockResponse = { uuid: "tok-1", value: "new-token-value" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.regenerateToken({ tokenId: "tok-1" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/settings/tokens/tok-1/regenerate",
        { method: "POST", body: {}, errorContext: "Regenerate Token" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode token ID with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.regenerateToken({ tokenId: "tok/v2 special" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/settings/tokens/tok%2Fv2%20special/regenerate",
        { method: "POST", body: {}, errorContext: "Regenerate Token" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Regenerate Token Failed - status: 404 Not Found"),
      );

      await expect(api.regenerateToken({ tokenId: "missing" })).rejects.toThrow(
        "Regenerate Token Failed - status: 404 Not Found",
      );
    });
  });

  describe("getUserPreferences", () => {
    it("should retrieve user preferences", async () => {
      const mockResponse = { emailNotifications: true, theme: "dark" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getUserPreferences();

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/preferences/current-user",
        { method: "GET", errorContext: "Get User Preferences" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Get User Preferences Failed - status: 401 Unauthorized"),
      );

      await expect(api.getUserPreferences()).rejects.toThrow(
        "Get User Preferences Failed - status: 401 Unauthorized",
      );
    });
  });

  describe("getSystemPreferences", () => {
    it("should retrieve system preferences", async () => {
      const mockResponse = { allowGuestAccess: false };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getSystemPreferences();

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/preferences/system",
        { method: "GET", errorContext: "Get System Preferences" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Get System Preferences Failed - status: 403 Forbidden"),
      );

      await expect(api.getSystemPreferences()).rejects.toThrow(
        "Get System Preferences Failed - status: 403 Forbidden",
      );
    });
  });

  describe("getAuditLog", () => {
    it("should retrieve audit log without filters", async () => {
      const mockResponse = { events: [] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getAuditLog({});

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/audit",
        { method: "GET", errorContext: "Get Audit Log" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should append all filter query params", async () => {
      mockHttp.fetch.mockResolvedValueOnce({ events: [] });

      await api.getAuditLog({
        since: "2024-01-01",
        userUuid: "user-123",
        type: "login",
        sort: "desc",
        from: "cursor-abc",
        pageNumber: 2,
        pageSize: 20,
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/audit?since=2024-01-01&userUuid=user-123&type=login&sort=desc&from=cursor-abc&pageNumber=2&pageSize=20",
        { method: "GET", errorContext: "Get Audit Log" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Get Audit Log Failed - status: 403 Forbidden"),
      );

      await expect(api.getAuditLog({})).rejects.toThrow(
        "Get Audit Log Failed - status: 403 Forbidden",
      );
    });
  });

  describe("listAdminUsers", () => {
    it("should list admin users without filters", async () => {
      const mockResponse = { users: [{ uuid: "u1", name: "Alice" }] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.listAdminUsers({});

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/users",
        { method: "GET", errorContext: "List Admin Users" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should append all filter query params", async () => {
      mockHttp.fetch.mockResolvedValueOnce({ users: [] });

      await api.listAdminUsers({ active: true, q: "alice", userType: 0, page: 2, size: 10 });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/users?active=true&q=alice&userType=0&page=2&size=10",
        { method: "GET", errorContext: "List Admin Users" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("List Admin Users Failed - status: 403 Forbidden"),
      );

      await expect(api.listAdminUsers({})).rejects.toThrow(
        "List Admin Users Failed - status: 403 Forbidden",
      );
    });
  });

  describe("getAdminUser", () => {
    it("should retrieve an admin user by ID", async () => {
      const mockResponse = { uuid: "u1", name: "Alice", email: "alice@example.com" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getAdminUser({ userId: "u1" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/users/u1",
        { method: "GET", errorContext: "Get Admin User" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode user ID with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getAdminUser({ userId: "user/v2 id" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/users/user%2Fv2%20id",
        { method: "GET", errorContext: "Get Admin User" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Get Admin User Failed - status: 404 Not Found"),
      );

      await expect(api.getAdminUser({ userId: "missing" })).rejects.toThrow(
        "Get Admin User Failed - status: 404 Not Found",
      );
    });
  });

  describe("createAdminUser", () => {
    it("should create a new admin user", async () => {
      const mockResponse = { uuid: "new-u", name: "Bob", email: "bob@example.com" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.createAdminUser({
        name: "Bob",
        email: "bob@example.com",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/users",
        {
          method: "POST",
          body: { name: "Bob", email: "bob@example.com" },
          errorContext: "Create Admin User",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Create Admin User Failed - status: 422 Unprocessable Entity"),
      );

      await expect(
        api.createAdminUser({ name: "Bob", email: "bob@example.com" }),
      ).rejects.toThrow("Create Admin User Failed - status: 422 Unprocessable Entity");
    });
  });

  describe("updateAdminUser", () => {
    it("should update an admin user", async () => {
      const mockResponse = { uuid: "u1", name: "Alice Updated" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.updateAdminUser({ userId: "u1", name: "Alice Updated" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/users/u1",
        {
          method: "PUT",
          body: { name: "Alice Updated" },
          errorContext: "Update Admin User",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode user ID with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.updateAdminUser({ userId: "user/v2", name: "X" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/users/user%2Fv2",
        expect.objectContaining({ method: "PUT" }),
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Update Admin User Failed - status: 404 Not Found"),
      );

      await expect(api.updateAdminUser({ userId: "missing", name: "X" })).rejects.toThrow(
        "Update Admin User Failed - status: 404 Not Found",
      );
    });
  });

  describe("deleteAdminUser", () => {
    it("should delete an admin user", async () => {
      mockHttp.fetch.mockResolvedValueOnce(undefined);

      await api.deleteAdminUser({ userId: "u1" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/users/u1",
        { method: "DELETE", errorContext: "Delete Admin User" },
      );
    });

    it("should URL-encode user ID with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce(undefined);

      await api.deleteAdminUser({ userId: "user/v2 id" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/users/user%2Fv2%20id",
        { method: "DELETE", errorContext: "Delete Admin User" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Delete Admin User Failed - status: 404 Not Found"),
      );

      await expect(api.deleteAdminUser({ userId: "missing" })).rejects.toThrow(
        "Delete Admin User Failed - status: 404 Not Found",
      );
    });
  });

  describe("inviteUsers", () => {
    it("should invite users", async () => {
      const mockResponse = { invited: 2 };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.inviteUsers({
        users: [
          { email: "alice@example.com", name: "Alice" },
          { email: "bob@example.com", name: "Bob" },
        ],
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/users/invite-users",
        {
          method: "POST",
          body: {
            users: [
              { email: "alice@example.com", name: "Alice" },
              { email: "bob@example.com", name: "Bob" },
            ],
          },
          errorContext: "Invite Users",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Invite Users Failed - status: 422 Unprocessable Entity"),
      );

      await expect(
        api.inviteUsers({ users: [{ email: "bad@example.com", name: "Bad" }] }),
      ).rejects.toThrow("Invite Users Failed - status: 422 Unprocessable Entity");
    });
  });

  describe("setUserRoles", () => {
    it("should set user roles", async () => {
      const mockResponse = { uuid: "u1", roles: [{ uuid: "r1" }] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.setUserRoles({ userId: "u1", roles: ["r1"] });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/users/u1/roles",
        {
          method: "PUT",
          body: { roles: ["r1"] },
          errorContext: "Set User Roles",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode user ID with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.setUserRoles({ userId: "user/v2", roles: [] });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/users/user%2Fv2/roles",
        expect.objectContaining({ method: "PUT" }),
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Set User Roles Failed - status: 404 Not Found"),
      );

      await expect(
        api.setUserRoles({ userId: "missing", roles: [] }),
      ).rejects.toThrow("Set User Roles Failed - status: 404 Not Found");
    });
  });

  describe("addRoleToUser", () => {
    it("should add a role to a user", async () => {
      const mockResponse = { uuid: "u1", roles: [{ uuid: "r1" }] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.addRoleToUser({ userId: "u1", roleId: "r1" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/users/u1/roles/r1",
        { method: "PUT", body: {}, errorContext: "Add Role to User" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode IDs with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.addRoleToUser({ userId: "user/1", roleId: "role/2" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/users/user%2F1/roles/role%2F2",
        { method: "PUT", body: {}, errorContext: "Add Role to User" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Add Role to User Failed - status: 404 Not Found"),
      );

      await expect(
        api.addRoleToUser({ userId: "missing", roleId: "r1" }),
      ).rejects.toThrow("Add Role to User Failed - status: 404 Not Found");
    });
  });

  describe("removeRoleFromUser", () => {
    it("should remove a role from a user", async () => {
      mockHttp.fetch.mockResolvedValueOnce(undefined);

      await api.removeRoleFromUser({ userId: "u1", roleId: "r1" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/users/u1/roles/r1",
        { method: "DELETE", errorContext: "Remove Role from User" },
      );
    });

    it("should URL-encode IDs with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce(undefined);

      await api.removeRoleFromUser({ userId: "user/1", roleId: "role/2" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/users/user%2F1/roles/role%2F2",
        { method: "DELETE", errorContext: "Remove Role from User" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Remove Role from User Failed - status: 404 Not Found"),
      );

      await expect(
        api.removeRoleFromUser({ userId: "missing", roleId: "r1" }),
      ).rejects.toThrow("Remove Role from User Failed - status: 404 Not Found");
    });
  });

  describe("listAdminTeams", () => {
    it("should list admin teams without filters", async () => {
      const mockResponse = { teams: [{ uuid: "t1", name: "Team A" }] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.listAdminTeams({});

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/teams",
        { method: "GET", errorContext: "List Admin Teams" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should append filter query params", async () => {
      mockHttp.fetch.mockResolvedValueOnce({ teams: [] });

      await api.listAdminTeams({ q: "alpha", page: 2, size: 5 });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/teams?q=alpha&page=2&size=5",
        { method: "GET", errorContext: "List Admin Teams" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("List Admin Teams Failed - status: 403 Forbidden"),
      );

      await expect(api.listAdminTeams({})).rejects.toThrow(
        "List Admin Teams Failed - status: 403 Forbidden",
      );
    });
  });

  describe("getAdminTeam", () => {
    it("should retrieve an admin team by ID", async () => {
      const mockResponse = { uuid: "t1", name: "Team A" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getAdminTeam({ teamId: "t1" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/teams/t1",
        { method: "GET", errorContext: "Get Admin Team" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode team ID with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getAdminTeam({ teamId: "team/alpha v2" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/teams/team%2Falpha%20v2",
        { method: "GET", errorContext: "Get Admin Team" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Get Admin Team Failed - status: 404 Not Found"),
      );

      await expect(api.getAdminTeam({ teamId: "missing" })).rejects.toThrow(
        "Get Admin Team Failed - status: 404 Not Found",
      );
    });
  });

  describe("createAdminTeam", () => {
    it("should create a new admin team", async () => {
      const mockResponse = { uuid: "new-t", name: "New Team" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.createAdminTeam({ name: "New Team" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/teams",
        {
          method: "POST",
          body: { name: "New Team" },
          errorContext: "Create Admin Team",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Create Admin Team Failed - status: 422 Unprocessable Entity"),
      );

      await expect(api.createAdminTeam({ name: "Bad" })).rejects.toThrow(
        "Create Admin Team Failed - status: 422 Unprocessable Entity",
      );
    });
  });

  describe("updateAdminTeam", () => {
    it("should update an admin team", async () => {
      const mockResponse = { uuid: "t1", name: "Updated Team" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.updateAdminTeam({ teamId: "t1", name: "Updated Team" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/teams/t1",
        {
          method: "PUT",
          body: { name: "Updated Team" },
          errorContext: "Update Admin Team",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode team ID with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.updateAdminTeam({ teamId: "team/v2", name: "X" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/teams/team%2Fv2",
        expect.objectContaining({ method: "PUT" }),
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Update Admin Team Failed - status: 404 Not Found"),
      );

      await expect(api.updateAdminTeam({ teamId: "missing", name: "X" })).rejects.toThrow(
        "Update Admin Team Failed - status: 404 Not Found",
      );
    });
  });

  describe("deleteAdminTeam", () => {
    it("should delete an admin team", async () => {
      mockHttp.fetch.mockResolvedValueOnce(undefined);

      await api.deleteAdminTeam({ teamId: "t1" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/teams/t1",
        { method: "DELETE", errorContext: "Delete Admin Team" },
      );
    });

    it("should URL-encode team ID with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce(undefined);

      await api.deleteAdminTeam({ teamId: "team/v2 id" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/teams/team%2Fv2%20id",
        { method: "DELETE", errorContext: "Delete Admin Team" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Delete Admin Team Failed - status: 404 Not Found"),
      );

      await expect(api.deleteAdminTeam({ teamId: "missing" })).rejects.toThrow(
        "Delete Admin Team Failed - status: 404 Not Found",
      );
    });
  });

  describe("listTeamUsers", () => {
    it("should list users in a team", async () => {
      const mockResponse = { users: [{ uuid: "u1", name: "Alice" }] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.listTeamUsers({ teamId: "t1" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/teams/t1/users",
        { method: "GET", errorContext: "List Team Users" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode team ID with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.listTeamUsers({ teamId: "team/v2 id" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/teams/team%2Fv2%20id/users",
        { method: "GET", errorContext: "List Team Users" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("List Team Users Failed - status: 404 Not Found"),
      );

      await expect(api.listTeamUsers({ teamId: "missing" })).rejects.toThrow(
        "List Team Users Failed - status: 404 Not Found",
      );
    });
  });

  describe("getTeamUser", () => {
    it("should verify a user is in a team", async () => {
      const mockResponse = { uuid: "u1", name: "Alice" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getTeamUser({ teamId: "t1", userId: "u1" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/teams/t1/users/u1",
        { method: "GET", errorContext: "Get Team User" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode both IDs with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getTeamUser({ teamId: "team/1", userId: "user/2" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/teams/team%2F1/users/user%2F2",
        { method: "GET", errorContext: "Get Team User" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Get Team User Failed - status: 404 Not Found"),
      );

      await expect(api.getTeamUser({ teamId: "t1", userId: "missing" })).rejects.toThrow(
        "Get Team User Failed - status: 404 Not Found",
      );
    });
  });

  describe("setTeamUsers", () => {
    it("should fully replace team members", async () => {
      const mockResponse = { users: [{ uuid: "u1" }] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.setTeamUsers({
        teamId: "t1",
        uuids: ["u1", "u2"],
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/teams/t1/users",
        {
          method: "PUT",
          body: { users: ["u1", "u2"] },
          errorContext: "Set Team Users",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode team ID with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.setTeamUsers({ teamId: "team/v2", uuids: [] });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/teams/team%2Fv2/users",
        expect.objectContaining({ method: "PUT" }),
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Set Team Users Failed - status: 404 Not Found"),
      );

      await expect(
        api.setTeamUsers({ teamId: "missing", uuids: [] }),
      ).rejects.toThrow("Set Team Users Failed - status: 404 Not Found");
    });
  });

  describe("patchTeamUsers", () => {
    it("should patch team users using JSON Patch operations", async () => {
      const mockResponse = { users: [{ uuid: "u1" }] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);
      const operations = [
        { op: "add" as const, path: "/users" as const, value: { uuid: "u2" } },
      ];

      const result = await api.patchTeamUsers({ teamId: "t1", operations });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/teams/t1/users",
        {
          method: "PATCH",
          body: operations,
          errorContext: "Patch Team Users",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode team ID with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.patchTeamUsers({
        teamId: "team/v2",
        operations: [{ op: "remove", path: "/users", value: { uuid: "u1" } }],
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/teams/team%2Fv2/users",
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Patch Team Users Failed - status: 404 Not Found"),
      );

      await expect(
        api.patchTeamUsers({ teamId: "missing", operations: [] }),
      ).rejects.toThrow("Patch Team Users Failed - status: 404 Not Found");
    });
  });

  describe("removeUserFromTeam", () => {
    it("should remove a user from a team", async () => {
      mockHttp.fetch.mockResolvedValueOnce(undefined);

      await api.removeUserFromTeam({ teamId: "t1", userId: "u1" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/teams/t1/users/u1",
        { method: "DELETE", errorContext: "Remove User from Team" },
      );
    });

    it("should URL-encode both IDs with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce(undefined);

      await api.removeUserFromTeam({ teamId: "team/1", userId: "user/2" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/teams/team%2F1/users/user%2F2",
        { method: "DELETE", errorContext: "Remove User from Team" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Remove User from Team Failed - status: 404 Not Found"),
      );

      await expect(
        api.removeUserFromTeam({ teamId: "t1", userId: "missing" }),
      ).rejects.toThrow("Remove User from Team Failed - status: 404 Not Found");
    });
  });

  describe("listAdminRoles", () => {
    it("should list all admin roles", async () => {
      const mockResponse = { roles: [{ uuid: "r1", name: "Admin" }] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.listAdminRoles();

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/roles",
        { method: "GET", errorContext: "List Admin Roles" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("List Admin Roles Failed - status: 403 Forbidden"),
      );

      await expect(api.listAdminRoles()).rejects.toThrow(
        "List Admin Roles Failed - status: 403 Forbidden",
      );
    });
  });

  describe("getAdminRole", () => {
    it("should retrieve an admin role by ID", async () => {
      const mockResponse = { uuid: "r1", name: "Admin" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getAdminRole({ roleId: "r1" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/roles/r1",
        { method: "GET", errorContext: "Get Admin Role" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode role ID with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getAdminRole({ roleId: "role/v2 id" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/roles/role%2Fv2%20id",
        { method: "GET", errorContext: "Get Admin Role" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Get Admin Role Failed - status: 404 Not Found"),
      );

      await expect(api.getAdminRole({ roleId: "missing" })).rejects.toThrow(
        "Get Admin Role Failed - status: 404 Not Found",
      );
    });
  });

  describe("createAdminRole", () => {
    it("should create a new admin role", async () => {
      const mockResponse = { uuid: "new-r", name: "Custom Role" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.createAdminRole({
        name: "Custom Role",
        permissions: [{ scope: "webhook:read" }],
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/roles",
        {
          method: "POST",
          body: { name: "Custom Role", permissions: [{ scope: "webhook:read" }] },
          errorContext: "Create Admin Role",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Create Admin Role Failed - status: 422 Unprocessable Entity"),
      );

      await expect(
        api.createAdminRole({ name: "Bad", permissions: [] }),
      ).rejects.toThrow("Create Admin Role Failed - status: 422 Unprocessable Entity");
    });
  });

  describe("updateAdminRole", () => {
    it("should update an admin role", async () => {
      const mockResponse = { uuid: "r1", name: "Updated Role" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.updateAdminRole({
        roleId: "r1",
        name: "Updated Role",
        permissions: [{ scope: "user:manage" }],
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/roles/r1",
        {
          method: "PUT",
          body: { name: "Updated Role", permissions: [{ scope: "user:manage" }] },
          errorContext: "Update Admin Role",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode role ID with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.updateAdminRole({ roleId: "role/v2", name: "X", permissions: [] });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/roles/role%2Fv2",
        expect.objectContaining({ method: "PUT" }),
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Update Admin Role Failed - status: 404 Not Found"),
      );

      await expect(
        api.updateAdminRole({ roleId: "missing", name: "X", permissions: [] }),
      ).rejects.toThrow("Update Admin Role Failed - status: 404 Not Found");
    });
  });

  describe("deleteAdminRole", () => {
    it("should delete an admin role", async () => {
      mockHttp.fetch.mockResolvedValueOnce(undefined);

      await api.deleteAdminRole({ roleId: "r1" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/roles/r1",
        { method: "DELETE", errorContext: "Delete Admin Role" },
      );
    });

    it("should URL-encode role ID with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce(undefined);

      await api.deleteAdminRole({ roleId: "role/v2 id" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/roles/role%2Fv2%20id",
        { method: "DELETE", errorContext: "Delete Admin Role" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Delete Admin Role Failed - status: 404 Not Found"),
      );

      await expect(api.deleteAdminRole({ roleId: "missing" })).rejects.toThrow(
        "Delete Admin Role Failed - status: 404 Not Found",
      );
    });
  });

  describe("resetAdminRoles", () => {
    it("should reset all roles to defaults", async () => {
      const mockResponse = { roles: [{ uuid: "r-default", name: "User" }] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.resetAdminRoles();

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/roles/reset",
        { method: "POST", body: {}, errorContext: "Reset Admin Roles" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Reset Admin Roles Failed - status: 403 Forbidden"),
      );

      await expect(api.resetAdminRoles()).rejects.toThrow(
        "Reset Admin Roles Failed - status: 403 Forbidden",
      );
    });
  });

  describe("listAdminPermissions", () => {
    it("should list all admin permissions", async () => {
      const mockResponse = { permissions: [{ scope: "webhook:read" }] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.listAdminPermissions();

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/permissions",
        { method: "GET", errorContext: "List Admin Permissions" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("List Admin Permissions Failed - status: 403 Forbidden"),
      );

      await expect(api.listAdminPermissions()).rejects.toThrow(
        "List Admin Permissions Failed - status: 403 Forbidden",
      );
    });
  });

  describe("createSystemAccount", () => {
    it("should create a system account", async () => {
      const mockResponse = { uuid: "sa-1", name: "CI System" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.createSystemAccount({ name: "CI System" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/system-accounts",
        {
          method: "POST",
          body: { name: "CI System" },
          errorContext: "Create System Account",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Create System Account Failed - status: 422 Unprocessable Entity"),
      );

      await expect(api.createSystemAccount({ name: "Bad" })).rejects.toThrow(
        "Create System Account Failed - status: 422 Unprocessable Entity",
      );
    });
  });

  describe("getSystemAccountTokens", () => {
    it("should retrieve tokens for a system account", async () => {
      const mockResponse = { tokens: [{ uuid: "tok-sa-1" }] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getSystemAccountTokens({ accountId: "sa-1" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/system-accounts/sa-1/tokens",
        { method: "GET", errorContext: "Get System Account Tokens" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode account ID with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getSystemAccountTokens({ accountId: "sa/v2 id" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/admin/system-accounts/sa%2Fv2%20id/tokens",
        { method: "GET", errorContext: "Get System Account Tokens" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Get System Account Tokens Failed - status: 404 Not Found"),
      );

      await expect(
        api.getSystemAccountTokens({ accountId: "missing" }),
      ).rejects.toThrow("Get System Account Tokens Failed - status: 404 Not Found");
    });
  });

  describe("handlers", () => {
    it("should expose all 41 handler keys with correct names", () => {
      const handlers = api.handlers;
      const expectedKeys = [
        "getMetrics",
        "getTeamMetrics",
        "listSecrets",
        "getSecret",
        "createSecret",
        "updateSecret",
        "deleteSecret",
        "getCurrentUser",
        "listTokens",
        "regenerateToken",
        "getUserPreferences",
        "getSystemPreferences",
        "getAuditLog",
        "listAdminUsers",
        "getAdminUser",
        "createAdminUser",
        "updateAdminUser",
        "deleteAdminUser",
        "inviteUsers",
        "setUserRoles",
        "addRoleToUser",
        "removeRoleFromUser",
        "listAdminTeams",
        "getAdminTeam",
        "createAdminTeam",
        "updateAdminTeam",
        "deleteAdminTeam",
        "listTeamUsers",
        "getTeamUser",
        "setTeamUsers",
        "patchTeamUsers",
        "removeUserFromTeam",
        "listAdminRoles",
        "getAdminRole",
        "createAdminRole",
        "updateAdminRole",
        "deleteAdminRole",
        "resetAdminRoles",
        "listAdminPermissions",
        "createSystemAccount",
        "getSystemAccountTokens",
      ];
      expect(Object.keys(handlers)).toEqual(expectedKeys);
    });

    it("should bind handlers to the api instance", async () => {
      mockHttp.fetch.mockResolvedValueOnce({ pacticipants: 5 });
      const { getMetrics } = api.handlers;
      await getMetrics();
      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/metrics",
        { method: "GET", errorContext: "Get Metrics" },
      );
    });
  });
});
