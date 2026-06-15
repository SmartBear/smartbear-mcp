
import type { SwaggerConfiguration } from "./configuration";
import type { TableOfContentsItem } from "./portal-types";

type UrlSegmentSource = { slug?: string } | null;

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
 * Build the live URL for a published portal product.
 */
export function buildPortalLiveUrl(
  config: SwaggerConfiguration,
  host: string | undefined,
  productSlug: string | undefined,
  section: UrlSegmentSource,
  tocItem: UrlSegmentSource,
): string {
  if (!host || !productSlug) {
    return "";
  }

  const portalUiDomain = config.getPortalUiDomainSuffix();
  const baseUrl = `https://${host}${portalUiDomain}/${productSlug}`;

  if (section?.slug && tocItem?.slug) {
    return `${baseUrl}/${section.slug}/${tocItem.slug}`;
  }

  return baseUrl;
}