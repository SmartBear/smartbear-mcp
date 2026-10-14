import type { McpAppParams } from "../../../common/types";
import { createPactFlowAppHtml } from "./resource";

// Self-contained on purpose: hosts apply a restrictive CSP to MCP Apps by
// default (no external scripts, no WASM), so the DOT parser and layered layout
// live inline. Must not contain backticks or "${" (String.raw template).
const html = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>PactFlow Integrations</title>
<style>
  :root {
    --bg: var(--color-background-primary, #f8fafc);
    --fg: var(--color-text-primary, #1f2328);
    --muted: var(--color-text-secondary, #59636e);
    --border: var(--color-border-primary, #d9e1e8);
    --panel: var(--color-background-secondary, rgba(255, 255, 255, 0.88));
    --dot: #d7dee7;
    --edge: #70a18b;
    --green: #20a464;
    --orange: #e38410;
    --red: #e5483f;
    --ring: #6757d9;
    --accent: #126c4c;
    color-scheme: light dark;
  }
  [data-theme="dark"] {
    --bg: var(--color-background-primary, #10161c);
    --fg: var(--color-text-primary, #e6edf3);
    --muted: var(--color-text-secondary, #9198a1);
    --border: var(--color-border-primary, #3d444d);
    --panel: var(--color-background-secondary, rgba(21, 27, 35, 0.9));
    --dot: #2f3843;
    --edge: #51806c;
    --green: #2fbd74;
    --orange: #f39b25;
    --red: #f05b52;
    --ring: #9488ff;
    --accent: #57ca91;
  }
  html, body { margin: 0; padding: 0; background: var(--bg); color: var(--fg);
    font: 13px var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif); }
  main { padding: 12px; min-width: 0; }
  header { display: flex; align-items: center; gap: 12px; min-height: 32px; margin-bottom: 8px; }
  h1 { font-size: 15px; margin: 0; letter-spacing: 0; }
  #summary, #status { color: var(--muted); }
  #toolbar { display: flex; gap: 4px; margin-left: auto; }
  button { width: 30px; height: 30px; padding: 0; border: 1px solid var(--border); border-radius: 5px;
    background: var(--panel); color: var(--fg); font: inherit; font-size: 16px; cursor: pointer; }
  button:hover, button:focus-visible { border-color: var(--accent); outline: none; }
  #fit { width: 38px; font-size: 11px; }
  #graph { position: relative; overflow: hidden; height: min(640px, 72vh); min-height: 360px;
    border: 1px solid var(--border); border-radius: 6px; background-color: var(--bg);
    background-image: radial-gradient(circle, var(--dot) 1px, transparent 1px); background-size: 18px 18px; }
  svg { display: block; width: 100%; height: 100%; touch-action: none; cursor: grab; }
  svg.panning { cursor: grabbing; }
  .node { cursor: pointer; }
  .node circle.core { fill: var(--green); stroke: var(--bg); stroke-width: 3; }
  .node circle.ring { fill: none; stroke: var(--ring); stroke-width: 2; opacity: 0; }
  .node.both circle.ring { opacity: 0.85; }
  .node.hub circle.core { fill: var(--orange); }
  .node.major-hub circle.core { fill: var(--red); }
  .node text { fill: var(--fg); font-size: 11px; font-weight: 500; text-anchor: middle;
    paint-order: stroke; stroke: var(--bg); stroke-width: 3px; stroke-linejoin: round; }
  .edge path { fill: none; stroke: var(--edge); stroke-width: 1.35; opacity: 0.72; }
  .dim { opacity: 0.08 !important; }
  .node.hl circle.ring { opacity: 1; stroke: var(--accent); stroke-width: 3; }
  .node.hl circle.core { filter: url(#node-shadow); }
  .edge.hl path { stroke: var(--accent); stroke-width: 2.5; opacity: 1; }
  #legend { display: flex; flex-wrap: wrap; gap: 14px; margin: 8px 2px 0; color: var(--muted); font-size: 11px; }
  .legend-item { display: inline-flex; align-items: center; gap: 5px; }
  .swatch { width: 9px; height: 9px; border-radius: 50%; background: var(--green); }
  .swatch.hub { background: var(--orange); }
  .swatch.major { background: var(--red); }
  .swatch.both { box-sizing: border-box; background: var(--green); outline: 2px solid var(--ring); }
  details { margin-top: 8px; }
  pre { white-space: pre-wrap; word-break: break-word; color: var(--muted); }
</style>
</head>
<body>
<main>
  <header>
    <h1>Contract integrations</h1><span id="summary"></span>
    <div id="toolbar" hidden>
      <button id="zoom-in" type="button" title="Zoom in" aria-label="Zoom in">+</button>
      <button id="zoom-out" type="button" title="Zoom out" aria-label="Zoom out">-</button>
      <button id="fit" type="button" title="Fit graph" aria-label="Fit graph">Fit</button>
    </div>
  </header>
  <div id="status">Waiting for integrations...</div>
  <div id="graph" hidden></div>
  <div id="legend" hidden>
    <span class="legend-item"><i class="swatch"></i>Service</span>
    <span class="legend-item"><i class="swatch hub"></i>Hub</span>
    <span class="legend-item"><i class="swatch major"></i>Major hub</span>
    <span class="legend-item"><i class="swatch both"></i>Consumer and provider</span>
  </div>
  <details id="source" hidden><summary>DOT source</summary><pre id="dot"></pre></details>
</main>
<script>
(function () {
  "use strict";
  var SVG_NS = "http://www.w3.org/2000/svg";
  var statusEl = document.getElementById("status");
  var summaryEl = document.getElementById("summary");
  var graphEl = document.getElementById("graph");
  var sourceEl = document.getElementById("source");
  var dotEl = document.getElementById("dot");
  var toolbarEl = document.getElementById("toolbar");
  var legendEl = document.getElementById("legend");

  // ---- MCP Apps (SEP-1865) JSON-RPC over postMessage ----
  var nextId = 1;
  var pending = {};
  function post(msg) { window.parent.postMessage(msg, "*"); }
  function request(method, params) {
    var id = nextId++;
    post({ jsonrpc: "2.0", id: id, method: method, params: params });
    return new Promise(function (resolve, reject) { pending[id] = { resolve: resolve, reject: reject }; });
  }
  function notify(method, params) { post({ jsonrpc: "2.0", method: method, params: params }); }

  window.addEventListener("message", function (event) {
    if (event.source !== window.parent) return;
    var msg = event.data;
    if (!msg || msg.jsonrpc !== "2.0") return;
    if (!msg.method && msg.id !== undefined && pending[msg.id]) {
      var p = pending[msg.id];
      delete pending[msg.id];
      if (msg.error) p.reject(new Error(msg.error.message || "Request failed"));
      else p.resolve(msg.result);
      return;
    }
    switch (msg.method) {
      case "ui/notifications/tool-result": renderResult(msg.params); break;
      case "ui/notifications/host-context-changed": applyHostContext(msg.params); break;
      case "ui/notifications/tool-cancelled": setStatus("Tool call was cancelled."); break;
      case "ui/resource-teardown":
      case "ping":
        if (msg.id !== undefined) post({ jsonrpc: "2.0", id: msg.id, result: {} });
        break;
    }
  });

  function applyHostContext(ctx) {
    if (!ctx) return;
    if (ctx.theme) document.documentElement.setAttribute("data-theme", ctx.theme);
    var vars = ctx.styles && ctx.styles.variables;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        if (vars[k]) document.documentElement.style.setProperty(k, vars[k]);
      });
    }
  }

  var lastSize = "";
  function reportSize() {
    var w = Math.ceil(document.documentElement.scrollWidth);
    var h = Math.ceil(document.documentElement.scrollHeight);
    var key = w + "x" + h;
    if (key === lastSize) return;
    lastSize = key;
    notify("ui/notifications/size-changed", { width: w, height: h });
  }
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(reportSize).observe(document.body);

  request("ui/initialize", {
    protocolVersion: "2026-01-26",
    appInfo: { name: "pactflow-integrations-graph", version: "1.0.0" },
    appCapabilities: { availableDisplayModes: ["inline", "fullscreen"] }
  }).then(function (result) {
    applyHostContext(result && result.hostContext);
    notify("ui/notifications/initialized", {});
    reportSize();
  }).catch(function (err) { setStatus("Failed to initialise: " + err.message); });

  function setStatus(text) {
    statusEl.hidden = false;
    statusEl.textContent = text;
    reportSize();
  }

  function renderResult(result) {
    var visibleText = ((result && result.content) || [])
      .filter(function (c) { return c && c.type === "text"; })
      .map(function (c) { return c.text; })
      .join("\n");
    if (result && result.isError) { setStatus(visibleText || "The tool returned an error."); return; }
    var structured = result && result.structuredContent;
    var appData = result && result._meta && result._meta.contractTesting;
    var text = structured && structured.integrationsGraphDot || appData && appData.integrationsGraphDot;
    // Retain compatibility with graph results stored by the first app version.
    if (!text && /^\s*(strict\s+)?(di)?graph\b/i.test(visibleText)) text = visibleText;
    if (!text) { setStatus("The integration graph data was not included in the tool result."); return; }
    var graph;
    try { graph = parseDot(text); } catch (e) { setStatus("Could not parse DOT: " + e.message); return; }
    dotEl.textContent = text;
    sourceEl.hidden = false;
    if (!graph.nodes.length) { setStatus("No integrations found."); return; }
    statusEl.hidden = true;
    summaryEl.textContent = graph.nodes.length + " pacticipants, " + graph.edges.length + " integrations";
    draw(graph);
    reportSize();
  }

  // ---- Minimal Graphviz DOT parser (nodes and edges; attributes ignored) ----
  function tokenize(src) {
    var tokens = [];
    var i = 0, n = src.length;
    while (i < n) {
      var c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === "/" && src[i + 1] === "/" || c === "#") { while (i < n && src[i] !== "\n") i++; continue; }
      if (c === "/" && src[i + 1] === "*") { var end = src.indexOf("*/", i + 2); i = end < 0 ? n : end + 2; continue; }
      if (c === "-" && (src[i + 1] === ">" || src[i + 1] === "-")) { tokens.push({ t: "edge" }); i += 2; continue; }
      if ("{}[];,=".indexOf(c) >= 0) { tokens.push({ t: "p", v: c }); i++; continue; }
      if (c === '"') {
        var s = "";
        i++;
        while (i < n && src[i] !== '"') {
          if (src[i] === "\\" && i + 1 < n) { s += src[i + 1] === '"' ? '"' : src[i] + src[i + 1]; i += 2; }
          else s += src[i++];
        }
        i++;
        tokens.push({ t: "id", v: s, q: true });
        continue;
      }
      if (c === "<") {
        var depth = 0, start = i;
        do { if (src[i] === "<") depth++; else if (src[i] === ">") depth--; i++; } while (i < n && depth > 0);
        tokens.push({ t: "id", v: src.slice(start + 1, i - 1), q: true });
        continue;
      }
      var j = i;
      while (j < n && !/[\s{}\[\];,="<]/.test(src[j]) && !(src[j] === "-" && (src[j + 1] === ">" || src[j + 1] === "-"))) j++;
      if (j === i) j++;
      tokens.push({ t: "id", v: src.slice(i, j) });
      i = j;
    }
    return tokens;
  }

  function parseDot(src) {
    var t = tokenize(src || "");
    var start = -1;
    for (var k = 0; k < t.length; k++) { if (t[k].t === "p" && t[k].v === "{") { start = k; break; } }
    if (start < 0) throw new Error("expected a graph body");
    var nodes = [], seen = {}, edges = [], edgeSeen = {};
    var chain = [];
    function addNode(name) { if (!seen[name]) { seen[name] = true; nodes.push(name); } }
    function flush() {
      if (chain.length === 1) addNode(chain[0]);
      for (var x = 0; x + 1 < chain.length; x++) {
        addNode(chain[x]); addNode(chain[x + 1]);
        var key = chain[x] + "\u0000" + chain[x + 1];
        if (!edgeSeen[key]) { edgeSeen[key] = true; edges.push([chain[x], chain[x + 1]]); }
      }
      chain = [];
    }
    var i = start + 1;
    while (i < t.length) {
      var tok = t[i];
      if (tok.t === "edge") { i++; continue; }
      if (tok.t === "p") {
        if (tok.v === "[") { while (i < t.length && !(t[i].t === "p" && t[i].v === "]")) i++; i++; continue; }
        if (tok.v === "=") { chain.pop(); i += 2; continue; }
        flush(); i++; continue;
      }
      if (!tok.q && /^(node|edge|graph|subgraph)$/i.test(tok.v)) {
        flush(); i++;
        if (/^subgraph$/i.test(tok.v) && t[i] && t[i].t === "id") i++;
        continue;
      }
      if (chain.length && t[i - 1].t !== "edge") flush();
      chain.push(tok.v);
      i++;
    }
    flush();
    return { nodes: nodes, edges: edges };
  }

  // ---- Deterministic force layout: Graphviz-like network without external WASM ----
  function layout(graph) {
    var count = graph.nodes.length;
    var area = Math.max(720, Math.sqrt(count) * 210);
    var center = area / 2;
    var positions = {};
    var degree = {}, incoming = {}, outgoing = {};
    graph.nodes.forEach(function (n, i) {
      degree[n] = 0; incoming[n] = 0; outgoing[n] = 0;
      var angle = i * 2.399963229728653;
      var radius = 45 + Math.sqrt(i) * 48;
      positions[n] = { x: center + Math.cos(angle) * radius, y: center + Math.sin(angle) * radius, vx: 0, vy: 0 };
    });
    graph.edges.forEach(function (e) { degree[e[0]]++; degree[e[1]]++; outgoing[e[0]]++; incoming[e[1]]++; });
    var ideal = Math.max(105, Math.min(165, 650 / Math.sqrt(Math.max(1, count / 5))));
    for (var tick = 0; tick < 260; tick++) {
      var cooling = 1 - tick / 280;
      for (var a = 0; a < count; a++) {
        var pa = positions[graph.nodes[a]];
        for (var b = a + 1; b < count; b++) {
          var pb = positions[graph.nodes[b]];
          var dx = pb.x - pa.x, dy = pb.y - pa.y;
          var d2 = Math.max(100, dx * dx + dy * dy), d = Math.sqrt(d2);
          var repel = 4200 / d2;
          pa.vx -= dx / d * repel; pa.vy -= dy / d * repel;
          pb.vx += dx / d * repel; pb.vy += dy / d * repel;
        }
      }
      graph.edges.forEach(function (e) {
        var p1 = positions[e[0]], p2 = positions[e[1]];
        var dx = p2.x - p1.x, dy = p2.y - p1.y, d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        var spring = (d - ideal) * 0.008;
        p1.vx += dx / d * spring; p1.vy += dy / d * spring;
        p2.vx -= dx / d * spring; p2.vy -= dy / d * spring;
      });
      graph.nodes.forEach(function (n) {
        var p = positions[n];
        p.vx += (center - p.x) * 0.0008; p.vy += (center - p.y) * 0.0008;
        p.vx *= 0.84; p.vy *= 0.84;
        p.vx = Math.max(-10, Math.min(10, p.vx)); p.vy = Math.max(-10, Math.min(10, p.vy));
        p.x += p.vx * cooling * 6; p.y += p.vy * cooling * 6;
      });
    }
    return { positions: positions, degree: degree, incoming: incoming, outgoing: outgoing };
  }

  function el(name, attrs, parent) {
    var e = document.createElementNS(SVG_NS, name);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }

  function draw(graph) {
    var model = layout(graph), positions = model.positions;
    var degrees = graph.nodes.map(function (n) { return model.degree[n]; }).sort(function (a, b) { return a - b; });
    var hubCutoff = degrees[Math.max(0, Math.floor(degrees.length * 0.78))] || 2;
    var majorCutoff = degrees[Math.max(0, Math.floor(degrees.length * 0.94))] || 4;
    var PAD = 90, minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    graph.nodes.forEach(function (n) {
      var p = positions[n]; minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    });
    var width = Math.max(640, maxX - minX + PAD * 2), height = Math.max(440, maxY - minY + PAD * 2);
    graph.nodes.forEach(function (n) { positions[n].x += PAD - minX; positions[n].y += PAD - minY; });

    var svg = el("svg", { viewBox: "0 0 " + width + " " + height, role: "img", "aria-label": "PactFlow integrations graph" });
    el("title", {}, svg).textContent = "PactFlow integrations graph";
    var defs = el("defs", {}, svg);
    var marker = el("marker", { id: "arrow", viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "6", markerHeight: "6", orient: "auto-start-reverse" }, defs);
    el("path", { d: "M0,0 L10,5 L0,10 z", fill: "currentColor" }, marker);
    var filter = el("filter", { id: "node-shadow", x: "-60%", y: "-60%", width: "220%", height: "220%" }, defs);
    el("feDropShadow", { dx: "0", dy: "2", stdDeviation: "3", "flood-opacity": "0.28" }, filter);
    svg.style.color = "var(--muted)";
    var viewport = el("g", {}, svg);
    var edgeLayer = el("g", {}, viewport), nodeLayer = el("g", {}, viewport);

    function nodeRadius(n) { return 9 + Math.min(13, Math.sqrt(model.degree[n]) * 3.2); }
    function edgePath(from, to, index) {
      var a = positions[from], b = positions[to];
      var dx = b.x - a.x, dy = b.y - a.y, d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      var r1 = nodeRadius(from), r2 = nodeRadius(to);
      var sx = a.x + dx / d * r1, sy = a.y + dy / d * r1;
      var ex = b.x - dx / d * (r2 + 5), ey = b.y - dy / d * (r2 + 5);
      var bend = ((index % 2 ? 1 : -1) * Math.min(28, d * 0.1));
      var cx = (sx + ex) / 2 - dy / d * bend, cy = (sy + ey) / 2 + dx / d * bend;
      return "M" + sx + "," + sy + " Q" + cx + "," + cy + " " + ex + "," + ey;
    }

    var edgeEls = graph.edges.map(function (e, index) {
      var g = el("g", { "class": "edge" }, edgeLayer);
      var path = el("path", { d: edgePath(e[0], e[1], index), "marker-end": "url(#arrow)" }, g);
      el("title", {}, g).textContent = e[0] + " \u2192 " + e[1];
      return { g: g, path: path, from: e[0], to: e[1], index: index };
    });

    var nodeEls = {};
    graph.nodes.forEach(function (n) {
      var p = positions[n], radius = nodeRadius(n), classes = ["node"];
      if (model.incoming[n] && model.outgoing[n]) classes.push("both");
      if (model.degree[n] >= hubCutoff && hubCutoff > 1) classes.push("hub");
      if (model.degree[n] >= majorCutoff && majorCutoff > hubCutoff) classes.push("major-hub");
      var g = el("g", { "class": classes.join(" "), tabindex: "0", transform: "translate(" + p.x + " " + p.y + ")" }, nodeLayer);
      el("circle", { "class": "ring", r: radius + 3 }, g);
      el("circle", { "class": "core", r: radius }, g);
      el("text", { x: 0, y: radius + 17 }, g).textContent = n;
      el("title", {}, g).textContent = n + " - " + model.incoming[n] + " incoming, " + model.outgoing[n] + " outgoing";
      nodeEls[n] = g;
      function on() { highlight(n); }
      g.addEventListener("mouseenter", on);
      g.addEventListener("focus", on);
      g.addEventListener("mouseleave", clear);
      g.addEventListener("blur", clear);
      g.addEventListener("pointerdown", function (event) {
        event.stopPropagation();
        g.setPointerCapture(event.pointerId);
        var point = svg.createSVGPoint();
        function move(moveEvent) {
          point.x = moveEvent.clientX; point.y = moveEvent.clientY;
          var local = point.matrixTransform(viewport.getScreenCTM().inverse());
          p.x = local.x; p.y = local.y;
          g.setAttribute("transform", "translate(" + p.x + " " + p.y + ")");
          edgeEls.forEach(function (edge) {
            if (edge.from === n || edge.to === n) edge.path.setAttribute("d", edgePath(edge.from, edge.to, edge.index));
          });
        }
        function up() { g.removeEventListener("pointermove", move); g.removeEventListener("pointerup", up); }
        g.addEventListener("pointermove", move); g.addEventListener("pointerup", up);
      });
    });

    function highlight(n) {
      var related = {}; related[n] = true;
      edgeEls.forEach(function (e) {
        var hit = e.from === n || e.to === n;
        if (hit) { related[e.from] = true; related[e.to] = true; }
        e.g.classList.toggle("hl", hit);
        e.g.classList.toggle("dim", !hit);
      });
      Object.keys(nodeEls).forEach(function (k) {
        nodeEls[k].classList.toggle("hl", k === n);
        nodeEls[k].classList.toggle("dim", !related[k]);
      });
    }
    function clear() {
      edgeEls.forEach(function (e) { e.g.classList.remove("hl", "dim"); });
      Object.keys(nodeEls).forEach(function (k) { nodeEls[k].classList.remove("hl", "dim"); });
    }

    var zoom = 1, panX = 0, panY = 0, panStart = null;
    function transform() { viewport.setAttribute("transform", "translate(" + panX + " " + panY + ") scale(" + zoom + ")"); }
    function setZoom(next, clientX, clientY) {
      var old = zoom; zoom = Math.max(0.35, Math.min(3.5, next));
      var rect = svg.getBoundingClientRect();
      var x = (clientX === undefined ? rect.left + rect.width / 2 : clientX) - rect.left;
      var y = (clientY === undefined ? rect.top + rect.height / 2 : clientY) - rect.top;
      var sx = width / rect.width, sy = height / rect.height;
      panX = x * sx - (x * sx - panX) * zoom / old;
      panY = y * sy - (y * sy - panY) * zoom / old;
      transform();
    }
    function fit() { zoom = 1; panX = 0; panY = 0; transform(); }
    svg.addEventListener("wheel", function (event) { event.preventDefault(); setZoom(zoom * (event.deltaY < 0 ? 1.12 : 0.89), event.clientX, event.clientY); }, { passive: false });
    svg.addEventListener("pointerdown", function (event) {
      if (event.target.closest && event.target.closest(".node")) return;
      panStart = { x: event.clientX, y: event.clientY, px: panX, py: panY };
      svg.setPointerCapture(event.pointerId); svg.classList.add("panning");
    });
    svg.addEventListener("pointermove", function (event) {
      if (!panStart) return;
      var rect = svg.getBoundingClientRect();
      panX = panStart.px + (event.clientX - panStart.x) * width / rect.width;
      panY = panStart.py + (event.clientY - panStart.y) * height / rect.height;
      transform();
    });
    svg.addEventListener("pointerup", function () { panStart = null; svg.classList.remove("panning"); });
    document.getElementById("zoom-in").onclick = function () { setZoom(zoom * 1.25); };
    document.getElementById("zoom-out").onclick = function () { setZoom(zoom * 0.8); };
    document.getElementById("fit").onclick = fit;

    graphEl.replaceChildren(svg);
    graphEl.hidden = false;
    toolbarEl.hidden = false;
    legendEl.hidden = false;
  }
})();
</script>
</body>
</html>
`;

void html;

export const INTEGRATIONS_GRAPH_APP: McpAppParams = {
  resourceUri: "ui://contract-testing/integrations-graph",
  title: "Integrations Graph",
  description:
    "Interactive diagram of consumer-provider integrations rendered from Graphviz DOT.",
  html: createPactFlowAppHtml("integrations-graph"),
};
