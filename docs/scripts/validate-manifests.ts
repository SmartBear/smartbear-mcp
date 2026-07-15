import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

function ts(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}
function info(msg: string): void {
  console.log(`${ts()} [INFO] ${msg}`);
}
function error(msg: string): void {
  console.error(`${ts()} [ERROR] ${msg}`);
}

async function main(): Promise<void> {
  const root = process.cwd();
  const productsDir = join(root, "docs", "products");
  const schema = join(root, "docs", "schemas", "manifest.schema.json");

  let entries: Awaited<ReturnType<typeof readdir>>;
  try {
    entries = await readdir(productsDir, { withFileTypes: true });
  } catch (err) {
    error(
      `Cannot read products directory "${productsDir}": ${(err as Error).message}`,
    );
    process.exit(1);
  }

  const manifests = entries
    .filter((e) => e.isDirectory())
    .map((e) => join(productsDir, e.name, "manifest.json"))
    .filter((p) => statSync(p, { throwIfNoEntry: false })?.isFile());

  if (manifests.length === 0) {
    info("No manifests found — nothing to validate.");
    return;
  }

  info(`Found ${manifests.length} manifest(s) to validate.`);
  let failed = false;

  for (const manifest of manifests) {
    const label = manifest.slice(root.length + 1);
    info(`Validating: ${label}`);

    const result = spawnSync(
      "npx",
      [
        "-y",
        "ajv-cli",
        "validate",
        "-s",
        schema,
        "-d",
        manifest,
        "--spec=draft2020",
      ],
      { encoding: "utf8", cwd: root },
    );

    if (result.status === 0) {
      info("  ✓ Valid");
    } else {
      const output = (result.stdout + result.stderr).trim();
      for (const line of output.split("\n").filter(Boolean)) {
        error(`  ${line}`);
      }
      failed = true;
    }
  }

  if (failed) {
    error("Manifest validation failed.");
    process.exit(1);
  }

  info("All manifests valid.");
}

main().catch((err: unknown) => {
  error((err as Error).message ?? String(err));
  process.exit(1);
});
