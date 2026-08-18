
const RESOURCE_KEY="resources";
const SUBJECTS=["Maths","English","Biology","Chemistry","Physics","History","Geography","Business","Computer Science"];
const COLOURS={"Maths":"#2563eb","English":"#7c3aed","Biology":"#16a34a","Chemistry":"#06b6d4","Physics":"#f59e0b","History":"#dc2626","Geography":"#059669","Business":"#9333ea","Computer Science":"#0ea5e9"};
let resources=getCollection(RESOURCE_KEY), currentSearch="", currentSubject="All Subjects", currentSort="newest", openNewTab=true, showArchived=false, showDeleted=false;

const $=id=>document.getElementById(id);
function save(){setCollection(RESOURCE_KEY,resources)}
function normalise(r){return {...r,pinned:!!r.pinned,favourite:!!r.favourite,archived:!!r.archived,deleted:!!r.deleted,clicks:Number(r.clicks)||0,created:r.created||Date.now(),lastEdited:r.lastEdited||null,lastOpened:r.lastOpened||null,priority:r.priority||"Medium",rating:Math.max(1,Math.min(5,Number(r.rating)||3))}}
resources=resources.map(normalise); save();

function addResource(){
 const subject=$("subjectInput").value,title=$("titleInput").value.trim(),raw=$("urlInput").value.trim();
 if(!subject)return alert("Choose a subject.");
 if(!title)return alert("Enter a resource title.");
 if(!raw)return alert("Enter a resource link.");
 const url=raw.match(/^https?:\/\//i)?raw:"https://"+raw;
 try{new URL(url)}catch{return alert("Enter a valid URL.")}
 if(resources.some(r=>r.url===url&&!r.deleted)){return alert("That resource is already in your library.")}
 const priority=$("priorityInput").value,rating=Number($("ratingInput").value);
 resources.unshift({id:uid("res"),shortId:Math.random().toString(36).slice(2,8).toUpperCase(),title,url,subject,tag:$("tagInput").value.trim(),note:$("noteInput").value.trim(),priority,rating,favourite:false,pinned:false,archived:false,deleted:false,deletedDate:null,clicks:0,created:Date.now(),lastEdited:null,lastOpened:null});
 save(); clearForm(); render();
}
function clearForm(){["titleInput","urlInput","tagInput","noteInput"].forEach(id=>$(id).value="");$("subjectInput").value="";$("priorityInput").value="Medium";$("ratingInput").value="3"}
function filteredResources(){
 let a=resources.filter(r=>showDeleted?r.deleted:showArchived?r.archived&&!r.deleted:!r.archived&&!r.deleted);
 if(currentSearch){const q=currentSearch.toLowerCase();a=a.filter(r=>[r.title,r.subject,r.tag,r.note,r.url,r.priority].join(" ").toLowerCase().includes(q))}
 if(currentSubject!=="All Subjects")a=a.filter(r=>r.subject===currentSubject);
 const cmp={
  newest:(a,b)=>b.created-a.created,oldest:(a,b)=>a.created-b.created,
  alphabetical:(a,b)=>a.title.localeCompare(b.title),mostOpened:(a,b)=>b.clicks-a.clicks,
  recentlyEdited:(a,b)=>(b.lastEdited||0)-(a.lastEdited||0),
  favourites:(a,b)=>Number(b.favourite)-Number(a.favourite),
  rating:(a,b)=>b.rating-a.rating,priority:(a,b)=>({High:3,Medium:2,Low:1}[b.priority]-({High:3,Medium:2,Low:1}[a.priority]))
 }[currentSort]||((a,b)=>b.created-a.created);
 return a.sort((a,b)=>Number(b.pinned)-Number(a.pinned)||cmp(a,b));
}
function render(){
 const list=filteredResources(); $("resultsText").textContent=`${list.length} shown • ${resources.length} total • ${resources.filter(r=>r.archived&&!r.deleted).length} archived • ${resources.filter(r=>r.deleted).length} deleted`;
 $("resourceGrid").innerHTML="";
 if(!list.length){$("resourceGrid").innerHTML=`<div class="empty"><h2>${showDeleted?"Recycle Bin is empty":showArchived?"Archive is empty":"No resources found"}</h2><p>Try another filter or add a resource.</p></div>`; updateStats(); return}
 list.forEach(r=>{
  const card=document.createElement("article");card.className="card";card.style.borderLeft=`7px solid ${COLOURS[r.subject]||"var(--primary)"}`;
  if(r.favourite)card.style.boxShadow="0 0 0 2px #f59e0b";
  const host=(()=>{try{return new URL(r.url).hostname.replace(/^www\./,"")}catch{return""}})();
  const ageDays=Math.floor((Date.now()-r.created)/86400000), isNew=ageDays<7;
  card.innerHTML=`
   <div class="actions">
    ${r.pinned?'<span class="badge" style="background:#f59e0b">📌 PINNED</span>':""}
    ${isNew&&!r.deleted?'<span class="badge" style="background:#16a34a">🆕 NEW</span>':""}
    <span class="badge" style="background:${COLOURS[r.subject]||"var(--primary)"}">${esc(r.subject)}</span>
    <span class="badge">${esc(r.priority)} Priority</span>
    <span class="badge">⭐ ${r.rating}/5</span>
   </div>
   <h2 style="margin:13px 0 5px">${esc(r.title)}</h2>
   <div class="muted">${esc(r.shortId)} ${r.tag?`• ${esc(r.tag)}`:""}</div>
   <p>${esc(r.note)||'<span class="muted">No notes.</span>'}</p>
   <a href="${esc(r.url)}" target="${openNewTab?"_blank":"_self"}" onclick="track('${r.id}')">${esc(r.url)}</a>
   <div class="muted" style="margin-top:7px">🌐 ${esc(host)}</div>
   <div class="actions" style="margin-top:16px">
    ${r.deleted?`<button class="btn success small" onclick="restoreDeleted('${r.id}')">♻ Restore</button><button class="btn danger small" onclick="permanentDelete('${r.id}')">🗑 Delete Forever</button>`:
      r.archived?`<button class="btn success small" onclick="restoreArchived('${r.id}')">↩ Restore</button>`:
      `<button class="btn secondary small" onclick="editResource('${r.id}')">✏ Edit</button>
       <button class="btn secondary small" onclick="copyLink('${r.id}')">📋 Copy</button>
       <button class="btn secondary small" onclick="togglePin('${r.id}')">${r.pinned?"📌 Unpin":"📍 Pin"}</button>
       <button class="btn secondary small" onclick="toggleFav('${r.id}')">${r.favourite?"⭐ Unfavourite":"☆ Favourite"}</button>
       <button class="btn warning small" onclick="archive('${r.id}')">🗄 Archive</button>
       <button class="btn danger small" onclick="trash('${r.id}')">🗑 Delete</button>`}
   </div>
   <div class="muted" style="margin-top:15px;font-size:13px;display:flex;gap:14px;flex-wrap:wrap">
    <span>📅 Added ${dateText(r.created)}</span><span>✏ Edited ${dateText(r.lastEdited)}</span><span>🕒 Last opened ${dateText(r.lastOpened)}</span><span>👆 ${r.clicks} opens</span><span>📆 ${ageDays} days old</span>
   </div>`;
  $("resourceGrid").appendChild(card);
 });
 updateStats();
}
function updateStats(){
 $("totalResources").textContent=resources.filter(r=>!r.deleted&&!r.archived).length;
 $("totalFavourites").textContent=resources.filter(r=>r.favourite&&!r.deleted).length;
 $("totalClicks").textContent=resources.reduce((s,r)=>s+r.clicks,0);
 $("totalSubjects").textContent=new Set(resources.filter(r=>!r.deleted).map(r=>r.subject)).size;
 $("archivedCount").textContent=resources.filter(r=>r.archived&&!r.deleted).length;
 $("deletedCount").textContent=resources.filter(r=>r.deleted).length;
 $("libraryStatus").textContent=resources.length?`${resources.length} resources stored locally.`:"Your library is empty.";
}
function editResource(id){
 const r=resources.find(x=>x.id===id);if(!r)return;
 const title=prompt("Title",r.title);if(title===null)return;
 const url=prompt("URL",r.url);if(url===null)return;
 const tag=prompt("Topic / Tag",r.tag||"");if(tag===null)return;
 const note=prompt("Notes",r.note||"");if(note===null)return;
 const priority=prompt("Priority: High, Medium or Low",r.priority);if(priority===null)return;
 const rating=prompt("Rating: 1-5",r.rating);if(rating===null)return;
 r.title=title.trim()||r.title;r.url=url.trim()||r.url;r.tag=tag.trim();r.note=note.trim();r.priority=/^(High|Medium|Low)$/i.test(priority.trim())?priority.trim()[0].toUpperCase()+priority.trim().slice(1).toLowerCase():r.priority;r.rating=Math.max(1,Math.min(5,Number(rating)||r.rating));r.lastEdited=Date.now();save();render();
}
function togglePin(id){const r=resources.find(x=>x.id===id);if(r){r.pinned=!r.pinned;save();render()}}
function toggleFav(id){const r=resources.find(x=>x.id===id);if(r){r.favourite=!r.favourite;save();render()}}
function archive(id){const r=resources.find(x=>x.id===id);if(r&&confirm("Archive this resource?")){r.archived=true;save();render()}}
function trash(id){const r=resources.find(x=>x.id===id);if(r&&confirm("Move this resource to the Recycle Bin? You can restore it later.")){r.deleted=true;r.deletedDate=Date.now();save();render()}}
function restoreArchived(id){const r=resources.find(x=>x.id===id);if(r){r.archived=false;save();showArchived=false;render()}}
function restoreDeleted(id){const r=resources.find(x=>x.id===id);if(r){r.deleted=false;r.deletedDate=null;save();showDeleted=false;render()}}
function permanentDelete(id){if(!confirm("Permanently delete this resource? This cannot be undone."))return;resources=resources.filter(r=>r.id!==id);save();render()}
function track(id){const r=resources.find(x=>x.id===id);if(r){r.clicks++;r.lastOpened=Date.now();save()}}
async function copyLink(id){const r=resources.find(x=>x.id===id);if(!r)return;try{await navigator.clipboard.writeText(r.url);alert("Link copied.")}catch{prompt("Copy this link:",r.url)}}
function exportLibrary(){const blob=new Blob([JSON.stringify(resources,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="gcse-ontrack-resources.json";a.click();URL.revokeObjectURL(a.href)}
function importLibrary(file){
 const reader=new FileReader();reader.onload=()=>{try{const incoming=JSON.parse(reader.result);if(!Array.isArray(incoming))throw 0;const existing=new Set(resources.map(r=>r.id));incoming.map(normalise).forEach(r=>{if(!existing.has(r.id))resources.push(r)});save();render();alert("Library imported.")}catch{alert("Invalid resource backup.")}};reader.readAsText(file)
}
function openSubject(){const s=$("subjectInput").value;if(!s)return alert("Choose a subject.");resources.filter(r=>r.subject===s&&!r.deleted).forEach(r=>window.open(r.url,openNewTab?"_blank":"_self"))}
document.addEventListener("DOMContentLoaded",()=>{
 $("addResourceBtn").onclick=addResource;
 $("searchInput").oninput=e=>{currentSearch=e.target.value;render()};
 $("subjectFilter").onchange=e=>{currentSubject=e.target.value;render()};
 $("sortSelect").onchange=e=>{currentSort=e.target.value;render()};
 $("resetFiltersBtn").onclick=()=>{currentSearch="";currentSubject="All Subjects";currentSort="newest";showArchived=false;showDeleted=false;$("searchInput").value="";$("subjectFilter").value="All Subjects";$("sortSelect").value="newest";render()};
 $("toggleTabMode").onclick=e=>{openNewTab=!openNewTab;e.target.textContent=openNewTab?"🌐 New Tab":"📄 Same Tab"};
 $("exportBtn").onclick=exportLibrary;
 $("importBtn").onclick=()=>$("importFile").click();
 $("importFile").onchange=e=>{if(e.target.files[0])importLibrary(e.target.files[0]);e.target.value=""};
 $("clearLibraryBtn").onclick=()=>{if(confirm("Delete every resource? This cannot be undone.")){resources=[];save();render()}};
 $("archiveBtn").onclick=()=>{showArchived=true;showDeleted=false;render()};
 $("recycleBinBtn").onclick=()=>{showDeleted=true;showArchived=false;render()};
 $("openSubjectBtn").onclick=openSubject;
 render();
});
