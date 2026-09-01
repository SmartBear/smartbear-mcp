import { describe, expect, it } from "vitest";
import {
  applyBaseUrlTemplating,
  convertPathVarsToReflectVars,
  generateUniqueParamName,
  hostnameFor,
  normalizeBaseUrl,
  sanitizeForParamName,
  splitUrlByBaseUrl,
} from "../client/functional-testing-url-utils";

describe("convertPathVarsToReflectVars", () => {
  it("converts a single path placeholder", () => {
    expect(convertPathVarsToReflectVars("/pet/{petId}")).toBe(
      "/pet/${var(petId)}",
    );
  });

  it("converts multiple path placeholders", () => {
    expect(
      convertPathVarsToReflectVars("/store/{storeId}/order/{orderId}"),
    ).toBe("/store/${var(storeId)}/order/${var(orderId)}");
  });

  it("leaves a path with no placeholders unchanged", () => {
    expect(convertPathVarsToReflectVars("/pet/findByStatus")).toBe(
      "/pet/findByStatus",
    );
  });
});

describe("sanitizeForParamName", () => {
  it("strips non-alphanumeric characters", () => {
    expect(sanitizeForParamName("petstore.swagger.io")).toBe(
      "petstoreswaggerio",
    );
  });

  it("truncates to 25 characters", () => {
    const long = "a".repeat(40);
    expect(sanitizeForParamName(long)).toBe("a".repeat(25));
  });

  it("returns an empty string for an entirely non-alphanumeric input", () => {
    expect(sanitizeForParamName("???")).toBe("");
  });
});

describe("hostnameFor", () => {
  it("extracts the hostname from a valid URL", () => {
    expect(hostnameFor("https://petstore.swagger.io/v2")).toBe(
      "petstore.swagger.io",
    );
  });

  it("falls back to the original string when not a valid URL", () => {
    expect(hostnameFor("not-a-url")).toBe("not-a-url");
  });
});

describe("normalizeBaseUrl", () => {
  it("strips a single trailing slash", () => {
    expect(normalizeBaseUrl("https://petstore.swagger.io/v2/")).toBe(
      "https://petstore.swagger.io/v2",
    );
  });

  it("leaves a url with no trailing slash unchanged", () => {
    expect(normalizeBaseUrl("https://petstore.swagger.io/v2")).toBe(
      "https://petstore.swagger.io/v2",
    );
  });
});

describe("splitUrlByBaseUrl", () => {
  it("returns the remainder path when the url starts with the base url", () => {
    expect(
      splitUrlByBaseUrl(
        "https://petstore.swagger.io/v2/pet/1",
        "https://petstore.swagger.io/v2",
      ),
    ).toEqual({
      normalizedBase: "https://petstore.swagger.io/v2",
      remainder: "/pet/1",
    });
  });

  it("returns '/' when the url equals the base url exactly", () => {
    expect(
      splitUrlByBaseUrl(
        "https://petstore.swagger.io/v2",
        "https://petstore.swagger.io/v2",
      ),
    ).toEqual({
      normalizedBase: "https://petstore.swagger.io/v2",
      remainder: "/",
    });
  });

  it("tolerates a trailing slash on the base url", () => {
    expect(
      splitUrlByBaseUrl(
        "https://petstore.swagger.io/v2/pet/1",
        "https://petstore.swagger.io/v2/",
      ),
    ).toEqual({
      normalizedBase: "https://petstore.swagger.io/v2",
      remainder: "/pet/1",
    });
  });

  it("returns null when the url does not start with the base url", () => {
    expect(
      splitUrlByBaseUrl(
        "https://other.example.com/pet/1",
        "https://petstore.swagger.io/v2",
      ),
    ).toBeNull();
  });

  it("does not treat a base url as a prefix match when it is not a path boundary", () => {
    expect(
      splitUrlByBaseUrl(
        "https://petstore.swagger.io/v2extra/pet/1",
        "https://petstore.swagger.io/v2",
      ),
    ).toBeNull();
  });
});

describe("applyBaseUrlTemplating", () => {
  it("binds path placeholders to caller-supplied parameters of the same name instead of duplicating them", () => {
    const result = applyBaseUrlTemplating(
      [
        {
          baseUrl: "https://petstore31.swagger.io/api/v3",
          url: "https://petstore31.swagger.io/api/v3/pet/{petId}?name={name}&status={status}",
          httpMethod: "POST",
        },
      ],
      [
        { name: "petId", value: "10" },
        { name: "name", value: "doggie-updated" },
        { name: "status", value: "sold" },
      ],
    );

    expect(result.steps?.[0].url).toBe(
      "${var(baseURLpetstore31swaggerio)}/pet/${var(petId)}?name=${var(name)}&status=${var(status)}",
    );

    const paramNames = result.parameters.map((p) => p.name);
    expect(paramNames).not.toContain("petId2");
    expect(paramNames).not.toContain("name2");
    expect(paramNames).not.toContain("status2");
    expect(result.parameters.find((p) => p.name === "petId")?.value).toBe("10");
    expect(result.parameters.find((p) => p.name === "name")?.value).toBe(
      "doggie-updated",
    );
    expect(result.parameters.find((p) => p.name === "status")?.value).toBe(
      "sold",
    );
  });

  it("binds to a caller parameter of the same generated base-url name even when unrelated", () => {
    const result = applyBaseUrlTemplating(
      [
        {
          baseUrl: "https://petstore.swagger.io/v2",
          url: "https://petstore.swagger.io/v2/pet/{petId}",
          httpMethod: "GET",
        },
      ],
      [{ name: "baseURLpetstoreswaggerio", value: "unrelated" }],
    );

    const generatedBaseUrlParam = result.parameters.find((p) =>
      p.name.startsWith("baseURLpetstoreswaggerio"),
    );
    expect(generatedBaseUrlParam?.name).toBe("baseURLpetstoreswaggerio");
  });

  it("names the base-url parameter after apiName", () => {
    const result = applyBaseUrlTemplating(
      [
        {
          baseUrl: "https://petstore.swagger.io/v2",
          url: "https://petstore.swagger.io/v2/pet/{petId}",
          httpMethod: "GET",
          apiName: "Petstore",
        },
      ],
      undefined,
    );

    expect(result.steps?.[0].url).toBe(
      "${var(baseURLPetstore)}/pet/${var(petId)}",
    );
    expect(result.parameters).toEqual([
      { name: "baseURLPetstore", value: "https://petstore.swagger.io/v2" },
      { name: "petId", value: "" },
    ]);
  });

  it("converts {pathParam} placeholders to ${var(name)} when the step has no baseUrl", () => {
    const result = applyBaseUrlTemplating(
      [
        {
          url: "https://petstore.swagger.io/v2/pet/{petId}",
          httpMethod: "GET",
        },
      ],
      undefined,
    );

    expect(result.steps?.[0].url).toBe(
      "https://petstore.swagger.io/v2/pet/${var(petId)}",
    );
    expect(result.parameters).toEqual([{ name: "petId", value: "" }]);
  });
});

describe("generateUniqueParamName", () => {
  it("returns the base name when unused", () => {
    expect(generateUniqueParamName("baseURLPetstore", new Set())).toBe(
      "baseURLPetstore",
    );
  });

  it("appends 2 on the first collision", () => {
    expect(
      generateUniqueParamName("baseURLPetstore", new Set(["baseURLPetstore"])),
    ).toBe("baseURLPetstore2");
  });

  it("increments past multiple collisions", () => {
    expect(
      generateUniqueParamName(
        "baseURLPetstore",
        new Set(["baseURLPetstore", "baseURLPetstore2", "baseURLPetstore3"]),
      ),
    ).toBe("baseURLPetstore4");
  });
});
