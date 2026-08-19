/* GCSE OnTrack shared storage */
function getCollection(key){try{const v=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(v)?v:[]}catch{return[]}}
function setCollection(key,value){localStorage.setItem(key,JSON.stringify(value))}
function uid(prefix="id"){return prefix+"_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,8)}
function esc(value){const d=document.createElement("div");d.textContent=String(value??"");return d.innerHTML}
function dateText(value){if(!value)return"Never";const d=new Date(value);return isNaN(d)?"Never":d.toLocaleDateString("en-GB")}
