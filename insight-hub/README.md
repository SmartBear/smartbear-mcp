# Insight Hub

Fetch details of your app crashes and errors from your [Insight Hub](https://www.smartbear.com/insight-hub) dashboard for you LLM to help you diagnose and fix.

## Example prompts

- "Help me fix this crash from Insight Hub: https://app.bugsnag.com/my-org/my-project/errors/1a2b3c4d5e6f7g8h9i0j1k2l?&event_id=1a2b3c4d5e6f7g8h9i0j1k2l"
- "What are my top events for the 'example' project in insight hub?"

## Environment Variables

- `INSIGHT_HUB_AUTH_TOKEN`: Required for this client. The auth token for your account from your Insight Hub dashboard, under **Personal auth tokens** in user settings.
- `MCP_SERVER_INSIGHT_HUB_API_KEY`: Optional. If set, enables error reporting of the _MCP_server_ code via the BugSnag SDK. This is useful for debugging and monitoring of the MCP server itself and shouldn't be set to the same API key as your app.

## Tools

1. `list_insight_hub_projects`
   - List all projects in an organization.
2. `get_insight_hub_error`
   - Get error details from a project.
3. `get_insight_hub_error_latest_event`
   - Get the latest event for an error.
4. `get_insight_hub_event_details`
   - Get details of a specific event on Insight Hub.

## Resources

- **insight_hub_orgs**
  - URI: `insighthub://orgs`
  - Description: Lists all organizations available to your Insight Hub account in JSON format.
  - Example usage: Retrieve a list of all organizations to get their IDs for use with other tools.

- **insight_hub_event**
  - URI Template: `insighthub://event/{id}`
  - Description: Fetches details for a specific event by its event ID. Returns the event details in JSON format.
  - Example usage: Retrieve event details for debugging or analysis by referencing the event ID.