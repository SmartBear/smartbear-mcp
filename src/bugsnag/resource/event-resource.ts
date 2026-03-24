import { Resource } from "../../common/resources";
import type { BugsnagClient } from "../client";

export const eventResource = new Resource(
  {
    name: "event",
    path: "{id}",
  },
  (client: BugsnagClient) => async (uri, variables, _extra) => {
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(await client.getEvent(variables.id)),
        },
      ],
    };
  },
);
