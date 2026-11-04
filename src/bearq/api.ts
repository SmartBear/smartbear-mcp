/**
 * Extracts the RFC 7807 problem `detail` from a BearQ public API error
 * response, for richer ToolError messages than a bare status line.
 */
export async function toProblemDetail(res: Response): Promise<string | null> {
  try {
    const body = (await res.json()) as { detail?: unknown };
    return typeof body.detail === "string" && body.detail ? body.detail : null;
  } catch {
    return null;
  }
}

/** ` — <problem detail>` when the error response carries one, else empty. */
export async function problemSuffix(res: Response): Promise<string> {
  const detail = await toProblemDetail(res);
  return detail ? ` — ${detail}` : "";
}
