import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type {
  IntegrationsNetwork,
  NetworkEdge,
} from "../../integrations-network";
import { useAppRuntime } from "./runtime";
import { appData } from "./shared";

const W = 1100;
const H = 680;
const PALETTE = [
  "#13a085",
  "#3b82c4",
  "#d9822b",
  "#8e5bd0",
  "#d6457a",
  "#2f9e44",
  "#c9a227",
  "#e0603a",
  "#4a6fa5",
  "#16a3b8",
];
const STATUS_COLOR = {
  verified: "#1fa463",
  failed: "#e5483f",
  unverified: "#e38410",
  none: "#8b94a0",
} as const;
const EDGE_COLOR = {
  verified: "#1fa463",
  failed: "#e5483f",
  unverified: "#8b7be0",
} as const;
type NodeStatus = keyof typeof STATUS_COLOR;

type SimNode = SimulationNodeDatum & {
  id: string;
  group: string;
  degree: number;
  r: number;
  status: NodeStatus;
  bdct: boolean;
  pinned?: boolean;
};
type SimLink = SimulationLinkDatum<SimNode> & { edge: NetworkEdge };
type Viewport = { x: number; y: number; k: number };

const css = `
.ig{position:relative}
.ig-bar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:8px}
.ig-bar input{flex:1 1 180px;min-width:140px;width:auto}
.ig-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
.ig-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border);border-radius:999px;padding:3px 9px;font-size:11px;cursor:pointer;background:var(--panel);color:var(--fg)}
.ig-chip.off{opacity:.45}
.ig-chip i{width:9px;height:9px;border-radius:50%;display:inline-block}
.ig-canvas{position:relative;height:min(680px,76vh);overflow:hidden;background-image:radial-gradient(var(--border) 1px,transparent 1px);background-size:18px 18px;border:1px solid var(--border);border-radius:6px;background-color:var(--bg)}
.ig-canvas svg{width:100%;height:100%;touch-action:none;display:block}
.ig-panel{position:absolute;top:0;right:0;bottom:0;width:min(330px,92%);overflow:auto;background:var(--panel);border-left:1px solid var(--border);padding:12px;box-shadow:-6px 0 18px rgba(0,0,0,.08)}
.ig-panel h2{margin:0;font-size:15px;overflow-wrap:anywhere}
.ig-panel h3{margin:14px 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
.ig-row{display:flex;width:100%;gap:8px;align-items:flex-start;text-align:left;padding:6px 4px;border:0;border-radius:5px;cursor:pointer;background:none}
.ig-row:hover{background:var(--bg)}
.ig-why,.ig-states{margin:2px 0 6px 18px;font-size:11px}
.ig-why summary{color:var(--fail);cursor:pointer}
.ig-states summary{cursor:pointer}
.ig-err{padding:4px 6px;margin:3px 0;border-left:2px solid var(--fail);background:var(--bg);word-break:break-word}
.ig-states .ig-tag{display:block;margin:2px 0;white-space:normal}
.ig-dot{width:9px;height:9px;border-radius:50%;margin-top:4px;flex:none}
.ig-kv{display:grid;grid-template-columns:90px 1fr;gap:4px 8px;font-size:12px}
.ig-kv span:nth-child(odd){color:var(--muted)}
.ig-kv span:nth-child(even){overflow-wrap:anywhere}
.ig-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0}
.ig-stats div{border:1px solid var(--border);border-radius:6px;padding:6px;text-align:center}
.ig-stats b{display:block;font-size:16px}
.ig-small{font-size:11px;color:var(--muted)}
.ig-tag{display:inline-block;border:1px solid var(--border);border-radius:4px;padding:0 5px;font-size:10px;margin-right:4px;color:var(--muted)}
.ig-ctl{display:flex;gap:4px}
`;

function hash(value: string): number {
  let h = 17;
  for (const c of value) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function ago(iso?: string): string {
  if (!iso) return "never";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (Number.isNaN(s)) return "unknown";
  for (const [n, label] of [
    [86400 * 365, "y"],
    [86400 * 30, "mo"],
    [86400, "d"],
    [3600, "h"],
    [60, "m"],
  ] as const) {
    if (s >= n) return `${Math.floor(s / n)}${label} ago`;
  }
  return "just now";
}

const short = (v?: string) => (v && v.length > 12 ? v.slice(0, 8) : v);

function packGroups(groups: { name: string; count: number }[]) {
  const placed: { name: string; x: number; y: number; r: number }[] = [];
  for (const g of groups) {
    const r = 52 * Math.sqrt(g.count) + 48;
    for (let t = 0; ; t++) {
      const rho = 12 * t;
      const a = t * 2.399963;
      const x = rho * Math.cos(a);
      const y = rho * Math.sin(a) * 0.8;
      if (placed.every((p) => Math.hypot(p.x - x, p.y - y) >= p.r + r + 36)) {
        placed.push({ name: g.name, x, y, r });
        break;
      }
    }
  }
  return new Map(
    placed.map((p) => [p.name, { ...p, x: p.x + W / 2, y: p.y + H / 2 }]),
  );
}

function buildLayout(net: IntegrationsNetwork) {
  const degree = new Map<string, number>();
  const nodeStatus = new Map<string, NodeStatus>();
  const bdct = new Set<string>();
  const rank: Record<string, number> = {
    failed: 3,
    unverified: 2,
    verified: 1,
  };
  for (const e of net.edges) {
    for (const id of [e.consumer, e.provider]) {
      degree.set(id, (degree.get(id) ?? 0) + 1);
      const prev = nodeStatus.get(id);
      if (!prev || prev === "none" || rank[e.status] > rank[prev])
        nodeStatus.set(id, e.status);
      if (e.verificationModes.length) bdct.add(id);
    }
  }
  const centers = packGroups(net.summary.groups);
  const nodes: SimNode[] = net.nodes.map((n) => {
    const c = centers.get(n.group) ?? { x: W / 2, y: H / 2 };
    const d = degree.get(n.id) ?? 0;
    return {
      id: n.id,
      group: n.group,
      degree: d,
      r: Math.min(20, 5 + Math.sqrt(d) * 2.6),
      status: nodeStatus.get(n.id) ?? "none",
      bdct: bdct.has(n.id),
      x: c.x + ((hash(n.id) % 60) - 30),
      y: c.y + ((hash(`${n.id}y`) % 60) - 30),
    };
  });
  const links: SimLink[] = net.edges.map((edge) => ({
    source: edge.consumer,
    target: edge.provider,
    edge,
  }));
  const sim = forceSimulation(nodes)
    .force(
      "link",
      forceLink<SimNode, SimLink>(links)
        .id((d) => d.id)
        .distance((l) =>
          (l.source as SimNode).group === (l.target as SimNode).group
            ? 115
            : 260,
        )
        .strength((l) =>
          (l.source as SimNode).group === (l.target as SimNode).group
            ? 0.35
            : 0.01,
        ),
    )
    .force("charge", forceManyBody().strength(-340))
    .force(
      "collide",
      forceCollide<SimNode>().radius((d) => d.r + 36),
    )
    .force(
      "x",
      forceX<SimNode>((d) => centers.get(d.group)?.x ?? W / 2).strength(0.22),
    )
    .force(
      "y",
      forceY<SimNode>((d) => centers.get(d.group)?.y ?? H / 2).strength(0.22),
    )
    .force("contain", (alpha: number) => {
      for (const n of nodes) {
        const c = centers.get(n.group);
        if (!c || n.fx != null) continue;
        const dx = (n.x ?? 0) - c.x,
          dy = (n.y ?? 0) - c.y;
        const d = Math.hypot(dx, dy) || 1;
        const limit = c.r * 1.0;
        if (d > limit) {
          const pull = ((d - limit) / d) * 0.6 * alpha;
          n.vx = (n.vx ?? 0) - dx * pull;
          n.vy = (n.vy ?? 0) - dy * pull;
        }
      }
    })
    .stop();
  sim.tick(400);
  return { nodes, links, sim };
}

function hull(points: [number, number][]): [number, number][] {
  if (points.length < 3) return points;
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const build = (list: [number, number][]) => {
    const out: [number, number][] = [];
    for (const p of list) {
      while (
        out.length >= 2 &&
        cross(out[out.length - 2], out[out.length - 1], p) <= 0
      )
        out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...build(pts), ...build([...pts].reverse())];
}

export function IntegrationsGraph() {
  const { result } = useAppRuntime();
  const net = appData(result, "integrationsNetwork") as
    | IntegrationsNetwork
    | undefined;
  if (!net?.nodes?.length) {
    return (
      <main>
        <header>
          <h1>Contract integrations</h1>
        </header>
        <p className="status">
          {net ? "No integrations found." : "Waiting for integrations..."}
        </p>
      </main>
    );
  }
  return <Graph net={net} />;
}

function Graph({ net }: { net: IntegrationsNetwork }) {
  const layout = useMemo(() => buildLayout(net), [net]);
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  const [vp, setVp] = useState<Viewport>({ x: 0, y: 0, k: 1 });
  const [selected, setSelected] = useState<string | undefined>(() =>
    net.nodes.some((n) => n.id === net.focus) ? net.focus : undefined,
  );
  const [hovered, setHovered] = useState<string>();
  const [search, setSearch] = useState("");
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(new Set());
  const [failingOnly, setFailingOnly] = useState(false);
  const [isolate, setIsolate] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const vpRef = useRef(vp);
  vpRef.current = vp;
  const drag = useRef<
    | {
        kind: "pan" | "node";
        sx: number;
        sy: number;
        vp: Viewport;
        node?: SimNode;
        moved: boolean;
      }
    | undefined
  >(undefined);

  const groupColor = useMemo(() => {
    const map = new Map<string, string>();
    net.summary.groups.forEach((g, i) => {
      map.set(
        g.name,
        g.name === "Other" ? "#8b94a0" : PALETTE[i % PALETTE.length],
      );
    });
    return map;
  }, [net]);
  const byId = useMemo(
    () => new Map(layout.nodes.map((n) => [n.id, n])),
    [layout],
  );
  const meta = useMemo(() => new Map(net.nodes.map((n) => [n.id, n])), [net]);

  const neighbors = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const e of net.edges) {
      if (!map.has(e.consumer)) map.set(e.consumer, new Set());
      if (!map.has(e.provider)) map.set(e.provider, new Set());
      map.get(e.consumer)?.add(e.provider);
      map.get(e.provider)?.add(e.consumer);
    }
    return map;
  }, [net]);

  const fitView = useCallback(
    (ids?: string[]) => {
      const list = layout.nodes.filter((n) => !ids || ids.includes(n.id));
      if (!list.length) return;
      const xs = list.map((n) => n.x ?? 0);
      const ys = list.map((n) => n.y ?? 0);
      const pad = 70;
      const minX = Math.min(...xs) - pad,
        maxX = Math.max(...xs) + pad;
      const minY = Math.min(...ys) - pad,
        maxY = Math.max(...ys) + pad;
      const k = Math.min(2.2, Math.min(W / (maxX - minX), H / (maxY - minY)));
      setVp({
        k,
        x: W / 2 - ((minX + maxX) / 2) * k,
        y: H / 2 - ((minY + maxY) / 2) * k,
      });
    },
    [layout],
  );

  useEffect(() => {
    layout.sim.on("tick", redraw);
    fitView();
    return () => {
      layout.sim.on("tick", null);
      layout.sim.stop();
    };
  }, [layout, fitView]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      const cx = ((e.clientX - r.left) * W) / r.width;
      const cy = ((e.clientY - r.top) * H) / r.height;
      setVp((v) => {
        const k = Math.min(
          3,
          Math.max(0.25, v.k * (e.deltaY < 0 ? 1.12 : 0.89)),
        );
        return {
          k,
          x: cx - ((cx - v.x) / v.k) * k,
          y: cy - ((cy - v.y) / v.k) * k,
        };
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const term = search.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!term) return undefined;
    return new Set(
      net.nodes
        .filter((n) =>
          [n.id, n.group, ...n.teams, ...n.labels].some((s) =>
            s.toLowerCase().includes(term),
          ),
        )
        .map((n) => n.id),
    );
  }, [net, term]);

  const failingNodes = useMemo(() => {
    const s = new Set<string>();
    for (const e of net.edges)
      if (e.status === "failed") {
        s.add(e.consumer);
        s.add(e.provider);
      }
    return s;
  }, [net]);

  const visible = (id: string) => {
    const n = byId.get(id);
    if (!n || hiddenGroups.has(n.group)) return false;
    if (failingOnly && !failingNodes.has(id)) return false;
    if (
      isolate &&
      selected &&
      id !== selected &&
      !neighbors.get(selected)?.has(id)
    )
      return false;
    return true;
  };
  const focus = hovered ?? selected;
  const lit = (id: string) => {
    if (matches && !matches.has(id)) return false;
    return !focus || id === focus || !!neighbors.get(focus)?.has(id);
  };

  const toGraph = (clientX: number, clientY: number) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    const v = vpRef.current;
    return {
      x: (((clientX - r.left) * W) / r.width - v.x) / v.k,
      y: (((clientY - r.top) * H) / r.height - v.y) / v.k,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 3) d.moved = true;
    if (d.kind === "pan") {
      setVp({
        ...d.vp,
        x: d.vp.x + ((e.clientX - d.sx) * W) / r.width,
        y: d.vp.y + ((e.clientY - d.sy) * H) / r.height,
      });
    } else if (d.node && d.moved) {
      const p = toGraph(e.clientX, e.clientY);
      d.node.fx = p.x;
      d.node.fy = p.y;
      d.node.pinned = true;
      layout.sim.alphaTarget(0.25).restart();
    }
  };
  const endDrag = () => {
    if (drag.current?.kind === "node") layout.sim.alphaTarget(0);
    drag.current = undefined;
  };

  const relayout = () => {
    for (const n of layout.nodes) {
      n.fx = null;
      n.fy = null;
      n.pinned = false;
    }
    layout.sim.alpha(0.9).alphaTarget(0).restart();
    setTimeout(() => fitView(), 700);
  };

  const select = (id?: string) => {
    setSelected(id);
    if (!id) setIsolate(false);
  };
  const centerOn = (id: string) => {
    const n = byId.get(id);
    if (n)
      setVp((v) => ({
        ...v,
        x: W / 2 - (n.x ?? 0) * v.k,
        y: H / 2 - (n.y ?? 0) * v.k,
      }));
  };

  const hullData = net.summary.groups.map((g) => {
    const members = layout.nodes.filter(
      (n) => n.group === g.name && visible(n.id),
    );
    if (!members.length) return null;
    const pts: [number, number][] = [];
    for (const m of members)
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        pts.push([
          (m.x ?? 0) + Math.cos(a) * (m.r + 16),
          (m.y ?? 0) + Math.sin(a) * (m.r + 16),
        ]);
      }
    const poly = hull(pts);
    return {
      g,
      poly,
      top: Math.min(...poly.map((p) => p[1])),
      cx: poly.reduce((s, p) => s + p[0], 0) / poly.length,
    };
  });

  const edgePath = (l: SimLink) => {
    const s = l.source as SimNode,
      t = l.target as SimNode;
    const dx = (t.x ?? 0) - (s.x ?? 0),
      dy = (t.y ?? 0) - (s.y ?? 0);
    const len = Math.hypot(dx, dy) || 1;
    const ex = (t.x ?? 0) - (dx / len) * (t.r + 3),
      ey = (t.y ?? 0) - (dy / len) * (t.r + 3);
    const mx = ((s.x ?? 0) + ex) / 2 - (dy / len) * len * 0.08,
      my = ((s.y ?? 0) + ey) / 2 + (dx / len) * len * 0.08;
    return `M${s.x ?? 0},${s.y ?? 0} Q${mx},${my} ${ex},${ey}`;
  };

  const failing = net.summary.failed;
  const sel = selected ? meta.get(selected) : undefined;
  const outgoing = selected
    ? net.edges.filter((e) => e.consumer === selected)
    : [];
  const incoming = selected
    ? net.edges.filter((e) => e.provider === selected)
    : [];
  const order = (a: NetworkEdge, b: NetworkEdge) =>
    ["failed", "unverified", "verified"].indexOf(a.status) -
    ["failed", "unverified", "verified"].indexOf(b.status);

  const edgeRow = (
    e: NetworkEdge,
    other: string,
    mine: "consumer" | "provider",
  ) => (
    <div key={`${e.consumer}>${e.provider}`}>
      <button
        type="button"
        className="ig-row"
        onClick={() => {
          select(other);
          centerOn(other);
        }}
      >
        <span className="ig-dot" style={{ background: EDGE_COLOR[e.status] }} />
        <div>
          <div>{other}</div>
          <div className="ig-small">
            {e.status === "failed"
              ? `${e.failed} failing`
              : e.status === "verified"
                ? "verified"
                : "not verified yet"}
            {mine === "consumer" && e.consumerVersion
              ? ` · ${short(e.consumerVersion)}`
              : ""}
            {e.consumerBranch && mine === "consumer"
              ? ` @ ${e.consumerBranch}`
              : ""}
            {e.providerVersion ? ` · provider ${short(e.providerVersion)}` : ""}
            {e.verifiedAt ? ` · ${ago(e.verifiedAt)}` : ""}
          </div>
          {e.verificationModes.length > 0 && (
            <div>
              {e.verificationModes.map((m) => (
                <span className="ig-tag" key={m}>
                  BDCT {m}
                </span>
              ))}
            </div>
          )}
        </div>
      </button>
      {e.failure && (
        <details className="ig-why" open>
          <summary>
            Why it failed
            {e.failure.kind === "bdct" ? " (contract comparison)" : ""}
          </summary>
          {e.failure.errors.length ? (
            e.failure.errors.map((er, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static list
              <div className="ig-err" key={i}>
                <div>{er.summary}</div>
                <div className="ig-small">
                  {[er.interaction, er.location].filter(Boolean).join(" · ")}
                </div>
              </div>
            ))
          ) : (
            <div className="ig-small">
              No error details were published with this result.
            </div>
          )}
        </details>
      )}
      {e.providerStates && e.providerStates.length > 0 && (
        <details className="ig-states">
          <summary>Provider states ({e.providerStates.length})</summary>
          {e.providerStates.map((st) => (
            <div className="ig-tag" key={st}>
              {st}
            </div>
          ))}
        </details>
      )}
    </div>
  );

  return (
    <main className="ig">
      <style>{css}</style>
      <header>
        <h1>Contract integrations</h1>
        <span className="muted">
          {net.summary.pacticipants} services · {net.summary.integrations}{" "}
          integrations · {net.summary.verified} verified · {failing} failing ·{" "}
          {net.summary.unverified} unverified
        </span>
      </header>
      {net.warnings?.map((w) => (
        <div className="muted" key={w}>
          ⚠ {w}
        </div>
      ))}
      <div className="ig-bar">
        <input
          type="search"
          placeholder="Search services, teams or labels"
          value={search}
          aria-label="Search services"
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || !matches?.size) return;
            const first = [...matches][0];
            select(first);
            centerOn(first);
          }}
        />
        <button
          type="button"
          className={failingOnly ? "ig-chip" : ""}
          onClick={() => setFailingOnly((v) => !v)}
          aria-pressed={failingOnly}
        >
          {failingOnly ? "Showing failing only" : "Failing only"}
        </button>
        <span className="ig-ctl">
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => setVp((v) => ({ ...v, k: Math.min(3, v.k * 1.25) }))}
          >
            +
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() =>
              setVp((v) => ({ ...v, k: Math.max(0.25, v.k * 0.8) }))
            }
          >
            −
          </button>
          <button type="button" onClick={() => fitView()}>
            Fit
          </button>
          <button type="button" onClick={relayout}>
            Re-layout
          </button>
        </span>
      </div>
      <div className="ig-chips">
        {net.summary.groups.map((g) => (
          <button
            type="button"
            key={g.name}
            className={`ig-chip${hiddenGroups.has(g.name) ? " off" : ""}`}
            aria-pressed={!hiddenGroups.has(g.name)}
            onClick={() =>
              setHiddenGroups((s) => {
                const n = new Set(s);
                if (n.has(g.name)) n.delete(g.name);
                else n.add(g.name);
                return n;
              })
            }
          >
            <i style={{ background: groupColor.get(g.name) }} />
            {g.name} · {g.count}
          </button>
        ))}
        {(["verified", "unverified", "failed"] as const).map((s) => (
          <span className="ig-chip" key={s} style={{ cursor: "default" }}>
            <i style={{ background: STATUS_COLOR[s] }} />
            {s}
          </span>
        ))}
      </div>
      <div className="ig-canvas">
        <svg
          ref={svgRef}
          role="img"
          aria-label="PactFlow consumer-provider integration network"
          viewBox={`0 0 ${W} ${H}`}
          style={{ cursor: drag.current?.kind === "pan" ? "grabbing" : "grab" }}
          onPointerDown={(e) => {
            drag.current = {
              kind: "pan",
              sx: e.clientX,
              sy: e.clientY,
              vp,
              moved: false,
            };
          }}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => {
            if (
              drag.current?.kind === "pan" &&
              !drag.current.moved &&
              e.target === e.currentTarget
            )
              select(undefined);
            endDrag();
          }}
          onPointerLeave={endDrag}
        >
          <defs>
            {(["verified", "failed", "unverified"] as const).map((s) => (
              <marker
                key={s}
                id={`ig-arrow-${s}`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto"
              >
                <path d="M0 0L10 5L0 10z" fill={EDGE_COLOR[s]} />
              </marker>
            ))}
          </defs>
          <g transform={`translate(${vp.x} ${vp.y}) scale(${vp.k})`}>
            {hullData.map(
              (h) =>
                h && (
                  <g key={h.g.name} opacity={matches || focus ? 0.5 : 1}>
                    <polygon
                      points={h.poly.map((p) => p.join(",")).join(" ")}
                      fill={groupColor.get(h.g.name)}
                      fillOpacity={0.13}
                      stroke={groupColor.get(h.g.name)}
                      strokeOpacity={0.13}
                      strokeWidth={14}
                      strokeLinejoin="round"
                    />
                    <text
                      x={h.cx}
                      y={h.top - 18}
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight={700}
                      letterSpacing={1}
                      fill={groupColor.get(h.g.name)}
                    >
                      {h.g.name.toUpperCase()}
                    </text>
                  </g>
                ),
            )}
            {layout.links.map((l) => {
              const s = l.source as SimNode,
                t = l.target as SimNode;
              if (!visible(s.id) || !visible(t.id)) return null;
              const on =
                lit(s.id) &&
                lit(t.id) &&
                (!focus || s.id === focus || t.id === focus);
              const d = edgePath(l);
              return (
                <g key={`${s.id}>${t.id}`} opacity={on ? 1 : 0.07}>
                  <path
                    d={d}
                    fill="none"
                    stroke={EDGE_COLOR[l.edge.status]}
                    strokeWidth={on && focus ? 1.8 : 1.1}
                    strokeOpacity={0.7}
                    markerEnd={`url(#ig-arrow-${l.edge.status})`}
                  />
                  {on && layout.links.length <= 250 && (
                    <circle r={2} fill={EDGE_COLOR[l.edge.status]}>
                      <animateMotion
                        dur={`${3 + (hash(s.id + t.id) % 30) / 10}s`}
                        repeatCount="indefinite"
                        path={d}
                      />
                    </circle>
                  )}
                </g>
              );
            })}
            {layout.nodes.map((n) => {
              if (!visible(n.id)) return null;
              const on = lit(n.id);
              const color = STATUS_COLOR[n.status];
              return (
                // biome-ignore lint/a11y/noStaticElementInteractions: SVG node handles pointer drag; keyboard access is via the search box and detail panel
                <g
                  key={n.id}
                  transform={`translate(${n.x ?? 0} ${n.y ?? 0})`}
                  opacity={on ? 1 : 0.12}
                  style={{ cursor: "pointer" }}
                  onPointerEnter={() => setHovered(n.id)}
                  onPointerLeave={() => setHovered(undefined)}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    drag.current = {
                      kind: "node",
                      sx: e.clientX,
                      sy: e.clientY,
                      vp,
                      node: n,
                      moved: false,
                    };
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    const d = drag.current;
                    if (d && !d.moved)
                      select(selected === n.id ? undefined : n.id);
                    endDrag();
                  }}
                  onDoubleClick={() => {
                    n.fx = null;
                    n.fy = null;
                    n.pinned = false;
                    layout.sim.alpha(0.3).restart();
                  }}
                >
                  {(n.bdct || n.id === selected) && (
                    <circle
                      r={n.r + 5}
                      fill="none"
                      stroke={n.id === selected ? "var(--accent)" : color}
                      strokeWidth={n.id === selected ? 2 : 1}
                      opacity={n.id === selected ? 1 : 0.35}
                    />
                  )}
                  <circle
                    r={n.r}
                    fill={color}
                    stroke="var(--panel)"
                    strokeWidth={2}
                  />
                  {n.pinned && <circle r={2.2} fill="var(--panel)" />}
                  {(vp.k >= 0.3 || n.degree >= 4 || n.id === selected) && (
                    <text
                      y={n.r + 11}
                      textAnchor="middle"
                      fontSize={Math.min(13, 8.5 / Math.sqrt(vp.k))}
                      fill="var(--fg)"
                      style={{
                        paintOrder: "stroke",
                        stroke: "var(--bg)",
                        strokeWidth: 3,
                        strokeLinejoin: "round",
                        pointerEvents: "none",
                      }}
                    >
                      {n.id}
                    </text>
                  )}
                  <title>{`${n.id} · ${n.group} · ${n.degree} integrations`}</title>
                </g>
              );
            })}
          </g>
        </svg>
        {selected && sel && (
          <aside className="ig-panel" aria-label={`Details for ${selected}`}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <h2>{selected}</h2>
              <button
                type="button"
                aria-label="Close details"
                onClick={() => select(undefined)}
              >
                ✕
              </button>
            </div>
            <div style={{ margin: "6px 0" }}>
              <span
                className="badge"
                style={{
                  background:
                    STATUS_COLOR[byId.get(selected)?.status ?? "none"],
                }}
              >
                {byId.get(selected)?.status === "none"
                  ? "no integrations"
                  : byId.get(selected)?.status}
              </span>{" "}
              <span
                className="ig-tag"
                style={{ color: groupColor.get(sel.group) }}
              >
                {sel.group}
              </span>
            </div>
            <div className="ig-stats">
              <div>
                <b>{outgoing.length}</b>
                <span className="ig-small">consumes</span>
              </div>
              <div>
                <b>{incoming.length}</b>
                <span className="ig-small">consumers</span>
              </div>
              <div>
                <b style={{ color: "var(--fail)" }}>
                  {
                    [...outgoing, ...incoming].filter(
                      (e) => e.status === "failed",
                    ).length
                  }
                </b>
                <span className="ig-small">failing</span>
              </div>
              <div>
                <b style={{ color: "var(--warn)" }}>
                  {
                    [...outgoing, ...incoming].filter(
                      (e) => e.status === "unverified",
                    ).length
                  }
                </b>
                <span className="ig-small">unverified</span>
              </div>
            </div>
            <div className="ig-kv">
              <span>Teams</span>
              <span>{sel.teams.length ? sel.teams.join(", ") : "—"}</span>
              <span>Labels</span>
              <span>{sel.labels.length ? sel.labels.join(", ") : "—"}</span>
              <span>Main branch</span>
              <span>{sel.mainBranch ?? "—"}</span>
              <span>Latest version</span>
              <span>{short(sel.latestVersion) ?? "—"}</span>
              <span>Updated</span>
              <span>{ago(sel.updatedAt)}</span>
              <span>Created</span>
              <span>
                {sel.createdAt
                  ? new Date(sel.createdAt).toLocaleDateString()
                  : "—"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setIsolate((v) => !v)}
                aria-pressed={isolate}
              >
                {isolate ? "Show all" : "Isolate neighbourhood"}
              </button>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(selected)}
              >
                Copy name
              </button>
            </div>
            <h3>Connects to ({outgoing.length})</h3>
            {outgoing.length ? (
              [...outgoing]
                .sort(order)
                .map((e) => edgeRow(e, e.provider, "consumer"))
            ) : (
              <div className="ig-small">Doesn't consume any providers.</div>
            )}
            <h3>Used by ({incoming.length})</h3>
            {incoming.length ? (
              [...incoming]
                .sort(order)
                .map((e) => edgeRow(e, e.consumer, "provider"))
            ) : (
              <div className="ig-small">No consumers yet.</div>
            )}
          </aside>
        )}
      </div>
      <div className="muted" style={{ marginTop: 6, fontSize: 11 }}>
        Scroll to zoom · drag to pan · drag a service to pin it (double-click to
        release) · click a service for details · ringed services use
        bi-directional contract testing
      </div>
    </main>
  );
}
