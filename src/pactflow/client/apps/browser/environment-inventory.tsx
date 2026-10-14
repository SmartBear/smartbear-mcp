import { useAppRuntime } from "./runtime";
import { appData, label, Raw, Shell } from "./shared";
export function EnvironmentInventory() {
  const { result } = useAppRuntime();
  const data = appData(result, "environmentInventory");
  if (!data)
    return (
      <Shell title="Environment version inventory">
        <p className="status">Waiting for environment versions...</p>
      </Shell>
    );
  const embedded = data._embedded ?? {};
  const supported = Array.isArray(embedded.releasedVersions);
  const items = embedded.deployedVersions ?? embedded.releasedVersions ?? [];
  return (
    <Shell
      title="Environment version inventory"
      subtitle={`${items.length} active version${items.length === 1 ? "" : "s"}`}
    >
      <div className="panel scroll">
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Version</th>
              <th>Environment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.length ? (
              items.map((item: any, index: number) => {
                const value = item._embedded ?? item;
                return (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static, never reordered
                  <tr key={index}>
                    <td>{label(value.pacticipant ?? item.pacticipant)}</td>
                    <td>{label(value.version ?? item.version)}</td>
                    <td>{label(value.environment ?? item.environment)}</td>
                    <td>
                      <span className={`badge ${supported ? "ok" : ""}`}>
                        {supported ? "supported" : "deployed"}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="empty">
                  No active versions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Raw value={data} />
    </Shell>
  );
}
