![Collaborator.png](./images/embedded/Collaborator.png)
The Collaborator client enables seamless interaction with SmartBear Collaborator for code review management, automation, and reporting. Tools for Collaborator require the following environment variables to be set:

- `COLLABORATOR_BASE_URL`
- `COLLABORATOR_USERNAME`
- `COLLABORATOR_LOGIN_TICKET`

These credentials are used to authenticate all API requests automatically.

---

### Available Tools

## Review Management

- **Create Collaborator Review**
  - Creates a new review. All parameters are optional.
  - Parameters:
    - `creator` (optional): Username of the review creator.
    - `title` (optional): Review title.
    - `templateName` (optional): Template name for the review.
    - `accessPolicy` (optional): Access policy (default: ANYONE).

- **Find Collaborator Review By ID**
  - Finds a review by its review ID.
  - Parameters:
    - `reviewId` (required): The review ID.

- **Get Collaborator Review Comments**
  - Retrieves comments for a review by its review ID.
  - Parameters:
    - `reviewId` (required): The review ID.

- **Create Collaborator Review Line Comment**
  - Posts a line comment on a review file.
  - Parameters:
    - `reviewId` (required): The review ID.
    - `versionId` (required): The review file version ID.
    - `lineNumber` (required): The line number to attach the comment to.
    - `comment` (required): The comment text.

- **Download Collaborator Review Diffs**
  - Downloads review diffs and decodes the ZIP payload into readable diff text.
  - Parameters:
    - `reviewId` (required): The review ID.

- **Reject Collaborator Review**
  - Rejects a review by its review ID and reason.
  - Parameters:
    - `reviewId` (required): The review ID.
    - `reason` (required): Reason for rejection.

- **Get Collaborator Reviews**
  - Retrieves reviews with optional filters.
  - Parameters:
    - `login`, `role`, `creator`, `reviewPhase`, `fullInfo`, `fromDate`, `toDate` (all optional).

- **ReviewService Action**
  - Invoke ReviewService method(eg moveReviewToAnnotatePhase, cancel, reopen, un-cancel).
  - Parameters:
  - `reviewId` (required): The review ID.

## Remote System Configuration Management

- **Create Collaborator Remote System Configuration**
  - Creates a remote system configuration (e.g., Bitbucket, GitHub, Gitlab etc).
  - Parameters:
    - `token`, `title`, `config` (required), `reviewTemplateId` (optional).

- **Edit Collaborator Remote System Configuration**
  - Edits an existing remote system configuration.
  - Parameters:
    - `id` (required), `title`, `config`, `reviewTemplateId` (optional).

- **Delete Collaborator Remote System Configuration**
  - Deletes a remote system configuration by its ID.
  - Parameters:
    - `id` (required).

- **Update Collaborator Remote System Configuration Webhook**
  - Updates the webhook for a remote system configuration.
  - Parameters:
    - `id` (required).

- **Test Collaborator Remote System configuration Connection**
  - Tests the connection for a remote system configuration.
  - Parameters:
    - `id` (required).

---

## Example Workflow

1. Create a new review.
2. Find a review by id.
3. Retrieve review comments.
4. Add a line comment to a review file.
5. Download review diffs and inspect the decoded diff text.
6. Reject a review by id and reason.
7. moveReviewToAnnotatePhase, cancel, reopen and un-cancel the review by id.
8. Manage remote system configurations (create, edit, delete, test, update webhook).

---

For troubleshooting, best practices, and more information, refer to the main MCP Server documentation.
