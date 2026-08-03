import { describe, expect, it } from "vitest";
import {
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

  it("strips multiple trailing slashes", () => {
    expect(normalizeBaseUrl("https://petstore.swagger.io/v2///")).toBe(
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
    ).toBe("/pet/1");
  });

  it("returns '/' when the url equals the base url exactly", () => {
    expect(
      splitUrlByBaseUrl(
        "https://petstore.swagger.io/v2",
        "https://petstore.swagger.io/v2",
      ),
    ).toBe("/");
  });

  it("tolerates a trailing slash on the base url", () => {
    expect(
      splitUrlByBaseUrl(
        "https://petstore.swagger.io/v2/pet/1",
        "https://petstore.swagger.io/v2/",
      ),
    ).toBe("/pet/1");
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
