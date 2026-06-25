import { z } from "zod";
import { READ_ONLY } from "./tools";
import type { SwaggerToolParams } from "./tools";

const ListTestsOutputSchema = z.array(
  z.looseObject({
    id: z.string(),
    name: z.string(),
  }),
);

export const FUNCTIONAL_TESTING_TOOLS: SwaggerToolParams[] = [
  {
    title: "List Tests",
    toolset: "Functional Testing",
    summary:
      "Lists all API tests available in your Swagger Functional Testing account. " +
      "Use this tool when you need to discover available tests before running them or checking their status. " +
      "Do not use this tool to retrieve test execution results or history.",
    ...READ_ONLY,
    handler: "listFunctionalTestingTests",
    outputSchema: ListTestsOutputSchema,
  },
];
