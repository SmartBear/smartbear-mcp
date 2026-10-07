import { describe, expect, it } from "vitest";
import {
  decodeJwtClaims,
  firstClaim,
  getClaim,
  requestBearerClaims,
} from "./jwt";
import { requestContextStorage } from "./request-context";

const b64 = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");
const jwt = (payload: unknown) => `${b64({ alg: "none" })}.${b64(payload)}.sig`;

describe("decodeJwtClaims", () => {
  it("decodes the payload without verifying the signature", () => {
    expect(decodeJwtClaims(jwt({ sub: "auth0|123", email: "a@b.c" }))).toEqual({
      sub: "auth0|123",
      email: "a@b.c",
    });
  });

  it("tolerates surrounding whitespace", () => {
    expect(decodeJwtClaims(`  ${jwt({ sub: "x" })}\n`)).toEqual({ sub: "x" });
  });

  it("returns undefined for opaque tokens and malformed input", () => {
    for (const token of [
      "a-personal-access-token",
      "a.b",
      "a..c",
      "",
      undefined,
      null,
    ]) {
      expect(decodeJwtClaims(token)).toBeUndefined();
    }
  });

  it("returns undefined when the payload is not a JSON object", () => {
    expect(decodeJwtClaims(`h.${b64("just a string")}.s`)).toBeUndefined();
    expect(decodeJwtClaims(`h.${b64([1, 2])}.s`)).toBeUndefined();
    expect(
      decodeJwtClaims(`h.${Buffer.from("{not json").toString("base64url")}.s`),
    ).toBeUndefined();
  });
});

describe("requestBearerClaims", () => {
  const run = <T>(authorization: string | string[] | undefined, fn: () => T) =>
    requestContextStorage.run({ headers: { authorization } }, fn);

  it("reads the Authorization bearer token from the request context", () => {
    expect(run(`Bearer ${jwt({ sub: "x" })}`, requestBearerClaims)).toEqual({
      sub: "x",
    });
  });

  it("accepts a header without the Bearer prefix", () => {
    expect(run(jwt({ sub: "x" }), requestBearerClaims)).toEqual({ sub: "x" });
  });

  it("takes the first value of a repeated header", () => {
    expect(
      run(
        [`Bearer ${jwt({ sub: "first" })}`, "Bearer other"],
        requestBearerClaims,
      ),
    ).toEqual({ sub: "first" });
  });

  it("returns undefined without a context, a header or a JWT", () => {
    expect(requestBearerClaims()).toBeUndefined();
    expect(run(undefined, requestBearerClaims)).toBeUndefined();
    expect(run("Bearer opaque-token", requestBearerClaims)).toBeUndefined();
  });
});

describe("requestBearerClaims with a declared token header", () => {
  const runWith = <T>(
    headers: Record<string, string | string[] | undefined>,
    fn: () => T,
  ) => requestContextStorage.run({ headers }, fn);

  it("reads the declared product header instead of Authorization", () => {
    expect(
      runWith({ "acme-api-token": jwt({ sub: "acme-user" }) }, () =>
        requestBearerClaims("Acme-Api-Token"),
      ),
    ).toEqual({ sub: "acme-user" });
  });

  it("strips a Bearer prefix from the declared header too", () => {
    expect(
      runWith({ "acme-api-token": `Bearer ${jwt({ sub: "x" })}` }, () =>
        requestBearerClaims("Acme-Api-Token"),
      ),
    ).toEqual({ sub: "x" });
  });

  it("prefers the declared header when both carry a JWT", () => {
    expect(
      runWith(
        {
          "acme-api-token": jwt({ sub: "declared" }),
          authorization: `Bearer ${jwt({ sub: "fallback" })}`,
        },
        () => requestBearerClaims("Acme-Api-Token"),
      ),
    ).toEqual({ sub: "declared" });
  });

  it("falls back to Authorization when the declared header is absent", () => {
    expect(
      runWith({ authorization: `Bearer ${jwt({ sub: "fallback" })}` }, () =>
        requestBearerClaims("Acme-Api-Token"),
      ),
    ).toEqual({ sub: "fallback" });
  });

  it("falls back when the declared header holds an opaque token", () => {
    // An API key that is not a JWT must not mask a usable OAuth token.
    expect(
      runWith(
        {
          "acme-api-token": "opaque-api-key",
          authorization: `Bearer ${jwt({ email: "user@example.com" })}`,
        },
        () => requestBearerClaims("Acme-Api-Token"),
      ),
    ).toEqual({ email: "user@example.com" });
  });

  it("stays undefined when neither header carries a JWT", () => {
    expect(
      runWith(
        { "acme-api-token": "opaque", authorization: "Bearer opaque" },
        () => requestBearerClaims("Acme-Api-Token"),
      ),
    ).toBeUndefined();
  });

  it("does not double-read a declared header that is Authorization", () => {
    expect(
      runWith({ authorization: `Bearer ${jwt({ sub: "x" })}` }, () =>
        requestBearerClaims("authorization"),
      ),
    ).toEqual({ sub: "x" });
  });

  it("ignores a blank declaration and uses Authorization", () => {
    expect(
      runWith({ authorization: `Bearer ${jwt({ sub: "x" })}` }, () =>
        requestBearerClaims("   "),
      ),
    ).toEqual({ sub: "x" });
  });
});

describe("getClaim", () => {
  const claims = {
    email: "  user@example.com ",
    "https://smartbear.com/org_id": "org_42",
    userId: 4185074,
    context: { user: { accountId: "acc-1" } },
    blank: "   ",
    flag: true,
  };

  it("reads a top-level claim, trimmed", () => {
    expect(getClaim(claims, "email")).toBe("user@example.com");
  });

  it("matches Auth0 namespaced keys by their final segment", () => {
    expect(getClaim(claims, "org_id")).toBe("org_42");
  });

  it("walks dot-separated paths", () => {
    expect(getClaim(claims, "context.user.accountId")).toBe("acc-1");
  });

  it("returns finite numbers as strings", () => {
    expect(getClaim(claims, "userId")).toBe("4185074");
  });

  it("ignores blank, boolean, missing and non-object intermediate values", () => {
    expect(getClaim(claims, "blank")).toBeUndefined();
    expect(getClaim(claims, "flag")).toBeUndefined();
    expect(getClaim(claims, "missing")).toBeUndefined();
    expect(getClaim(claims, "email.local")).toBeUndefined();
    expect(getClaim(claims, "context.missing.accountId")).toBeUndefined();
  });

  it("returns undefined without claims", () => {
    expect(getClaim(undefined, "email")).toBeUndefined();
  });
});

describe("firstClaim", () => {
  const claims = { userId: 7, sub: "7" };

  it("returns the first path that resolves", () => {
    expect(firstClaim(claims, ["missing", "sub", "userId"])).toBe("7");
  });

  it("returns undefined without paths or matches", () => {
    expect(firstClaim(claims, undefined)).toBeUndefined();
    expect(firstClaim(claims, [])).toBeUndefined();
    expect(firstClaim(claims, ["nope"])).toBeUndefined();
  });
});
