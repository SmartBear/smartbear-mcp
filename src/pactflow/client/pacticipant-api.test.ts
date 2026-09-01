import { beforeEach, describe, expect, it } from "vitest";
import { ToolError } from "../../common/tools";
import { PacticipantApi } from "./pacticipant-api";
import { createMockHttpClient } from "./test-helpers";

describe("PacticipantApi", () => {
  let api: PacticipantApi;
  let mockHttp: ReturnType<typeof createMockHttpClient>;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    api = new PacticipantApi(mockHttp);
  });

  describe("listPacticipants", () => {
    it("should retrieve pacticipants without params", async () => {
      const mockResponse = { pacticipants: [{ name: "ServiceA" }] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.listPacticipants();

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants",
        { method: "GET", errorContext: "List Pacticipants" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should append pagination query params", async () => {
      mockHttp.fetch.mockResolvedValueOnce({ pacticipants: [] });

      await api.listPacticipants({ pageNumber: 2, pageSize: 10 });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants?page=2&size=10",
        { method: "GET", errorContext: "List Pacticipants" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("List Pacticipants Failed - status: 401 Unauthorized"),
      );

      await expect(api.listPacticipants()).rejects.toThrow(
        "List Pacticipants Failed - status: 401 Unauthorized",
      );
    });
  });

  describe("getPacticipant", () => {
    it("should retrieve a pacticipant by name", async () => {
      const mockResponse = { name: "ServiceA", mainBranch: "main" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getPacticipant({ pacticipantName: "ServiceA" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/ServiceA",
        { method: "GET", errorContext: "Get Pacticipant" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode the pacticipant name", async () => {
      mockHttp.fetch.mockResolvedValueOnce({ name: "Service A/B" });

      await api.getPacticipant({ pacticipantName: "Service A/B" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/Service%20A%2FB",
        { method: "GET", errorContext: "Get Pacticipant" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Get Pacticipant Failed - status: 404 Not Found"),
      );

      await expect(
        api.getPacticipant({ pacticipantName: "Unknown" }),
      ).rejects.toThrow("Get Pacticipant Failed - status: 404 Not Found");
    });
  });

  describe("listBranches", () => {
    it("should retrieve branches for a pacticipant", async () => {
      const mockResponse = { branches: [{ name: "main" }] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.listBranches({ pacticipantName: "ServiceA" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/ServiceA/branches",
        { method: "GET", errorContext: "List Branches" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should append filter and pagination query params", async () => {
      mockHttp.fetch.mockResolvedValueOnce({ branches: [] });

      await api.listBranches({
        pacticipantName: "ServiceA",
        q: "feat",
        pageNumber: 1,
        pageSize: 20,
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/ServiceA/branches?q=feat&pageNumber=1&pageSize=20",
        { method: "GET", errorContext: "List Branches" },
      );
    });

    it("should URL-encode pacticipant name", async () => {
      mockHttp.fetch.mockResolvedValueOnce({ branches: [] });

      await api.listBranches({ pacticipantName: "Service A/B" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/Service%20A%2FB/branches",
        { method: "GET", errorContext: "List Branches" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("List Branches Failed"),
      );

      await expect(
        api.listBranches({ pacticipantName: "ServiceA" }),
      ).rejects.toThrow("List Branches Failed");
    });
  });

  describe("listVersions", () => {
    it("should retrieve versions for a pacticipant", async () => {
      const mockResponse = { versions: [{ number: "1.0.0" }] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.listVersions({ pacticipantName: "ServiceA" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/ServiceA/versions",
        { method: "GET", errorContext: "List Versions" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should append pagination query params", async () => {
      mockHttp.fetch.mockResolvedValueOnce({ versions: [] });

      await api.listVersions({
        pacticipantName: "ServiceA",
        pageNumber: 2,
        pageSize: 50,
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/ServiceA/versions?page=2&size=50",
        { method: "GET", errorContext: "List Versions" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("List Versions Failed"),
      );

      await expect(
        api.listVersions({ pacticipantName: "ServiceA" }),
      ).rejects.toThrow("List Versions Failed");
    });
  });

  describe("getVersion", () => {
    it("should retrieve a specific version", async () => {
      const mockResponse = { number: "1.0.0", branch: "main" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getVersion({
        pacticipantName: "ServiceA",
        versionNumber: "1.0.0",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/ServiceA/versions/1.0.0",
        { method: "GET", errorContext: "Get Version" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode version number with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getVersion({
        pacticipantName: "ServiceA",
        versionNumber: "1.0.0-beta+build.1",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/ServiceA/versions/1.0.0-beta%2Bbuild.1",
        { method: "GET", errorContext: "Get Version" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(new ToolError("Get Version Failed"));

      await expect(
        api.getVersion({ pacticipantName: "ServiceA", versionNumber: "1.0.0" }),
      ).rejects.toThrow("Get Version Failed");
    });
  });

  describe("getLatestVersion", () => {
    it("should retrieve the latest version without tag", async () => {
      const mockResponse = { number: "2.0.0" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getLatestVersion({
        pacticipantName: "ServiceA",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/ServiceA/latest-version",
        { method: "GET", errorContext: "Get Latest Version" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should retrieve the latest version filtered by tag", async () => {
      mockHttp.fetch.mockResolvedValueOnce({ number: "1.5.0" });

      await api.getLatestVersion({ pacticipantName: "ServiceA", tag: "prod" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/ServiceA/latest-version/prod",
        { method: "GET", errorContext: "Get Latest Version" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Get Latest Version Failed"),
      );

      await expect(
        api.getLatestVersion({ pacticipantName: "ServiceA" }),
      ).rejects.toThrow("Get Latest Version Failed");
    });
  });

  describe("updatePacticipant", () => {
    it("should send a PUT request to update pacticipant metadata", async () => {
      const mockResponse = { name: "ServiceA", mainBranch: "main" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.updatePacticipant({
        pacticipantName: "ServiceA",
        mainBranch: "main",
        displayName: "Service A",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/ServiceA",
        {
          method: "PUT",
          body: { mainBranch: "main", displayName: "Service A" },
          errorContext: "Update Pacticipant",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Update Pacticipant Failed"),
      );

      await expect(
        api.updatePacticipant({ pacticipantName: "ServiceA" }),
      ).rejects.toThrow("Update Pacticipant Failed");
    });
  });

  describe("patchPacticipant", () => {
    it("should send a PATCH request to partially update pacticipant metadata", async () => {
      const mockResponse = { name: "ServiceA", mainBranch: "develop" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.patchPacticipant({
        pacticipantName: "ServiceA",
        mainBranch: "develop",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/ServiceA",
        {
          method: "PATCH",
          body: { mainBranch: "develop" },
          errorContext: "Patch Pacticipant",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Patch Pacticipant Failed"),
      );

      await expect(
        api.patchPacticipant({ pacticipantName: "ServiceA" }),
      ).rejects.toThrow("Patch Pacticipant Failed");
    });
  });

  describe("updateVersion", () => {
    it("should send a PUT request to update a version's build URL", async () => {
      const mockResponse = { number: "1.0.0", buildUrl: "https://ci.com/1" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.updateVersion({
        pacticipantName: "ServiceA",
        versionNumber: "1.0.0",
        buildUrl: "https://ci.com/1",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/ServiceA/versions/1.0.0",
        {
          method: "PUT",
          body: { buildUrl: "https://ci.com/1" },
          errorContext: "Update Version",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Update Version Failed"),
      );

      await expect(
        api.updateVersion({
          pacticipantName: "ServiceA",
          versionNumber: "1.0.0",
        }),
      ).rejects.toThrow("Update Version Failed");
    });
  });

  describe("getBranchVersions", () => {
    it("should retrieve all versions for a branch", async () => {
      const mockResponse = { versions: [{ number: "1.0.0" }] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getBranchVersions({
        pacticipantName: "ServiceA",
        branchName: "main",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/ServiceA/branches/main/versions",
        { method: "GET", errorContext: "Get Branch Versions" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should append pagination params", async () => {
      mockHttp.fetch.mockResolvedValueOnce({ versions: [] });

      await api.getBranchVersions({
        pacticipantName: "ServiceA",
        branchName: "main",
        pageNumber: 2,
        pageSize: 25,
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/ServiceA/branches/main/versions?page=2&size=25",
        { method: "GET", errorContext: "Get Branch Versions" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Get Branch Versions Failed"),
      );

      await expect(
        api.getBranchVersions({
          pacticipantName: "ServiceA",
          branchName: "main",
        }),
      ).rejects.toThrow("Get Branch Versions Failed");
    });
  });

  describe("createPacticipant", () => {
    it("should create a new pacticipant", async () => {
      const mockResponse = { name: "NewService", displayName: "New Service" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.createPacticipant({
        name: "NewService",
        displayName: "New Service",
        mainBranch: "main",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants",
        {
          method: "POST",
          body: {
            name: "NewService",
            displayName: "New Service",
            mainBranch: "main",
          },
          errorContext: "Create Pacticipant",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Create Pacticipant Failed"),
      );

      await expect(
        api.createPacticipant({ name: "NewService" }),
      ).rejects.toThrow("Create Pacticipant Failed");
    });
  });

  describe("deletePacticipant", () => {
    it("should delete a pacticipant", async () => {
      mockHttp.fetch.mockResolvedValueOnce(undefined);

      await api.deletePacticipant({ pacticipantName: "OldService" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/OldService",
        { method: "DELETE", errorContext: "Delete Pacticipant" },
      );
    });

    it("should URL-encode pacticipant names with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce(undefined);

      await api.deletePacticipant({ pacticipantName: "My Service/v2" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/My%20Service%2Fv2",
        { method: "DELETE", errorContext: "Delete Pacticipant" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Delete Pacticipant Failed"),
      );

      await expect(
        api.deletePacticipant({ pacticipantName: "OldService" }),
      ).rejects.toThrow("Delete Pacticipant Failed");
    });
  });

  describe("getBranch", () => {
    it("should retrieve a specific branch", async () => {
      const mockResponse = { name: "main", pacticipant: { name: "ServiceA" } };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getBranch({
        pacticipantName: "ServiceA",
        branchName: "main",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/ServiceA/branches/main",
        { method: "GET", errorContext: "Get Branch" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode branch name with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getBranch({
        pacticipantName: "ServiceA",
        branchName: "feature/my branch",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/ServiceA/branches/feature%2Fmy%20branch",
        { method: "GET", errorContext: "Get Branch" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Get Branch Failed - status: 404 Not Found"),
      );

      await expect(
        api.getBranch({ pacticipantName: "ServiceA", branchName: "missing" }),
      ).rejects.toThrow("Get Branch Failed - status: 404 Not Found");
    });
  });

  describe("deleteBranch", () => {
    it("should delete a branch", async () => {
      mockHttp.fetch.mockResolvedValueOnce(undefined);

      await api.deleteBranch({
        pacticipantName: "ServiceA",
        branchName: "old-feature",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/ServiceA/branches/old-feature",
        { method: "DELETE", errorContext: "Delete Branch" },
      );
    });

    it("should URL-encode branch name with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce(undefined);

      await api.deleteBranch({
        pacticipantName: "ServiceA",
        branchName: "feature/old branch",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/ServiceA/branches/feature%2Fold%20branch",
        { method: "DELETE", errorContext: "Delete Branch" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Delete Branch Failed"),
      );

      await expect(
        api.deleteBranch({
          pacticipantName: "ServiceA",
          branchName: "old-feature",
        }),
      ).rejects.toThrow("Delete Branch Failed");
    });
  });

  describe("addLabel", () => {
    it("should apply a label to a pacticipant", async () => {
      const mockResponse = {
        name: "mobile",
        pacticipant: { name: "ConsumerApp" },
      };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.addLabel({
        pacticipantName: "ConsumerApp",
        labelName: "mobile",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/ConsumerApp/labels/mobile",
        { method: "PUT", body: {}, errorContext: "Add Label" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode label names with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.addLabel({
        pacticipantName: "ServiceA",
        labelName: "team/alpha",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/ServiceA/labels/team%2Falpha",
        { method: "PUT", body: {}, errorContext: "Add Label" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(new ToolError("Add Label Failed"));

      await expect(
        api.addLabel({ pacticipantName: "ServiceA", labelName: "mobile" }),
      ).rejects.toThrow("Add Label Failed");
    });
  });

  describe("removeLabel", () => {
    it("should remove a label from a pacticipant", async () => {
      mockHttp.fetch.mockResolvedValueOnce(undefined);

      await api.removeLabel({
        pacticipantName: "ConsumerApp",
        labelName: "mobile",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/ConsumerApp/labels/mobile",
        { method: "DELETE", errorContext: "Remove Label" },
      );
    });

    it("should URL-encode label names with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce(undefined);

      await api.removeLabel({
        pacticipantName: "ServiceA",
        labelName: "team/alpha",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/ServiceA/labels/team%2Falpha",
        { method: "DELETE", errorContext: "Remove Label" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Remove Label Failed"),
      );

      await expect(
        api.removeLabel({ pacticipantName: "ServiceA", labelName: "mobile" }),
      ).rejects.toThrow("Remove Label Failed");
    });
  });

  describe("listLabels", () => {
    it("should retrieve all labels without params", async () => {
      const mockResponse = { labels: [{ name: "team-a" }] };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.listLabels();

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/labels",
        { method: "GET", errorContext: "List Labels" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should append pagination query params", async () => {
      mockHttp.fetch.mockResolvedValueOnce({ labels: [] });

      await api.listLabels({ pageNumber: 1, pageSize: 10 });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/labels?page=1&size=10",
        { method: "GET", errorContext: "List Labels" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(new ToolError("List Labels Failed"));

      await expect(api.listLabels()).rejects.toThrow("List Labels Failed");
    });
  });

  describe("getPacticipantLabel", () => {
    it("should retrieve a specific label for a pacticipant", async () => {
      const mockResponse = { name: "team-a" };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.getPacticipantLabel({
        pacticipantName: "ServiceA",
        labelName: "team-a",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/ServiceA/labels/team-a",
        { method: "GET", errorContext: "Get Pacticipant Label" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode names with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce({});

      await api.getPacticipantLabel({
        pacticipantName: "Service A/B",
        labelName: "team/alpha",
      });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/Service%20A%2FB/labels/team%2Falpha",
        { method: "GET", errorContext: "Get Pacticipant Label" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("Get Pacticipant Label Failed - status: 404 Not Found"),
      );

      await expect(
        api.getPacticipantLabel({
          pacticipantName: "ServiceA",
          labelName: "missing-label",
        }),
      ).rejects.toThrow("Get Pacticipant Label Failed - status: 404 Not Found");
    });
  });

  describe("listPacticipantsByLabel", () => {
    it("should retrieve pacticipants with a given label", async () => {
      const mockResponse = {
        pacticipants: [{ name: "ServiceA" }, { name: "ServiceB" }],
      };
      mockHttp.fetch.mockResolvedValueOnce(mockResponse);

      const result = await api.listPacticipantsByLabel({ labelName: "team-a" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/label/team-a",
        { method: "GET", errorContext: "List Pacticipants by Label" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should URL-encode label names with special characters", async () => {
      mockHttp.fetch.mockResolvedValueOnce({ pacticipants: [] });

      await api.listPacticipantsByLabel({ labelName: "team/alpha" });

      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants/label/team%2Falpha",
        { method: "GET", errorContext: "List Pacticipants by Label" },
      );
    });

    it("should propagate HTTP errors", async () => {
      mockHttp.fetch.mockRejectedValueOnce(
        new ToolError("List Pacticipants by Label Failed"),
      );

      await expect(
        api.listPacticipantsByLabel({ labelName: "team-a" }),
      ).rejects.toThrow("List Pacticipants by Label Failed");
    });
  });

  describe("handlers", () => {
    it("should expose all 19 handler keys with correct names", () => {
      const handlers = api.handlers;
      const expectedKeys = [
        "listPacticipants",
        "getPacticipant",
        "listBranches",
        "listVersions",
        "getVersion",
        "getLatestVersion",
        "updatePacticipant",
        "patchPacticipant",
        "updateVersion",
        "getBranchVersions",
        "createPacticipant",
        "deletePacticipant",
        "getBranch",
        "deleteBranch",
        "addLabel",
        "removeLabel",
        "listLabels",
        "getPacticipantLabel",
        "listPacticipantsByLabel",
      ];
      expect(Object.keys(handlers)).toEqual(expectedKeys);
    });

    it("should bind handlers to the api instance", async () => {
      mockHttp.fetch.mockResolvedValueOnce({ pacticipants: [] });
      const { listPacticipants } = api.handlers;
      await listPacticipants();
      expect(mockHttp.fetch).toHaveBeenCalledWith(
        "https://test.example.com/pacticipants",
        { method: "GET", errorContext: "List Pacticipants" },
      );
    });
  });
});
