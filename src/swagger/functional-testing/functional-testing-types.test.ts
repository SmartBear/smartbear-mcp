import { describe, expect, it } from "vitest";
import {
  CreateFunctionalTestingBodyRuleSchema,
  CreateFunctionalTestingStatusRangeSchema,
  CreateFunctionalTestingTestParamsSchema,
  CreateFunctionalTestingTestStepSchema,
} from "../client/functional-testing-types";

describe("CreateFunctionalTestingStatusRangeSchema", () => {
  it("accepts a valid ascending range", () => {
    const result = CreateFunctionalTestingStatusRangeSchema.safeParse({
      start: 200,
      end: 299,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a single status code as start === end", () => {
    const result = CreateFunctionalTestingStatusRangeSchema.safeParse({
      start: 200,
      end: 200,
    });
    expect(result.success).toBe(true);
  });

  it("rejects start greater than end", () => {
    const result = CreateFunctionalTestingStatusRangeSchema.safeParse({
      start: 500,
      end: 200,
    });
    expect(result.success).toBe(false);
  });

  it("rejects status codes below 100", () => {
    const result = CreateFunctionalTestingStatusRangeSchema.safeParse({
      start: -1,
      end: 200,
    });
    expect(result.success).toBe(false);
  });

  it("rejects status codes above 599", () => {
    const result = CreateFunctionalTestingStatusRangeSchema.safeParse({
      start: 200,
      end: 9999,
    });
    expect(result.success).toBe(false);
  });
});

describe("CreateFunctionalTestingBodyRuleSchema", () => {
  const basePath = '["data"]["name"]';

  describe("path", () => {
    it("accepts a single bracket segment", () => {
      const result = CreateFunctionalTestingBodyRuleSchema.safeParse({
        path: '["data"]',
        assertionType: "string",
        operator: "eq",
        target: "Alice",
      });
      expect(result.success).toBe(true);
    });

    it("accepts multiple chained bracket segments", () => {
      const result = CreateFunctionalTestingBodyRuleSchema.safeParse({
        path: basePath,
        assertionType: "string",
        operator: "eq",
        target: "Alice",
      });
      expect(result.success).toBe(true);
    });

    it("rejects dot notation", () => {
      const result = CreateFunctionalTestingBodyRuleSchema.safeParse({
        path: "data.name",
        assertionType: "string",
        operator: "eq",
        target: "Alice",
      });
      expect(result.success).toBe(false);
    });

    it("rejects an unbracketed path", () => {
      const result = CreateFunctionalTestingBodyRuleSchema.safeParse({
        path: "data",
        assertionType: "string",
        operator: "eq",
        target: "Alice",
      });
      expect(result.success).toBe(false);
    });

    it("rejects an empty path", () => {
      const result = CreateFunctionalTestingBodyRuleSchema.safeParse({
        path: "",
        assertionType: "string",
        operator: "eq",
        target: "Alice",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("compare assertions (string/number)", () => {
    it("accepts operator + target", () => {
      const result = CreateFunctionalTestingBodyRuleSchema.safeParse({
        path: basePath,
        assertionType: "string",
        operator: "eq",
        target: "Alice",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing operator and target", () => {
      const result = CreateFunctionalTestingBodyRuleSchema.safeParse({
        path: basePath,
        assertionType: "string",
      });
      expect(result.success).toBe(false);
    });

    it("rejects operator without target", () => {
      const result = CreateFunctionalTestingBodyRuleSchema.safeParse({
        path: basePath,
        assertionType: "number",
        operator: "eq",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("list-match assertions (targets)", () => {
    it("accepts targets alone", () => {
      const result = CreateFunctionalTestingBodyRuleSchema.safeParse({
        path: basePath,
        assertionType: "string",
        targets: ["Alice", "Bob"],
      });
      expect(result.success).toBe(true);
    });

    it("rejects targets combined with operator/target", () => {
      const result = CreateFunctionalTestingBodyRuleSchema.safeParse({
        path: basePath,
        assertionType: "string",
        targets: ["Alice"],
        operator: "eq",
        target: "Alice",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("range assertions (number only)", () => {
    it("accepts lower + upper together", () => {
      const result = CreateFunctionalTestingBodyRuleSchema.safeParse({
        path: basePath,
        assertionType: "number",
        lower: "1",
        upper: "10",
      });
      expect(result.success).toBe(true);
    });

    it("rejects lower without upper (would silently always fail at runtime)", () => {
      const result = CreateFunctionalTestingBodyRuleSchema.safeParse({
        path: basePath,
        assertionType: "number",
        lower: "1",
      });
      expect(result.success).toBe(false);
    });

    it("rejects upper without lower", () => {
      const result = CreateFunctionalTestingBodyRuleSchema.safeParse({
        path: basePath,
        assertionType: "number",
        upper: "10",
      });
      expect(result.success).toBe(false);
    });

    it("rejects range assertion on assertionType 'string'", () => {
      const result = CreateFunctionalTestingBodyRuleSchema.safeParse({
        path: basePath,
        assertionType: "string",
        lower: "1",
        upper: "10",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("regex assertions", () => {
    it("accepts pattern: 'nonempty' alone", () => {
      const result = CreateFunctionalTestingBodyRuleSchema.safeParse({
        path: basePath,
        assertionType: "regex",
        pattern: "nonempty",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing pattern", () => {
      const result = CreateFunctionalTestingBodyRuleSchema.safeParse({
        path: basePath,
        assertionType: "regex",
      });
      expect(result.success).toBe(false);
    });

    it("rejects operator/target set alongside regex (silently ignored server-side)", () => {
      const result = CreateFunctionalTestingBodyRuleSchema.safeParse({
        path: basePath,
        assertionType: "regex",
        pattern: "nonempty",
        operator: "eq",
        target: "some-regex",
      });
      expect(result.success).toBe(false);
    });

    it("rejects pattern set on non-regex assertionType", () => {
      const result = CreateFunctionalTestingBodyRuleSchema.safeParse({
        path: basePath,
        assertionType: "string",
        operator: "eq",
        target: "Alice",
        pattern: "nonempty",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("assignment", () => {
    it("is allowed alongside a valid compare assertion", () => {
      const result = CreateFunctionalTestingBodyRuleSchema.safeParse({
        path: basePath,
        assertionType: "string",
        operator: "eq",
        target: "Alice",
        assignment: "userName",
      });
      expect(result.success).toBe(true);
    });
  });
});

describe("CreateFunctionalTestingTestStepSchema", () => {
  it("accepts a plain url without baseUrl", () => {
    const result = CreateFunctionalTestingTestStepSchema.safeParse({
      url: "https://example.com/api/users",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a url with baseUrl set", () => {
    const result = CreateFunctionalTestingTestStepSchema.safeParse({
      url: "https://petstore.swagger.io/v2/pet/{petId}",
      baseUrl: "https://petstore.swagger.io/v2",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a baseUrl that is not a valid URL", () => {
    const result = CreateFunctionalTestingTestStepSchema.safeParse({
      url: "https://petstore.swagger.io/v2/pet/1",
      baseUrl: "petstore",
    });
    expect(result.success).toBe(false);
  });

  it("accepts an already-templated url", () => {
    const result = CreateFunctionalTestingTestStepSchema.safeParse({
      url: "${var(baseURLPetstore)}/pet/${var(petId)}",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty url", () => {
    const result = CreateFunctionalTestingTestStepSchema.safeParse({
      url: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("CreateFunctionalTestingTestParamsSchema", () => {
  it("accepts top-level parameters", () => {
    const result = CreateFunctionalTestingTestParamsSchema.safeParse({
      name: "My Test",
      parameters: [
        { name: "baseURLPetstore", value: "https://petstore.swagger.io/v2" },
        { name: "petId" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a parameter with an empty name", () => {
    const result = CreateFunctionalTestingTestParamsSchema.safeParse({
      name: "My Test",
      parameters: [{ name: "" }],
    });
    expect(result.success).toBe(false);
  });
});
