import { useAppRuntime } from "./runtime";
import { appData, label, Metric, Raw, Shell } from "./shared";
export function DeploymentMatrix() {
  const { result } = useAppRuntime();
  const data = appData(result, "deploymentMatrix");
  if (!data)
    return (
      <Shell title="Deployment safety">
        <p className="status">Waiting for deployment results...</p>
      </Shell>
    );
  const matrix = Array.isArray(data.matrix) ? data.matrix : [];
  const deployable = data.summary?.deployable;
  return (
    <Shell
      title="Deployment safety"
      subtitle={`${matrix.length} verification${matrix.length === 1 ? "" : "s"}`}
    >
      <section
        className={`panel ${deployable === true ? "ok" : deployable === false ? "fail" : ""}`}
        style={{ padding: 12, borderLeft: "5px solid var(--accent)" }}
      >
        <b>
          {deployable === true
            ? "Safe to deploy"
            : deployable === false
              ? "Deployment blocked"
              : "Deployment status unknown"}
        </b>
        <div className="muted">
          {label(data.summary?.reason, "PactFlow did not provide a reason.")}
        </div>
      </section>
      <div className="grid metrics">
        <Metric label="passed" value={data.summary?.success ?? 0} tone="ok" />
        <Metric label="failed" value={data.summary?.failed ?? 0} tone="fail" />
        <Metric
          label="unknown"
          value={data.summary?.unknown ?? 0}
          tone="warn"
        />
        <Metric label="matrix entries" value={matrix.length} />
      </div>
      <div className="panel scroll">
        <table>
          <thead>
            <tr>
              <th>Consumer</th>
              <th>Consumer version</th>
              <th>Provider</th>
              <th>Provider version</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((entry: any, index: number) => {
              const state =
                entry.verificationResult?.success === false
                  ? "fail"
                  : entry.verificationResult?.success === true
                    ? "ok"
                    : "warn";
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: static, never reordered
                <tr key={index}>
                  <td>{label(entry.consumer)}</td>
                  <td>
                    {label(
                      entry.consumer?.version ??
                        entry.pact?.consumerVersionNumber,
                    )}
                  </td>
                  <td>{label(entry.provider)}</td>
                  <td>
                    {label(
                      entry.provider?.version ??
                        entry.pact?.providerVersionNumber,
                    )}
                  </td>
                  <td>
                    <span className={`badge ${state}`}>{state}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Raw value={data} />
    </Shell>
  );
}
