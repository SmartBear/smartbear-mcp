import { describe, it, expect, beforeEach } from "vitest";
import { EnvironmentApi } from "./environment-api";
import { createMockHttpClient } from "./test-helpers";
import { ToolError } from "../../common/tools";

describe("EnvironmentApi", () => {
  let api: EnvironmentApi;
  let mockHttp: ReturnType<typeof createMockHttpClient>;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    api = new EnvironmentApi(mockHttp);
  });

  describe("listEnvironments", () => {
    it("should retrieve all environments", async () => {
      const mockResponse = { environments: [{ uuid: "abc", name: "production" }] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.listEnvironments();

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/environments",
        { method: "GET", errorContext: "List Environments" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(new ToolError("List Environments Failed - status: 401 Unauthorized"));

      await expect(api.listEnvironments()).rejects.toThrow(
        "List Environments Failed - status: 401 Unauthorized",
      );
    });
  });

  describe("getEnvironment", () => {
    it("should retrieve an environment by UUID", async () => {
      const mockResponse = { uuid: "abc-123", name: "production" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getEnvironment({ environmentId: "abc-123" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/environments/abc-123",
        { method: "GET", errorContext: "Get Environment" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode the environmentId", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getEnvironment({ environmentId: "my env/id" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/environments/my%20env%2Fid",
        { method: "GET", errorContext: "Get Environment" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(new ToolError("Get Environment Failed - status: 404 Not Found"));

      await expect(api.getEnvironment({ environmentId: "missing" })).rejects.toThrow(
        "Get Environment Failed - status: 404 Not Found",
      );
    });
  });

  describe("recordDeployment", () => {
    it("should record a deployment without applicationInstance", async () => {
      const mockResponse = { uuid: "deploy-1" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.recordDeployment({
        pacticipantName: "ServiceA",
        versionNumber: "1.0.0",
        environmentId: "env-uuid",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/ServiceA/versions/1.0.0/deployed-versions/environment/env-uuid",
        { method: "POST", body: {}, errorContext: "Record Deployment" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should include applicationInstance when provided", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.recordDeployment({
        pacticipantName: "ServiceA",
        versionNumber: "1.0.0",
        environmentId: "env-uuid",
        applicationInstance: "blue",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/ServiceA/versions/1.0.0/deployed-versions/environment/env-uuid",
        { method: "POST", body: { applicationInstance: "blue" }, errorContext: "Record Deployment" },
      );
    });

    it("should URL-encode path params with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.recordDeployment({
        pacticipantName: "Service A/B",
        versionNumber: "1.0.0+build",
        environmentId: "env uuid",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/Service%20A%2FB/versions/1.0.0%2Bbuild/deployed-versions/environment/env%20uuid",
        { method: "POST", body: {}, errorContext: "Record Deployment" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(new ToolError("Record Deployment Failed - status: 422"));

      await expect(
        api.recordDeployment({ pacticipantName: "S", versionNumber: "1", environmentId: "e" }),
      ).rejects.toThrow("Record Deployment Failed - status: 422");
    });
  });

  describe("getCurrentlyDeployed", () => {
    it("should retrieve currently deployed versions for an environment", async () => {
      const mockResponse = { deployedVersions: [] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getCurrentlyDeployed({ environmentId: "env-uuid" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/environments/env-uuid/deployed-versions/currently-deployed",
        { method: "GET", errorContext: "Get Currently Deployed" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode the environmentId", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getCurrentlyDeployed({ environmentId: "env id/1" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/environments/env%20id%2F1/deployed-versions/currently-deployed",
        { method: "GET", errorContext: "Get Currently Deployed" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(new ToolError("Get Currently Deployed Failed - status: 404 Not Found"));

      await expect(api.getCurrentlyDeployed({ environmentId: "bad" })).rejects.toThrow(
        "Get Currently Deployed Failed - status: 404 Not Found",
      );
    });
  });

  describe("recordRelease", () => {
    it("should record a release", async () => {
      const mockResponse = { uuid: "release-1" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.recordRelease({
        pacticipantName: "MobileApp",
        versionNumber: "2.0.0",
        environmentId: "prod-uuid",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/MobileApp/versions/2.0.0/released-versions/environment/prod-uuid",
        { method: "POST", body: {}, errorContext: "Record Release" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode path params with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.recordRelease({
        pacticipantName: "App/v2",
        versionNumber: "1.0+rc1",
        environmentId: "env 1",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/App%2Fv2/versions/1.0%2Brc1/released-versions/environment/env%201",
        { method: "POST", body: {}, errorContext: "Record Release" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(new ToolError("Record Release Failed - status: 422"));

      await expect(
        api.recordRelease({ pacticipantName: "S", versionNumber: "1", environmentId: "e" }),
      ).rejects.toThrow("Record Release Failed - status: 422");
    });
  });

  describe("getCurrentlySupported", () => {
    it("should retrieve currently supported versions for an environment", async () => {
      const mockResponse = { releasedVersions: [] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getCurrentlySupported({ environmentId: "prod-uuid" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/environments/prod-uuid/released-versions/currently-supported",
        { method: "GET", errorContext: "Get Currently Supported" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode the environmentId", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getCurrentlySupported({ environmentId: "prod env/1" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/environments/prod%20env%2F1/released-versions/currently-supported",
        { method: "GET", errorContext: "Get Currently Supported" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(new ToolError("Get Currently Supported Failed - status: 404 Not Found"));

      await expect(api.getCurrentlySupported({ environmentId: "bad" })).rejects.toThrow(
        "Get Currently Supported Failed - status: 404 Not Found",
      );
    });
  });

  describe("createEnvironment", () => {
    it("should create an environment", async () => {
      const mockResponse = { uuid: "new-env-uuid", name: "staging" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.createEnvironment({
        name: "staging",
        production: false,
        displayName: "Staging",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/environments",
        {
          method: "POST",
          body: { name: "staging", production: false, displayName: "Staging" },
          errorContext: "Create Environment",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(new ToolError("Create Environment Failed - status: 409 Conflict"));

      await expect(
        api.createEnvironment({ name: "staging", production: false }),
      ).rejects.toThrow("Create Environment Failed - status: 409 Conflict");
    });
  });

  describe("updateEnvironment", () => {
    it("should update an environment", async () => {
      const mockResponse = { uuid: "env-uuid", name: "staging-updated" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.updateEnvironment({
        environmentId: "env-uuid",
        name: "staging-updated",
        production: false,
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/environments/env-uuid",
        {
          method: "PUT",
          body: { name: "staging-updated", production: false },
          errorContext: "Update Environment",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode the environmentId", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.updateEnvironment({
        environmentId: "env id/1",
        name: "env",
        production: false,
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/environments/env%20id%2F1",
        expect.objectContaining({ method: "PUT" }),
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(new ToolError("Update Environment Failed - status: 404 Not Found"));

      await expect(
        api.updateEnvironment({ environmentId: "bad", name: "x", production: false }),
      ).rejects.toThrow("Update Environment Failed - status: 404 Not Found");
    });
  });

  describe("deleteEnvironment", () => {
    it("should delete an environment", async () => {
      mockHttp.fetch.mockResolvedValueOnce(undefined);

      await api.deleteEnvironment({ environmentId: "env-uuid" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/environments/env-uuid",
        { method: "DELETE", errorContext: "Delete Environment" },
      );
    });

    it("should URL-encode the environmentId", async () => {
      mockHttp.fetch.mockResolvedValueOnce(undefined);

      await api.deleteEnvironment({ environmentId: "my env/id" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/environments/my%20env%2Fid",
        { method: "DELETE", errorContext: "Delete Environment" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(new ToolError("Delete Environment Failed - status: 404 Not Found"));

      await expect(api.deleteEnvironment({ environmentId: "missing" })).rejects.toThrow(
        "Delete Environment Failed - status: 404 Not Found",
      );
    });
  });

  describe("getDeployedVersions", () => {
    it("should retrieve deployed versions for a pacticipant version and environment", async () => {
      const mockResponse = { deployedVersions: [] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getDeployedVersions({
        pacticipantName: "ServiceA",
        versionNumber: "1.0.0",
        environmentId: "env-uuid",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/ServiceA/versions/1.0.0/deployed-versions/environment/env-uuid",
        { method: "GET", errorContext: "Get Deployed Versions" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode path params with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getDeployedVersions({
        pacticipantName: "Service A/B",
        versionNumber: "1.0+rc",
        environmentId: "env 1",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/Service%20A%2FB/versions/1.0%2Brc/deployed-versions/environment/env%201",
        { method: "GET", errorContext: "Get Deployed Versions" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(new ToolError("Get Deployed Versions Failed - status: 404"));

      await expect(
        api.getDeployedVersions({ pacticipantName: "S", versionNumber: "1", environmentId: "e" }),
      ).rejects.toThrow("Get Deployed Versions Failed - status: 404");
    });
  });

  describe("getReleasedVersions", () => {
    it("should retrieve released versions for a pacticipant version and environment", async () => {
      const mockResponse = { releasedVersions: [] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getReleasedVersions({
        pacticipantName: "MobileApp",
        versionNumber: "2.0.0",
        environmentId: "prod-uuid",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/MobileApp/versions/2.0.0/released-versions/environment/prod-uuid",
        { method: "GET", errorContext: "Get Released Versions" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode path params with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getReleasedVersions({
        pacticipantName: "App/v2",
        versionNumber: "1.0+rc",
        environmentId: "env 1",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/App%2Fv2/versions/1.0%2Brc/released-versions/environment/env%201",
        { method: "GET", errorContext: "Get Released Versions" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(new ToolError("Get Released Versions Failed - status: 404"));

      await expect(
        api.getReleasedVersions({ pacticipantName: "S", versionNumber: "1", environmentId: "e" }),
      ).rejects.toThrow("Get Released Versions Failed - status: 404");
    });
  });

  describe("handlers", () => {
    it("should expose all 11 handler keys", () => {
      const keys = Object.keys(api.handlers);
      expect(keys).toContain("listEnvironments");
      expect(keys).toContain("getEnvironment");
      expect(keys).toContain("recordDeployment");
      expect(keys).toContain("getCurrentlyDeployed");
      expect(keys).toContain("recordRelease");
      expect(keys).toContain("getCurrentlySupported");
      expect(keys).toContain("createEnvironment");
      expect(keys).toContain("updateEnvironment");
      expect(keys).toContain("deleteEnvironment");
      expect(keys).toContain("getDeployedVersions");
      expect(keys).toContain("getReleasedVersions");
      expect(keys).toHaveLength(11);
    });
  });
});
