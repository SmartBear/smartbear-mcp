import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { CollaboratorClient } from "../../../collaborator/client";

const fetchMock = createFetchMock(vi);

// Helper to create and configure a client
async function createConfiguredClient(
  baseUrl = "https://collab.example.com",
  username = "admin",
  loginTicket = "ticket123",
): Promise<CollaboratorClient> {
  const client = new CollaboratorClient();
  await client.configure({} as any, {
    base_url: baseUrl,
    username: username,
    login_ticket: loginTicket,
  });
  return client;
}

describe("CollaboratorClient", () => {
  let client: CollaboratorClient;

  beforeEach(async () => {
    vi.clearAllMocks();
    fetchMock.enableMocks();
    fetchMock.resetMocks();
    client = await createConfiguredClient();
  });

  afterEach(() => {
    fetchMock.disableMocks();
  });

  describe("configure", () => {
    it("sets baseUrl, username, and loginTicket", async () => {
      const newClient = new CollaboratorClient();
      const result = await newClient.configure({} as any, {
        base_url: "https://collab.example.com",
        username: "admin",
        login_ticket: "ticket123",
      });
      expect(result).toBe(undefined);
      expect(newClient.isConfigured()).toBe(true);
      expect(newClient).toBeInstanceOf(CollaboratorClient);
    });

    it("has correct client properties", () => {
      expect(client.name).toBe("Collaborator");
      expect(client.toolPrefix).toBe("collaborator");
      expect(client.configPrefix).toBe("Collaborator");
    });
  });

  describe("call", () => {
    it("prepends authentication and sends correct payload", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ result: "ok" }));
      const commands = [
        { command: "ReviewService.findReviewById", args: { reviewId: "1" } },
      ];
      await client.call(commands);
      const requestBody = fetchMock.mock.calls[0]?.[1]?.body;
      expect(requestBody).toBeDefined();
      const body = JSON.parse(requestBody as string);
      expect(body[0].command).toBe("SessionService.authenticate");
      expect(body[0].args).toEqual({ login: "admin", ticket: "ticket123" });
      expect(body[1].command).toBe("ReviewService.findReviewById");
      expect(body[1].args).toEqual({ reviewId: "1" });
    });

    it("throws error on non-OK response", async () => {
      fetchMock.mockResponseOnce("Unauthorized", { status: 401 });
      await expect(
        client.call([
          { command: "ReviewService.findReviewById", args: { reviewId: "1" } },
        ]),
      ).rejects.toThrow("Collaborator API call failed: 401 - Unauthorized");
    });
  });

  describe("registerTools", () => {
    const mockRegister = vi.fn();
    const mockGetInput = vi.fn();
    beforeEach(() => {
      mockRegister.mockClear();
    });

    it("registers all expected tools", () => {
      client.registerTools(mockRegister, mockGetInput);
      const titles = mockRegister.mock.calls.map((call) => call[0].title);
      expect(titles).toContain("Find Collaborator Review By ID");
      expect(titles).toContain("Create Collaborator Review");
      expect(titles).toContain("Reject Collaborator Review");
      expect(titles).toContain("Get Collaborator Reviews");
      expect(titles).toContain(
        "Create Collaborator Remote System Configuration",
      );
      expect(titles).toContain("Edit Collaborator Remote System Configuration");
      expect(titles).toContain(
        "Delete Collaborator Remote System Configuration",
      );
      expect(titles).toContain(
        "Update Collaborator Remote System Configuration Webhook",
      );
      expect(titles).toContain(
        "Test Collaborator Remote System Configuration Connection",
      );
    });
  });

  describe("tool handlers", () => {
    beforeEach(async () => {
      client = await createConfiguredClient();
      fetchMock.resetMocks();
    });

    it("findReviewById handler calls API and returns result", async () => {
      fetchMock.mockResponseOnce(
        JSON.stringify({ reviewId: "1", status: "open" }),
      );
      const result = await client.call([
        { command: "ReviewService.findReviewById", args: { reviewId: "1" } },
      ]);
      expect(result.reviewId).toBe("1");
      expect(result.status).toBe("open");
    });

    it("createReview handler calls API and returns result", async () => {
      fetchMock.mockResponseOnce(
        JSON.stringify({ reviewId: "2", status: "created" }),
      );
      const result = await client.call([
        {
          command: "ReviewService.createReview",
          args: { title: "Test Review" },
        },
      ]);
      expect(result.reviewId).toBe("2");
      expect(result.status).toBe("created");
    });

    it("rejectReview handler calls API and returns result", async () => {
      fetchMock.mockResponseOnce(
        JSON.stringify({ reviewId: "3", status: "rejected" }),
      );
      const result = await client.call([
        {
          command: "ReviewService.reject",
          args: { reviewId: "3", reason: "Not needed" },
        },
      ]);
      expect(result.reviewId).toBe("3");
      expect(result.status).toBe("rejected");
    });

    it("createIntegration handler calls API and returns result", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ id: 10, status: "created" }));
      const result = await client.call([
        {
          command: "AdminRemoteSystemService.createIntegration",
          args: { token: "GITHUB", title: "Test", config: "{}" },
        },
      ]);
      expect(result.id).toBe(10);
      expect(result.status).toBe("created");
    });

    it("editIntegration handler calls API and returns result", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ id: 10, status: "edited" }));
      const result = await client.call([
        {
          command: "AdminRemoteSystemService.editIntegration",
          args: { id: 10, title: "Updated" },
        },
      ]);
      expect(result.id).toBe(10);
      expect(result.status).toBe("edited");
    });

    it("deleteIntegration handler calls API and returns result", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ id: 10, status: "deleted" }));
      const result = await client.call([
        {
          command: "AdminRemoteSystemService.deleteIntegration",
          args: { id: 10 },
        },
      ]);
      expect(result.id).toBe(10);
      expect(result.status).toBe("deleted");
    });
  });
});
