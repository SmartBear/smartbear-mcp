# Insight Hub

Fetch details of your app crashes and errors from your [Insight Hub](https://www.smartbear.com/insight-hub) dashboard for your LLM to help you diagnose and fix.

To connect an MCP server, you will need to create a personal auth token from the user settings page on your Insight Hub dashboard. If you wish to interact with only one Insight Hub project, we also recommend setting `INSIGHT_HUB_PROJECT_API_KEY` to reduce the scope of the conversation.

## Example prompts

- "Help me fix this crash from Insight Hub: https://app.bugsnag.com/my-org/my-project/errors/1a2b3c4d5e6f7g8h9i0j1k2l?&event_id=1a2b3c4d5e6f7g8h9i0j1k2l"
- "What are my top events for the 'example' project in insight hub?"

## Environment Variables

- `INSIGHT_HUB_AUTH_TOKEN`: (Required) The auth token for your account from your Insight Hub dashboard, under **Personal auth tokens** in user settings.
- `INSIGHT_HUB_PROJECT_API_KEY`: (Optional) The API key for the Insight Hub project you wish to interact with. Use this to scope all operations to a single project.
- `INSIGHT_HUB_ENDPOINT`: (Optional) The API server to connect to. Use this for on-premise installations to point to your own endpoint (e.g. `https://your.api.server`).

## Tools

1. `list_insight_hub_projects`
   - List all projects in an organization.
   - Multi-project mode only.
2. `get_insight_hub_error`
   - Get error details from a project.
3. `get_insight_hub_error_latest_event`
   - Get the latest event for an error.
4. `get_insight_hub_event_details`
   - Get details of a specific event.
6. `get_project_event_filters`
   - List the filters available for a project.
5. `list_insight_hub_project_errors`
   - List and filter the errors from a project.

## Resources

- **insight_hub_event**
  - URI Template: `insighthub://event/{id}`
  - Description: Fetches details for a specific event by its event ID. Returns the event details in JSON format.
  - Example usage: Retrieve event details for debugging or analysis by referencing the event ID.