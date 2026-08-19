/* GCSE OnTrack — Revision Plan */
(function(){
"use strict";
const KEY="revisionPlan";
const $=id=>document.getElementById(id);

function readPlan(){
 try{
  const raw=localStorage.getItem(KEY);
  if(!raw)return null;
  const v=JSON.parse(raw);
  return Array.isArray(v)?v[0]||null:v;
 }catch{return null}
}
function savePlan(plan){
 localStorage.setItem(KEY,JSON.stringify([plan]));
}
function esc(v){
 const d=document.createElement("div");
 d.textContent=String(v??"");
 return d.innerHTML;
}
function renderPlan(plan=readPlan()){
 const output=$("planOutput");
 if(!output)return;
 if(!plan){
  output.innerHTML='<div class="empty"><h2>No plan yet</h2><p>Enter your exam date, subjects and weekly study time to generate one.</p></div>';
  return;
 }
 if($("examDate"))$("examDate").value=plan.examDate;
 if($("subjects"))$("subjects").value=plan.subjects.join(", ");
 if($("hours"))$("hours").value=plan.hours;
 const per=plan.hours/plan.subjects.length;
 let html=`<div class="notice"><strong>${plan.weeks} weeks</strong> until your exam • <strong>${plan.hours} hours/week</strong> • <strong>${plan.subjects.length} subjects</strong></div><div class="grid grid2" style="margin-top:16px">`;
 for(let w=1;w<=plan.weeks;w++){
  html+=`<div class="card"><h3>Week ${w}</h3><p class="muted">Active recall • exam questions • corrections</p>`;
  plan.subjects.forEach(s=>html+=`<p>📚 <strong>${esc(s)}</strong> — ${per.toFixed(1)} hrs</p>`);
  html+="</div>";
 }
 output.innerHTML=html+"</div>";
}
function generate(e){
 e.preventDefault();
 const exam=$("examDate")?.value;
 const subjects=($("subjects")?.value||"").split(",").map(s=>s.trim()).filter(Boolean);
 const hours=Number($("hours")?.value);
 if(!exam)return alert("Enter your exam date.");
 if(!subjects.length)return alert("Enter at least one subject.");
 if(!hours||hours<1)return alert("Enter at least 1 hour per week.");
 const today=new Date();today.setHours(0,0,0,0);
 const date=new Date(exam+"T00:00:00");
 if(date<=today)return alert("Choose a future exam date.");
 const plan={examDate:exam,subjects,hours,weeks:Math.max(1,Math.ceil((date-today)/86400000/7)),created:Date.now()};
 savePlan(plan);renderPlan(plan);
}
document.addEventListener("DOMContentLoaded",()=>{
 if(!$("planForm"))return;
 $("planForm").addEventListener("submit",generate);
 $("clearPlan")?.addEventListener("click",()=>{
  if(confirm("Clear your revision plan?")){
   localStorage.removeItem(KEY);renderPlan(null);
  }
 });
 renderPlan();
});
})();