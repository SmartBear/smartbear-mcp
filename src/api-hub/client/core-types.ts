// Zod schemas for SwaggerHub Core API validation to implement API Hub Core functionality

// Core API types for SwaggerHub Design functionality - generated from Zod schemas

export interface Organization {
  id: string;
  name: string;
  displayName: string;
  isDefaultOrg: boolean;
  email: string;
  platformManaged: boolean;
}

// Response collection types
export type OrganizationsListResponse = Organization[];
