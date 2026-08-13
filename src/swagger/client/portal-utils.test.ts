import { describe, expect, it } from "vitest";
import {
  appendRandomSuffix,
  buildSubdomainCandidate,
  convertToValidSubdomain,
  type Rng,
  SUBDOMAIN_MAX_LENGTH,
} from "./portal-utils";

const SUBDOMAIN_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const suffixFor = (r: number) => r.toString(36).substring(2, 5).padEnd(3, "0");

const constRng =
  (value: number): Rng =>
  () =>
    value;

describe("convertToValidSubdomain", () => {
  it("lowercases and strips characters outside [a-z0-9-]", () => {
    expect(convertToValidSubdomain("Acme Corp!!")).toBe("acmecorp");
  });

  it("collapses repeated hyphens between segments", () => {
    expect(convertToValidSubdomain("acme--corp")).toBe("acme-corp");
  });

  it("pads with random digits up to the minimum length", () => {
    expect(convertToValidSubdomain("", constRng(0.5))).toBe("555");
    expect(convertToValidSubdomain("a", constRng(0.5))).toBe("a55");
  });

  it("trims to the maximum length without a trailing hyphen", () => {
    expect(convertToValidSubdomain("a".repeat(30))).toHaveLength(
      SUBDOMAIN_MAX_LENGTH,
    );
  });

  it("produces a subdomain-valid slug", () => {
    expect(convertToValidSubdomain("Acme Corp", constRng(0.5))).toMatch(
      SUBDOMAIN_REGEX,
    );
  });
});

describe("appendRandomSuffix", () => {
  it("appends a hyphen plus the base-36 random string", () => {
    const r = 0.123456789;
    expect(appendRandomSuffix("acmecorp", constRng(r))).toBe(
      `acmecorp-${suffixFor(r)}`,
    );
  });

  it("keeps a max-length base within the overall subdomain limit", () => {
    const base = "a".repeat(SUBDOMAIN_MAX_LENGTH);
    const subdomain = appendRandomSuffix(base, constRng(0.123456789));
    expect(subdomain.length).toBeLessThanOrEqual(SUBDOMAIN_MAX_LENGTH);
    expect(subdomain).toMatch(SUBDOMAIN_REGEX);
  });

  it("yields different suffixes for different randomness (retry case)", () => {
    const first = appendRandomSuffix("acmecorp", constRng(0.111111));
    const second = appendRandomSuffix("acmecorp", constRng(0.777777));
    expect(first).not.toBe(second);
  });

  it("strips a hyphen left at the cut point when trimming the base", () => {
    // 15 chars + "-" + 4 chars: the slice to fit the suffix cuts right after
    // the hyphen, which must not survive as "--" in the result.
    const base = `${"a".repeat(15)}-${"b".repeat(4)}`;
    const subdomain = appendRandomSuffix(base, constRng(0.123456789));
    expect(subdomain).toBe(`${"a".repeat(15)}-${suffixFor(0.123456789)}`);
    expect(subdomain).toMatch(SUBDOMAIN_REGEX);
  });

  it("pads the suffix to 3 characters when the base-36 expansion is short", () => {
    // (0).toString(36) === "0" and (0.5).toString(36) === "0.i" would yield
    // empty or 1-char suffixes without padding.
    expect(appendRandomSuffix("acmecorp", constRng(0))).toBe("acmecorp-000");
    expect(appendRandomSuffix("acmecorp", constRng(0.5))).toBe("acmecorp-i00");
  });
});

describe("buildSubdomainCandidate", () => {
  it("combines the slugified name with a random suffix", () => {
    const r = 0.123456789;
    expect(buildSubdomainCandidate("Acme Corp", constRng(r))).toBe(
      `acmecorp-${suffixFor(r)}`,
    );
  });

  it("always produces a valid, within-limit subdomain even for long names", () => {
    const subdomain = buildSubdomainCandidate(
      "This Is A Very Long Company Name",
      constRng(0.123456789),
    );
    expect(subdomain).toMatch(SUBDOMAIN_REGEX);
    expect(subdomain.length).toBeLessThanOrEqual(SUBDOMAIN_MAX_LENGTH);
  });

  it("pads a missing name with random digits before suffixing", () => {
    const subdomain = buildSubdomainCandidate(undefined, constRng(0.5));
    expect(subdomain.startsWith("555-")).toBe(true);
    expect(subdomain).toMatch(SUBDOMAIN_REGEX);
  });
});
