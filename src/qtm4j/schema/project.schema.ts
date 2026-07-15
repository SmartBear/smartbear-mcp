/**
 * QTM4J Project Schemas
 *
 * Zod schemas for project-related API requests and responses.
 */
import { z } from "zod";
import { PAGINATION, SCHEMA_DESCRIPTIONS } from "../config/constants.ts";

export const ProjectSchema = z
  .object({
    id: z.number().describe("Project ID"),
    key: z.string().describe("Project key (e.g., 'SCRUM', 'AD')"),
    name: z.string().describe("Project name"),
    favorite: z
      .boolean()
      .optional()
      .describe("Whether project is marked as favorite"),
    avatarUrl: z.string().optional().nullable().describe("Project avatar URL"),
    projectTypeKey: z
      .string()
      .optional()
      .nullable()
      .describe("Project type key (e.g., 'software')"),
    qmetryEnabled: z
      .boolean()
      .optional()
      .describe("Whether QMetry is enabled for this project"),
  })
  .passthrough()
  .describe(SCHEMA_DESCRIPTIONS.PROJECT_OBJECT);

/** POST /rest/api/latest/projects */
export const GetProjectsBody = z.object({
  projectId: z.number().optional().describe("Filter by specific project ID"),
  search: z.string().optional().describe(SCHEMA_DESCRIPTIONS.SEARCH_TEXT),
  qmetryEnabled: z
    .boolean()
    .optional()
    .describe(SCHEMA_DESCRIPTIONS.QMETRY_ENABLED),
  startAt: z
    .number()
    .min(PAGINATION.MIN_ALLOWED_RESULTS - 1)
    .default(PAGINATION.DEFAULT_START_AT)
    .describe(SCHEMA_DESCRIPTIONS.START_AT),
  maxResults: z
    .number()
    .min(PAGINATION.MIN_ALLOWED_RESULTS)
    .max(PAGINATION.MAX_ALLOWED_RESULTS)
    .default(PAGINATION.DEFAULT_MAX_RESULTS_PROJECTS)
    .describe(SCHEMA_DESCRIPTIONS.MAX_RESULTS_PROJECTS),
});

export const GetProjectsResponse = z.object({
  total: z
    .number()
    .min(PAGINATION.MIN_ALLOWED_RESULTS - 1)
    .describe("Total number of projects"),
  data: z.array(ProjectSchema).describe("List of projects"),
});

export type GetProjectsResponseType = z.infer<typeof GetProjectsResponse>;

/** set_project_context input */
export const SetProjectContextBody = z.object({
  projectKey: z
    .string()
    .describe(
      "Project key (e.g., 'SCRUM'). Use the get_projects tool to discover available project keys.",
    ),
});

export const SetProjectContextResponse = z.object({
  projectId: z.number().describe("Numeric project ID"),
  projectKey: z.string().describe("Project key"),
  projectName: z.string().describe("Project name"),
  message: z.string().describe("Confirmation message"),
  availableFields: z
    .record(z.string(), z.record(z.string(), z.string()))
    .optional()
    .describe(
      "Available field values keyed by field name (e.g. 'priority', 'testcase_status'). " +
        "Use these to map user input via NLP (e.g. user says 'Major' → send 'High').",
    ),
});

export type SetProjectContextBodyType = z.infer<typeof SetProjectContextBody>;
export type SetProjectContextResponseType = z.infer<
  typeof SetProjectContextResponse
>;
