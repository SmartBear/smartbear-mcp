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

    it("getReviews handler calls API with minimal args and returns result", async () => {
      fetchMock.mockResponseOnce(
        JSON.stringify([{ reviewId: "1", status: "open" }]),
      );
      const result = await client.call([
        {
          command: "ReviewService.getReviews",
          args: {},
        },
      ]);
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].reviewId).toBe("1");
    });

    it("getReviews handler calls API with all optional args", async () => {
      fetchMock.mockResponseOnce(
        JSON.stringify([{ reviewId: "2", status: "closed" }]),
      );
      const args = {
        login: "user1",
        role: "AUTHOR",
        creator: true,
        reviewPhase: "PLANNING",
        fullInfo: true,
        fromDate: "2025-01-01",
        toDate: "2025-12-31",
      };
      const result = await client.call([
        {
          command: "ReviewService.getReviews",
          args,
        },
      ]);
      expect(result[0].reviewId).toBe("2");
      expect(result[0].status).toBe("closed");
    });

    it("getReviews handler handles API error", async () => {
      fetchMock.mockResponseOnce("Internal Server Error", { status: 500 });
      await expect(
        client.call([
          {
            command: "ReviewService.getReviews",
            args: {},
          },
        ]),
      ).rejects.toThrow();
    });

    it("updateWebhook handler calls API with id as number", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ id: 5, status: "updated" }));
      const result = await client.call([
        {
          command: "AdminRemoteSystemService.updateWebhook",
          args: { id: 5 },
        },
      ]);
      expect(result.id).toBe(5);
      expect(result.status).toBe("updated");
    });

    it("updateWebhook handler calls API with id as string", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ id: 6, status: "updated" }));
      const result = await client.call([
        {
          command: "AdminRemoteSystemService.updateWebhook",
          args: { id: "6" },
        },
      ]);
      expect(result.id).toBe(6);
      expect(result.status).toBe("updated");
    });

    it("updateWebhook handler handles API error", async () => {
      fetchMock.mockResponseOnce("Not Found", { status: 404 });
      await expect(
        client.call([
          {
            command: "AdminRemoteSystemService.updateWebhook",
            args: { id: 7 },
          },
        ]),
      ).rejects.toThrow();
    });

    it("testConnection handler calls API with id as number", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ id: 8, status: "ok" }));
      const result = await client.call([
        {
          command: "AdminRemoteSystemService.testConnection",
          args: { id: 8 },
        },
      ]);
      expect(result.id).toBe(8);
      expect(result.status).toBe("ok");
    });

    it("testConnection handler calls API with id as string", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ id: 9, status: "ok" }));
      const result = await client.call([
        {
          command: "AdminRemoteSystemService.testConnection",
          args: { id: "9" },
        },
      ]);
      expect(result.id).toBe(9);
      expect(result.status).toBe("ok");
    });

    it("testConnection handler handles API error", async () => {
      fetchMock.mockResponseOnce("Not Found", { status: 404 });
      await expect(
        client.call([
          {
            command: "AdminRemoteSystemService.testConnection",
            args: { id: 10 },
          },
        ]),
      ).rejects.toThrow();
    });
  });

  describe("tool handler direct invocation", () => {
    let handlers: Record<string, (args: any, extra: any) => Promise<any>> = {};
    const mockGetInput = vi.fn();
    beforeEach(() => {
      handlers = {};
      client.registerTools((def, fn) => {
        handlers[def.title] = fn;
      }, mockGetInput);
    });

    it("getReviews handler processes all arguments", async () => {
      const args = {
        login: "user1",
        role: "AUTHOR",
        creator: true,
        reviewPhase: "PLANNING",
        fullInfo: true,
        fromDate: "2025-01-01",
        toDate: "2025-12-31",
      };
      const fakeResult = [{ reviewId: "42", status: "closed" }];
      vi.spyOn(client, "call").mockResolvedValueOnce(fakeResult);
      const handler = handlers["Get Collaborator Reviews"];
      const result = await handler(args, {});
      expect(result.content[0].text).toContain("42");
      expect(result.content[0].text).toContain("closed");
    });

    it("getReviews handler handles missing args", async () => {
      const fakeResult = [{ reviewId: "43", status: "open" }];
      vi.spyOn(client, "call").mockResolvedValueOnce(fakeResult);
      const handler = handlers["Get Collaborator Reviews"];
      const result = await handler({}, {});
      expect(result.content[0].text).toContain("43");
      expect(result.content[0].text).toContain("open");
    });

    it("updateWebhook handler processes id as string", async () => {
      const fakeResult = { id: 99, status: "updated" };
      vi.spyOn(client, "call").mockResolvedValueOnce(fakeResult);
      const handler =
        handlers["Update Collaborator Remote System Configuration Webhook"];
      const result = await handler({ id: "99" }, {});
      expect(result.content[0].text).toContain("99");
      expect(result.content[0].text).toContain("updated");
    });

    it("testConnection handler processes id as number", async () => {
      const fakeResult = { id: 100, status: "ok" };
      vi.spyOn(client, "call").mockResolvedValueOnce(fakeResult);
      const handler =
        handlers["Test Collaborator Remote System Configuration Connection"];
      const result = await handler({ id: 100 }, {});
      expect(result.content[0].text).toContain("100");
      expect(result.content[0].text).toContain("ok");
    });

    it("getReviews handler propagates errors", async () => {
      vi.spyOn(client, "call").mockRejectedValueOnce(new Error("fail"));
      const handler = handlers["Get Collaborator Reviews"];
      await expect(handler({}, {})).rejects.toThrow("fail");
    });

    it("createIntegration handler processes all arguments", async () => {
      const fakeResult = { id: 101, status: "created" };
      vi.spyOn(client, "call").mockResolvedValueOnce(fakeResult);
      const handler =
        handlers["Create Collaborator Remote System Configuration"];
      const args = {
        token: "GITHUB",
        title: "Test",
        config: "{}",
        reviewTemplateId: "template1",
      };
      const result = await handler(args, {});
      expect(result.content[0].text).toContain("101");
      expect(result.content[0].text).toContain("created");
    });

    it("editIntegration handler processes all optional arguments", async () => {
      const fakeResult = { id: 102, status: "edited" };
      vi.spyOn(client, "call").mockResolvedValueOnce(fakeResult);
      const handler = handlers["Edit Collaborator Remote System Configuration"];
      const args = {
        id: "102",
        title: "Updated",
        config: "{}",
        reviewTemplateId: "template2",
      };
      const result = await handler(args, {});
      expect(result.content[0].text).toContain("102");
      expect(result.content[0].text).toContain("edited");
    });

    it("deleteIntegration handler processes id as string", async () => {
      const fakeResult = { id: 103, status: "deleted" };
      vi.spyOn(client, "call").mockResolvedValueOnce(fakeResult);
      const handler =
        handlers["Delete Collaborator Remote System Configuration"];
      const result = await handler({ id: "103" }, {});
      expect(result.content[0].text).toContain("103");
      expect(result.content[0].text).toContain("deleted");
    });

    it("rejectReview handler processes all arguments", async () => {
      const fakeResult = { reviewId: "104", status: "rejected" };
      vi.spyOn(client, "call").mockResolvedValueOnce(fakeResult);
      const handler = handlers["Reject Collaborator Review"];
      const args = { reviewId: "104", reason: "Not needed" };
      const result = await handler(args, {});
      expect(result.content[0].text).toContain("104");
      expect(result.content[0].text).toContain("rejected");
    });

    it("editIntegration handler propagates errors", async () => {
      vi.spyOn(client, "call").mockRejectedValueOnce(new Error("fail-edit"));
      const handler = handlers["Edit Collaborator Remote System Configuration"];
      await expect(handler({ id: "bad" }, {})).rejects.toThrow("fail-edit");
    });

    it("createIntegration handler propagates errors", async () => {
      vi.spyOn(client, "call").mockRejectedValueOnce(new Error("fail-create"));
      const handler =
        handlers["Create Collaborator Remote System Configuration"];
      await expect(
        handler({ token: "GITHUB", title: "Test", config: "{}" }, {}),
      ).rejects.toThrow("fail-create");
    });

    it("deleteIntegration handler propagates errors", async () => {
      vi.spyOn(client, "call").mockRejectedValueOnce(new Error("fail-delete"));
      const handler =
        handlers["Delete Collaborator Remote System Configuration"];
      await expect(handler({ id: "bad" }, {})).rejects.toThrow("fail-delete");
    });
  });
});
