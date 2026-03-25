import { BugsnagClient } from "../client";

export default BugsnagClient.createResource(
  {
    name: "event",
    path: "{id}",
  },
  async ({ client, uri, variables }) => {
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
