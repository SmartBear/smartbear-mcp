import type { SwaggerConfiguration } from "./configuration.ts";
import type { TableOfContentsItem } from "./portal-types.ts";

const MIN_SLUG_LENGTH = 3;

type UrlSegmentSource = { slug?: string } | null;
type PortalHostSource = {
  customDomain?: string | null;
  subdomain?: string | null;
} | null;

export function normalizeSlug(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (slug.length < MIN_SLUG_LENGTH) {
    throw new Error(`Slug "${slug}" is too short (minimum 3 characters).`);
  }

  return slug;
}

/**
 * Recursively search for a table of contents item by ID.
 */
export function findTableOfContentsItem(
  items: TableOfContentsItem[],
  targetId: string,
): TableOfContentsItem | null {
  for (const item of items) {
    if (item.id === targetId) {
      return item;
    }

    const nestedMatch = findTableOfContentsItem(item.children, targetId);
    if (nestedMatch) {
      return nestedMatch;
    }
  }

  return null;
}

export interface PortalLiveUrlOptions {
  portal: PortalHostSource;
  productSlug: string | undefined;
  section: UrlSegmentSource;
  tocItem: UrlSegmentSource;
  preview?: boolean;
}

/**
 * Build the live URL or previewUrl for a published portal product.
 */
export function buildPortalLiveUrl(
  config: SwaggerConfiguration,
  options: PortalLiveUrlOptions,
): string {
  const { portal, productSlug, section, tocItem, preview = false } = options;
  const host = portal?.customDomain ?? portal?.subdomain;
  const portalUiDomain = portal?.customDomain
    ? ""
    : config.getPortalUiDomainSuffix();

  if (!(host && productSlug)) {
    return "";
  }

  const baseUrl = `https://${host}${portalUiDomain}/${productSlug}`;
  const previewSuffix = preview ? "?preview=product" : "";

  if (section?.slug && tocItem?.slug) {
    return `${baseUrl}/${section.slug}/${tocItem.slug}${previewSuffix}`;
  }

  return `${baseUrl}${previewSuffix}`;
}
