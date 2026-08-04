#!/usr/bin/env node

/**
 * registry-remove-remote.js
 *
 * Frees a `remotes[].url` so it can be claimed by another server in the same
 * MCP registry namespace (registry.modelcontextprotocol.io), by changing the
 * lifecycle `status` of every version that still references it.
 *
 * Why status, not edit:
 *   The registry rejects publishing a remote URL that is already claimed by
 *   any *non-deleted* version of another server (see
 *   `validateNoDuplicateRemoteURLs` in modelcontextprotocol/registry). The
 *   obvious fix — PUT an edited server body with the remote stripped out — is
 *   NOT usable here: that endpoint requires `edit` permission, and DNS/GitHub
 *   publisher auth only ever grants `publish` (confirmed against the registry
 *   source: only an admin-configured generic OIDC provider or local dev auth
 *   grant `edit`). Confirmed empirically too: PUT returns 403 with a
 *   publish-scoped token.
 *
 *   The status-only `PATCH .../versions/{version}/status` endpoint is
 *   different: it accepts `publish` OR `edit` permission. Setting a version's
 *   status to `deleted` removes it from the duplicate-remote-URL scan (which
 *   explicitly excludes deleted versions), freeing any remote URL it held —
 *   with a normal publisher token.
 *
 * Safety:
 *   This script refuses to touch whichever version is currently flagged
 *   `isLatest`, however it was selected (explicit --versions or --remote-url
 *   auto-detection). It also never uses the registry's bulk
 *   "all versions" status endpoint, which would apply to literally every
 *   version including the current latest — a single wrong `--status` there
 *   would take down the live published server. Per-version PATCH calls only.
 *
 * Usage:
 *   node scripts/registry-remove-remote.js \
 *     --server com.smartbear/smartbear-mcp \
 *     --remote-url https://swagger.mcp.smartbear.com/mcp \
 *     [--versions 0.25.0,0.26.0,0.27.0]   # default: every version that has the URL
 *     [--status deleted]                  # default: deleted (also: active, deprecated)
 *     [--message "superseded by com.smartbear/swagger-mcp"]
 *     [--registry https://registry.modelcontextprotocol.io]
 *     [--token <jwt>]                     # else $MCP_REGISTRY_TOKEN, else token.json
 *     [--apply]                           # actually write; omit for a dry run
 *     [--yes]                             # skip the confirmation prompt when applying
 *
 * Auth:
 *   Reuses the same Registry JWT that `mcp-publisher` obtains. Resolution order:
 *     1. --token <jwt>
 *     2. $MCP_REGISTRY_TOKEN
 *     3. ~/.config/mcp-publisher/token.json  (written by `mcp-publisher login`)
 *   A `publish`-scoped token for the server's namespace is sufficient.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

const DEFAULT_REGISTRY = "https://registry.modelcontextprotocol.io";
const VALID_STATUSES = ["active", "deprecated", "deleted"];
const TOKEN_FILE = path.join(
  os.homedir(),
  ".config",
  "mcp-publisher",
  "token.json",
);

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    server: undefined,
    remoteUrl: undefined,
    versions: undefined, // array | undefined (undefined = auto-detect via remoteUrl)
    status: "deleted",
    message: undefined,
    registry: DEFAULT_REGISTRY,
    token: undefined,
    apply: false,
    yes: false,
  };

  const flags = argv.slice(2);
  for (let i = 0; i < flags.length; i++) {
    const flag = flags[i];
    const next = () => {
      const value = flags[++i];
      if (value === undefined) {
        fail(`Missing value for ${flag}`);
      }
      return value;
    };
    switch (flag) {
      case "--server":
        args.server = next();
        break;
      case "--remote-url":
        args.remoteUrl = next();
        break;
      case "--versions":
        args.versions = next()
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
        break;
      case "--status":
        args.status = next();
        break;
      case "--message":
        args.message = next();
        break;
      case "--registry":
        args.registry = next().replace(/\/+$/, "");
        break;
      case "--token":
        args.token = next();
        break;
      case "--apply":
        args.apply = true;
        break;
      case "--yes":
      case "-y":
        args.yes = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      default:
        fail(`Unknown argument: ${flag}`);
    }
  }

  if (!args.server)
    fail("--server is required (e.g. com.smartbear/smartbear-mcp)");
  if (!args.versions && !args.remoteUrl)
    fail("Specify which versions to target via --remote-url or --versions");
  if (!VALID_STATUSES.includes(args.status))
    fail(`--status must be one of: ${VALID_STATUSES.join(", ")}`);
  return args;
}

function printHelp() {
  console.log(
    `Free a remote URL by changing the status of registry server versions that hold it.\n\n` +
      `Required:\n` +
      `  --server <name>        e.g. com.smartbear/smartbear-mcp\n` +
      `  --remote-url <url>     target every version that still has this remote\n` +
      `                         (or) --versions a,b,c  target an explicit list instead\n\n` +
      `Optional:\n` +
      `  --status <status>      one of: ${VALID_STATUSES.join(", ")} (default: deleted)\n` +
      `  --message <text>       status message (e.g. reason for deletion)\n` +
      `  --registry <url>       default: ${DEFAULT_REGISTRY}\n` +
      `  --token <jwt>          default: $MCP_REGISTRY_TOKEN or ~/.config/mcp-publisher/token.json\n` +
      `  --apply                perform the change (default is a dry run)\n` +
      `  --yes, -y              skip the confirmation prompt when applying\n\n` +
      `Note: whichever version is currently flagged 'isLatest' is always refused,\n` +
      `to avoid accidentally taking down the live published server.\n`,
  );
}

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function resolveToken(cliToken) {
  if (cliToken) return cliToken;
  if (process.env.MCP_REGISTRY_TOKEN) return process.env.MCP_REGISTRY_TOKEN;
  if (fs.existsSync(TOKEN_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
      if (data.token) return data.token;
    } catch (error) {
      fail(`Failed to read ${TOKEN_FILE}: ${error.message}`);
    }
  }
  fail(
    `No registry token found. Provide --token, set $MCP_REGISTRY_TOKEN, or run ` +
      `\`mcp-publisher login <method>\` first (writes ${TOKEN_FILE}).`,
  );
}

// ---------------------------------------------------------------------------
// Registry API
// ---------------------------------------------------------------------------

async function registryFetch(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }
  if (!response.ok) {
    const detail =
      body && typeof body === "object"
        ? JSON.stringify(body)
        : String(body ?? "");
    throw new Error(
      `${options.method || "GET"} ${url} → ${response.status}: ${detail}`,
    );
  }
  return body;
}

/** Fetch every version record for a server, following pagination cursors. */
async function fetchAllVersions(registry, server) {
  const encoded = encodeURIComponent(server);
  const results = [];
  let cursor;
  do {
    const url = new URL(`${registry}/v0/servers/${encoded}/versions`);
    if (cursor) url.searchParams.set("cursor", cursor);
    const page = await registryFetch(url.toString());
    const servers = page.servers ?? page.data ?? [];
    results.push(...servers);
    cursor = page.metadata?.next_cursor ?? page.metadata?.nextCursor;
  } while (cursor);
  return results;
}

function isServerRecord(rec) {
  return rec != null && typeof rec.server === "object" && rec.server !== null;
}

function serverHasRemote(serverJson, remoteUrl) {
  return (serverJson.remotes ?? []).some((r) => r?.url === remoteUrl);
}

/** The registry-managed `_meta` block: { status, statusMessage, isLatest, ... }. */
function officialMeta(record) {
  return record._meta?.["io.modelcontextprotocol.registry/official"];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function confirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await new Promise((resolve) => rl.question(question, resolve));
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

async function main() {
  const args = parseArgs(process.argv);
  // A dry run is read-only, so only demand a token when we're actually writing.
  const token = args.apply ? resolveToken(args.token) : undefined;

  console.log(`Registry   : ${args.registry}`);
  console.log(`Server     : ${args.server}`);
  console.log(
    `New status : ${args.status}${args.message ? `  ("${args.message}")` : ""}`,
  );
  console.log(`Mode       : ${args.apply ? "APPLY" : "dry-run"}\n`);

  const allVersions = await fetchAllVersions(args.registry, args.server);
  if (allVersions.length === 0) {
    fail(`No versions found for ${args.server}`);
  }

  // The registry contract guarantees every record carries a `server` object. If
  // one doesn't, fail loudly rather than skip it: silently ignoring a record
  // could leave a version still holding the URL while we report success — the
  // opposite of what this tool is meant to guarantee.
  const malformed = allVersions.filter((rec) => !isServerRecord(rec));
  if (malformed.length > 0) {
    fail(
      `${malformed.length} registry record(s) are missing a 'server' object — ` +
        `unexpected API response shape, aborting.`,
    );
  }

  let candidates;
  if (args.remoteUrl) {
    candidates = allVersions.filter((rec) =>
      serverHasRemote(rec.server, args.remoteUrl),
    );
  } else {
    const wanted = new Set(args.versions);
    candidates = allVersions.filter((rec) => wanted.has(rec.server.version));
    const found = new Set(candidates.map((rec) => rec.server.version));
    for (const v of args.versions) {
      if (!found.has(v)) {
        console.warn(`⚠️  ${v}: no such version, skipping`);
      }
    }
  }

  if (candidates.length === 0) {
    console.log(`✅ Nothing to do — no matching version found.`);
    return;
  }

  // Hard safety rail: never let this tool touch the currently-latest version,
  // however it was selected. The registry has no bulk-scoped-to-non-latest
  // status endpoint, so this per-version guard is what keeps a wrong
  // --versions list (or a future remote-url match) from taking down the live
  // published server.
  const latestHit = candidates.filter((rec) => officialMeta(rec)?.isLatest);
  if (latestHit.length > 0) {
    fail(
      `Refusing: ${latestHit.map((r) => r.server.version).join(", ")} ` +
        `${latestHit.length > 1 ? "are" : "is"} the current 'latest' version. ` +
        `Changing its status is a deliberate, separate action this tool won't take.`,
    );
  }

  console.log(`Versions to update (${candidates.length}):`);
  for (const rec of candidates) {
    const meta = officialMeta(rec);
    console.log(
      `  • ${rec.server.version}  ${meta?.status ?? "unknown"} → ${args.status}`,
    );
  }
  console.log("");

  if (!args.apply) {
    console.log(`Dry run — re-run with --apply to perform this change.`);
    return;
  }

  if (!args.yes) {
    const ok = await confirm(
      `Apply status change to ${candidates.length} version(s)? [y/N] `,
    );
    if (!ok) {
      console.log("Aborted.");
      return;
    }
  }

  const encoded = encodeURIComponent(args.server);
  let failures = 0;
  for (const rec of candidates) {
    const version = rec.server.version;
    const body = { status: args.status };
    if (args.message) body.statusMessage = args.message;
    const url = `${args.registry}/v0/servers/${encoded}/versions/${encodeURIComponent(version)}/status`;
    try {
      await registryFetch(url, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      console.log(`  ✅ ${version} → ${args.status}`);
    } catch (error) {
      failures++;
      console.error(`  ❌ ${version} failed: ${error.message}`);
    }
  }

  if (failures > 0) {
    fail(`${failures} update(s) failed.`);
  }
  console.log(`\n✅ Done.`);
}

main().catch((error) => {
  console.error(`❌ ${error.message}`);
  process.exit(1);
});
