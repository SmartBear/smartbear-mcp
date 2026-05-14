#!/usr/bin/env node

// @ts-check

/**
 * Validate Portal Manifests
 *
 * Discovers all docs/products/*\/manifest.json files and validates each one.
 * Checks beyond what JSON Schema can express:
 *   - Duplicate slugs within a product
 *   - Parent slug references that don't resolve
 *   - Duplicate order values within the same parent
 *   - Content files missing from disk (for markdown/html types)
 */

import { statSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

// ─── Logging ──────────────────────────────────────────────────────────────────

function ts() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}
function info(msg) {
  console.log(`${ts()} [INFO] ${msg}`);
}
function error(msg) {
  console.error(`${ts()} [ERROR] ${msg}`);
}

// ─── Validation ───────────────────────────────────────────────────────────────

const VALID_CONTENT_TYPES = new Set(["markdown", "html", "apiUrl"]);

const PRODUCT_METADATA_REQUIRED = [
  "description",
  "slug",
  "public",
  "hidden",
  "logo",
  "autoPublish",
  "validateAPIs",
];
const PRODUCT_METADATA_ALLOWED = new Set([
  "description",
  "slug",
  "public",
  "hidden",
  "logo",
  "logoDark",
  "autoPublish",
  "validateAPIs",
]);
const PRODUCT_METADATA_BOOLEANS = [
  "public",
  "hidden",
  "autoPublish",
  "validateAPIs",
];
const PRODUCT_METADATA_STRINGS = ["description", "slug", "logo", "logoDark"];

const CONTENT_ITEM_REQUIRED = [
  "order",
  "parent",
  "name",
  "slug",
  "type",
  "contentUrl",
];
const CONTENT_ITEM_ALLOWED = new Set([
  "order",
  "parent",
  "name",
  "slug",
  "type",
  "contentUrl",
]);
const CONTENT_ITEM_STRINGS = ["parent", "name", "slug", "type", "contentUrl"];

function validateManifest(manifest, productDir) {
  const errors = [];

  // productMetadata
  const pm = manifest.productMetadata;
  if (!pm || typeof pm !== "object") {
    errors.push("productMetadata is required and must be an object");
    return errors;
  }
  for (const field of PRODUCT_METADATA_REQUIRED) {
    if (pm[field] === undefined)
      errors.push(`productMetadata.${field} is required`);
  }
  for (const field of PRODUCT_METADATA_BOOLEANS) {
    if (pm[field] !== undefined && typeof pm[field] !== "boolean") {
      errors.push(`productMetadata.${field} must be boolean`);
    }
  }
  for (const field of PRODUCT_METADATA_STRINGS) {
    if (pm[field] !== undefined && typeof pm[field] !== "string") {
      errors.push(`productMetadata.${field} must be a string`);
    }
  }
  for (const key of Object.keys(pm)) {
    if (!PRODUCT_METADATA_ALLOWED.has(key)) {
      errors.push(`productMetadata has unexpected property "${key}"`);
    }
  }

  // contentMetadata
  const cm = manifest.contentMetadata;
  if (!Array.isArray(cm)) {
    errors.push("contentMetadata must be an array");
    return errors;
  }

  const allSlugs = new Set(cm.map((item) => item?.slug).filter(Boolean));
  const seenSlugs = new Set();
  // Map of parent slug (or '' for root) → Map of order value → item name
  const ordersByParent = new Map();

  for (let i = 0; i < cm.length; i++) {
    const item = cm[i];

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(`contentMetadata[${i}]: must be an object`);
      continue;
    }

    const label = `contentMetadata[${i}] ("${item.name ?? "?"}")`;

    // Additional properties
    for (const key of Object.keys(item)) {
      if (!CONTENT_ITEM_ALLOWED.has(key)) {
        errors.push(`${label}: unexpected property "${key}"`);
      }
    }

    // Required fields
    for (const field of CONTENT_ITEM_REQUIRED) {
      if (item[field] === undefined)
        errors.push(`${label}: "${field}" is required`);
    }

    // Type checks
    for (const field of CONTENT_ITEM_STRINGS) {
      if (item[field] !== undefined && typeof item[field] !== "string") {
        errors.push(`${label}: "${field}" must be a string`);
      }
    }
    if (item.order !== undefined && !Number.isInteger(item.order)) {
      errors.push(`${label}: "order" must be an integer`);
    }

    // type enum
    if (item.type !== undefined && !VALID_CONTENT_TYPES.has(item.type)) {
      errors.push(
        `${label}: type must be one of [${[...VALID_CONTENT_TYPES].join(", ")}], got "${item.type}"`,
      );
    }

    // Duplicate slug
    if (item.slug) {
      if (seenSlugs.has(item.slug)) {
        errors.push(`${label}: slug "${item.slug}" is duplicated`);
      } else {
        seenSlugs.add(item.slug);
      }
    }

    // Parent slug resolves
    if (item.parent) {
      if (!allSlugs.has(item.parent)) {
        errors.push(
          `${label}: parent "${item.parent}" does not match any slug in this manifest`,
        );
      }
    }

    // Duplicate order within same parent
    if (item.order !== undefined) {
      const parentKey = item.parent ?? "";
      if (!ordersByParent.has(parentKey))
        ordersByParent.set(parentKey, new Map());
      const seen = ordersByParent.get(parentKey);
      if (seen.has(item.order)) {
        const other = seen.get(item.order);
        errors.push(
          `${label}: order ${item.order} is duplicated within parent "${parentKey || "(root)"}" (also used by "${other}")`,
        );
      } else {
        seen.set(item.order, item.name ?? item.slug);
      }
    }

    // Content file exists on disk (not applicable for apiUrl, where contentUrl is a URL)
    if (item.type !== "apiUrl" && item.contentUrl !== undefined) {
      if (!item.contentUrl) {
        errors.push(
          `${label}: "contentUrl" must not be empty for type "${item.type}"`,
        );
      } else {
        const filePath = join(productDir, item.contentUrl);
        if (!statSync(filePath, { throwIfNoEntry: false })?.isFile()) {
          errors.push(
            `${label}: contentUrl "${item.contentUrl}" not found at ${filePath}`,
          );
        }
      }
    }
  }

  return errors;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const productsDir = join(process.cwd(), "docs", "products");

  let entries;
  try {
    entries = await readdir(productsDir, { withFileTypes: true });
  } catch (err) {
    error(`Cannot read products directory "${productsDir}": ${err.message}`);
    process.exit(1);
  }

  const products = entries
    .filter((e) => e.isDirectory())
    .map((e) => ({
      name: e.name,
      dir: join(productsDir, e.name),
      manifestPath: join(productsDir, e.name, "manifest.json"),
    }))
    .filter((p) =>
      statSync(p.manifestPath, { throwIfNoEntry: false })?.isFile(),
    );

  if (products.length === 0) {
    info("No manifests found — nothing to validate.");
    return;
  }

  info(`Found ${products.length} manifest(s) to validate.`);
  let failed = false;

  for (const { name, dir, manifestPath } of products) {
    info(`Validating: ${name}/manifest.json`);

    let manifest;
    try {
      manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    } catch (err) {
      error(`  ✗ Invalid JSON: ${err.message}`);
      failed = true;
      continue;
    }

    const errors = validateManifest(manifest, dir);
    if (errors.length === 0) {
      info(`  ✓ Valid`);
    } else {
      for (const msg of errors) error(`  ✗ ${msg}`);
      failed = true;
    }
  }

  if (failed) {
    error("Manifest validation failed.");
    process.exit(1);
  }

  info("All manifests valid.");
}

main().catch((err) => {
  error(err.message ?? String(err));
  process.exit(1);
});
