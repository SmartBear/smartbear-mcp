import type { ReactNode } from "react";

export const css = `
:root{--bg:var(--color-background-primary,#f7f9fb);--panel:var(--color-background-secondary,#fff);--fg:var(--color-text-primary,#17212b);--muted:var(--color-text-secondary,#5d6b79);--border:var(--color-border-primary,#d9e1e8);--accent:#1677a8;--ok:#138a52;--warn:#b77913;--fail:#d9433d}[data-theme=dark]{--bg:var(--color-background-primary,#10161c);--panel:var(--color-background-secondary,#18212a);--fg:var(--color-text-primary,#edf3f7);--muted:var(--color-text-secondary,#a3b0bb);--border:var(--color-border-primary,#34424e);--accent:#55bce9;--ok:#4bce91;--warn:#e7a540;--fail:#ef665e}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:13px var(--font-sans,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)}main{padding:12px}header{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:10px}h1{margin:0;font-size:15px}.muted,.status,.empty{color:var(--muted)}.panel{border:1px solid var(--border);border-radius:6px;background:var(--panel)}.grid{display:grid;gap:8px}.metrics{grid-template-columns:repeat(auto-fit,minmax(120px,1fr));margin:10px 0}.metric{padding:9px}.metric b{display:block;font-size:18px}.metric.ok b{color:var(--ok)}.metric.fail b{color:var(--fail)}.metric.warn b{color:var(--warn)}button,input{font:inherit}button{border:1px solid var(--border);background:var(--panel);color:var(--fg);border-radius:5px;padding:5px 10px;cursor:pointer}button:disabled{opacity:.5}input{width:100%;padding:8px;border:1px solid var(--border);border-radius:5px;background:var(--panel);color:var(--fg)}table{width:100%;border-collapse:collapse;min-width:520px}th,td{padding:8px 10px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top}th{font-size:11px;color:var(--muted);text-transform:uppercase}.scroll{overflow:auto}.badge{display:inline-block;border-radius:999px;padding:3px 7px;color:#fff;font-size:11px;background:var(--muted)}.badge.ok{background:var(--ok)}.badge.fail{background:var(--fail)}.badge.warn{background:var(--warn)}pre{white-space:pre-wrap;overflow-wrap:anywhere;color:var(--muted)}details{margin-top:8px}@media(max-width:520px){main{padding:10px}}`;

export function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main>
      <header>
        <h1>{title}</h1>
        {subtitle && <span className="muted">{subtitle}</span>}
      </header>
      {children}
    </main>
  );
}
export function Raw({ value }: { value: unknown }) {
  return (
    <details>
      <summary>Raw result</summary>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}
export function Metric({
  label,
  value,
  tone = "",
}: {
  label: string;
  value: ReactNode;
  tone?: string;
}) {
  return (
    <div className={`metric panel ${tone}`}>
      <b>{value}</b>
      <span className="muted">{label}</span>
    </div>
  );
}
export function appData(result: any, key: string) {
  return result?._meta?.contractTesting?.[key];
}
export function label(value: any, fallback = "-"): string {
  if (value == null || value === "") return fallback;
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  return String(
    value.name ??
      value.displayName ??
      value.pacticipantName ??
      value.version ??
      value.number ??
      fallback,
  );
}
