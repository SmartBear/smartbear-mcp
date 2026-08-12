import { describe, expect, it } from "vitest";
import { applyEdits, setVersionToYamlSpec } from "./client/patch-spec-utils";

describe("setVersionToYamlSpec", () => {
  const spec = [
    "openapi: 3.0.0",
    "info:",
    "  title: Pets",
    "  version: 1.0.0",
    "paths:",
    "  /pets:",
    "    get:",
    "      responses:",
    "        '200':",
    "          description: OK",
  ].join("\n");

  it("replaces the version under the info block", () => {
    const result = setVersionToYamlSpec(spec, "2.0.0");

    expect(result).toContain("  version: 2.0.0");
    expect(result).not.toContain("1.0.0");
  });

  it("preserves double quotes around the value", () => {
    const quoted = spec.replace("version: 1.0.0", 'version: "1.0.0"');

    const result = setVersionToYamlSpec(quoted, "2.0.0");

    expect(result).toContain('  version: "2.0.0"');
  });

  it("preserves single quotes around the value", () => {
    const quoted = spec.replace("version: 1.0.0", "version: '1.0.0'");

    const result = setVersionToYamlSpec(quoted, "2.0.0");

    expect(result).toContain("  version: '2.0.0'");
  });

  it("skips blank lines inside the info block", () => {
    const withBlank = spec.replace(
      "  title: Pets",
      "  title: Pets\n\n  description: A spec",
    );

    const result = setVersionToYamlSpec(withBlank, "2.0.0");

    expect(result).toContain("  version: 2.0.0");
  });

  it("does not touch version keys outside the info block", () => {
    const outside = [
      "info:",
      "  title: Pets",
      "components:",
      "  schemas:",
      "    Meta:",
      "      version: 1.0.0",
    ].join("\n");

    expect(setVersionToYamlSpec(outside, "2.0.0")).toBe(outside);
  });

  it("returns the text unchanged when there is no info block", () => {
    const noInfo = "openapi: 3.0.0\npaths: {}";

    expect(setVersionToYamlSpec(noInfo, "2.0.0")).toBe(noInfo);
  });

  it("returns the text unchanged when info has no version key", () => {
    const noVersion = "info:\n  title: Pets\npaths: {}";

    expect(setVersionToYamlSpec(noVersion, "2.0.0")).toBe(noVersion);
  });

  it("replaces the version in an OAS 2.0 spec without touching the swagger key", () => {
    const oas2 = [
      'swagger: "2.0"',
      "info:",
      "  title: Pets",
      "  version: 1.0.0",
      "paths: {}",
    ].join("\n");

    const result = setVersionToYamlSpec(oas2, "2.0.0");

    expect(result).toContain("  version: 2.0.0");
    expect(result).toContain('swagger: "2.0"');
  });

  it("replaces the version in an AsyncAPI 2.6 spec without touching the asyncapi key", () => {
    const asyncapi26 = [
      "asyncapi: 2.6.0",
      "info:",
      "  title: Events",
      "  version: 1.0.0",
      "channels: {}",
    ].join("\n");

    const result = setVersionToYamlSpec(asyncapi26, "1.1.0");

    expect(result).toContain("  version: 1.1.0");
    expect(result).toContain("asyncapi: 2.6.0");
  });

  it("replaces the version in an AsyncAPI 3.0 spec without touching the asyncapi key", () => {
    const asyncapi30 = [
      "asyncapi: 3.0.0",
      "info:",
      "  title: Events",
      "  version: 1.0.0",
      "channels: {}",
    ].join("\n");

    const result = setVersionToYamlSpec(asyncapi30, "1.1.0");

    expect(result).toContain("  version: 1.1.0");
    expect(result).toContain("asyncapi: 3.0.0");
  });
});

describe("applyEdits", () => {
  const text = [
    "info:",
    "  title: Pets",
    "paths:",
    "  /pets:",
    "    get:",
    "      description: OK",
    "  /pets/{id}:",
    "    get:",
    "      description: OK",
  ].join("\n");

  it("applies a unique edit", () => {
    const result = applyEdits(text, [
      { oldString: "title: Pets", replaceString: "title: Pet Store" },
    ]);

    expect(result.text).toContain("title: Pet Store");
    expect(result.applied).toEqual([0]);
    expect(result.failed).toEqual([]);
  });

  it("applies edits sequentially so later edits see earlier changes", () => {
    const result = applyEdits(text, [
      { oldString: "title: Pets", replaceString: "title: Pet Store" },
      { oldString: "title: Pet Store", replaceString: "title: Pet Shop" },
    ]);

    expect(result.text).toContain("title: Pet Shop");
    expect(result.applied).toEqual([0, 1]);
    expect(result.failed).toEqual([]);
  });

  it("deletes the matched text when replaceString is empty", () => {
    const result = applyEdits(text, [
      { oldString: "  title: Pets\n", replaceString: "" },
    ]);

    expect(result.text).not.toContain("title: Pets");
    expect(result.applied).toEqual([0]);
  });

  it("reports no_match when oldString is not found", () => {
    const result = applyEdits(text, [
      { oldString: "does not exist", replaceString: "x" },
    ]);

    expect(result.text).toBe(text);
    expect(result.applied).toEqual([]);
    expect(result.failed).toEqual([
      { index: 0, error: "no_match", matchCount: 0 },
    ]);
  });

  it("reports ambiguous when oldString matches more than once", () => {
    const result = applyEdits(text, [
      { oldString: "description: OK", replaceString: "description: Done" },
    ]);

    expect(result.text).toBe(text);
    expect(result.applied).toEqual([]);
    expect(result.failed).toEqual([
      { index: 0, error: "ambiguous", matchCount: 2 },
    ]);
  });

  it("replaces every occurrence when replaceAll is true", () => {
    const result = applyEdits(text, [
      {
        oldString: "description: OK",
        replaceString: "description: Done",
        replaceAll: true,
      },
    ]);

    expect(result.text).not.toContain("description: OK");
    expect(result.text.split("description: Done")).toHaveLength(3);
    expect(result.applied).toEqual([0]);
    expect(result.failed).toEqual([]);
  });

  it("applies valid edits and reports failed ones in a mixed batch", () => {
    const result = applyEdits(text, [
      { oldString: "missing", replaceString: "x" },
      { oldString: "title: Pets", replaceString: "title: Pet Store" },
      { oldString: "description: OK", replaceString: "description: Done" },
    ]);

    expect(result.text).toContain("title: Pet Store");
    expect(result.text).toContain("description: OK");
    expect(result.applied).toEqual([1]);
    expect(result.failed).toEqual([
      { index: 0, error: "no_match", matchCount: 0 },
      { index: 2, error: "ambiguous", matchCount: 2 },
    ]);
  });
});
