import { useState } from "react";
import { useAppRuntime } from "./runtime";
import { appData, Raw, Shell } from "./shared";
export function ProviderStates() {
  const { result } = useAppRuntime();
  const [query, setQuery] = useState("");
  const data = appData(result, "providerStates");
  if (!data)
    return (
      <Shell title="Provider state coverage">
        <p className="status">Waiting for provider states...</p>
      </Shell>
    );
  const states = Array.isArray(data.providerStates) ? data.providerStates : [];
  const visible = states.filter((state: any) =>
    JSON.stringify(state).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Shell
      title="Provider state coverage"
      subtitle={`${states.length} state${states.length === 1 ? "" : "s"}`}
    >
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        type="search"
        placeholder="Filter states or consumers"
        aria-label="Filter provider states"
      />
      <div className="panel" style={{ padding: "0 10px" }}>
        {visible.length ? (
          visible.map((state: any, index: number) => (
            <article
              // biome-ignore lint/suspicious/noArrayIndexKey: static, never reordered
              key={index}
              style={{
                padding: "10px 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <b>{state.name ?? "Unnamed state"}</b>
              <div
                style={{
                  display: "flex",
                  gap: 5,
                  flexWrap: "wrap",
                  marginTop: 7,
                }}
              >
                {(state.consumers ?? []).map((consumer: string) => (
                  <span className="badge" key={consumer}>
                    {consumer}
                  </span>
                )) || <span className="empty">No consumers recorded</span>}
              </div>
            </article>
          ))
        ) : (
          <p className="empty">No matching provider states.</p>
        )}
      </div>
      <Raw value={data} />
    </Shell>
  );
}
