import type {
  ErrorApiView,
  EventApiView,
  ReleaseApiView,
  ReleaseGroup,
  Span,
  SpanGroup,
} from "../../../../bugsnag/client/api/api.js";
import type {
  EventField,
  Organization,
  Project,
} from "../../../../bugsnag/client/api/index.js";

export function getMockOrganization(
  id: string,
  name: string,
  slug?: string,
  extra: Partial<Organization> = {},
): Organization {
  return {
    id,
    name,
    slug: slug ?? name.toLowerCase().replace(/\s+/g, "-"),
    updatedAt: new Date(),
    createdAt: new Date(),
    autoUpgrade: false,
    managedByPlatformServices: false,
    ...extra,
  };
}

export function getMockProject(
  id: string,
  name?: string,
  apiKey?: string,
  extra: Partial<Project> = {},
): Project {
  return { id, name, apiKey, ...extra };
}

export function getMockEventField(
  displayId: string,
  extra: Partial<EventField> = {},
): EventField {
  return {
    displayId: displayId,
    custom: false,
    filterOptions: { name: "filter" },
    pivotOptions: {},
    ...extra,
  };
}

export function getMockError(
  id: string,
  extra: Partial<ErrorApiView> = {},
): ErrorApiView {
  return { id, ...extra };
}

export function getMockEvent(
  id: string,
  extra: Partial<EventApiView> = {},
): EventApiView {
  return { id, ...extra };
}

export function getMockReleaseGroup(
  id: string,
  extra: Partial<ReleaseGroup> = {},
): ReleaseGroup {
  return {
    id,
    projectId: "proj-1",
    releaseStageName: "production",
    appVersion: "1.0.0",
    firstReleasedAt: new Date().toISOString(),
    firstReleaseId: "release-1",
    releasesCount: 1,
    hasSecondaryVersions: false,
    totalSessionsCount: 0,
    topReleaseGroup: false,
    visible: true,
    ...extra,
  };
}

export function getMockRelease(
  id: string,
  extra: Partial<ReleaseApiView> = {},
): ReleaseApiView {
  return { id, ...extra };
}

export function getMockSpanGroup(
  id: number,
  name: string,
  category: string,
  extra: Partial<SpanGroup> = {},
): SpanGroup {
  return {
    id: `span-group-${id}`,
    name: `span-name-${name}`,
    displayName: name,
    category: <any>category,
    ...extra,
  };
}

export function getMockSpan(
  traceId: string,
  id: number,
  name: string,
  category: string,
  isFirstClass: boolean = true,
  extra: Partial<Span> = {},
): Span {
  return {
    traceId,
    id: `span-${id}`,
    name: `span-name-${name}`,
    displayName: name,
    category: <any>category,
    isFirstClass: isFirstClass,
    duration: Math.round(Math.random() * 1000),
    timestamp: new Date(Date.now()).toISOString(),
    startTime: new Date(Date.now() - 1000).toISOString(),
    timeAdjustmentType: <any>"unadjusted",
    ...extra,
  };
}
