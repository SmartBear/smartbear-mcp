import type { ProjectApiView, ReleaseApiView, ReleaseGroup } from "./api.js";

// Exporting all the types required outside of the api module - all imports from the tool should come from here

export {
  ErrorUpdateRequest,
  EventField,
  PerformanceFilter,
} from "./api.js";
export { CurrentUserAPI, Organization } from "./CurrentUser.js";
export { Configuration } from "./configuration.js";
export { ErrorAPI } from "./Error.js";
export { ProjectAPI } from "./Project.js";

export interface Project extends ProjectApiView {
  id: string; // ID is always present
}

export interface Build extends ReleaseApiView {
  id: string; // ID is always present
}

export interface Release extends ReleaseGroup {
  id: string; // ID is always present
}
