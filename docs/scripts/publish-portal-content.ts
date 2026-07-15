/**
 * Publish Portal Content
 *
 * Discovers all docs/products/* directories containing a manifest.json and
 * publishes each one to SwaggerHub Portal.
 *
 * Required env vars:
 *   SWAGGERHUB_API_KEY          - SwaggerHub API key
 *   SWAGGERHUB_PORTAL_SUBDOMAIN - Portal subdomain (e.g. "smartbear")
 *
 * Optional env vars:
 *   LOG_LEVEL - 1=DEBUG, 2=INFO (default), 3=WARNING, 4=ERROR
 *
 * SwaggerHub Portal API: https://app.swaggerhub.com/apis-docs/smartbear-public/swaggerhub-portal-api/0.7.0-beta
 */

import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import process from "node:process";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FetchOpts {
  json?: unknown;
  binary?: Buffer;
  contentType?: string;
}

interface Attachment {
  id: string;
  name: string;
}

interface TocItem {
  id: string;
  title: string;
  slug?: string;
  content?: { documentId?: string; type?: string; url?: string };
  children?: TocItem[];
}

interface ContentItem {
  name: string;
  slug: string;
  order: number;
  type: string;
  contentUrl: string;
  parent?: string;
}

interface ProductMetadata {
  description: string;
  slug: string;
  public: boolean;
  hidden: boolean;
  logo?: string;
  logoDark?: string;
  autoPublish: boolean;
  validateAPIs: boolean;
}

interface Manifest {
  productMetadata: ProductMetadata;
  contentMetadata: ContentItem[];
}

interface ProcessCtx {
  sectionId: string;
  productDir: string;
  manifest: Manifest;
  attachments: Attachment[];
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PORTAL_BASE_URL = "https://api.portal.swaggerhub.com/v1";
const API_KEY = process.env.SWAGGERHUB_API_KEY;
const PORTAL_SUBDOMAIN = process.env.SWAGGERHUB_PORTAL_SUBDOMAIN;
const LOG_LEVEL = Number.parseInt(process.env.LOG_LEVEL ?? "2", 10);
const DRY_RUN =
  process.env.DRY_RUN === "true" || process.argv.includes("--dry-run");

if (!DRY_RUN) {
  if (!API_KEY) {
    error("SWAGGERHUB_API_KEY is required");
    process.exit(1);
  }
  if (!PORTAL_SUBDOMAIN) {
    error("SWAGGERHUB_PORTAL_SUBDOMAIN is required");
    process.exit(1);
  }
}

// Stable fake IDs used throughout a dry run so downstream functions keep working
const FAKE = Object.freeze({
  PORTAL: "dry-portal-id",
  PRODUCT: "dry-product-id",
  SECTION: "dry-section-id",
  TOC: "dry-toc-id",
  DOC: "dry-doc-id",
  ATTACHMENT: "dry-attachment-id",
});

// ─── Logging ──────────────────────────────────────────────────────────────────

function ts(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}
function debug(msg: string): void {
  if (LOG_LEVEL <= 1) console.log(`${ts()} [DEBUG] ${msg}`);
}
function info(msg: string): void {
  if (LOG_LEVEL <= 2) console.log(`${ts()} [INFO] ${msg}`);
}
function warn(msg: string): void {
  if (LOG_LEVEL <= 3) console.warn(`${ts()} [WARNING] ${msg}`);
}
function error(msg: string): void {
  console.error(`${ts()} [ERROR] ${msg}`);
}

// ─── MIME types ───────────────────────────────────────────────────────────────

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

function mimeForFile(filename: string): string {
  return (
    MIME_MAP[extname(filename).toLowerCase()] ?? "application/octet-stream"
  );
}

// ─── HTTP client ──────────────────────────────────────────────────────────────

async function portalFetch(
  method: string,
  url: string,
  opts: FetchOpts = {},
): Promise<unknown> {
  if (DRY_RUN) {
    const label = opts.json
      ? ` ${JSON.stringify(opts.json)}`
      : opts.binary
        ? " [binary upload]"
        : "";
    info(`[DRY RUN] ${method} ${url}${label}`);
    return dryRunResponse(method, url);
  }

  debug(`${method} ${url}`);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${API_KEY}`,
  };
  let body: string | Buffer | undefined;

  if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.json);
  } else if (opts.binary !== undefined) {
    headers["Content-Type"] = opts.contentType ?? "application/octet-stream";
    body = opts.binary;
  }

  const res = await fetch(url, { method, headers, body });

  if (!res.ok) {
    const text = await res.text().catch(() => "(no body)");
    throw new Error(`${method} ${url} → ${res.status}: ${text}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/** Returns a plausible fake response so the rest of the script can keep running. */
function dryRunResponse(method: string, url: string): unknown {
  if (method === "GET") {
    if (/\/portals(\?|$)/.test(url)) return { items: [{ id: FAKE.PORTAL }] };
    if (/\/products(\?|$)/.test(url)) return { items: [] }; // "not found" → exercises create path
    if (/\/sections(\?|$)/.test(url)) return { items: [{ id: FAKE.SECTION }] };
    if (/\/table-of-contents(\?|$)/.test(url)) return { items: [] }; // empty TOC → exercises create path
    if (/\/attachments(\?|$)/.test(url)) return [];
  }
  if (method === "POST") {
    if (/\/products(\?|$)/.test(url)) return { id: FAKE.PRODUCT };
    if (/\/table-of-contents(\?|$)/.test(url))
      return { id: FAKE.TOC, documentId: FAKE.DOC };
    if (/\/attachments\//.test(url)) return { id: FAKE.ATTACHMENT };
  }
  return null;
}

function portalUrl(path: string): string {
  return `${PORTAL_BASE_URL}${path}`;
}

function portalUrlQ(path: string, params: Record<string, string>): string {
  const url = new URL(`${PORTAL_BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.toString();
}

// ─── Portal: portal & product ─────────────────────────────────────────────────

async function getPortalId(): Promise<string> {
  info(`Fetching portal ID for subdomain "${PORTAL_SUBDOMAIN}"...`);
  const data = (await portalFetch(
    "GET",
    portalUrlQ("/portals", { subdomain: PORTAL_SUBDOMAIN ?? "" }),
  )) as { items?: Array<{ id: string }> };
  const id = data?.items?.[0]?.id;
  if (!id)
    throw new Error(`No portal found for subdomain "${PORTAL_SUBDOMAIN}"`);
  info(`Portal ID: ${id}`);
  return id;
}

async function getProductId(
  portalId: string,
  productName: string,
): Promise<string | null> {
  debug(`Looking up product "${productName}"...`);
  const data = (await portalFetch(
    "GET",
    portalUrlQ(`/portals/${portalId}/products`, { name: productName }),
  )) as { items?: Array<{ id: string }> };
  return data?.items?.[0]?.id ?? null;
}

async function createProduct(
  portalId: string,
  {
    name,
    description,
    slug,
    isPublic,
    isHidden,
  }: {
    name: string;
    description: string;
    slug: string;
    isPublic: boolean;
    isHidden: boolean;
  },
): Promise<string> {
  info(`Creating product "${name}"...`);
  const data = (await portalFetch(
    "POST",
    portalUrl(`/portals/${portalId}/products`),
    {
      json: {
        type: "new",
        name,
        description,
        slug,
        public: isPublic,
        hidden: isHidden,
      },
    },
  )) as { id: string };
  info(`Created product: ${data.id}`);
  return data.id;
}

async function patchProduct(
  productId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  await portalFetch("PATCH", portalUrl(`/products/${productId}`), {
    json: fields,
  });
}

async function getDefaultSectionId(productId: string): Promise<string> {
  debug(`Fetching default section for product ${productId}...`);
  const data = (await portalFetch(
    "GET",
    portalUrl(`/products/${productId}/sections`),
  )) as { items?: Array<{ id: string }> };
  const id = data?.items?.[0]?.id;
  if (!id) throw new Error(`No section found for product ${productId}`);
  info(`Section ID: ${id}`);
  return id;
}

// ─── Portal: attachments ──────────────────────────────────────────────────────

async function getBrandingAttachments(portalId: string): Promise<Attachment[]> {
  const data = await portalFetch(
    "GET",
    portalUrlQ("/attachments", { portalId }),
  );
  return Array.isArray(data) ? (data as Attachment[]) : [];
}

async function getDocAttachments(productId: string): Promise<Attachment[]> {
  const data = await portalFetch(
    "GET",
    portalUrlQ("/attachments", { productId }),
  );
  return Array.isArray(data) ? (data as Attachment[]) : [];
}

async function uploadBrandingImage(
  portalId: string,
  productDir: string,
  imagePath: string,
): Promise<string | null> {
  const filename = basename(imagePath);
  info(`Uploading branding image "${filename}"...`);

  // Deduplication check — may fail if the API key lacks list permission; in
  // that case fall through and attempt the upload anyway.
  try {
    const existing = await getBrandingAttachments(portalId);
    const already = existing.find((a) => a.name === filename);
    if (already) {
      info(`Branding image already uploaded: ${already.id}`);
      return already.id;
    }
  } catch (err) {
    debug(
      `Cannot list branding attachments (${(err as Error).message}) — attempting upload anyway`,
    );
  }

  const fullPath = join(productDir, imagePath);
  if (!existsSync(fullPath)) {
    warn(`Branding image not found: ${fullPath}`);
    return null;
  }

  try {
    const buffer = await readFile(fullPath);
    const data = (await portalFetch(
      "POST",
      portalUrlQ(`/attachments/branding/${portalId}`, { name: filename }),
      { binary: buffer, contentType: mimeForFile(filename) },
    )) as { id?: string } | null;
    info(`Uploaded branding image: ${data?.id}`);
    return data?.id ?? null;
  } catch (err) {
    warn(
      `Branding image upload failed for "${filename}": ${(err as Error).message}`,
    );
    return null;
  }
}

async function loadDocImages(
  productId: string,
  productDir: string,
): Promise<Attachment[]> {
  const imagesDir = join(productDir, "images", "embedded");
  if (!existsSync(imagesDir)) {
    warn(`No images/embedded directory in ${productDir}`);
    return [];
  }

  const filenames = await readdir(imagesDir);

  // In dry-run mode, synthesize fake attachment records so replaceAttachmentUrls
  // can exercise the URL substitution logic without making any API calls.
  if (DRY_RUN) {
    return filenames.map((name) => ({ id: `dry-${name}`, name }));
  }

  const attachments = await getDocAttachments(productId);
  let uploaded = false;

  for (const filename of filenames) {
    if (attachments.find((a) => a.name === filename)) {
      debug(`Doc image already uploaded: ${filename}`);
      continue;
    }
    info(`Uploading doc image "${filename}"...`);
    const buffer = await readFile(join(imagesDir, filename));
    await portalFetch(
      "POST",
      portalUrlQ(`/attachments/documentation/${productId}`, { name: filename }),
      { binary: buffer, contentType: mimeForFile(filename) },
    );
    uploaded = true;
  }

  return uploaded ? getDocAttachments(productId) : attachments;
}

// ─── Portal: table of contents ────────────────────────────────────────────────

async function getTocItems(sectionId: string): Promise<TocItem[]> {
  const data = (await portalFetch(
    "GET",
    portalUrl(`/sections/${sectionId}/table-of-contents`),
  )) as { items?: TocItem[] };
  return data?.items ?? [];
}

function findInToc(items: TocItem[], title: string): TocItem | null {
  for (const item of items) {
    if (item.title === title) return item;
    if (item.children?.length) {
      const found = findInToc(item.children, title);
      if (found) return found;
    }
  }
  return null;
}

async function upsertTocMarkdown(
  sectionId: string,
  {
    title,
    slug,
    order,
    type,
    parentTocId,
  }: {
    title: string;
    slug: string;
    order: number;
    type: string;
    parentTocId: string | null;
  },
): Promise<{ tocId: string | null; documentId: string | null }> {
  info(`Upserting markdown TOC: "${title}"...`);
  const existing = findInToc(await getTocItems(sectionId), title);

  if (!existing) {
    const data = (await portalFetch(
      "POST",
      portalUrl(`/sections/${sectionId}/table-of-contents`),
      {
        json: {
          type: "new",
          title,
          slug,
          order,
          content: { type },
          ...(parentTocId ? { parentId: parentTocId } : {}),
        },
      },
    )) as { id?: string; documentId?: string } | null;
    return { tocId: data?.id ?? null, documentId: data?.documentId ?? null };
  }

  await portalFetch("PATCH", portalUrl(`/table-of-contents/${existing.id}`), {
    json: {
      title,
      order,
      ...(slug === existing.slug ? {} : { slug }),
      parentId: parentTocId ?? null,
    },
  });

  // PATCH response doesn't include documentId; re-fetch to find it
  const updated = findInToc(await getTocItems(sectionId), title);
  return {
    tocId: existing.id,
    documentId: updated?.content?.documentId ?? null,
  };
}

async function upsertTocApiRef(
  sectionId: string,
  {
    title,
    slug,
    order,
    url: apiUrl,
    parentTocId,
  }: {
    title: string;
    slug: string;
    order: number;
    url: string;
    parentTocId: string | null;
  },
): Promise<string | null> {
  info(`Upserting API reference TOC: "${title}"...`);
  const existing = findInToc(await getTocItems(sectionId), title);
  const content = { type: "apiUrl", url: apiUrl };

  if (!existing) {
    const data = (await portalFetch(
      "POST",
      portalUrl(`/sections/${sectionId}/table-of-contents`),
      {
        json: {
          type: "new",
          title,
          slug,
          order,
          content,
          ...(parentTocId ? { parentId: parentTocId } : {}),
        },
      },
    )) as { id?: string } | null;
    return data?.id ?? null;
  }

  await portalFetch("PATCH", portalUrl(`/table-of-contents/${existing.id}`), {
    json: {
      title,
      order,
      content,
      ...(slug === existing.slug ? {} : { slug }),
      parentId: parentTocId ?? null,
    },
  });
  return existing.id;
}

// ─── Portal: document content ─────────────────────────────────────────────────

async function updateDocument(
  documentId: string | null,
  content: string,
  type: string,
): Promise<void> {
  if (!documentId) {
    info("No document ID — skipping content update.");
    return;
  }
  info(`Updating document ${documentId} (${type})...`);
  await portalFetch("PATCH", portalUrl(`/documents/${documentId}`), {
    json: { content, type },
  });
}

async function publishPortalProduct(
  productId: string,
  autoPublish: boolean,
): Promise<void> {
  const preview = autoPublish ? "false" : "true";
  info(`Publishing product ${productId} (preview=${preview})...`);
  const data = (await portalFetch(
    "PUT",
    portalUrlQ(`/products/${productId}/published-content`, { preview }),
  )) as { validationMessages?: unknown[] } | null;
  if (data?.validationMessages?.length) {
    throw new Error(
      `Publish validation errors: ${JSON.stringify(data.validationMessages)}`,
    );
  }
  info("Published successfully.");
}

// ─── Content processing ───────────────────────────────────────────────────────

function replaceAttachmentUrls(
  content: string,
  type: string,
  attachments: Attachment[],
): string {
  let result = content;
  for (const { id, name } of attachments) {
    const url = `https://${PORTAL_SUBDOMAIN}.portal.swaggerhub.com/services/api/attachments/${id}`;
    if (type === "html") {
      result = result.replaceAll(
        `src="./images/embedded/${name}"`,
        `src="${url}"`,
      );
      result = result.replaceAll(
        `src='./images/embedded/${name}'`,
        `src="${url}"`,
      );
    } else {
      result = result.replaceAll(
        `![${name}](./images/embedded/${name})`,
        `![${name}](${url})`,
      );
    }
  }
  return result;
}

async function processContentItem(
  item: ContentItem,
  parentTocId: string | null,
  ctx: ProcessCtx,
  depth = 0,
): Promise<void> {
  const { sectionId, productDir, manifest, attachments } = ctx;
  const { name, slug, order, type, contentUrl } = item;

  const indent = "  ".repeat(depth);
  info(`${indent}${"─".repeat(Math.max(4, 52 - depth * 2))}`);
  info(`${indent}"${name}" (${type}) order=${order}`);

  let tocId: string | null = null;

  if (type.toLowerCase() === "apiurl") {
    tocId = await upsertTocApiRef(sectionId, {
      title: name,
      slug,
      order,
      url: contentUrl,
      parentTocId,
    });
  } else {
    const { tocId: newTocId, documentId } = await upsertTocMarkdown(sectionId, {
      title: name,
      slug,
      order,
      type,
      parentTocId,
    });
    tocId = newTocId;

    if (contentUrl) {
      const filePath = join(productDir, contentUrl);
      let rawContent: string;
      try {
        rawContent = await readFile(filePath, "utf8");
      } catch {
        throw new Error(`Content file not found: ${filePath}`);
      }
      await updateDocument(
        documentId,
        replaceAttachmentUrls(rawContent, type, attachments),
        type,
      );
    }
  }

  const children = manifest.contentMetadata
    .filter((c) => c.parent === slug)
    .sort((a, b) => a.order - b.order);

  for (const child of children) {
    await processContentItem(child, tocId, ctx, depth + 1);
  }
}

// ─── Orchestration ────────────────────────────────────────────────────────────

async function processProduct(productDir: string): Promise<void> {
  const manifestPath = join(productDir, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
  const { productMetadata, contentMetadata } = manifest;
  const productName = basename(productDir);

  info("═".repeat(60));
  info(`Product: "${productName}"`);
  info("═".repeat(60));

  const portalId = await getPortalId();
  let productId = await getProductId(portalId, productName);

  if (productId) {
    info(`Updating existing product: ${productId}`);
    await patchProduct(productId, {
      name: productName,
      description: productMetadata.description,
      slug: productMetadata.slug,
      public: productMetadata.public,
      hidden: productMetadata.hidden,
    });
  } else {
    productId = await createProduct(portalId, {
      name: productName,
      description: productMetadata.description,
      slug: productMetadata.slug,
      isPublic: productMetadata.public,
      isHidden: productMetadata.hidden,
    });
  }

  if (productMetadata.logo) {
    const logoId = await uploadBrandingImage(
      portalId,
      productDir,
      productMetadata.logo,
    );
    if (logoId) await patchProduct(productId, { branding: { logoId } });
  }
  if (productMetadata.logoDark) {
    const logoDarkId = await uploadBrandingImage(
      portalId,
      productDir,
      productMetadata.logoDark,
    );
    if (logoDarkId)
      await patchProduct(productId, {
        branding: { logoDarkModeId: logoDarkId },
      });
  }

  const sectionId = await getDefaultSectionId(productId);
  const attachments = await loadDocImages(productId, productDir);

  const ctx: ProcessCtx = { sectionId, productDir, manifest, attachments };

  const rootItems = contentMetadata
    .filter((item) => !item.parent)
    .sort((a, b) => a.order - b.order);

  if (rootItems.length === 0) {
    throw new Error(`Product "${productName}" has no root-level content items`);
  }

  for (const item of rootItems) {
    await processContentItem(item, null, ctx);
  }

  await publishPortalProduct(productId, productMetadata.autoPublish);
  info(`✓ Done: "${productName}"`);
}

async function main(): Promise<void> {
  if (DRY_RUN) {
    info("");
    info("┌─────────────────────────────────────────────────┐");
    info("│  DRY RUN — no API calls will be made            │");
    info("│  All content files will be read and validated.  │");
    info("└─────────────────────────────────────────────────┘");
    info("");
  }

  const productsDir = join(process.cwd(), "docs", "products");

  let productDirs: string[];
  try {
    const entries = await readdir(productsDir, { withFileTypes: true });
    productDirs = entries
      .filter(
        (e) =>
          e.isDirectory() &&
          existsSync(join(productsDir, e.name, "manifest.json")),
      )
      .map((e) => join(productsDir, e.name));
  } catch (err) {
    error(
      `Cannot read products directory "${productsDir}": ${(err as Error).message}`,
    );
    process.exit(1);
  }

  if (productDirs.length === 0) {
    warn(
      "No product directories with a manifest.json found — nothing to publish.",
    );
    return;
  }

  info(`Found ${productDirs.length} product(s) to publish.`);

  for (const productDir of productDirs) {
    await processProduct(productDir);
  }

  info("All products published successfully.");
}

main().catch((err: unknown) => {
  error((err as Error).message ?? String(err));
  process.exit(1);
});
