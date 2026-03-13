import { beforeEach, describe, expect, it, vi } from "vitest";
import { CurrentUserAPI, ErrorAPI } from "../../../../bugsnag/client/api";
import { BugsnagClient } from "../../../../bugsnag/client.js";
import {
  getMockEvent,
  getMockOrganization,
  getMockProject,
} from "../utils/factories.js";

vi.mock("../../../../bugsnag/client/api");

describe("EventResource", () => {
  const mockCache = { get: vi.fn() };
  const registerResourcesSpy = vi.fn();

  async function createClient() {
    const client = new BugsnagClient();
    await client.configure({ getCache: () => mockCache as any } as any, {
      auth_token: "test-token",
    });

    client.registerResources(registerResourcesSpy);
    const resourceHandler = registerResourcesSpy.mock.calls.find(
      (call: any) => call[0] === "event",
    )?.[2];

    return { client, resourceHandler };
  }

  beforeEach(async () => {
    vi.clearAllMocks();

    const mockOrg = getMockOrganization("org-1", "Test Org", "test-org");

    vi.mocked(CurrentUserAPI.prototype).listUserOrganizations.mockResolvedValue(
      {
        status: 200,
        headers: new Headers(),
        body: [mockOrg],
      },
    );
  });

  it("should find event by ID across projects", async () => {
    const mockEvent = getMockEvent("event-1");
    const mockProjects = [getMockProject("proj-1", "Project 1")];

    mockCache.get.mockReturnValueOnce(mockProjects);
    vi.mocked(ErrorAPI.prototype).viewEventById.mockResolvedValue({
      status: 200,
      headers: new Headers(),
      body: mockEvent,
    });

    const { resourceHandler } = await createClient();

    const result = await resourceHandler(
      { href: "bugsnag://event/event-1" },
      { id: "event-1" },
    );

    expect(result.contents[0].uri).toBe("bugsnag://event/event-1");
    expect(result.contents[0].text).toBe(JSON.stringify(mockEvent));
  });
});
