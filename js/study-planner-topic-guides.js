
/* GCSE ONTRACK — structured, topic-specific timetable guides.
 * Replaces the existing topic-guide script. No data model or session is deleted.
 */
(() => {
  "use strict";
  const KEY = "gcoStudyPlanner_v1";
  const DAY_ID = {Monday:"Mon",Tuesday:"Tue",Wednesday:"Wed",Thursday:"Thu",Friday:"Fri",Saturday:"Sat",Sunday:"Sun"};
  const clean = (v,n=160) => String(v ?? "").trim().slice(0,n);
  const el = (tag,cls="",value) => {
    const node=document.createElement(tag);
    if(cls) node.className=cls;
    if(value!==undefined) node.textContent=String(value);
    return node;
  };
  function modelRead(){
    try{
      const m=JSON.parse(localStorage.getItem(KEY)||"null");
      if(!m||typeof m!=="object"||Array.isArray(m)) return null;
      m.sessions=Array.isArray(m.sessions)?m.sessions:[];
      m.subjects=Array.isArray(m.subjects)?m.subjects:[];
      return m;
    }catch(e){console.warn("GCSE ONTRACK: could not read saved timetable",e);return null;}
  }
  function boardFor(s,m){
    return clean(s.examBoard||m.subjects.find(x=>x&&x.name===s.subject)?.examBoard||"",50);
  }
  function subjectKind(name){
    const s=clean(name,80).toLowerCase();
    if(/math/.test(s))return "maths";
    if(/biology/.test(s))return "biology";
    if(/chemistry/.test(s))return "chemistry";
    if(/physics/.test(s))return "physics";
    if(/science/.test(s))return "science";
    if(/history/.test(s))return "history";
    if(/business/.test(s))return "business";
    if(/english/.test(s))return "english";
    if(/geography/.test(s))return "geography";
    if(/\bit\b|digital information technology|computer science|computing/.test(s))return "computing";
    return "other";
  }
  function isBalancing(t){
    return /balanc(?:e|ed|ing)[\s\w-]{0,45}equations?|equations?[\s\w-]{0,45}balanc(?:e|ed|ing)|symbol equations?|chemical equations?|conservation of mass/i.test(clean(t,120));
  }
  function cardSession(card,m){
    const id=String(card.dataset.sessionId||"");
    if(id){
      const byId=m.sessions.find(s=>s&&String(s.id||"")===id&&s.kind!=="break");
      if(byId)return byId;
    }
    const dayLabel=card.closest(".timetable-day")?.querySelector(".timetable-day-heading h3")?.textContent?.trim();
    const day=DAY_ID[dayLabel];
    const time=card.querySelector(".session-time")?.textContent||"";
    const match=time.split(/[–-]/)[0].trim().match(/^(\d{1,2}):(\d{2})$/);
    const start=match?Number(match[1])*60+Number(match[2]):null;
    const title=card.querySelector(":scope > h3")?.textContent?.trim()||"";
    const matches=m.sessions.filter(s=>s&&s.kind!=="break"&&
      (!day||s.day===day)&&(start===null||Number(s.startMinutes)===start)&&
      title===(clean(s.subject)?clean(s.subject)+" — "+clean(s.topic):clean(s.topic||s.title)));
    return matches.length===1?matches[0]:null;
  }

  const G={
    maths:["Solve questions on {t} independently and show a method another student could follow.","Show the method, not just the final answer.",
      ["Retrieve the method","Study a worked example","Apply it independently","Mark and improve"],
      t=>["Write the rule, formula or method for "+t+" from memory. Note what each symbol or step means.","Study one worked example. Explain each step, then cover it and reproduce the method.","Attempt three questions on "+t+" without looking at the example. Show every line of working.","Mark the questions, correct the first error and write what you will check next time."],
      t=>"Three attempted questions on "+t+", full working and one corrected mistake.","Your method is visible, the arithmetic is checked and the final answer has the correct form or unit.","Do not skip working or copy a method without checking whether it fits."],
    biology:["Explain {t} accurately, using biological terms and a clear sequence or relationship.","Name structures and substances precisely; link each stage with cause and effect.",
      ["Retrieve key terms","Build the model","Explain from memory","Check and improve"],
      t=>["Write the key terms for "+t+" from memory, then check their definitions.","Draw or organise the process, structure or comparison for "+t+" in a logical order.","Answer one exam-style question using precise biological terms and linked explanations.","Check the sequence and terminology, then add the detail you missed."],
      t=>"A labelled diagram, flow sequence or comparison for "+t+", plus one exam-style explanation.","The sequence is logical, key terms are accurate and each explanation links cause to effect.","Avoid vague words; name the structure, substance or process."],
    chemistry:["Explain or apply {t} accurately, using correct formulae, equations and units where needed.","Track particles, formulae and conditions carefully.",
      ["Retrieve the chemistry","Work through a model","Apply it independently","Check the chemistry"],
      t=>["List key substances, formulae, particles or definitions connected to "+t+" from memory.","Work through one suitable example, showing each chemical step and why it is needed.","Attempt a new question on "+t+" without looking at the example.","Check symbols, formulae, working and units; correct any error."],
      t=>"A correct equation, calculation, particle explanation or comparison for "+t+", with working shown.","Formulae and symbols are correct, working is shown, and atoms or units are checked where relevant.","Check chemical symbols, formulae and units. Never change a formula to balance an equation."],
    physics:["Apply the correct physics model to {t} and show how evidence or a calculation supports your answer.","Choose the right model, show substitutions and keep units attached to calculated values.",
      ["Select the model","Study the method","Attempt a new question","Check units and meaning"],
      t=>["Identify the model, law, quantities or definitions needed for "+t+".","For a calculation, write and rearrange the equation before substituting values; otherwise draw and label the model.","Complete a new calculation, explanation or graph question on "+t+".","Check units, scale, direction and whether the answer is physically sensible."],
      t=>"A labelled model or diagram, one worked calculation or explanation, and units where relevant.","The chosen model is appropriate, substitutions are clear and the final answer has a sensible unit.","Do not mix units or choose an equation just because it contains a familiar number."],
    science:["Explain {t} clearly and apply the correct scientific method, terminology or calculation.","Use accurate scientific vocabulary and distinguish given information from what must be explained.",
      ["Retrieve the science","Build a clear model","Apply it","Check the explanation"],
      t=>["Retrieve the key terms and state the scientific idea behind "+t+".","Create a labelled diagram, sequence, equation or data table that represents the topic.","Answer one exam-style question, showing reasoning or working.","Check terminology and scientific accuracy, then correct one gap."],
      t=>"A short scientific explanation or calculation on "+t+", plus one checked answer.","Scientific vocabulary is accurate and the explanation, diagram, calculation or data interpretation is consistent.","Do not confuse information supplied in the question with the explanation it asks you to provide."],
    history:["Produce a supported historical explanation or judgement about {t} using precise evidence.","Build an argument with relevant evidence; explain how it supports the point.",
      ["Retrieve precise evidence","Explain the context","Build an argument","Check the judgement"],
      t=>["Create a short timeline or evidence list for "+t+" with relevant dates, people and events.","Choose two precise facts and explain what each demonstrates about the topic.","Write a developed paragraph linking a point, evidence and explanation to the question.","Check chronology, relevance and whether the explanation supports a clear judgement."],
      t=>"One developed paragraph on "+t+" containing a clear point, precise evidence and explanation.","Evidence is accurate and relevant, chronology is secure, and the explanation supports the judgement.","Do not retell events without explaining why the evidence matters."],
    business:["Explain {t} and apply it to a business situation before analysing the likely impact.","Move from knowledge to application, then analyse impact before reaching a justified judgement.",
      ["Retrieve key knowledge","Apply to a business","Analyse the impact","Evaluate"],
      t=>["Define key terms in "+t+" and note the formula or model if one applies.","Apply the idea to the business or scenario in your question. Use details from that context.","Develop a cause-and-effect chain: decision or factor → impact on the business → consequence.","Consider an alternative or limitation and justify your final judgement."],
      t=>"A definition, one applied point, a developed impact and a justified judgement about "+t+".","The answer uses the scenario, develops a cause-and-effect chain and justifies the judgement.","Do not describe a business concept without applying it to the business in the question."],
    english:["Produce a focused English response on {t} supported by precise evidence and analysis.","Make a clear interpretation, support it with precise evidence and explain the writer's choices or your own.",
      ["Identify the task","Select evidence","Write and analyse","Review the response"],
      t=>["Identify the exact text, question focus or writing purpose linked to "+t+".","Select brief, accurate evidence or plan the point you want to communicate.","Write one focused paragraph and explain the meaning, method or effect of your choices.","Check that the response answers the task and improve one specific sentence or point."],
      t=>"One focused paragraph on "+t+" with a clear argument, brief evidence and analysis.","Evidence is accurate, analysis explains meaning or effect, and every point answers the task.","Do not name a technique and stop; explain what the evidence suggests in context."],
    geography:["Explain {t} using accurate geographical processes, evidence and place-specific detail.","Connect the process to a named place or example, use accurate evidence and explain the links.",
      ["Retrieve the process","Use evidence","Explain the links","Check accuracy"],
      t=>["Recall the key process and geographical vocabulary for "+t+".","Draw a labelled sequence or retrieve precise evidence from the relevant case study.","Explain how or why the process happens, using a named example where appropriate.","Check that the evidence is accurate and the explanation links each stage."],
      t=>"A process diagram or case-study fact set and one developed explanation about "+t+".","Processes are linked logically and place-specific evidence is accurate and relevant.","Do not give a generic example when the question needs a named place or case study."],
    computing:["Apply {t} to a realistic brief and produce evidence that meets the relevant requirement.","Show the process or decision clearly, then test it against the requirement, user need or criterion.",
      ["Identify the requirement","Break down the concept","Produce evidence","Check and improve"],
      t=>["Identify the requirement, user need or learning outcome linked to "+t+".","Break the process or concept into clear steps and use the correct technical vocabulary.","Produce or analyse a small piece of evidence that demonstrates the topic.","Check it against the requirement and explain one improvement."],
      t=>"Annotated evidence or a short worked solution showing how "+t+" meets the task requirement.","Evidence meets the requirement, decisions are justified and the result has been checked or tested.","Do not describe a feature without linking it to a user need or criterion."],
    other:["Show what you understand about {t} in a short, independently produced answer.","Use the exact topic and course requirements; retrieve, check and correct.",
      ["Retrieve the essentials","Clarify the idea","Apply it independently","Check and improve"],
      t=>["Write the key terms and intended learning outcome for "+t+" from memory.","Use relevant class material to clarify the main idea and one suitable example.","Complete a short application or exam-style task without copying a model answer.","Check the work against the learning outcome and correct one gap."],
      t=>"A short answer or piece of work demonstrating "+t+", plus one correction.","You can explain the main idea without copying and have corrected at least one gap.","Keep the answer focused on the exact topic and task."]
  };

  function phase3Tasks(card, session, board){
    const oldGuide=card.querySelector(".phase3-session-steps");
    const focus=oldGuide?.querySelector(".phase3-focus-line")?.textContent?.trim() || "";
    const expected=clean(session.subject)+" · "+clean(session.topic)+(board?" · "+board:"");
    // Only reuse the older task list when it belongs to this exact session.
    if(focus!==expected)return [];
    const ol=oldGuide.querySelector("ol");
    return ol?Array.from(ol.querySelectorAll("li")).map(li=>li.textContent.replace(/^\s*\d+\s*min\s*[—-]\s*/i,"").trim()).filter(Boolean).slice(0,4):[];
  }
  function allocate(total,count){
    total=Math.max(5,Math.round(Number(total)||25));
    const w=count===2?[.45,.55]:[.2,.25,.35,.2];
    const a=w.map(x=>Math.floor(total*x));let rest=total-a.reduce((p,c)=>p+c,0);
    for(let i=0;rest>0;i=(i+1)%a.length){a[i]++;rest--;}
    return a;
  }
  function balancingSteps(total){
    const tasks=[
      ["Count the atoms","Copy the equation exactly. Count each element on the left (reactants) and right (products). For brackets, multiply atoms inside by the number outside."],
      ["Choose coefficients","Balance one element at a time by adding a large number in front of a formula. Never change small subscripts."],
      ["Recount every element","A coefficient multiplies the entire formula. Recount every element after each change; leave hydrogen and oxygen until later when practical."],
      ["Check and practise","Make every element match on both sides. Use the smallest whole-number coefficients, omit a coefficient of 1, then balance a new equation without looking."]
    ];
    const chosen=Number(total)<12?[tasks[0],tasks[3]]:tasks;
    return chosen.map((x,i)=>({label:x[0],task:x[1],minutes:allocate(total,chosen.length)[i]}));
  }
  function buildSteps(card,session,kind,board){
    const conf=G[kind]||G.other;const duration=Number(session.durationMinutes)||25;
    if((kind==="science"||kind==="chemistry")&&isBalancing(session.topic))return balancingSteps(duration);
    const old=phase3Tasks(card,session,board);const t=clean(session.topic,120);
    const tasks=old.length>=2?old:conf[3](t);const count=duration<12?2:4;
    const chosen=count===2?[tasks[0],tasks[3]||tasks[1]]:tasks.slice(0,4);
    const labels=count===2?["Learn and model","Retrieve and check"]:conf[2];
    const times=allocate(duration,count);
    return chosen.map((task,i)=>({label:labels[i],task,minutes:times[i]}));
  }
  function renderGuide(card,s,board){
    const key=[s.id,s.durationMinutes,s.subject,s.topic,board].join("|");
    if(card.dataset.refinedGuideKey===key)return;
    const kind=subjectKind(s.subject),conf=G[kind]||G.other;
    const balancing=(kind==="science"||kind==="chemistry")&&isBalancing(s.topic);
    card.querySelectorAll(".session-steps").forEach(n=>n.remove());
    const box=el("details","session-steps phase3-session-steps topic-guide-structured");box.open=true;
    box.appendChild(el("summary","","How to study this topic"));
    box.appendChild(el("p","phase3-focus-line",clean(s.subject)+" · "+clean(s.topic)+(board?" · "+board:"")));
    box.appendChild(el("p","topic-guide-objective","YOUR TARGET — "+(balancing?
      "Balance chemical symbol equations by changing coefficients only, then prove every element has the same atom count on both sides.":
      conf[0].replace("{t}",clean(s.topic,120)))));
    box.appendChild(el("p","topic-guide-key-rule","KEY APPROACH — "+(balancing?
      "Change only the large numbers in front of formulae (coefficients). Never change small subscripts: that changes the substance.":
      conf[1])));
    box.appendChild(el("h4","topic-guide-section-heading","Work through these steps"));
    const ol=el("ol","topic-guide-steps");
    buildSteps(card,s,kind,board).forEach((step,i)=>{
      const li=el("li","topic-guide-step");const top=el("div","topic-guide-step-top");
      top.append(el("span","topic-guide-step-number",String(i+1).padStart(2,"0")),
        el("strong","",step.label),el("span","topic-guide-step-time",step.minutes+" min"));
      li.append(top,el("p","",step.task));ol.appendChild(li);
    });box.appendChild(ol);
    if(balancing){
      const ex=el("section","topic-guide-example");
      ex.append(el("h4","","Worked example: magnesium + oxygen"),
        el("p","topic-guide-equation","Mg + O₂ → MgO"),
        el("p","","Before: left Mg = 1, O = 2; right Mg = 1, O = 1."),
        el("p","topic-guide-equation topic-guide-equation-answer","2Mg + O₂ → 2MgO"),
        el("p","","After: left Mg = 2, O = 2; right Mg = 2, O = 2. The coefficient multiplies every atom in the formula."));
      box.appendChild(ex);
      const challenge=el("details","topic-guide-challenge");challenge.append(el("summary","","Try this before revealing the answer"),el("p","topic-guide-equation","Al + O₂ → Al₂O₃"),el("p","","Balance aluminium and oxygen, then count both elements on both sides."));
      const reveal=el("details","topic-guide-answer");reveal.append(el("summary","","Reveal the balanced equation"),el("p","topic-guide-equation topic-guide-equation-answer","4Al + 3O₂ → 2Al₂O₃"));challenge.appendChild(reveal);box.appendChild(challenge);
    }
    box.append(
      el("p","topic-guide-output","FINISH WITH — "+(balancing?"An atom-count table, the balanced magnesium equation and the aluminium equation attempted independently.":conf[4](clean(s.topic,120)))),
      el("p","topic-guide-check","SUCCESS CHECK — "+(balancing?"Every element matches on both sides; no formula subscript has changed; coefficients are the smallest whole-number ratio.":conf[5])),
      el("p","topic-guide-common-errors","COMMON ERRORS — "+(balancing?"Do not change O₂ into O or H₂O into H₂O₂. A coefficient multiplies every atom in a formula, including atoms inside brackets.":conf[6]))
    );
    const actions=card.querySelector(".session-actions");if(actions)card.insertBefore(box,actions);else card.appendChild(box);
    card.dataset.refinedGuideKey=key;
    // Keep the earlier Phase 3 observer from replacing this guide with its older list.
    card.dataset.phase3Key=key;
  }

  const BALANCING=[
    {role:"GCSE Chemistry explanation and worked examples",title:"Cognito — How to balance chemical equations",url:"https://www.cognito.org/blog/gcse-chemistry-balancing-equations",note:"Direct GCSE Chemistry guide with a repeatable method, worked examples and practice equations. General GCSE coverage; check your specification."},
  ];
  const OCR={
    role:"OCR Foundation lesson",title:"Oak National Academy — Balancing equations (OCR Foundation)",
    url:"https://www.thenational.academy/teachers/programmes/chemistry-secondary-ks4-foundation-ocr/units/calculations-involving-masses/lessons/balancing-equations",
    note:"Direct Year 10 OCR Foundation lesson with slides, video, worksheet and quizzes. Use it only if the Foundation tier matches your course."
  };
  function appendBalancingResources(card,s,board){
    card.querySelectorAll(".session-resources").forEach(n=>n.remove());
    const box=el("details","session-resources topic-guide-resources");box.open=true;
    box.appendChild(el("summary","","Direct resources for balancing equations"));
    box.appendChild(el("p","topic-guide-resource-note",board==="OCR"?
      "These links provide a general GCSE explanation and an OCR Foundation lesson. Check your tier.":
      "A direct topic guide is available. No exam-board-specific page is shown unless an exact matching lesson has been verified."));
    const list=el("div","topic-guide-resource-list");
    const items=board==="OCR"?[...BALANCING,OCR]:BALANCING;
    items.forEach(item=>{
      const cardItem=el("article","topic-guide-resource-card");
      cardItem.appendChild(el("span","topic-guide-resource-role",item.role));
      const a=el("a","session-resource-link",item.title);a.href=item.url;a.target="_blank";a.rel="noopener noreferrer";
      cardItem.append(a,el("p","",item.note));
      const save=el("button","btn secondary small","＋ Save to Resource Library");save.type="button";
      save.addEventListener("click",()=>{
        if(typeof window.getCollection!=="function"||typeof window.setCollection!=="function"){save.textContent="Open Resource Library to save";return;}
        try{
          const rows=window.getCollection("resources");const existing=rows.find(r=>r&&r.url===item.url&&!r.deleted);
          if(existing){const tags=String(existing.tag||"").split(";").map(x=>x.trim()).filter(Boolean);if(!tags.includes(s.topic))tags.push(s.topic);existing.tag=tags.join("; ").slice(0,100);window.setCollection("resources",rows);}
          else{const id=typeof window.uid==="function"?window.uid("res"):"res_"+Date.now().toString(36);window.setCollection("resources",[{id,shortId:Math.random().toString(36).slice(2,8).toUpperCase(),title:(s.subject+": "+s.topic+" — "+item.role).slice(0,140),url:item.url,subject:s.subject,tag:s.topic,note:item.note,priority:"Medium",rating:3,favourite:false,pinned:false,archived:false,deleted:false,deletedDate:null,clicks:0,created:Date.now(),lastEdited:null,lastOpened:null},...rows]);}
          save.textContent="✓ Saved to Resource Library";save.disabled=true;
        }catch(e){console.error(e);save.textContent="Could not save — try Resource Library";}
      });cardItem.appendChild(save);list.appendChild(cardItem);
    });box.appendChild(list);
    box.appendChild(el("p","topic-guide-disclaimer","External resources can change. Check the course and topic before using them; GCSE ONTRACK does not host their materials."));
    const actions=card.querySelector(".session-actions");if(actions)card.insertBefore(box,actions);else card.appendChild(box);
  }
  function removeGenericSearchLinks(card){
    card.querySelectorAll(".session-resources a.session-resource-link").forEach(a=>{
      if(/google\.[^/]+\/search|bing\.com\/search/i.test(a.href)){
        const item=a.closest(".session-resource-item,.phase3-resource-item");if(item)item.remove();
      }
    });
    card.querySelectorAll(".session-resources").forEach(panel=>{
      const list=panel.querySelector(".session-resource-list");
      if(list&&!list.querySelector("a.session-resource-link")&&!list.querySelector(".topic-guide-resource-note"))list.replaceChildren(el("p","topic-guide-resource-note","No direct topic page is mapped for this session yet. A generic homepage or search-results page is not being presented as a topic resource."));
    });
  }
  function enhance(){
    const host=document.getElementById("weeklySchedule");if(!host)return;
    const m=modelRead();if(!m)return;
    host.querySelectorAll(".timetable-session-card").forEach(card=>{
      if(card.classList.contains("kind-break"))return;
      const s=cardSession(card,m);if(!s)return;
      const board=boardFor(s,m);renderGuide(card,s,board);
      const kind=subjectKind(s.subject);
      if((kind==="science"||kind==="chemistry")&&isBalancing(s.topic)){
        const key=[s.id,s.topic,board].join("|");
        if(card.dataset.refinedResourceKey!==key){appendBalancingResources(card,s,board);card.dataset.refinedResourceKey=key;}
      }else removeGenericSearchLinks(card);
    });
  }
  function install(){
    const host=document.getElementById("weeklySchedule");if(!host)return;
    if(host.dataset.refinedGuideObserver==="true"){enhance();return;}
    const observer=new MutationObserver(enhance);observer.observe(host,{childList:true,subtree:true});
    host.dataset.refinedGuideObserver="true";enhance();
  }
  document.addEventListener("DOMContentLoaded",install,{once:true});
  if(document.readyState!=="loading")install();
})();
