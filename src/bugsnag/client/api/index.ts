import type {
  OrganizationApiView,
  ProjectApiView,
  ReleaseApiView,
  ReleaseGroup,
} from "./api.js";

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
} from "./api.js";
export { CurrentUserAPI } from "./CurrentUser.js";
export { Configuration } from "./configuration.js";
export { ErrorAPI } from "./Error.js";
export { ProjectAPI } from "./Project.js";

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
