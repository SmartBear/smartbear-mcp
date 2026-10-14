import { Fragment, useEffect, useState } from "react";
import { useAppRuntime } from "./runtime";
import { Raw, Shell } from "./shared";

const metaKeys = new Set(["_links", "_actions", "pagination", "_embedded"]);
function payload(result: any) {
  const contractTesting = result?._meta?.contractTesting;
  if (contractTesting?.result !== undefined)
    return { data: contractTesting.result, meta: contractTesting };
  for (const item of result?.content ?? []) {
    try {
      if (typeof item.text === "string")
        return { data: JSON.parse(item.text), meta: null };
    } catch {}
  }
  return null;
}
function listFor(data: any): any[] | null {
  if (Array.isArray(data)) return data;
  for (const value of Object.values(data?._embedded ?? {}))
    if (Array.isArray(value)) return value;
  for (const [key, value] of Object.entries(data ?? {}))
    if (!metaKeys.has(key) && Array.isArray(value)) return value;
  return null;
}
function rowKey(item: any) {
  if (item && typeof item === "object" && !Array.isArray(item)) {
    for (const key of ["uuid", "id", "href", "name"]) {
      const value = item[key];
      if (typeof value === "string" || typeof value === "number")
        return `${key}:${value}`;
    }
  }
  return JSON.stringify(item);
}
export function ResultExplorer() {
  const { result, toolInput, callTool } = useAppRuntime();
  const [search, setSearch] = useState("");
  const [raw, setRaw] = useState(false);
  const [expanded, setExpanded] = useState<number>();
  const [allData, setAllData] = useState<any>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const value = payload(result);
  const resultData = value?.data;
  useEffect(() => {
    if (!resultData) return;
    setAllData(undefined);
    setExpanded(undefined);
  }, [resultData]);
  if (!value)
    return (
      <Shell title="PactFlow result">
        <p className="status">Waiting for a tool result...</p>
      </Shell>
    );
  const data = allData ?? value.data;
  const rows = listFor(data);
  const term = search.toLowerCase();
  const visible = rows?.filter((item) =>
    JSON.stringify(item).toLowerCase().includes(term),
  );
  const columns = rows
    ? [
        ...new Set(
          rows.flatMap((item) =>
            item && typeof item === "object" && !Array.isArray(item)
              ? Object.keys(item).filter(
                  (key) =>
                    !metaKeys.has(key) &&
                    (item[key] == null || typeof item[key] !== "object"),
                )
              : [],
          ),
        ),
      ].slice(0, 6)
    : [];
  const page = value.data?.pagination ?? value.data?.page;
  const goto = async (number: number, loadAll = false) => {
    setLoading(true);
    setError("");
    try {
      const args = {
        ...toolInput,
        pageNumber: loadAll ? 1 : number,
        ...(loadAll
          ? { pageSize: Math.min(Math.max(page?.totalItems ?? 1, 1), 1000) }
          : {}),
      };
      const next = await callTool(args);
      const nextPayload = payload(next);
      if (loadAll) setAllData(nextPayload?.data);
    } catch (reason: any) {
      setError(reason.message ?? "Could not load results.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Shell
      title={value.meta?.tool?.title ?? "PactFlow result"}
      subtitle={
        rows
          ? `${visible?.length} result${visible?.length === 1 ? "" : "s"}`
          : undefined
      }
    >
      <header>
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            if (event.target.value && page?.totalPages > 1 && !allData)
              void goto(1, true);
          }}
          type="search"
          placeholder="Search all results"
          aria-label="Filter result"
        />
        <button type="button" onClick={() => setRaw(!raw)}>
          {raw ? "Table view" : "Raw JSON"}
        </button>
      </header>
      {error && <p className="status">{error}</p>}
      {raw ? (
        <Raw value={value.data} />
      ) : rows ? (
        <div className="panel scroll">
          <table>
            <thead>
              <tr>
                {(columns.length ? columns : ["value"]).map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible?.map((item, index) => (
                <Fragment key={rowKey(item)}>
                  <tr
                    onClick={() =>
                      setExpanded(expanded === index ? undefined : index)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    {columns.length ? (
                      columns.map((column) => (
                        <td key={column}>{String(item?.[column] ?? "")}</td>
                      ))
                    ) : (
                      <td>{JSON.stringify(item)}</td>
                    )}
                  </tr>
                  {expanded === index && (
                    <tr>
                      <td colSpan={Math.max(1, columns.length)}>
                        <pre>{JSON.stringify(item, null, 2)}</pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="panel" style={{ padding: 10 }}>
          <pre>{JSON.stringify(value.data, null, 2)}</pre>
        </div>
      )}
      {page?.totalPages > 1 && !allData && (
        <p style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            disabled={loading || page.pageNumber <= 1}
            onClick={() => void goto(page.pageNumber - 1)}
          >
            Previous
          </button>
          <span className="muted">
            Page {page.pageNumber} of {page.totalPages}
          </span>
          <button
            type="button"
            disabled={loading || page.pageNumber >= page.totalPages}
            onClick={() => void goto(page.pageNumber + 1)}
          >
            Next
          </button>
        </p>
      )}
    </Shell>
  );
}
