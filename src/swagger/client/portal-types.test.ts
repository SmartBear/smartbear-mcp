import { describe, expect, it } from "vitest";
import {
  CreateProductArgsSchema,
  ProductOutputSchema,
  UpdateProductArgsSchema,
} from "./portal-types";

describe("product visibility schemas", () => {
  const createBase = {
    portalId: "portal-123",
    type: "new",
    name: "Product",
    slug: "product",
  };

  it.each([
    "visible",
    "hidden",
    "conditional",
  ])("accepts visibility '%s' on create and update", (visibility) => {
    expect(
      CreateProductArgsSchema.safeParse({ ...createBase, visibility }).success,
    ).toBe(true);
    expect(
      UpdateProductArgsSchema.safeParse({ productId: "p-1", visibility })
        .success,
    ).toBe(true);
  });

  it("rejects an unknown visibility value", () => {
    expect(
      CreateProductArgsSchema.safeParse({ ...createBase, visibility: "nope" })
        .success,
    ).toBe(false);
    expect(
      UpdateProductArgsSchema.safeParse({
        productId: "p-1",
        visibility: "nope",
      }).success,
    ).toBe(false);
  });

  it("still accepts the deprecated hidden flag", () => {
    expect(
      CreateProductArgsSchema.safeParse({ ...createBase, hidden: true })
        .success,
    ).toBe(true);
  });

  it("includes visibility in the product output", () => {
    const parsed = ProductOutputSchema.parse({
      id: "p-1",
      hidden: false,
      visibility: "conditional",
    });
    expect(parsed.visibility).toBe("conditional");
  });
});
