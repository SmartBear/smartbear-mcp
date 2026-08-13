import { z } from "zod";

// Zod schemas for SwaggerHub User Management API validation

// User Management API types for organization management functionality

export interface Organization {
  id: string; // UUID of the organization
  name: string; // Organization name (identifier)
  description?: string; // Organization description
  email?: string; // Organization email
  url?: string; // Organization website
  memberCount?: number; // Total number of members
}

// Exposed to agents. The User Management API may return admin email addresses, but we strip them at the MCP boundary.
export type OrganizationListItem = Omit<Organization, "email">;

// Pagination support for User Management API
export interface PagedResult {
  totalCount: number; // Total number of results
  pageSize: number; // Requested number of results per page
  page: number; // 0-based index of current page
}

// Response from User Management API /orgs endpoint
export interface OrganizationsListResponse extends PagedResult {
  items: OrganizationListItem[]; // List of organizations
}

// Query parameters for getting organizations
export const OrganizationsQuerySchema = z.object({
  q: z
    .string()
    .optional()
    .describe(
      "Search organizations by partial or full name (case-insensitive)",
    ),
  sortBy: z
    .enum(["NAME", "EMAIL"])
    .optional()
    .describe("The property to sort the results by"),
  order: z.enum(["ASC", "DESC"]).optional().describe("Sort order"),
  page: z
    .number()
    .min(0)
    .optional()
    .describe("0-based index of the page to return"),
  pageSize: z
    .number()
    .min(1)
    .max(1000)
    .optional()
    .describe("Number of results per page to return"),
});

export type OrganizationsQueryParams = z.infer<typeof OrganizationsQuerySchema>;

export const OrganizationsListOutputSchema = z.object({
  totalCount: z.number().optional(),
  pageSize: z.number().optional(),
  page: z.number().optional(),
  items: z
    .array(
      z.looseObject({
        id: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        url: z.string().optional(),
        memberCount: z.number().optional(),
      }),
    )
    .optional(),
});
