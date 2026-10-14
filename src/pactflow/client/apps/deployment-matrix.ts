import type { McpAppParams } from "../../../common/types";
import { createPactFlowAppHtml } from "./resource";

const html = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Deployment safety</title>
<style>
  :root { --bg:var(--color-background-primary,#f7f9fb); --panel:var(--color-background-secondary,#fff); --fg:var(--color-text-primary,#17212b); --muted:var(--color-text-secondary,#5d6b79); --border:var(--color-border-primary,#d9e1e8); --ok:#138a52; --warn:#b77913; --fail:#d9433d; --unknown:#64748b; }
  [data-theme="dark"] { --bg:var(--color-background-primary,#10161c); --panel:var(--color-background-secondary,#18212a); --fg:var(--color-text-primary,#edf3f7); --muted:var(--color-text-secondary,#a3b0bb); --border:var(--color-border-primary,#34424e); --ok:#36bb78; --warn:#e7a540; --fail:#ef665e; --unknown:#94a3b8; }
  * { box-sizing:border-box; } html,body { margin:0; background:var(--bg); color:var(--fg); font:13px var(--font-sans,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif); }
  main { padding:12px; } header { display:flex; align-items:baseline; gap:10px; margin-bottom:10px; } h1 { margin:0; font-size:15px; } #subtitle,#status { color:var(--muted); }
  #decision { border:1px solid var(--border); border-left:5px solid var(--unknown); border-radius:6px; background:var(--panel); padding:12px; margin-bottom:10px; } #decision.pass { border-left-color:var(--ok); } #decision.fail { border-left-color:var(--fail); }
  #decision strong { display:block; font-size:15px; } #reason { color:var(--muted); margin-top:3px; }
  #metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin-bottom:10px; } .metric { border:1px solid var(--border); border-radius:6px; background:var(--panel); padding:9px; } .metric b { display:block; font-size:18px; } .metric span { color:var(--muted); font-size:11px; } .metric.ok b { color:var(--ok); } .metric.fail b { color:var(--fail); } .metric.warn b { color:var(--warn); }
  #table-wrap { overflow:auto; border:1px solid var(--border); border-radius:6px; background:var(--panel); } table { width:100%; min-width:620px; border-collapse:collapse; } th,td { padding:9px 10px; text-align:left; border-bottom:1px solid var(--border); } th { color:var(--muted); font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.04em; } tr:last-child td { border:0; } .badge { display:inline-block; padding:3px 7px; border-radius:999px; color:#fff; font-size:11px; font-weight:600; } .badge.ok { background:var(--ok); } .badge.fail { background:var(--fail); } .badge.warn { background:var(--warn); } .badge.unknown { background:var(--unknown); } details { margin-top:8px; } pre { white-space:pre-wrap; color:var(--muted); }
  @media (max-width:520px) { #metrics { grid-template-columns:repeat(2,minmax(0,1fr)); } }
</style>
</head>
<body><main>
<header><h1>Deployment safety</h1><span id="subtitle"></span></header>
<div id="status">Waiting for deployment results...</div>
<section id="content" hidden><div id="decision"><strong id="title"></strong><div id="reason"></div></div><div id="metrics"></div><div id="table-wrap"><table><thead><tr><th>Consumer</th><th>Consumer version</th><th>Provider</th><th>Provider version</th><th>Status</th></tr></thead><tbody id="rows"></tbody></table></div></section>
<details id="source" hidden><summary>Raw result</summary><pre id="raw"></pre></details>
</main><script>
(function(){
  var status=document.getElementById("status"), content=document.getElementById("content"), subtitle=document.getElementById("subtitle"), decision=document.getElementById("decision"), title=document.getElementById("title"), reason=document.getElementById("reason"), metrics=document.getElementById("metrics"), rows=document.getElementById("rows"), raw=document.getElementById("raw"), source=document.getElementById("source"), nextId=1, pending={};
  function post(m){window.parent.postMessage(m,"*");} function notify(method,params){post({jsonrpc:"2.0",method:method,params:params});} function request(method,params){var id=nextId++;post({jsonrpc:"2.0",id:id,method:method,params:params});return new Promise(function(resolve,reject){pending[id]={resolve:resolve,reject:reject};});}
  function reportSize(){notify("ui/notifications/size-changed",{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight});}
  function text(value,fallback){if(value===undefined||value===null||value==="")return fallback;if(typeof value==="string"||typeof value==="number")return String(value);if(typeof value!=="object")return fallback;var candidates=[value.name,value.displayName,value.pacticipantName,value.version,value.number,value.message,value.description,value.reason];for(var i=0;i<candidates.length;i++){if(typeof candidates[i]==="string"||typeof candidates[i]==="number")return String(candidates[i]);}return fallback;}
  function name(value){return text(value,"-");}
  function outcome(row){var value=row&&row.verificationResult;if(!value)return "unknown";if(value.success===true||value.verified===true||value.status==="success"||value.status==="passed")return "ok";if(value.success===false||value.verified===false||value.status==="failed")return "fail";return "unknown";}
  function metric(label,value,kind){var e=document.createElement("div");e.className="metric "+kind;e.innerHTML="<b>"+value+"</b><span>"+label+"</span>";metrics.appendChild(e);}
  function render(result){var data=result&&result._meta&&result._meta.contractTesting&&result._meta.contractTesting.deploymentMatrix;if(!data){status.textContent="Deployment result data was not included in the tool result.";return;} var summary=data.summary||{}, matrix=Array.isArray(data.matrix)?data.matrix:[];raw.textContent=JSON.stringify(data,null,2);source.hidden=false;status.hidden=true;content.hidden=false;subtitle.textContent=matrix.length+" verification"+(matrix.length===1?"":"s");var deployable=summary.deployable;decision.className=deployable===true?"pass":deployable===false?"fail":"";title.textContent=deployable===true?"Safe to deploy":deployable===false?"Deployment blocked":"Deployment status unknown";reason.textContent=text(summary.reason,"PactFlow did not provide a reason.");metric("passed",summary.success||0,"ok");metric("failed",summary.failed||0,"fail");metric("unknown",summary.unknown||0,"warn");metric("matrix entries",matrix.length,"");rows.replaceChildren();matrix.forEach(function(entry){var state=outcome(entry), consumer=entry.consumer||{}, provider=entry.provider||{}, pact=entry.pact||{};var tr=document.createElement("tr");tr.innerHTML="<td></td><td></td><td></td><td></td><td><span class=\"badge "+state+"\">"+state+"</span></td>";var cells=tr.children;cells[0].textContent=name(consumer);cells[1].textContent=text(consumer.version||consumer.versionNumber||pact.consumerVersionNumber,"-");cells[2].textContent=name(provider);cells[3].textContent=text(provider.version||provider.versionNumber||pact.providerVersionNumber,"-");rows.appendChild(tr);});reportSize();}
  window.addEventListener("message",function(event){if(event.source!==window.parent)return;var m=event.data;if(!m||m.jsonrpc!=="2.0")return;if(!m.method&&m.id!==undefined&&pending[m.id]){var p=pending[m.id];delete pending[m.id];m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);return;}if(m.method==="ui/notifications/tool-result")render(m.params);if(m.method==="ui/notifications/host-context-changed"&&m.params&&m.params.theme)document.documentElement.setAttribute("data-theme",m.params.theme);if((m.method==="ping"||m.method==="ui/resource-teardown")&&m.id!==undefined)post({jsonrpc:"2.0",id:m.id,result:{}});});
  request("ui/initialize",{protocolVersion:"2026-01-26",appInfo:{name:"pactflow-deployment-matrix",version:"1.0.0"},appCapabilities:{availableDisplayModes:["inline","fullscreen"]}}).then(function(result){if(result&&result.hostContext&&result.hostContext.theme)document.documentElement.setAttribute("data-theme",result.hostContext.theme);notify("ui/notifications/initialized",{});reportSize();});
})();
</script></body></html>`;

void html;

export const DEPLOYMENT_MATRIX_APP: McpAppParams = {
  resourceUri: "ui://contract-testing/deployment-matrix",
  title: "Deployment Matrix",
  description:
    "Deployment decision and consumer-provider verification matrix for PactFlow.",
  html: createPactFlowAppHtml("deployment-matrix"),
};
