import type {
  OrganizationApiView,
  ProjectApiView,
  ReleaseApiView,
  ReleaseGroup,
} from "./api.ts";

// Exporting all the types required outside of the api module - all imports from the tool should come from here

export {
  CurrentUserApiFetchParamCreator,
  ErrorApiView,
  ErrorsApiFetchParamCreator,
  ErrorUpdateRequest,
  EventApiView,
  EventField,
  OrganizationApiView,
  PivotApiView,
  ProjectNetworkGroupingRuleset,
  ProjectsApiFetchParamCreator,
  Span,
  SpanGroup,
  TraceField,
} from "./api.ts";
export { CurrentUserAPI } from "./CurrentUser.ts";
export { Configuration } from "./configuration.ts";
export { ErrorAPI } from "./Error.ts";
export { ProjectAPI } from "./Project.ts";

export interface Organization extends OrganizationApiView {
  id: string; // ID is always present
}

export interface Project extends ProjectApiView {
  id: string; // ID is always present
}

export interface Build extends ReleaseApiView {
  id: string; // ID is always present
}

export interface Release extends ReleaseGroup {
  id: string; // ID is always present
}
