import { useAppRuntime } from "./runtime";
import { appData, label, Raw, Shell } from "./shared";
export function PacticipantNetwork() {
  const { result } = useAppRuntime();
  const data = appData(result, "pacticipantNetwork");
  if (!data)
    return (
      <Shell title="Service blast radius">
        <p className="status">Waiting for pacticipant network...</p>
      </Shell>
    );
  const center = label(
    data.pacticipant ?? data.name ?? data.pacticipantName,
    "Unknown service",
  );
  const inbound: string[] = [];
  const outbound: string[] = [];
  for (const integration of data.integrations ?? []) {
    const consumer = label(
      integration.consumer ??
        integration.consumerName ??
        integration.consumerPacticipant,
      "Unknown service",
    );
    const provider = label(
      integration.provider ??
        integration.providerName ??
        integration.providerPacticipant,
      "Unknown service",
    );
    if (provider === center) inbound.push(consumer);
    else if (consumer === center) outbound.push(provider);
  }
  const list = (items: string[]) =>
    items.length ? (
      <ul>
        {[...new Set(items)].map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    ) : (
      <p className="empty">None recorded</p>
    );
  return (
    <Shell
      title="Service blast radius"
      subtitle={`${inbound.length + outbound.length} relationships`}
    >
      <section className="panel" style={{ padding: 12 }}>
        <b>{center}</b>
        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            marginTop: 12,
          }}
        >
          <div>
            <h2>Consumers depending on this service</h2>
            {list(inbound)}
          </div>
          <div>
            <h2>Providers this service depends on</h2>
            {list(outbound)}
          </div>
        </div>
      </section>
      <Raw value={data} />
    </Shell>
  );
}
