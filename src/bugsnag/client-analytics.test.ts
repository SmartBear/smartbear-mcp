import { describe, expect, it } from "vitest";
import {
  analyticsIdFromEmail,
  analyticsIdFromUserId,
  resolveClientIdentity,
} from "../common/analytics";
import { requestContextStorage } from "../common/request-context";
import { BugsnagClient } from "./client";

const b64 = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");
const jwt = (payload: unknown) => `${b64({ alg: "none" })}.${b64(payload)}.sig`;

function withHeaders<T>(
  headers: Record<string, string | undefined>,
  fn: () => T,
): T {
  return requestContextStorage.run({ headers }, fn);
}

describe("BugsnagClient analytics declaration", () => {
  const client = new BugsnagClient();

  it("declares the registered app_name and the user id claim", () => {
    expect(client.analytics).toEqual({ appName: "BugSnag", userId: ["sub"] });
  });

  it("identifies the user from sub in a token issued by BugSnag's OAuth server", () => {
    const token = jwt({
      iss: "https://oauth.bugsnag.smartbear.com",
      scope: "",
      sub: "5f1e2d3c4b5a69788796a5b4",
      iat: 1,
      exp: 2,
    });

    expect(
      withHeaders({ authorization: `Bearer ${token}` }, () =>
        resolveClientIdentity(client),
      ),
    ).toEqual({
      analytics_id: analyticsIdFromUserId(
        "bugsnag",
        "5f1e2d3c4b5a69788796a5b4",
      ),
      organization: undefined,
      app_name: "BugSnag",
    });
  });

  it("switches to the SmartBear formula as soon as the token carries an email", () => {
    const token = jwt({
      sub: "5f1e2d3c4b5a69788796a5b4",
      email: "User@Example.com",
    });

    expect(
      withHeaders({ authorization: `Bearer ${token}` }, () =>
        resolveClientIdentity(client),
      ).analytics_id,
    ).toBe(analyticsIdFromEmail("user@example.com"));
  });

  it("is anonymous with a personal access token or outside a request", () => {
    const anonymous = {
      analytics_id: undefined,
      organization: undefined,
      app_name: "BugSnag",
    };
    expect(
      withHeaders({ "Bugsnag-Auth-Token": "pat" }, () =>
        resolveClientIdentity(client),
      ),
    ).toEqual(anonymous);
    expect(resolveClientIdentity(client)).toEqual(anonymous);
  });
});
