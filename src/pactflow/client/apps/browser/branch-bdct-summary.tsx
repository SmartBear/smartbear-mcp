import { useAppRuntime } from "./runtime";
import { appData, label, Raw, Shell } from "./shared";

type Tone = "ok" | "fail" | "warn";

function tone(value: unknown): Tone {
  const normalized = String(value).toLowerCase();
  if (value === true || /pass|success|verified|ok/.test(normalized))
    return "ok";
  if (value === false || /fail|error|incompatible|unverified/.test(normalized))
    return "fail";
  return "warn";
}

function outcome(value: unknown, seen = new Set<unknown>()): unknown {
  if (!value || typeof value !== "object" || seen.has(value)) return undefined;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = outcome(item, seen);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  const record = value as Record<string, unknown>;
  for (const key of [
    "outcome",
    "status",
    "success",
    "verified",
    "verificationStatus",
  ]) {
    if (record[key] !== undefined) return record[key];
  }
  for (const item of Object.values(record)) {
    const found = outcome(item, seen);
    if (found !== undefined) return found;
  }
  return undefined;
}

export function BranchBdctSummary() {
  const { result } = useAppRuntime();
  const data = appData(result, "branchBdctSummary") as
    | {
        pacticipantName?: string;
        branches?: Array<Record<string, unknown>>;
      }
    | undefined;
  const branches = data?.branches ?? [];

  if (!data) {
    return (
      <Shell title="Branch BDCT summary">
        <p className="status">Waiting for branch verification results...</p>
      </Shell>
    );
  }

  return (
    <Shell title="Branch BDCT summary" subtitle={label(data.pacticipantName)}>
      {branches.length ? (
        <div className="panel scroll">
          <table>
            <thead>
              <tr>
                <th>Branch</th>
                <th>Latest version</th>
                <th>Cross-contract status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => {
                const value = branch.error
                  ? "error"
                  : (branch.status ?? outcome(branch.bdct));
                const state = tone(value);
                return (
                  <tr
                    key={`${String(branch.branchName ?? branch.name ?? "branch")}-${String(branch.version ?? "latest")}`}
                  >
                    <td>
                      <b>{label(branch.branchName ?? branch.name)}</b>
                    </td>
                    <td>{label(branch.version, "No published version")}</td>
                    <td>
                      <span className={`badge ${state}`}>
                        {label(value, "Unknown")}
                      </span>
                    </td>
                    <td className="muted">
                      {label(
                        branch.error ?? branch.reason,
                        "BDCT result available",
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty">No branches were returned for this pacticipant.</p>
      )}
      <Raw value={data} />
    </Shell>
  );
}
