import type {
  CollaboratorApiView,
  OrganizationApiView,
  ProjectApiView,
  ReleaseApiView,
  ReleaseGroup,
} from "./api";

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
} from "./api";
export { CurrentUserAPI } from "./CurrentUser";
export { Configuration } from "./configuration";
export { ErrorAPI } from "./Error";
export { ProjectAPI } from "./Project";

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

export interface Collaborator extends CollaboratorApiView {
  id: string; // ID is always present
}

// A collaborator as returned by the List Project Collaborators tool: account
// security fields are dropped and project_roles is reduced to this project's role.
export type ProjectCollaborator = Pick<
  Collaborator,
  | "id"
  | "name"
  | "email"
  | "is_admin"
  | "pending_invitation"
  | "last_request_at"
> & {
  project_role?: string;
};
