![bearq.png](./images/embedded/bearq.png)

The BearQ client provides AI-powered QA test management and execution capabilities. Tools for BearQ require a `BEARQ_API_TOKEN`.

## Environment Variables

| Variable             | Required | Description                                                                     |
| -------------------- | -------- | ------------------------------------------------------------------------------- |
| `BEARQ_API_TOKEN`    | Yes      | BearQ workspace API token (Bearer). Generate from your workspace settings.      |
| `BEARQ_API_BASE_URL` | No       | Override the BearQ API base URL. Defaults to `https://api.bearq.smartbear.com`. |

> **Switching workspaces:** To use a different workspace, swap `BEARQ_API_TOKEN` and restart the MCP server.

## Available Tools

### Running Tests

#### `bearq_run_regression_tests`

- Purpose: Runs the full BearQ regression suite — every regression-ready test case in the workspace.
- Parameters: `environment` (optional) — target environment name to run against; omit to use the workspace default.
- Returns: Task IDs for the started run.
- Use case: CI/CD pipelines or pre-release smoke checks.

#### `bearq_run_test_cases`

- Purpose: Runs specific BearQ regression test cases by ID.
- Parameters: `testCaseIds` — list of regression test case IDs. `environment` (optional) — target environment name to run against; omit to use the workspace default.
- Returns: Task IDs for the started run.
- Use case: Targeted re-run of a subset of regression tests after a code change.

#### `bearq_run_tests_in_functional_areas`

- Purpose: Runs every regression test case tagged with one or more functional areas.
- Parameters: `functionalAreas` — list of functional area IDs or names. `environment` (optional) — target environment name to run against; omit to use the workspace default.
- Returns: Task IDs for the started run.
- Use case: Run only the tests relevant to a feature area touched by a change.

---

### Deleting Tests

#### `bearq_delete_test_cases`

- Purpose: Deletes specific BearQ test cases by ID.
- Parameters: `testCaseIds` — list of test case IDs.
- Returns: `{ results }` — per-id `{ testCaseId, deleted }` (with an `error` string when a delete fails).
- Use case: Remove tests you no longer want. Works on any unprotected test; protected tests are rejected. Deletion is reversible — tests are archived and can be restored. Deleting a draft test also stops its autonomous refinement.

---

### Exploring the Application

#### `bearq_expand_application_model`

- Purpose: Explores the live application to discover or update its pages and elements in BearQ's application model.
- Parameters: `functionalArea` (optional) — functional area ID or name to scope exploration.
- Returns: Task ID for the started exploration.
- Use case: After a new feature ships, run exploration to keep the application model current.

---

### QA Lead

#### `bearq_chat_with_qa_lead`

- Purpose: Sends an open-ended instruction to BearQ's QA lead agent.
- Parameters: `instruction` — natural language instruction.
- Returns: Task ID for the started QA lead task.
- Use case: Catch-all when no other BearQ tool fits. The QA lead can list, create, and update test cases, manage functional areas, and read the application model — enough surface area to handle most QA workflow requests.

---

### Environments

#### `bearq_list_environments`

- Purpose: Lists the environments configured in the workspace.
- Parameters: None.
- Returns: `{ environments }` — each with `id`, `name`, `url`, `isDefault`, `createdAt`, and `updatedAt`.
- Use case: Discover valid environment names to pass to the run tools, and identify the workspace default.

---

### Task Management

#### `bearq_get_task`

- Purpose: Retrieves a task's current state, metadata, and activity log.
- Parameters: `taskId` — BearQ task ID.
- Returns: Full task object with current state, metadata, and activity log. Returns immediately — does not block on completion.
- Use case: Poll task progress or retrieve results after a test run.

#### `bearq_get_task_status`

- Purpose: Retrieves the status of a task (running / complete / error / cancelled).
- Parameters: `taskId` — BearQ task ID.
- Returns: `{ status }`.
- Use case: Lightweight status check without fetching the full task payload.

#### `bearq_stop_task`

- Purpose: Cancels a running task.
- Parameters: `taskId` — BearQ task ID.
- Returns: Empty response on success.
- Use case: Cancel a long-running test run that is no longer needed.

#### `bearq_wait_for_task`

- Purpose: Blocks until a BearQ task reaches a terminal state (completed / failed / cancelled), then returns its full metadata, activity log, and final result.
- Parameters: `taskId` — BearQ task ID.
- Returns: `{ events }` — the ordered sequence of SSE events from the BearQ task stream (`metadata`, `activityLogEntries`, and a terminal `done` or `timeout` event). The `done` event carries the task's final status and result; a `timeout` event means the task has already been terminated and no follow-up call is needed.
- Use case: Wait on a test run and inspect results in one call. Blocks for the lifetime of the task — use `bearq_get_task_status` for a quick non-blocking check.
