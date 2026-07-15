import {
  type ErrorApiView,
  type EventApiView,
  type ReleaseApiView,
  type ReleaseGroup,
  type Span,
  type SpanGroup,
  type TraceField,
  TraceFieldOptions,
} from "../client/api/api.ts";
import type { EventField, Organization, Project } from "../client/api/index.ts";

const MOCK_SPAN_DURATION_MS = 1000;
const MOCK_SPAN_START_TIME_OFFSET_MS = 1000;

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
    updated_at: new Date(),
    created_at: new Date(),
    auto_upgrade: false,
    managed_by_platform_services: false,
    ...extra,
  };
}

export function getMockProject(
  id: string,
  name?: string,
  apiKey?: string,
  extra: Partial<Project> = {},
): Project {
  return {
    id,
    name,
    api_key: apiKey,
    ...extra,
  };
}

export function getMockEventField(
  displayId: string,
  extra: Partial<EventField> = {},
): EventField {
  return {
    display_id: displayId,
    custom: false,
    filter_options: { name: "filter" },
    pivot_options: {},
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
    project_id: "proj-1",
    release_stage_name: "production",
    app_version: "1.0.0",
    first_released_at: new Date().toISOString(),
    first_release_id: "release-1",
    releases_count: 1,
    has_secondary_versions: false,
    total_sessions_count: 0,
    top_release_group: false,
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
    display_name: name,
    category: category as unknown as SpanGroup["category"],
    ...extra,
  };
}

// biome-ignore lint/complexity/useMaxParams: mock factory mirrors Span's required fields; consolidating into an options object would require touching call sites in test files owned by other in-flight work
export function getMockSpan(
  traceId: string,
  id: number,
  name: string,
  category: string,
  isFirstClass = true,
  extra: Partial<Span> = {},
): Span {
  return {
    trace_id: traceId,
    id: `span-${id}`,
    name: `span-name-${name}`,
    display_name: name,
    category,
    is_first_class: isFirstClass,
    duration: Math.round(Math.random() * MOCK_SPAN_DURATION_MS),
    timestamp: new Date(Date.now()).toISOString(),
    start_time: new Date(
      Date.now() - MOCK_SPAN_START_TIME_OFFSET_MS,
    ).toISOString(),
    time_adjustment_type:
      "unadjusted" as unknown as Span["time_adjustment_type"],
    ...extra,
  };
}

export function getMockTrace(name: string, type: string): TraceField {
  return {
    display_id: name,
    field_type: type as unknown as TraceField.FieldTypeEnum,
    filter_options: {
      name,
      description: "Cached field",
      searchable: true,
      match_types: [TraceFieldOptions.MatchTypesEnum.Eq],
    },
    custom: true,
  };
}
