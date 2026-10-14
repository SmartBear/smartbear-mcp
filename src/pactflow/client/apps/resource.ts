import { readFileSync } from "node:fs";

export function createPactFlowAppHtml(app: string): () => string {
  return () => {
    const bundle = readFileSync(
      new URL("../../../mcp-apps/index.js", import.meta.url),
      "utf8",
    );
    return createPactFlowAppDocument(app, bundle);
  };
}

export function createPactFlowAppDocument(app: string, bundle: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>PactFlow</title></head><body data-app="${app}"><div id="root"></div><script>${bundle.replace(/<\/script/gi, "<\\/script")}</script></body></html>`;
}
