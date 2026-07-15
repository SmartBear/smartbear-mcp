#!/usr/bin/env node

/**
 * registry-remove-remote.js
 *
 * Removes a `remotes[].url` entry from one or more versions of a server that is
 * published to the official MCP registry (registry.modelcontextprotocol.io).
 *
 * Why this exists:
 *   The registry rejects publishing a remote URL that is already claimed by any
 *   non-deleted version of another server (see `validateNoDuplicateRemoteURLs`
 *   in modelcontextprotocol/registry). To move a remote URL to a new server
 *   (e.g. hand `https://swagger.mcp.smartbear.com/mcp` from
 *   `com.smartbear/smartbear-mcp` to `com.smartbear/swagger-mcp`), every active
 *   version that still lists that URL must have it removed first.
 *
 *   Editing (rather than deleting) the old versions frees the URL WITHOUT
 *   destroying version history — the versions stay `active`, they just no
 *   longer advertise the remote.
 *
 * This is generic: pass any server name, any remote URL, and any set of
 * versions, so it can be reused for future remote-URL migrations.
 *
 * Usage:
 *   node scripts/registry-remove-remote.js \
 *     --server com.smartbear/smartbear-mcp \
 *     --remote-url https://swagger.mcp.smartbear.com/mcp \
 *     [--versions 0.25.0,0.26.0,0.27.0]   # default: every version that has the URL
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
 *   The token must carry `edit` permission for the server's namespace (the same
 *   permission publishing uses). A 403 means the token lacks edit scope — fall
 *   back to the OSS admins in Discord #registry-dev.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";

const DEFAULT_REGISTRY = "https://registry.modelcontextprotocol.io";
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
    versions: undefined, // array | undefined (undefined = auto-detect)
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
  if (!args.remoteUrl) fail("--remote-url is required");
  return args;
}

function printHelp() {
  console.log(
    "Remove a remote URL from versions of an MCP registry server.\n\n" +
      "Required:\n" +
      "  --server <name>        e.g. com.smartbear/smartbear-mcp\n" +
      "  --remote-url <url>     the remotes[].url to strip\n\n" +
      "Optional:\n" +
      "  --versions a,b,c       explicit versions (default: every version that has the URL)\n" +
      `  --registry <url>       default: ${DEFAULT_REGISTRY}\n` +
      "  --token <jwt>          default: $MCP_REGISTRY_TOKEN or ~/.config/mcp-publisher/token.json\n" +
      "  --apply                perform the edits (default is a dry run)\n" +
      "  --yes, -y              skip the confirmation prompt when applying\n",
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
    "No registry token found. Provide --token, set $MCP_REGISTRY_TOKEN, or run " +
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

function statusOf(record) {
  return record._meta?.["io.modelcontextprotocol.registry/official"]?.status;
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

  console.log(`Registry : ${args.registry}`);
  console.log(`Server   : ${args.server}`);
  console.log(`Remote   : ${args.remoteUrl}`);
  console.log(`Mode     : ${args.apply ? "APPLY" : "dry-run"}\n`);

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
        "unexpected API response shape, aborting.",
    );
  }

  // Candidate = version whose server JSON still lists the remote URL.
  let candidates = allVersions.filter((rec) =>
    serverHasRemote(rec.server, args.remoteUrl),
  );

  // Restrict to an explicit version list if provided.
  if (args.versions) {
    const wanted = new Set(args.versions);
    const matched = candidates.filter((rec) => wanted.has(rec.server.version));
    const found = new Set(matched.map((rec) => rec.server.version));
    for (const v of args.versions) {
      if (!found.has(v)) {
        // Distinguish "version doesn't have the URL" from "version doesn't exist".
        const exists = allVersions.some((rec) => rec.server.version === v);
        console.warn(
          exists
            ? `⚠️  ${v}: does not reference ${args.remoteUrl}, skipping`
            : `⚠️  ${v}: no such version, skipping`,
        );
      }
    }
    candidates = matched;
  }

  if (candidates.length === 0) {
    console.log(
      "✅ Nothing to do — no matching version references the remote URL.",
    );
    return;
  }

  console.log(`Versions to edit (${candidates.length}):`);
  for (const rec of candidates) {
    const status = statusOf(rec) ?? "unknown";
    const remaining = (rec.server.remotes ?? [])
      .filter((r) => r.url !== args.remoteUrl)
      .map((r) => r.url);
    console.log(
      `  • ${rec.server.version} [${status}]  remotes after edit: ` +
        `${remaining.length ? remaining.join(", ") : "(none)"}`,
    );
  }
  console.log("");

  if (!args.apply) {
    console.log("Dry run — re-run with --apply to perform these edits.");
    return;
  }

  if (!args.yes) {
    const ok = await confirm(`Apply ${candidates.length} edit(s)? [y/N] `);
    if (!ok) {
      console.log("Aborted.");
      return;
    }
  }

  const encoded = encodeURIComponent(args.server);
  let failures = 0;
  for (const rec of candidates) {
    const version = rec.server.version;
    const updated = {
      ...rec.server,
      remotes: (rec.server.remotes ?? []).filter(
        (r) => r.url !== args.remoteUrl,
      ),
    };
    const url = `${args.registry}/v0/servers/${encoded}/versions/${encodeURIComponent(version)}`;
    try {
      await registryFetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updated),
      });
      console.log(`  ✅ ${version} updated`);
    } catch (error) {
      failures++;
      console.error(`  ❌ ${version} failed: ${error.message}`);
    }
  }

  if (failures > 0) {
    fail(
      `${failures} edit(s) failed. A 403 means the token lacks 'edit' scope for ` +
        "this namespace — escalate to the OSS admins in Discord #registry-dev.",
    );
  }
  console.log(
    "\n✅ Done. The remote URL is now free to claim on another server.",
  );
}

main().catch((error) => {
  console.error(`❌ ${error.message}`);
  process.exit(1);
});
