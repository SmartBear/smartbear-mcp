import { describe, expect, it } from "vitest";
import { createPactFlowAppDocument } from "./resource";

describe("PactFlow MCP App resource", () => {
  it("embeds the browser bundle in a self-contained document", () => {
    const html = createPactFlowAppDocument(
      "deployment-matrix",
      "const markup = '</script>';",
    );

    expect(html).toContain('data-app="deployment-matrix"');
    expect(html).toContain("const markup");
    expect(html).toContain("<\\/script>");
    expect(html).not.toContain("<script src=");
  });
});
