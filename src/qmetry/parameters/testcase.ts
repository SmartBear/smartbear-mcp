import { z } from "zod";

export const TEST_CASE = {
  PARAMETERS: [
    {
      name: "projectKey", 
      type: z.string().optional(),
      description:
        "IMPORTANT: Project key determines which QMetry project to use. " +
        "If user says 'UT project', use 'UT'. If user says 'MAC project', use 'MAC'. " +
        "If user doesn't specify project, use 'default'. " +
        "ALWAYS use the SAME projectKey for both getting project info and fetching test cases. " +
        "Common keys: 'UT', 'MAC', 'VT', 'default'.",
      required: false,
      examples: ["default", "UT", "MAC", "VT", "PROJ1", "TEST9", "SANITYTEST"],
    },
    {
      name: "baseUrl",
      type: z.string().url().optional(),
      description: "Optional QMetry base URL override. Uses configured URL if not provided.",
      required: false,
    },
    {
      name: "viewId",
      type: z.number(),
      description: "ViewId for test cases - SYSTEM AUTOMATICALLY RESOLVES THIS. " +
                   "Leave empty unless you have a specific viewId. " +
                   "System will fetch project info using the projectKey and extract latestViews.TC.viewId automatically. " +
                   "Manual viewId only needed if you want to override the automatic resolution.",
      required: false,
      examples: ["162799", "167136", "167137"],
    },
    {
      name: "folderPath",
      type: z.string(),
      description: 'Folder path for test cases - SYSTEM AUTOMATICALLY SETS TO ROOT. ' +
                   'Leave empty unless you want specific folder. System will automatically use "" (root directory). ' +
                   'Only specify if user wants specific folder like "Automation/Regression".',
      required: false,
      examples: ["", "Folder/Subfolder", "Automation/Regression"],
    },
    {
      name: "folderID",
      type: z.number().optional(),
      description: "Optional folder numeric ID.",
      required: false,
      examples: ["", "491078", "491079"],
    },
    {
      name: "start",
      type: z.number().optional(),
      description: "Start offset (default 0).",
      required: false,
      examples: ["0", "100", "200"],
    },
    {
      name: "page",
      type: z.number().optional(),
      description: "Page number to return (starts from 1)",
      required: false,
      examples: ["1", "2", "3"],
    },
    {
      name: "limit",
      type: z.number().optional(),
      description: "Number of records (default 100).",
      required: false,
      examples: ["50", "100", "200"],
    },
    {
      name: "scope",
      type: z.string().optional(),
      description: "Scope of the test cases.",
      required: false,
      examples: ["", "project", "folder"],
    },
    {
      name: "showRootOnly",
      type: z.boolean().optional(),
      description: "Whether to show only root-level test cases.",
      required: false,
      examples: ["true", "false"],
    },
    {
      name: "getSubEntities",
      type: z.boolean().optional(),
      description: "Whether to include sub-entities in the results.",
      required: false,
      examples: ["true", "false"],
    },
    {
      name: "hideEmptyFolders",
      type: z.boolean().optional(),
      description: "Whether to hide empty folders in the results.",
      required: false,
      examples: ["true", "false"],
    },
    {
      name: "folderSortColumn",
      type: z.string().optional(),
      description: "folder sort column (default 'name')",
      required: false,
      examples: ["", "name", "createdOn", "modifiedOn"],
    },
    {
      name: "restoreDefaultColumns",
      type: z.boolean().optional(),
      description: "Whether to restore default columns (default 'name')",
      required: false,
      examples: ["true", "false"],
    },
    {
      name: "folderSortOrder",
      type: z.string().optional(),
      description: "folder sort order (ASC or DESC)",
      required: false,
      examples: ["ASC", "DESC"],
    },
    {
      name: "filter",
      type: z.string().optional(),
      description: 'JSON filter string for searching test cases. ' +
                   'Use format: [{"type":"string","value":"SEARCH_VALUE","field":"FIELD_NAME"}]. ' +
                   'Common fields: "entityKeyId" for test case keys (e.g., MAC-TC-1684), "name" for test case names. ' +
                   'Multiple filters can be combined with AND logic.',
      required: false,
      examples: [
        "[]",
        '[{"type":"string","value":"MAC-TC-1684","field":"entityKeyId"}]',
        '[{"type":"string","value":"Login","field":"name"}]',
        '[{"type":"string","value":"test","field":"name"},{"type":"string","value":"UT-TC-36","field":"entityKeyId"}]',
      ],
    },
    {
      name: "udfFilter",
      type: z.string().optional(),
      description: "UDF filter string (JSON) - default is '[]'",
      required: false,
      examples: ["[]", '[{"name":"My UDF","value":"Some Value"}]'],
    },
    {
      name: "tcID",
      type: z.number(),
      description: "Test Case numeric ID (required for fetching specific test case details). " +
                   "This is the internal numeric identifier, not the entity key like 'MAC-TC-1684'. " +
                   "You can get this ID from test case search results or by using filters.",
      required: true,
      examples: ["4426293", "4426294", "4426295"],
    },
    {
      name: "id",
      type: z.number(),
      description: "Test Case numeric ID (required for fetching steps or version details). " +
                   "This is the internal numeric identifier, not the entity key like 'MAC-TC-1684'. " +
                   "You can get this ID from test case search results.",
      required: true,
      examples: ["4426293", "4426294", "4426295"],
    },
    {
      name: "version",
      type: z.number(),
      description: "Test Case Version number (defaults to 1 if not specified). " +
                   "Each test case can have multiple versions for tracking changes over time.",
      required: false,
      examples: ["1", "2", "3"],
    },
  ],
};
