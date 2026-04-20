/**
 * QTM4J REST API Schemas
 *
 * This file contains Zod schemas for validating QTM4J API requests and responses.
 * Based on QTM4J Cloud REST API documentation.
 *
 * API Documentation: https://app.swaggerhub.com/apis-docs/qmetry-ada/qtm4j_cloud/restapi
 */
import * as zod from "zod";
import { PAGINATION, SCHEMA_DESCRIPTIONS } from "./constants";

/**
 * Schema for Project object
 */
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

/**
 * Schema for Get Projects Request Body
 * POST /rest/api/latest/projects
 */
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
    .optional()
    .describe(SCHEMA_DESCRIPTIONS.START_AT),
  maxResults: zod
    .number()
    .min(PAGINATION.MIN_ALLOWED_RESULTS)
    .max(PAGINATION.MAX_ALLOWED_RESULTS)
    .default(PAGINATION.DEFAULT_MAX_RESULTS_PROJECTS)
    .optional()
    .describe(SCHEMA_DESCRIPTIONS.MAX_RESULTS_PROJECTS),
});

/**
 * Schema for Get Projects Response
 */
export const GetProjectsResponse = zod.object({
  total: zod
    .number()
    .min(PAGINATION.MIN_ALLOWED_RESULTS - 1)
    .describe("Total number of projects"),
  data: zod.array(ProjectSchema).describe("List of projects"),
});

export type GetProjectsResponseType = zod.infer<typeof GetProjectsResponse>;
