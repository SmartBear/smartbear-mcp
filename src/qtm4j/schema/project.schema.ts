/**
 * QTM4J Project Schemas
 *
 * Zod schemas for project-related API requests and responses.
 */
import * as zod from "zod";
import { PAGINATION, SCHEMA_DESCRIPTIONS } from "../config/constants";

export const ProjectSchema = zod
  .object({
    id: zod.number().describe("Project ID"),
    key: zod.string().describe("Project key (e.g., 'SCRUM', 'AD')"),
    name: zod.string().describe("Project name"),
    favorite: zod
      .boolean()
      .optional()
      .describe("Whether project is marked as favorite"),
    avatarUrl: zod.string().optional().describe("Project avatar URL"),
    projectTypeKey: zod
      .string()
      .optional()
      .describe("Project type key (e.g., 'software')"),
    qmetryEnabled: zod
      .boolean()
      .optional()
      .describe("Whether QMetry is enabled for this project"),
  })
  .passthrough()
  .describe(SCHEMA_DESCRIPTIONS.PROJECT_OBJECT);

/** POST /rest/api/latest/projects */
export const GetProjectsBody = zod.object({
  projectId: zod.number().optional().describe("Filter by specific project ID"),
  search: zod.string().optional().describe(SCHEMA_DESCRIPTIONS.SEARCH_TEXT),
  qmetryEnabled: zod
    .boolean()
    .optional()
    .describe(SCHEMA_DESCRIPTIONS.QMETRY_ENABLED),
  startAt: zod
    .number()
    .min(PAGINATION.MIN_ALLOWED_RESULTS - 1)
    .default(PAGINATION.DEFAULT_START_AT)
    .describe(SCHEMA_DESCRIPTIONS.START_AT),
  maxResults: zod
    .number()
    .min(PAGINATION.MIN_ALLOWED_RESULTS)
    .max(PAGINATION.MAX_ALLOWED_RESULTS)
    .default(PAGINATION.DEFAULT_MAX_RESULTS_PROJECTS)
    .describe(SCHEMA_DESCRIPTIONS.MAX_RESULTS_PROJECTS),
});

export const GetProjectsResponse = zod.object({
  total: zod
    .number()
    .min(PAGINATION.MIN_ALLOWED_RESULTS - 1)
    .describe("Total number of projects"),
  data: zod.array(ProjectSchema).describe("List of projects"),
});

export type GetProjectsResponseType = zod.infer<typeof GetProjectsResponse>;

/** set_project_context input */
export const SetProjectContextBody = zod.object({
  projectKey: zod
    .string()
    .describe(
      "Project key (e.g., 'SCRUM'). Use the get_projects tool to discover available project keys.",
    ),
});

export const SetProjectContextResponse = zod.object({
  projectId: zod.number().describe("Numeric project ID"),
  projectKey: zod.string().describe("Project key"),
  projectName: zod.string().describe("Project name"),
  message: zod.string().describe("Confirmation message"),
  availableFields: zod
    .record(zod.string(), zod.record(zod.string(), zod.string()))
    .optional()
    .describe(
      "Available field values keyed by field name (e.g. 'priority', 'testcase_status'). " +
        "Use these to map user input via NLP (e.g. user says 'Major' → send 'High').",
    ),
});

export type SetProjectContextBodyType = zod.infer<typeof SetProjectContextBody>;
export type SetProjectContextResponseType = zod.infer<
  typeof SetProjectContextResponse
>;
