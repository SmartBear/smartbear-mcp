import { useAppRuntime } from "./runtime";
import { appData, label, Metric, Raw, Shell } from "./shared";

type Entry = {
  path: string;
  value: unknown;
  state: "ok" | "fail" | "warn";
  details: Record<string, unknown>;
};
function state(value: unknown): Entry["state"] {
  const text = String(value).toLowerCase();
  return value === true || /pass|success|verified|ok/.test(text)
    ? "ok"
    : value === false || /fail|error|incompatible|unverified/.test(text)
      ? "fail"
      : "warn";
}
function entries(
  value: unknown,
  path = "verification",
  seen = new Set<unknown>(),
  out: Entry[] = [],
): Entry[] {
  if (
    !value ||
    typeof value !== "object" ||
    seen.has(value) ||
    out.length >= 80
  )
    return out;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      entries(item, `${path}[${index}]`, seen, out);
    });
    return out;
  }
  const record = value as Record<string, unknown>;
  const candidate =
    record.success ??
    record.verified ??
    record.verificationStatus ??
    record.status ??
    record.outcome;
  if (candidate !== undefined)
    out.push({
      path,
      value: candidate,
      state: state(candidate),
      details: record,
    });
  Object.entries(record).forEach(([key, item]) => {
    if (item && typeof item === "object")
      entries(item, `${path}.${key}`, seen, out);
  });
  return out;
}
export function BdctVerification() {
  const { result } = useAppRuntime();
  const data = appData(result, "bdctVerification");
  if (!data)
    return (
      <Shell title="BDCT verification">
        <p className="status">Waiting for verification results...</p>
      </Shell>
    );
  const items = entries(data);
  const count = (tone: Entry["state"]) =>
    items.filter((item) => item.state === tone).length;
  return (
    <Shell
      title="BDCT verification"
      subtitle={`${items.length} verification result${items.length === 1 ? "" : "s"}`}
    >
      <div className="grid metrics">
        <Metric label="passed" value={count("ok")} tone="ok" />
        <Metric label="failed" value={count("fail")} tone="fail" />
        <Metric label="unknown" value={count("warn")} tone="warn" />
      </div>
      <div className="grid">
        {items.length ? (
          items.map((item) => (
            <article
              className="panel"
              key={item.path}
              style={{
                padding: 10,
                borderLeft: `3px solid var(--${item.state === "warn" ? "muted" : item.state})`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <b>
                  {label(
                    item.details.consumerName ??
                      item.details.providerName ??
                      item.details.name,
                    item.path,
                  )}
                </b>
                <span className={`badge ${item.state}`}>
                  {String(item.value)}
                </span>
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                {Object.entries(item.details)
                  .filter(
                    ([key, value]) =>
                      !/success|verified|status|outcome|_links|_embedded/i.test(
                        key,
                      ) &&
                      ["string", "number", "boolean"].includes(typeof value),
                  )
                  .slice(0, 8)
                  .map(([key, value]) => (
                    <span key={key} style={{ marginRight: 12 }}>
                      <b>{key}: </b>
                      {String(value)}
                    </span>
                  ))}
              </div>
            </article>
          ))
        ) : (
          <p className="empty">
            No standard status fields were found. Inspect the raw result for
            provider-specific detail.
          </p>
        )}
      </div>
      <Raw value={data} />
    </Shell>
  );
}
