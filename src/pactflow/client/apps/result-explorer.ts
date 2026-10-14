import type { McpAppParams } from "../../../common/types";

const css = `:root{--bg:var(--color-background-primary,#f7f9fb);--panel:var(--color-background-secondary,#fff);--fg:var(--color-text-primary,#17212b);--muted:var(--color-text-secondary,#5d6b79);--border:var(--color-border-primary,#d9e1e8);--accent:#14739b;--accent-bg:#e1f2f8}[data-theme="dark"]{--bg:var(--color-background-primary,#10161c);--panel:var(--color-background-secondary,#18212a);--fg:var(--color-text-primary,#edf3f7);--muted:var(--color-text-secondary,#a3b0bb);--border:var(--color-border-primary,#34424e);--accent:#67c8ec;--accent-bg:#173947}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:13px var(--font-sans,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)}main{padding:12px;max-width:1100px;margin:auto}header{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px}h1{font-size:16px;margin:0}.muted,#count,#status{color:var(--muted)}button,input{font:inherit}button{border:1px solid var(--border);background:var(--panel);color:var(--fg);border-radius:5px;padding:5px 10px;cursor:pointer}button:hover:not(:disabled){border-color:var(--accent);color:var(--accent)}button:disabled{opacity:.45;cursor:default}.sp{margin-left:auto}input{width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:5px;background:var(--panel);color:var(--fg);margin-bottom:10px}.box{overflow:auto;border:1px solid var(--border);border-radius:6px;background:var(--panel)}table{border-collapse:collapse;width:100%}th,td{padding:7px 10px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}th{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.04em}tr.row{cursor:pointer}tr.row:hover td{background:var(--accent-bg)}tr:last-child td{border:0}td.detail{white-space:normal;max-width:none;background:var(--bg)}.nested{color:var(--muted)}.mono,pre{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}pre{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;padding:10px}.kv{display:grid;grid-template-columns:minmax(120px,220px) 1fr;gap:0}.kv div{padding:7px 10px;border-bottom:1px solid var(--border);overflow-wrap:anywhere}.kv .k{color:var(--accent);font-family:ui-monospace,Menlo,monospace}details{border-top:1px solid var(--border);padding:6px 10px}summary{cursor:pointer;font-weight:600}footer{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:12px}[hidden]{display:none!important}.empty{color:var(--muted);padding:12px}`;

// The data-shape logic lives between the MODEL markers so tests can evaluate it
// on its own (see result-explorer.test.ts).
const model = `/*MODEL*/
var META_KEYS={_links:1,_actions:1,pagination:1};
function isScalar(v){return v===null||typeof v!=="object";}
function findList(data){
  if(Array.isArray(data))return{items:data,key:""};
  if(!data||typeof data!=="object")return null;
  var emb=data._embedded;
  if(emb&&typeof emb==="object"){for(var k in emb){if(Array.isArray(emb[k]))return{items:emb[k],key:"_embedded."+k};}}
  for(var j in data){if(!META_KEYS[j]&&j!=="_embedded"&&Array.isArray(data[j]))return{items:data[j],key:j};}
  return null;
}
function columnsFor(items){
  var counts={},order=[];
  items.forEach(function(it){if(it&&typeof it==="object"&&!Array.isArray(it)){Object.keys(it).forEach(function(k){if(META_KEYS[k]||k==="_embedded")return;if(isScalar(it[k])){if(!(k in counts)){counts[k]=0;order.push(k);}counts[k]++;}});}});
  var pref=["name","title","id","version","status","branch","environment","consumer","provider","description"];
  order.sort(function(a,b){var pa=pref.indexOf(a),pb=pref.indexOf(b);pa=pa<0?99:pa;pb=pb<0?99:pb;return pa-pb||counts[b]-counts[a]||order.indexOf(a)-order.indexOf(b);});
  return order.slice(0,6);
}
function cellText(v){
  if(v===undefined)return"";
  if(v===null)return"null";
  if(Array.isArray(v))return"["+v.length+(v.length===1?" item]":" items]");
  if(typeof v==="object")return"{…}";
  return String(v);
}
function rootScalars(data,listKey){
  var out=[];
  if(!data||typeof data!=="object"||Array.isArray(data))return out;
  Object.keys(data).forEach(function(k){if(META_KEYS[k]||k==="_embedded"||k===listKey)return;if(isScalar(data[k]))out.push({key:k,value:cellText(data[k])});});
  return out;
}
function nestedEntries(data,listKey){
  var out=[];
  if(!data||typeof data!=="object"||Array.isArray(data))return out;
  Object.keys(data).forEach(function(k){if(META_KEYS[k]||k===listKey||isScalar(data[k]))return;out.push({key:k,value:data[k]});});
  return out;
}
function pageInfo(data){
  var p=data&&data.pagination;
  if(p&&typeof p.pageNumber==="number"&&typeof p.totalPages==="number")return p;
  p=data&&data.page;
  if(!p||typeof p.number!=="number"||typeof p.totalPages!=="number")return null;
  return {pageNumber:p.number,totalPages:p.totalPages,totalItems:typeof p.totalElements==="number"?p.totalElements:0};
}
function rowMatches(item,term){
  if(!term)return true;
  try{return JSON.stringify(item).toLowerCase().indexOf(term)>=0;}catch(e){return false;}
}
function toolResultData(result){
  var ct=result&&result._meta&&result._meta.contractTesting;
  if(ct&&"result" in ct)return{data:ct.result,meta:ct};
  var content=result&&result.content;
  if(!Array.isArray(content))return null;
  for(var i=0;i<content.length;i++){
    var text=content[i]&&content[i].text;
    if(typeof text!=="string")continue;
    try{return{data:JSON.parse(text),meta:null};}catch(e){}
  }
  return null;
}
/*ENDMODEL*/`;

const script = `
${model}
(function(){
var $=function(id){return document.getElementById(id);},title=$("title"),count=$("count"),status=$("status"),content=$("content"),filter=$("filter"),view=$("view"),pager=$("pager"),prev=$("prev"),next=$("next"),pageLabel=$("page-label"),copyAll=$("copy-all"),rawBtn=$("raw"),
 nextId=1,pending={},data=null,meta=null,args={},showRaw=false,loading=false,full=null,fullFor=null,searchTimer=null,note=$("note");
function post(m){window.parent.postMessage(m,"*");}
function notify(method,params){post({jsonrpc:"2.0",method:method,params:params});}
function request(method,params){var id=nextId++;post({jsonrpc:"2.0",id:id,method:method,params:params});return new Promise(function(res,rej){pending[id]={resolve:res,reject:rej};});}
function reportSize(){notify("ui/notifications/size-changed",{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight});}
function copy(v){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(v);return;}var a=document.createElement("textarea");a.value=v;document.body.appendChild(a);a.select();document.execCommand("copy");a.remove();}
function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function json(v){return JSON.stringify(v,null,2);}
function jsonBlock(v){var p=el("pre","",json(v));return p;}
function drawList(list){
  var term=filter.value.trim().toLowerCase(),items=list.items,scope=full&&term?"across all pages":"on this page",cols=columnsFor(items),shown=items.filter(function(i){return rowMatches(i,term);});
  count.textContent=shown.length===items.length?items.length+" "+scope:shown.length+" of "+items.length+" "+scope;
  var box=el("div","box"),table=el("table"),thead=el("thead"),hr=el("tr"),tbody=el("tbody");
  if(!cols.length)cols=[""];
  cols.forEach(function(c){hr.appendChild(el("th","",c||"value"));});
  thead.appendChild(hr);table.append(thead,tbody);box.appendChild(table);
  if(!shown.length){box.appendChild(el("div","empty","No matching items."));}
  shown.forEach(function(item){
    var tr=el("tr","row");
    cols.forEach(function(c){var v=c?(item&&item[c]):item,td=el("td",v!==null&&typeof v==="object"?"nested":"",cellText(v));td.title=td.textContent;tr.appendChild(td);});
    var detail=null;
    tr.onclick=function(){
      if(detail){detail.remove();detail=null;reportSize();return;}
      detail=el("tr");var td=el("td","detail"),bar=el("div");td.colSpan=cols.length;
      var b=el("button","","Copy item");b.onclick=function(e){e.stopPropagation();copy(json(item));};bar.appendChild(b);
      td.append(bar,jsonBlock(item));detail.appendChild(td);tr.after(detail);reportSize();
    };
    tbody.appendChild(tr);
  });
  view.appendChild(box);
}
function drawObject(){
  var scal=rootScalars(data,null),nest=nestedEntries(data,null);
  count.textContent=scal.length+" fields, "+nest.length+" sections";
  if(scal.length){var kv=el("div","box kv");scal.forEach(function(s){kv.appendChild(el("div","k",s.key));kv.appendChild(el("div","",s.value));});view.appendChild(kv);}
  nest.forEach(function(n){var box=el("div","box"),d=el("details"),s=el("summary","",n.key+"  "+cellText(n.value));d.append(s,jsonBlock(n.value));d.addEventListener("toggle",reportSize);box.appendChild(d);box.style.marginTop="10px";view.appendChild(box);});
  if(!scal.length&&!nest.length)view.appendChild(el("div","empty","Empty result."));
}
function current(){return full&&filter.value.trim()?full:data;}
function draw(){
  var shownData=current(),searching=shownData===full;
  view.replaceChildren();
  if(showRaw){var b=el("div","box");b.appendChild(jsonBlock(data));view.appendChild(b);count.textContent="raw JSON";}
  else{
    var list=findList(shownData);
    if(list){
      drawList(list);
      var extra=rootScalars(data,list.key);
      if(extra.length){var kv=el("div","box kv");kv.style.marginTop="10px";extra.forEach(function(s){kv.appendChild(el("div","k",s.key));kv.appendChild(el("div","",s.value));});view.appendChild(kv);}
    }else drawObject();
  }
  var p=searching?null:pageInfo(data);
  pager.hidden=!p||p.totalPages<=1&&p.pageNumber<=1;
  if(p){pageLabel.textContent="Page "+p.pageNumber+" of "+p.totalPages+" · "+p.totalItems+" total";prev.disabled=loading||p.pageNumber<=1;next.disabled=loading||p.pageNumber>=p.totalPages;}
  reportSize();
}
function render(result){
  var payload=toolResultData(result);
  if(!payload){status.textContent="Tool result data was not included.";return;}
  if(payload.meta){meta=payload.meta;if(meta.args&&typeof meta.args==="object")args=meta.args;title.textContent=meta.tool&&meta.tool.title?meta.tool.title:"PactFlow result";}
  data=payload.data;
  status.hidden=true;content.hidden=false;loading=false;draw();
}
function callTool(a){
  var name=meta&&meta.tool&&meta.tool.name;
  if(!name)return Promise.reject({message:"tool name unavailable"});
  var timer,timeout=new Promise(function(_,rej){timer=setTimeout(function(){rej({message:"the host did not respond to the tool call"});},20000);});
  return Promise.race([request("tools/call",{name:name,arguments:a}),timeout]).then(function(r){clearTimeout(timer);return r;},function(e){clearTimeout(timer);throw e;});
}
function fail(what,err){loading=false;note.hidden=false;note.textContent="Could not "+what+": "+((err&&err.message)||"request failed");draw();}
function goto(n){
  var a={};for(var k in args)a[k]=args[k];a.pageNumber=n;
  loading=true;note.hidden=true;draw();
  callTool(a).then(function(r){args=a;full=null;fullFor=null;render(r);},function(e){fail("load page",e);});
}
function search(){
  var term=filter.value.trim(),p=pageInfo(data);
  if(!term||!p||p.totalPages<=1){draw();return;}
  if(full&&fullFor===JSON.stringify(args)){draw();return;}
  var a={};for(var k in args)a[k]=args[k];a.pageNumber=1;a.pageSize=Math.min(Math.max(p.totalItems,1),1000);
  loading=true;note.hidden=true;draw();
  callTool(a).then(function(r){var payload=toolResultData(r);loading=false;if(payload){full=payload.data;fullFor=JSON.stringify(args);}draw();},function(e){fail("search all pages",e);});
}
prev.onclick=function(){var p=pageInfo(data);if(p)goto(p.pageNumber-1);};
next.onclick=function(){var p=pageInfo(data);if(p)goto(p.pageNumber+1);};
filter.addEventListener("input",function(){if(!data)return;draw();clearTimeout(searchTimer);searchTimer=setTimeout(search,250);});
copyAll.onclick=function(){copy(json(data));};
rawBtn.onclick=function(){showRaw=!showRaw;rawBtn.textContent=showRaw?"Table view":"Raw JSON";draw();};
window.addEventListener("message",function(event){
  var m=event.data;if(!m||typeof m!=="object")return;
  if(m.jsonrpc==="2.0"&&m.id!==undefined&&pending[m.id]){var c=pending[m.id];delete pending[m.id];m.error?c.reject(m.error):c.resolve(m.result);return;}
  if(m.method==="ui/notifications/tool-input"&&m.params&&m.params.arguments)args=m.params.arguments;
  if(m.method==="ui/notifications/tool-result")render(m.params);
});
request("ui/initialize",{protocolVersion:"2026-01-26",appInfo:{name:"pactflow-result-explorer",version:"2.0.0"},appCapabilities:{availableDisplayModes:["inline","fullscreen"]}}).then(function(r){if(r&&r.hostContext&&r.hostContext.theme)document.documentElement.setAttribute("data-theme",r.hostContext.theme);notify("ui/notifications/initialized",{});reportSize();});
})();`;

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>PactFlow result explorer</title>
<style>${css}</style></head><body><main><header><h1 id="title">PactFlow result</h1><span id="count"></span><button id="raw" class="sp" type="button">Raw JSON</button><button id="copy-all" type="button">Copy result</button></header><div id="status">Waiting for a tool result...</div><section id="content" hidden><input id="filter" type="search" placeholder="Search all results" aria-label="Filter result" /><div id="note" class="muted" hidden></div><div id="view"></div><footer id="pager" hidden><button id="prev" type="button">‹ Previous</button><span id="page-label" class="muted"></span><button id="next" type="button">Next ›</button></footer></section></main><script>${script}</script></body></html>`;

void html;

export const PACTFLOW_RESULT_EXPLORER_APP: McpAppParams = {
  resourceUri: "ui://contract-testing/result-explorer",
  title: "PactFlow Result Explorer",
  description:
    "Generic PactFlow result viewer: item tables, detail views and page-by-page navigation.",
  html,
};

export const RESULT_EXPLORER_MODEL_SOURCE = (() => {
  const start = model.indexOf("/*MODEL*/");
  const end = model.indexOf("/*ENDMODEL*/");
  return model.slice(start, end);
})();
