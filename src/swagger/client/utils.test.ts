import { describe, expect, it } from "vitest";
import { isAsyncAPI, isOpenAPI } from "./utils";

describe("isOpenAPI", () => {
  it("detects OpenAPI 3.x", () => {
    expect(isOpenAPI("openapi: 3.0.0")).toBe(true);
    expect(isOpenAPI("openapi: '3.1.0'")).toBe(true);
    expect(isOpenAPI('openapi: "3.2.0"')).toBe(true);
  });

  it("detects Swagger 2.0", () => {
    expect(isOpenAPI('swagger: "2.0"')).toBe(true);
    expect(isOpenAPI("swagger: 2.0")).toBe(true);
  });

  it("returns false for AsyncAPI and anything else", () => {
    expect(isOpenAPI("asyncapi: 3.0.0")).toBe(false);
    expect(isOpenAPI("foo: bar")).toBe(false);
    expect(isOpenAPI('{"openapi": "3.0.0"}')).toBe(false);
    expect(isOpenAPI()).toBe(false);
  });
});

describe("isAsyncAPI", () => {
  it("detects AsyncAPI 2.x and 3.x", () => {
    expect(isAsyncAPI("asyncapi: 2.6.0")).toBe(true);
    expect(isAsyncAPI("asyncapi: '3.0.0'")).toBe(true);
  });

  it("returns false for OpenAPI and anything else", () => {
    expect(isAsyncAPI("openapi: 3.0.0")).toBe(false);
    expect(isAsyncAPI('swagger: "2.0"')).toBe(false);
    expect(isAsyncAPI("foo: bar")).toBe(false);
    expect(isAsyncAPI()).toBe(false);
  });
});
