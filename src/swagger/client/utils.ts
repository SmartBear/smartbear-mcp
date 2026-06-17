import type { SwaggerConfiguration } from "./configuration";
import type { TableOfContentsItem } from "./portal-types";

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

  if (slug.length < 3) {
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

    const nestedMatch = findTableOfContentsItem(item.children ?? [], targetId);
    if (nestedMatch) {
      return nestedMatch;
    }
  }

  return null;
}

/**
 * Build the live URL or previewUrl for a published portal product.
 */
export function buildPortalLiveUrl(
  config: SwaggerConfiguration,
  portal: PortalHostSource,
  productSlug: string | undefined,
  section: UrlSegmentSource,
  tocItem: UrlSegmentSource,
  preview: boolean = false,
): string {
  const host = portal?.customDomain ?? portal?.subdomain;
  const portalUiDomain = portal?.customDomain
    ? ""
    : config.getPortalUiDomainSuffix();

  if (!host || !productSlug) {
    return "";
  }

  const baseUrl = `https://${host}${portalUiDomain}/${productSlug}`;
  const previewSuffix = preview ? "?preview=product" : "";

  if (section?.slug && tocItem?.slug) {
    return `${baseUrl}/${section.slug}/${tocItem.slug}${previewSuffix}`;
  }

  return `${baseUrl}${previewSuffix}`;
}
