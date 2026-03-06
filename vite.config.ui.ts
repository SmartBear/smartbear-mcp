import { dirname, join, resolve } from "node:path";
import { resolve as resolveUrl } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// are we running the dev server or doing a build
const isDev = !process.argv.includes("build");
const port = isDev ? 3001 : 3000;
const base = `http://localhost:${port}/`;

/**
 * Modify the HTML so the imports/src/hrefs are absolute urls to the dev server.
 * As the MCP server reads and serves the HTML statically
 */
function absoluteUrls() {
  return {
    name: "absolute-urls",
    transformIndexHtml: {
      order: "post",
      handler(html: string, context) {
        const path = dirname(context.path);
        return html
          .replace(
            /(src|href)="([^/].*?)"/g,
            (...m) => `${m[1]}="${resolveUrl(base, join(path, m[2]))}"`,
          )
          .replace(/(src|href)="\//g, `$1="${base}`)
          .replace(/(from ['"])\//g, `$1${base}`);
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), ...(isDev ? [absoluteUrls()] : [])],
  root: resolve(__dirname, "src"),
  base: `${base}`,
  server: {
    hmr: true,
    port,
    allowedHosts: ["http://localhost:8081"],
  },
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: false,
    rollupOptions: {
      input: [resolve(__dirname, "src/bugsnag/ui/app.html")],
    },
    minify: false,
    target: "es2020",
  },
});
