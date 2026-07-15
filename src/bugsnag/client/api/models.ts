import type {
  OrganizationApiView,
  ProjectApiView,
  ReleaseApiView,
  ReleaseGroup,
} from "./api.ts";

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
