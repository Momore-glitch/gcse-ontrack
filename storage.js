
const ONTRACK_KEY="gcseOnTrack_vFinal";
function readData(){try{return JSON.parse(localStorage.getItem(ONTRACK_KEY))||{}}catch{return{}}}
function writeData(data){localStorage.setItem(ONTRACK_KEY,JSON.stringify(data))}
function getCollection(key){const d=readData();return Array.isArray(d[key])?d[key]:[]}
function setCollection(key,value){const d=readData();d[key]=value;writeData(d)}
function uid(prefix="item"){return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,9)}`}
function esc(v){const d=document.createElement("div");d.textContent=v??"";return d.innerHTML}
function dateText(v){return v?new Date(v).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"Never"}
document.addEventListener("DOMContentLoaded",()=>{const page=location.pathname.split("/").pop()||"index.html";document.querySelectorAll("nav a").forEach(a=>{if(a.getAttribute("href")===page)a.classList.add("active")})})
