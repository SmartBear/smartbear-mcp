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

  it("no longer has the removed hidden flag in the input schemas", () => {
    expect(CreateProductArgsSchema.shape).not.toHaveProperty("hidden");
    expect(UpdateProductArgsSchema.shape).not.toHaveProperty("hidden");
  });

  it("includes visibility in the product output", () => {
    const parsed = ProductOutputSchema.parse({
      id: "p-1",
      visibility: "conditional",
    });
    expect(parsed.visibility).toBe("conditional");
  });
});
