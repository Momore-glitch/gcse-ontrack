/* GCSE ONTRACK — final timetable refinement.
 * Collapses expanders until opened, renders the saved topic-specific study steps,
 * and supplies three useful resource types for the core GCSE subjects.
 * Does not change, delete or migrate planner sessions.
 */
(() => {
  "use strict";

  const MODEL_KEY = "gcoStudyPlanner_v1";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clean = (value, max = 160) => String(value ?? "").trim().slice(0, max);

  function readModel() {
    try {
      const value = JSON.parse(localStorage.getItem(MODEL_KEY) || "null");
      if (!value || typeof value !== "object" || Array.isArray(value)) return null;
      value.sessions = Array.isArray(value.sessions) ? value.sessions : [];
      value.subjects = Array.isArray(value.subjects) ? value.subjects : [];
      return value;
    } catch (error) {
      console.warn("GCSE ONTRACK could not read the timetable for its final refinement.", error);
      return null;
    }
  }

  const PACKS = {
    maths: {
      defaultBoard: "Pearson Edexcel",
      video: ["Video lessons", "Cognito — GCSE Maths video lessons", "https://cognito.org/courses/gcse/maths", "Subject-specific GCSE course with board selection."],
      practice: ["Topic practice", "Physics & Maths Tutor — Edexcel GCSE Maths topic questions", "https://www.physicsandmathstutor.com/maths-revision/gcse-questions-edexcel/", "Choose the question set for the session topic. Attempt it without notes, then use the matching mark scheme."],
      paper: ["Past papers and mark schemes", "Pearson Edexcel GCSE Maths past papers (1MA1) — Madlen", "https://madlen.io/uk/past-papers/gcse-maths/edexcel-1ma1/", "Choose Foundation or Higher and the correct paper. The archive links to original Pearson Edexcel papers and mark schemes."]
    },
    biology: {
      defaultBoard: "AQA",
      video: ["Video lessons", "Cognito — GCSE Biology video lessons", "https://cognito.org/courses/gcse/biology", "Choose AQA and open the topic that matches this session."],
      practice: ["Topic practice", "Physics & Maths Tutor — AQA GCSE Biology topic questions", "https://www.physicsandmathstutor.com/biology-revision/gcse-aqa/", "Choose the matching topic section and use its topic questions and flashcards after learning the content."],
      paper: ["Past papers and mark schemes", "AQA GCSE Biology past papers — Science GCSE", "https://sciencegcse.co.uk/past-papers?course=biology", "Choose Biology, the correct year and your exam tier. The archive links to original AQA question papers and mark schemes."]
    },
    chemistry: {
      defaultBoard: "AQA",
      video: ["Video lessons", "Cognito — GCSE Chemistry video lessons", "https://cognito.org/courses/gcse/chemistry", "Choose AQA and open the topic that matches this session."],
      practice: ["Topic practice", "Physics & Maths Tutor — AQA GCSE Chemistry topic questions", "https://www.physicsandmathstutor.com/chemistry-revision/gcse-aqa/", "Choose the matching topic section and use its topic questions and flashcards after learning the content."],
      paper: ["Past papers and mark schemes", "AQA GCSE Chemistry past papers — Science GCSE", "https://sciencegcse.co.uk/past-papers?course=chemistry", "Choose Chemistry, the correct year and your exam tier. The archive links to original AQA question papers and mark schemes."]
    },
    physics: {
      defaultBoard: "AQA",
      video: ["Video lessons", "Cognito — GCSE Physics video lessons", "https://cognito.org/courses/gcse/physics", "Choose AQA and open the topic that matches this session."],
      practice: ["Topic practice", "Physics & Maths Tutor — AQA GCSE Physics topic questions", "https://www.physicsandmathstutor.com/physics-revision/gcse-aqa/", "Choose the matching topic section and use its topic questions and flashcards after learning the content."],
      paper: ["Past papers and mark schemes", "AQA GCSE Physics past papers — Science GCSE", "https://sciencegcse.co.uk/past-papers?course=physics", "Choose Physics, the correct year and your exam tier. The archive links to original AQA question papers and mark schemes."]
    },
    history: {
      defaultBoard: "AQA",
      video: ["Video lessons", "Cognito — GCSE History video lessons", "https://cognito.org/courses/gcse/history", "Choose AQA and the relevant historic period or topic."],
      practice: ["Interactive topic practice", "DoRevision — AQA GCSE History (8145)", "https://dorevision.com/revise/aqa/gcse/history-8145", "Choose the interactive module whose title matches this session topic, then write an evidence-supported answer."],
      paper: ["Past papers and mark schemes", "AQA GCSE History past papers — Revision World", "https://revisionworld.com/a2-level-level-revision/history-gcse-level/history-gcse-past-papers/aqa-gcse-history-past-papers", "Choose the question-paper section that matches the AQA History option studied at school."]
    },
    "english language": {
      defaultBoard: "AQA",
      video: ["Video lessons", "Cognito — GCSE English Language video lessons", "https://cognito.org/courses/gcse/english-language", "Choose AQA and the reading or writing skill that matches this session."],
      practice: ["Question-skill practice", "DoRevision — AQA GCSE English Language", "https://dorevision.com/revise/aqa/gcse/english-language", "Choose the activity for this topic or question number, then practise the equivalent AQA question."],
      paper: ["Past papers and mark schemes", "AQA GCSE English Language past papers — Revision World", "https://revisionworld.com/a2-level-level-revision/english-language-gcse-level/english-language-gcse-past-papers/aqa-gcse-english-language-past-papers", "Choose the correct AQA paper and insert, complete it under timed conditions and mark your response."]
    },
    "english literature": {
      defaultBoard: "AQA",
      video: ["Video lessons", "Cognito — GCSE English Literature video lessons", "https://cognito.org/courses/gcse/english-literature", "Choose AQA and check that the set text matches the one studied in class."],
      practice: ["Text and essay practice", "DoRevision — AQA GCSE English Literature", "https://dorevision.com/revise/aqa/gcse/english-literature", "Choose the studied text or analytical skill that matches this session topic."],
      paper: ["Past papers and mark schemes", "AQA GCSE English Literature past papers — Revision World", "https://revisionworld.com/a2-level-level-revision/english-literature-gcse-level/english-literature-gcse-past-papers/aqa-gcse-english-literature-past-papers", "Choose Paper 1 or Paper 2 and check that the studied text and poetry section match the course."]
    },
    business: {
      defaultBoard: "Pearson Edexcel",
      video: ["Video lessons", "Cognito — GCSE Business video lessons", "https://cognito.org/courses/gcse/business", "Choose the appropriate exam board and the topic in this session."],
      practice: ["Interactive topic practice", "DoRevision — Edexcel GCSE Business (1BS0)", "https://dorevision.com/revise/edexcel/gcse/business", "Complete the short interactive activity for the topic, then apply it to a business scenario."],
      paper: ["Past papers and mark schemes", "Pearson — GCSE Business past-paper finder", "https://qualifications.pearson.com/en/support/support-topics/exams/past-papers.html", "Select GCSE Business (1BS0). Some of the newest papers are temporarily restricted to registered centres."]
    },
    "it / digital it": {
      defaultBoard: "Pearson BTEC",
      video: ["Video lessons and assessment guidance", "Pearson — BTEC Digital Information Technology training videos", "https://qualifications.pearson.com/en/qualifications/btec-tech-awards/digital-information-technology-2022/training-and-events.html", "Qualification-specific training videos. Some recordings are intended for teachers, so follow the component and task your school is studying."],
      practice: ["Course materials and practice tasks", "Pearson — BTEC Digital Information Technology course materials", "https://qualifications.pearson.com/en/qualifications/btec-tech-awards/digital-information-technology-2022.coursematerials.html", "Choose the component, learning outcome and sample material that match this session. Your current assignment brief takes priority."],
      paper: ["Official sample assessment", "Pearson — BTEC Digital Information Technology Component 3 sample assessment", "https://qualifications.pearson.com/content/dam/pdf/btec-tec-awards/information-technology/2022/specification-and-sample-assessments/60370506-BTEC-Tech-Award-Digital-Information-Technology-2022-SAMs-Component-3-PP1.pdf", "Use this sample external assessment to practise the Component 3 format. It is a sample paper, not a prediction of a live assessment."]
    }
  };

  function subjectKey(value) {
    const s = clean(value, 80).toLowerCase();
    if (/math/.test(s)) return "maths";
    if (/biology/.test(s)) return "biology";
    if (/chemistry/.test(s)) return "chemistry";
    if (/physics/.test(s)) return "physics";
    if (/history/.test(s)) return "history";
    if (/english language/.test(s)) return "english language";
    if (/english literature|^english$/.test(s)) return "english literature";
    if (/business/.test(s)) return "business";
    if (/\bit\b|digital information technology/.test(s)) return "it / digital it";
    return "";
  }

  function getSession(card, model) {
    const id = String(card.dataset.sessionId || "");
    if (id) {
      const byId = model.sessions.find(item => String(item.id || "") === id);
      if (byId) return byId;
    }
    const day = $(".timetable-day-heading h3", card.closest(".timetable-day"))?.textContent?.trim();
    const dayMap = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };
    const time = $(".session-time", card)?.textContent?.split(/[–-]/)[0]?.trim();
    const match = String(time || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!day || !match) return null;
    const start = Number(match[1]) * 60 + Number(match[2]);
    return model.sessions.find(item => item.day === dayMap[day] && Number(item.startMinutes) === start) || null;
  }

  function fallbackSteps(subject, topic) {
    const s = subjectKey(subject);
    const t = clean(topic, 120);
    const tasks = {
      maths: [
        `Write the rule, formula or method for ${t} from memory.`,
        `Study one worked example of ${t} and explain why each step is valid.`,
        `Attempt three ${t} questions without notes and show every line of working.`,
        "Mark the questions, correct the first error and redo it independently."
      ],
      biology: [
        `Recall the key structures, terms or stages involved in ${t}.`,
        `Draw or sequence the process for ${t}, labelling each relevant part.`,
        `Answer an exam-style ${t} question using accurate biological vocabulary.`,
        "Check the sequence and terminology, then correct one missing detail."
      ],
      chemistry: [
        `Recall the particles, substances, symbols or definitions needed for ${t}.`,
        `Work through one ${t} example, showing each chemical step.`,
        `Attempt a new ${t} calculation, equation or explanation without notes.`,
        "Check formulae, symbols, atom counts and units where relevant."
      ],
      physics: [
        `Identify the model, quantities, units or equation for ${t}.`,
        `Draw or label the relevant model and write the equation before substituting values.`,
        `Complete a new ${t} calculation, graph or explanation and show your reasoning.`,
        "Check units, scale, direction and whether the result is physically sensible."
      ],
      history: [
        `Recall the key people, dates and events linked to ${t}.`,
        `Choose two precise facts and explain what each demonstrates about ${t}.`,
        `Write a developed paragraph about ${t} using point, evidence and explanation.`,
        "Check chronology and whether the evidence supports your judgement."
      ],
      "english language": [
        `Identify the exact reading or writing skill involved in ${t}.`,
        "Select precise evidence or plan the purpose, audience and form of your response.",
        `Complete one timed ${t} exam question and explain the effect of your choices.`,
        "Check that each point answers the question and improve one specific feature."
      ],
      "english literature": [
        `Recall the central theme, character or idea connected with ${t}.`,
        "Select two accurate quotations from the studied text and identify the writer's choices.",
        `Write one analytical paragraph about ${t}, linking evidence to the writer's idea.`,
        "Check that your interpretation answers the question rather than retelling the plot."
      ],
      business: [
        `Define the key terms and formulae connected with ${t}.`,
        `Apply ${t} to the business or scenario in your question.`,
        "Develop a cause-and-effect chain from the decision to its business impact.",
        "Evaluate an alternative and justify your final judgement in context."
      ],
      "it / digital it": [
        `Identify the component, learning outcome or requirement connected with ${t}.`,
        "Break the task into clear steps and use the correct technical vocabulary.",
        `Produce or analyse evidence that demonstrates ${t}.`,
        "Check the evidence against the assessment criteria and identify one improvement."
      ]
    };
    return tasks[s] || [
      `Write the key terms and learning outcome for ${t} from memory.`,
      `Use your course material to clarify the main idea behind ${t}.`,
      `Complete one independent task or question on ${t}.`,
      "Check your work against the learning outcome and correct one gap."
    ];
  }

  function resourceEntries(session, model) {
    const key = subjectKey(session.subject);
    const pack = PACKS[key];
    if (!pack) return null;
    const subject = clean(session.subject, 60);
    const topic = clean(session.topic, 120);
    const savedSubject = model.subjects.find(item => item && item.name === subject);
    const board = clean(session.examBoard || savedSubject?.examBoard || pack.defaultBoard, 50);
    // These direct resource sets match the board used by this GCSE ONTRACK subject setup.
    // Never silently label one of these as a match when the student has selected a different board.
    if (board !== pack.defaultBoard) return null;
    return [pack.video, pack.practice, pack.paper].map((entry, index) => ({
      role: entry[0], title: entry[1], url: entry[2], description: entry[3],
      match: `${subject} · ${board}`, topic, index
    }));
  }

  function saveToLibrary(resource, session, button) {
    if (typeof window.getCollection !== "function" || typeof window.setCollection !== "function") {
      button.textContent = "Open Resource Library to save";
      return;
    }
    try {
      const resources = window.getCollection("resources");
      const existing = resources.find(item => item && item.url === resource.url && !item.deleted);
      const tag = clean(session.topic, 100);
      if (existing) {
        const tags = String(existing.tag || "").split(";").map(value => value.trim()).filter(Boolean);
        if (tag && !tags.some(value => value.toLowerCase() === tag.toLowerCase())) tags.push(tag);
        existing.tag = tags.join("; ").slice(0, 100);
        window.setCollection("resources", resources);
      } else {
        const entry = {
          id: typeof window.uid === "function" ? window.uid("res") : `res_${Date.now()}`,
          shortId: Math.random().toString(36).slice(2, 8).toUpperCase(),
          title: `${session.subject}: ${session.topic} — ${resource.role}`.slice(0, 140),
          url: resource.url, subject: session.subject, tag: tag || "GCSE revision",
          note: `Suggested for ${session.subject}: ${session.topic}. ${resource.description}`.slice(0, 1200),
          priority: "Medium", rating: 3, favourite: false, pinned: false,
          archived: false, deleted: false, deletedDate: null, clicks: 0,
          created: Date.now(), lastEdited: null, lastOpened: null
        };
        window.setCollection("resources", [entry, ...resources]);
      }
      button.textContent = "✓ Saved to Resource Library";
      button.disabled = true;
    } catch (error) {
      console.error("Could not save the recommended resource.", error);
      button.textContent = "Could not save — try Resource Library";
    }
  }

  function makeCardElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function renderSpecificGuide(card, session, board, key) {
    const current = card.querySelector(".phase4-subject-guide");
    if (current && card.dataset.gcoGuideKey === key) return;
    $$(".session-steps", card).forEach(node => node.remove());

    const details = makeCardElement("details", "session-steps phase3-session-steps phase4-subject-guide");
    details.open = false;
    details.dataset.gcoInitiallyCollapsed = "true";
    details.appendChild(makeCardElement("summary", "", `How to study ${clean(session.topic, 100)}`));
    details.appendChild(makeCardElement("p", "phase3-focus-line", `${clean(session.subject)} · ${clean(session.topic)}${board ? ` · ${board}` : ""}`));

    const savedSteps = Array.isArray(session.steps) ? session.steps.map(value => clean(value, 240)).filter(Boolean) : [];
    const steps = savedSteps.length ? savedSteps : fallbackSteps(session.subject, session.topic);
    const list = makeCardElement("ol", "topic-guide-steps");
    steps.slice(0, 6).forEach(step => list.appendChild(makeCardElement("li", "", step)));
    details.appendChild(list);
    const actions = card.querySelector(".session-actions");
    if (actions) card.insertBefore(details, actions);
    else card.appendChild(details);

    card.dataset.gcoGuideKey = key;
    card.dataset.refinedGuideKey = key;
    card.dataset.phase3Key = key;
  }

  function renderResources(card, session, model, board, key) {
    const entries = resourceEntries(session, model);
    if (!entries) return; // Preserve the existing board-aware resource links for other boards.
    const oldPanel = card.querySelector(".phase4-resource-panel");
    if (oldPanel && card.dataset.gcoResourceKey === key) return;
    $$(".session-resources", card).forEach(node => node.remove());

    const panel = makeCardElement("details", "session-resources phase4-resource-panel");
    panel.open = false;
    panel.dataset.gcoInitiallyCollapsed = "true";
    panel.appendChild(makeCardElement("summary", "", "Videos, topic practice and past papers"));
    panel.appendChild(makeCardElement("p", "field-hint", `Three resource types for ${session.subject} · ${session.topic}. Check that ${board} is the exam board or awarding organisation you study.`));

    const list = makeCardElement("div", "session-resource-list");
    entries.forEach(entry => {
      const item = makeCardElement("article", "session-resource-item phase4-resource-item");
      item.appendChild(makeCardElement("span", "resource-role", entry.role));
      const link = makeCardElement("a", "session-resource-link", entry.title);
      link.href = entry.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      item.appendChild(link);
      item.appendChild(makeCardElement("p", "muted", entry.description));
      const save = makeCardElement("button", "btn secondary small", "＋ Save to Resource Library");
      save.type = "button";
      save.addEventListener("click", () => saveToLibrary(entry, session, save));
      item.appendChild(save);
      list.appendChild(item);
    });
    panel.appendChild(list);
    panel.appendChild(makeCardElement("p", "resource-disclaimer", "External sites may change their content, availability or access rules. Check the specification, topic and tier before using a resource."));
    const actions = card.querySelector(".session-actions");
    if (actions) card.insertBefore(panel, actions);
    else card.appendChild(panel);

    const filterKey = [session.id, session.durationMinutes, session.subject, session.topic, board].join("|");
    card.dataset.filteredResourceKey = filterKey;
    card.dataset.refinedResourceKey = [session.id, session.topic, board].join("|");
    card.dataset.gcoResourceKey = key;
  }

  function collapseNewExpanders(card) {
    $$('details', card).forEach(details => {
      if (details.dataset.gcoInitiallyCollapsed === "true") return;
      details.open = false;
      details.dataset.gcoInitiallyCollapsed = "true";
    });
  }

  function enhanceCard(card, model) {
    if (card.classList.contains("kind-break")) return;
    const session = getSession(card, model);
    if (!session) return;
    const subject = clean(session.subject, 60);
    const subjectRecord = model.subjects.find(item => item && item.name === subject);
    const board = clean(session.examBoard || subjectRecord?.examBoard || PACKS[subjectKey(subject)]?.defaultBoard || "", 50);
    const key = [session.id, session.durationMinutes, subject, session.topic, board].join("|");

    renderSpecificGuide(card, session, board, key);
    renderResources(card, session, model, board, key);
    collapseNewExpanders(card);
  }

  function enhanceAll() {
    const host = $("#weeklySchedule");
    const model = readModel();
    if (!host || !model) return;
    $$(".timetable-session-card", host).forEach(card => enhanceCard(card, model));
  }

  function install() {
    const host = $("#weeklySchedule");
    if (!host || host.dataset.gcoFinalRefinementInstalled === "true") return;
    const observer = new MutationObserver(() => enhanceAll());
    observer.observe(host, { childList: true, subtree: true });
    host.dataset.gcoFinalRefinementInstalled = "true";
    enhanceAll();
  }

  document.addEventListener("DOMContentLoaded", install, { once: true });
  if (document.readyState !== "loading") install();
})();
