/* GCSE ONTRACK — topic-accurate timetable refinement.
 * Exact topic instructions and direct topic-level video, practice and paper links.
 * Unmapped topics deliberately show no generic homepage or search-result substitute.
 */
(() => {
  "use strict";

  const MODEL_KEY = "gcoStudyPlanner_v1";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clean = (value, max = 180) => String(value ?? "").trim().slice(0, max);

  function readModel() {
    try {
      const model = JSON.parse(localStorage.getItem(MODEL_KEY) || "null");
      if (!model || typeof model !== "object" || Array.isArray(model)) return null;
      model.sessions = Array.isArray(model.sessions) ? model.sessions : [];
      model.subjects = Array.isArray(model.subjects) ? model.subjects : [];
      return model;
    } catch (error) {
      console.warn("GCSE ONTRACK: couldn't read saved timetable data.", error);
      return null;
    }
  }

  function saveModel(model) {
    try {
      model.updatedAt = new Date().toISOString();
      localStorage.setItem(MODEL_KEY, JSON.stringify(model));
      return true;
    } catch (error) {
      console.warn("GCSE ONTRACK: couldn't save refined topic instructions.", error);
      return false;
    }
  }

  function subjectKey(value) {
    const subject = clean(value, 80).toLowerCase();
    if (/math/.test(subject)) return "maths";
    if (/biology/.test(subject)) return "biology";
    if (/chemistry/.test(subject)) return "chemistry";
    if (/physics/.test(subject)) return "physics";
    if (/history/.test(subject)) return "history";
    if (/english language/.test(subject)) return "english-language";
    if (/english literature|^english$/.test(subject)) return "english-literature";
    if (/business/.test(subject)) return "business";
    if (/\bit\b|digital information technology/.test(subject)) return "digital-it";
    return "other";
  }

  const TOPIC_PACKS = [
    {
      id: "chemistry-atomic-structure",
      subject: "chemistry", board: "AQA",
      match: /atomic structure|simple atomic model|subatomic particles|isotopes|periodic table/,
      topicLabel: "Atomic structure and the periodic table",
      video: {
        role: "Video lesson", title: "Cognito — GCSE Chemistry: Atoms & Ions",
        url: "https://www.youtube.com/watch?v=fN8kH9Vvqo0",
        description: "A direct lesson on protons, neutrons, electrons, ions and nuclear symbols."
      },
      practice: {
        role: "Flashcards", title: "PMT — Atomic Structure and the Periodic Table flashcards",
        url: "https://www.physicsandmathstutor.com/chemistry-revision/gcse-aqa/atomic-structure-and-periodic-table/flashcards/",
        description: "Test the definitions, particle properties, isotopes and periodic-table facts for AQA GCSE Chemistry."
      },
      paper: {
        role: "Topic past-paper questions", title: "PMT — AQA Chemistry: A Simple Atomic Model (question paper)",
        url: "https://www.physicsandmathstutor.com/download/Chemistry/GCSE/Topic-Qs/AQA/1-Atomic-Structure-and-the-Periodic-Table/Set-B/1.1%20A%20Simple%20Atomic%20Model%20QP.pdf",
        description: "A direct AQA GCSE Chemistry question paper on the simple atomic model. Choose the tier that matches your course before attempting it."
      }
    },
    {
      id: "biology-cell-structure",
      subject: "biology", board: "AQA",
      match: /cell structure|cell biology|animal and plant cells|prokaryot|eukaryot|organelles/,
      topicLabel: "Cell structure",
      video: {
        role: "Video lesson", title: "Cognito — GCSE Biology: Cell Types and Cell Structure",
        url: "https://www.youtube.com/watch?v=qHkUOlC8Nbo",
        description: "A direct lesson comparing animal, plant and bacterial cells and explaining their structures."
      },
      practice: {
        role: "Flashcards", title: "PMT — AQA Biology: Cell Structure flashcards",
        url: "https://www.physicsandmathstutor.com/biology-revision/gcse-aqa/cell-biology/cell-structure-flashcards",
        description: "Retrieve organelle names, functions and the differences between eukaryotic and prokaryotic cells."
      },
      paper: {
        role: "Topic past-paper questions", title: "PMT — AQA Biology: Cell Structure (Foundation question paper)",
        url: "https://pmt.physicsandmathstutor.com/download/Biology/GCSE/Topic-Qs/AQA/1-Cell-Biology/Set-C/1.1%20Cell%20Structure%20%28F%29%20QP.pdf",
        description: "A direct AQA GCSE Biology past-paper question set on cell structure. Use a Higher-tier set if that is your course."
      }
    },
    {
      id: "physics-atomic-structure",
      subject: "physics", board: "AQA",
      match: /atomic structure|atoms and isotopes|nuclear radiation|radioactive decay|electron shells|nuclear fission|nuclear fusion/,
      topicLabel: "Atomic structure",
      video: {
        role: "Video lesson", title: "Cognito — GCSE Physics: Atomic Structure, Isotopes and Electron Shells",
        url: "https://www.youtube.com/watch?v=GTpo1nAZqFE",
        description: "A direct lesson on subatomic particles, nuclear symbols, isotopes, electron shells and ionisation."
      },
      practice: {
        role: "Topic practice and flashcards", title: "PMT — AQA GCSE Physics: Topic 4 Atomic Structure",
        url: "https://www.physicsandmathstutor.com/physics-revision/gcse-aqa/atomic-structure/",
        description: "Open the Atomic Structure flashcards and test yourself on atoms, isotopes, nuclear radiation and radioactive emissions."
      },
      paper: {
        role: "Topic past-paper questions", title: "PMT — AQA GCSE Physics: Atomic Structure questions by topic",
        url: "https://pmt.physicsandmathstutor.com/download/Physics/GCSE/Topic-Qs/AQA/4-Atomic-Structure/Set-C/Atoms%20and%20Isotopes%20%28F%29%20QP.pdf",
        description: "A direct AQA GCSE Physics question paper on atoms and isotopes. Choose a Higher-tier set if that is your course."
      }
    },
    {
      id: "maths-sequences-edexcel",
      subject: "maths", board: "Pearson Edexcel",
      match: /sequence|nth term|arithmetic sequence|linear sequence/,
      topicLabel: "Sequences and the nth term",
      video: {
        role: "Video lesson", title: "1st Class Maths — Generating Sequences",
        url: "https://www.youtube.com/watch?v=EpkI-qOudPY",
        description: "A direct GCSE lesson showing how to generate terms from an nth-term rule."
      },
      practice: {
        role: "Topic practice and flashcards", title: "MathsGenie — Edexcel GCSE Maths: Sequences (Nth Term)",
        url: "https://mathsgenie.co.uk/gcse/maths/edexcel/grade-4-4-7-sequences-nth-term",
        description: "Open the Sequences topic lesson, practice cards and question bank. Choose the difficulty that matches your current work."
      },
      paper: {
        role: "Topic past-paper questions", title: "PMT — Edexcel GCSE Maths: Algebra questions by topic",
        url: "https://www.physicsandmathstutor.com/maths-revision/gcse-algebra/questions-edexcel/",
        description: "Open the Sequences section and attempt the sequence question papers before checking the model answers."
      }
    },
    {
      id: "history-germany-1890-1945",
      subject: "history", board: "AQA",
      match: /rise of the nazis|nazi rise|hitler becomes chancellor|great depression.*nazi|nazi.*great depression|reichstag.*nazi/,
      topicLabel: "The rise of the Nazis (Germany, 1890–1945)",
      video: {
        role: "Video lesson", title: "History Core — GCSE Germany 1890–1945",
        url: "https://www.youtube.com/watch?v=CbWbXw3JIgc",
        description: "A chronological lesson covering Kaiser Wilhelm II, the First World War, Weimar Germany and Nazi rule."
      },
      practice: {
        role: "Interactive topic practice", title: "DoRevision — AQA GCSE History: Germany, 1890–1945",
        url: "https://dorevision.com/learn/rise-of-the-nazis",
        description: "A direct interactive module on the Nazi vote, the Great Depression, Hitler becoming Chancellor and the AQA interpretation and judgement questions."
      },
      paper: {
        role: "Past papers and mark schemes", title: "AQA — GCSE History (8145) assessment resources",
        url: "https://www.savemyexams.com/gcse/history/aqa/past-papers/paper-1/",
        description: "Choose Paper 1, Section A, Option B: Germany 1890–1945. Use the matching question paper, insert and mark scheme."
      }
    },
    {
      id: "business-cash-flow-edexcel",
      subject: "business", board: "Pearson Edexcel",
      match: /cash ?flow|cashflow|cash inflow|cash outflow|cash-flow forecast/,
      topicLabel: "Cash and cash-flow",
      video: {
        role: "Video lesson", title: "ClickView — Cash Flow",
        url: "https://clickv.ie/w/ozJI",
        description: "A direct video explaining cash flow, inflows, outflows and why businesses monitor cash. Access may depend on your school's ClickView permissions."
      },
      practice: {
        role: "Interactive topic practice", title: "DoRevision — Edexcel Business: Cash and Cash-Flow",
        url: "https://dorevision.com/learn/cash-flow-edexcel",
        description: "Practise the difference between cash and profit, net cash flow, closing balances and cash-flow forecasts."
      },
      paper: {
        role: "Topic past-paper questions", title: "Plumi — Edexcel GCSE Business: Cash and Cash-Flow past-paper questions",
        url: "https://tryplumi.app/question-bank/edexcel-gcse-business/cash-and-cash-flow",
        description: "A topic-filtered bank of Edexcel 1BS0 past-paper questions with answers and mark schemes where available."
      }
    },
    {
      id: "english-language-paper1-q2",
      subject: "english-language", board: "AQA",
      match: /paper ?1.*(question ?2|q2)|question ?2.*language|\bq2\b|language analysis|language effect/,
      topicLabel: "AQA English Language Paper 1, Question 2",
      video: {
        role: "Video lesson", title: "Mr Bruff — AQA English Language Paper 1 Question 2",
        url: "https://www.youtube.com/watch?v=L_dE68iUg-k",
        description: "A direct lesson on analysing a writer's language choices and explaining their effects."
      },
      practice: {
        role: "Flashcards and quiz", title: "Lessicon — AQA Paper 1 Question 2: Language Analysis",
        url: "https://lessicon.com/library/gcse-english-language/paper-1-question-2-language-analysis",
        description: "Practise the AO2 vocabulary and question method with a short quiz and retrieval cards."
      },
      paper: {
        role: "Past-paper questions", title: "AQA GCSE English Language Paper 1 past questions",
        url: "https://www.pensbyhighschool.org/wp-content/uploads/2025/04/AQA-GCSE-Language-Paper-1-Past-Questions-1.pdf",
        description: "A compiled Paper 1 past-question booklet. Use Question 2 only for this session and write your answer under timed conditions."
      }
    },
    {
      id: "english-literature-macbeth",
      subject: "english-literature", board: "AQA",
      match: /macbeth|lady macbeth|banquo|macduff|witches|ambition.*guilt|guilt.*ambition/,
      topicLabel: "Macbeth",
      video: {
        role: "Video lesson", title: "Mr Bruff — Macbeth: Top Set Analysis",
        url: "https://www.youtube.com/watch?v=goET70zn57s",
        description: "A direct Macbeth analysis lesson. Use the part that matches the character, theme or scene in your session."
      },
      practice: {
        role: "Exam-question practice", title: "StemUp — AQA GCSE English Literature: Macbeth exam questions",
        url: "https://stemup.co.uk/pages/aqa-gcse-english-literature-macbeth",
        description: "Practise exam-style Macbeth questions on ambition, guilt, kingship, the supernatural and key characters."
      },
      paper: {
        role: "Past papers and mark schemes", title: "AQA — GCSE English Literature (8702) assessment resources",
        url: "https://www.aqa.org.uk/subjects/english/gcse/english-literature-8702/assessment-resources",
        description: "Open Paper 1, Section A (Shakespeare) and use a Macbeth question with its matching mark scheme."
      }
    }
  ];

  const GUIDES = {
    "chemistry-atomic-structure": [
      "Draw a table with proton, neutron and electron. Add each particle's relative charge, relative mass and location in the atom.",
      "For four nuclear symbols, write the proton number, mass number and number of neutrons. Calculate neutrons as mass number minus proton number.",
      "Draw electron-shell diagrams for three atoms. Check that the total electrons equal the atomic number for a neutral atom.",
      "Complete the linked atomic-model question paper. Mark every part, then redo incorrect particle counts or isotope calculations without notes."
    ],
    "biology-cell-structure": [
      "Draw and label an animal cell, a plant cell and a bacterial cell. Include only the structures present in each type.",
      "Make a two-column table of organelle and function. Include nucleus, cytoplasm, cell membrane, mitochondria, ribosomes, cell wall, chloroplasts and permanent vacuole where relevant.",
      "Write three comparisons between eukaryotic and prokaryotic cells. Each comparison must name a structure and state the difference.",
      "Attempt the linked cell-structure past-paper questions. Mark them and correct each missing label or inaccurate function in a different colour."
    ],
    "physics-atomic-structure": [
      "Write the relative charge, relative mass and location of protons, neutrons and electrons in a table.",
      "For four nuclear symbols, calculate proton number, mass number and neutron number. Show the subtraction used.",
      "Explain what makes two atoms isotopes. Then compare their proton and neutron numbers in one labelled example.",
      "Attempt the AQA Atomic Structure questions by topic. Mark each answer and rewrite any incorrect explanation using the correct particle names and units."
    ],
    "maths-sequences-edexcel": [
      "Write the first five terms of the sequence. Calculate the first differences and state whether the difference is constant.",
      "For a linear sequence, use the common difference as the coefficient of n. Substitute n = 1 into the rule to find the constant term.",
      "Test your nth-term rule by substituting n = 1, 2 and 5. Each result must match the corresponding sequence term.",
      "Complete three exam-style nth-term questions: one find-the-rule question, one find-a-term question and one explain-or-check question. Mark and redo any error."
    ],
    "history-germany-1890-1945": [
      "Create a timeline with five dates from the exact Germany subtopic in your session. Add one named event or person beside each date.",
      "Choose two causes or factors from the topic. For each, write what happened, why it happened and one consequence for Germany.",
      "Write one exam paragraph using point, precise evidence and explanation. Link every fact back to the question wording.",
      "Check chronology and factual accuracy against your class notes. Add one missing date or named example, then rewrite the weakest sentence as an explanation rather than a description."
    ],
    "business-cash-flow-edexcel": [
      "Write the definitions of cash inflow, cash outflow, net cash flow, opening balance and closing balance. Do not define cash flow as profit.",
      "Complete a cash-flow forecast. Calculate net cash flow as inflows minus outflows, then closing balance as opening balance plus net cash flow.",
      "Identify the month with the lowest closing balance. Use one figure from the forecast to explain the cash-flow problem facing the business.",
      "Recommend one suitable action. Explain how it changes inflows or outflows, then give one limitation using the business context."
    ],
    "english-language-paper1-q2": [
      "Read only the lines named in Question 2. Underline three short words or phrases that help create the effect asked about.",
      "For each quotation, name the precise word choice or language method and write what it suggests in this extract. Avoid naming a technique without explaining it.",
      "Write two analytical paragraphs. Each must contain a short quotation, analysis of a specific word and an explanation of the effect on the reader.",
      "Check that both paragraphs answer the question focus. Remove plot summary and add a precise explanation wherever you have only named a technique."
    ],
    "english-literature-macbeth": [
      "Write the exact character or theme from your session at the top of the page. Retrieve two short quotations from your studied copy of the play that support it.",
      "For each quotation, identify one important word or image. Explain what it suggests about the character or theme at that moment in the play.",
      "Write one analytical paragraph: argument about the question, brief quotation, close analysis of a word, and Shakespeare's wider idea.",
      "Check that your paragraph analyses the question rather than retelling the scene. Add a second interpretation of one word and link it to the play's context only where relevant."
    ]
  };

  function fallbackGuide(subject, topic) {
    const key = subjectKey(subject);
    const t = clean(topic, 100);
    const bySubject = {
      maths: [
        `Write the exact rule or method used for ${t}. Include the formula and define every symbol.`,
        `Study one worked example of ${t}. Cover the solution and reproduce every calculation step without looking.`,
        `Solve three ${t} questions: one basic, one standard exam question and one unfamiliar application. Show all working.`,
        "Mark the questions. Find the first incorrect step in each mistake, correct it and solve that question again without notes."
      ],
      biology: [
        `List the structures, organisms, processes or terms named in ${t}. Write a correct definition beside each one.`,
        `Draw a labelled diagram or ordered process for ${t}. Label each stage and write the function or outcome beside it.`,
        `Answer two exam-style questions on ${t}. Use the correct biological terms and link each cause to its effect.`,
        "Mark both answers. Add the missing scientific detail and repeat the weakest explanation from memory."
      ],
      chemistry: [
        `List the particles, substances, symbols and definitions needed for ${t}. Write each formula or equation accurately.`,
        `Complete one worked example for ${t}. Show each conversion, equation, substitution and unit.`,
        `Attempt two exam-style ${t} questions without notes. Include a calculation or balanced equation if the topic requires one.`,
        "Mark both answers. Check symbols, formulae, atom counts and units, then redo the incorrect part."
      ],
      physics: [
        `List the physical quantities, definitions, units and equations used in ${t}.`,
        `Draw and label the model or diagram for ${t}. Show the direction of any forces or transfers if they are part of the topic.`,
        `Attempt two exam-style ${t} questions. For calculations, write the equation, rearrange it, substitute values and include units.`,
        "Mark both answers. Check the equation, units, scale and direction, then repeat the incorrect calculation or explanation."
      ],
      history: [
        `Write five accurate facts about ${t}, including dates, named people and events where relevant.`,
        `Put the facts in chronological order and write one sentence explaining why each event mattered.`,
        `Answer one exam-style question on ${t} using a clear point, precise evidence and explanation.`,
        "Check the chronology and evidence against your course notes. Correct any inaccurate fact and strengthen the explanation that least supports the question."
      ],
      business: [
        `Define the key terms and any formula used in ${t}.`,
        `Apply the concept to a specific business from your question or class case study. Include one relevant detail from that business.`,
        "Develop one cause-and-effect chain: business decision or factor → impact on the business → consequence for an objective.",
        "Evaluate one alternative. Use the case-study context to explain when your recommendation would or would not work."
      ],
      "english-language": [
        `Identify the exact reading or writing skill in ${t} and write the success criteria for that question.`,
        "Select precise evidence from the source or plan the audience, purpose and form of the writing task.",
        `Complete one timed ${t} question. Support each point with evidence or a deliberate writing choice.`,
        "Check every paragraph against the question focus. Replace summary or unsupported claims with precise analysis."
      ],
      "english-literature": [
        `Name the text, character or theme linked to ${t}. Retrieve two short quotations from the text you study.`,
        "Annotate one important word in each quotation and explain how it supports your interpretation.",
        `Write one analytical paragraph on ${t}: argument, quotation, close analysis and the writer's idea.`,
        "Check that the paragraph answers the question. Add a second interpretation and remove plot retelling."
      ],
      "digital-it": [
        `Write the component, learning outcome and exact requirement connected with ${t}.`,
        "List the user or client needs and the constraints that affect the work. Keep each requirement measurable.",
        `Create or annotate one piece of evidence for ${t}. Label each feature and link it to a stated requirement.`,
        "Check the evidence against the assessment criteria. Identify one gap, make the improvement and explain how it meets the requirement."
      ]
    };
    return bySubject[key] || [
      `Write the learning outcome and five key terms for ${t}. Define each term in your own words.`,
      `Use the course material to make one labelled example, worked solution or evidence sheet for ${t}.`,
      `Complete one exam-style task on ${t} without copying the model answer.`,
      "Check the task against the specification or mark scheme, correct one clear gap and repeat that part independently."
    ];
  }

  function minutesFor(duration, count) {
    const total = Math.max(5, Number(duration) || 25);
    const weights = count === 2 ? [0.45, 0.55] : [0.18, 0.27, 0.35, 0.20];
    const result = weights.map(weight => Math.max(1, Math.floor(total * weight)));
    let left = total - result.reduce((sum, value) => sum + value, 0);
    for (let i = 0; left > 0; i = (i + 1) % result.length) {
      result[i] += 1;
      left -= 1;
    }
    while (result.reduce((sum, value) => sum + value, 0) > total) {
      const index = result.findIndex(value => value > 1);
      if (index < 0) break;
      result[index] -= 1;
    }
    return result;
  }

  function getGuide(session) {
    const topic = clean(session.topic, 120);
    const topicKey = topic.toLowerCase();
    const pack = TOPIC_PACKS.find(item =>
      item.subject === subjectKey(session.subject) && item.match.test(topicKey)
    );
    const tasks = GUIDES[pack?.id] || fallbackGuide(session.subject, topic);
    const duration = Math.max(5, Number(session.durationMinutes) || 25);
    const chosen = duration < 20 ? [tasks[0], tasks[3]] : tasks;
    const mins = minutesFor(duration, chosen.length);
    return { pack, steps: chosen.map((task, index) => `${mins[index]} min — ${task}`) };
  }

  function getSession(card, model) {
    const id = String(card.dataset.sessionId || "");
    if (id) {
      const exact = model.sessions.find(item => String(item.id || "") === id);
      if (exact) return exact;
    }
    const dayName = $(".timetable-day-heading h3", card.closest(".timetable-day"))?.textContent?.trim();
    const dayId = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" }[dayName];
    const timeText = $(".session-time", card)?.textContent || "";
    const startText = timeText.split(/[–-]/)[0]?.trim() || "";
    const match = startText.match(/^(\d{1,2}):(\d{2})$/);
    if (!dayId || !match) return null;
    const start = Number(match[1]) * 60 + Number(match[2]);
    const heading = $(":scope > h3", card)?.textContent?.trim() || "";
    const candidates = model.sessions.filter(item =>
      item.day === dayId && Number(item.startMinutes) === start && item.kind !== "break" &&
      heading === `${clean(item.subject)} — ${clean(item.topic)}`
    );
    return candidates.length === 1 ? candidates[0] : null;
  }

  function makeElement(tag, className = "", text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  }

  function saveResourceToLibrary(resource, session, button) {
    if (typeof window.getCollection !== "function" || typeof window.setCollection !== "function") {
      button.textContent = "Open Resource Library to save";
      return;
    }
    try {
      const resources = window.getCollection("resources");
      const existing = resources.find(item => item && item.url === resource.url && !item.deleted);
      if (existing) {
        const tags = String(existing.tag || "").split(";").map(value => value.trim()).filter(Boolean);
        const topic = clean(session.topic, 100);
        if (topic && !tags.some(value => value.toLowerCase() === topic.toLowerCase())) tags.push(topic);
        existing.tag = tags.join("; ").slice(0, 100);
        window.setCollection("resources", resources);
      } else {
        const entry = {
          id: typeof window.uid === "function" ? window.uid("res") : `res_${Date.now()}`,
          shortId: Math.random().toString(36).slice(2, 8).toUpperCase(),
          title: `${session.subject}: ${session.topic} — ${resource.role}`.slice(0, 140),
          url: resource.url, subject: session.subject, tag: clean(session.topic, 100),
          note: `Direct resource for ${session.subject}: ${session.topic}. ${resource.description}`.slice(0, 1200),
          priority: "Medium", rating: 3, favourite: false, pinned: false,
          archived: false, deleted: false, deletedDate: null, clicks: 0,
          created: Date.now(), lastEdited: null, lastOpened: null
        };
        window.setCollection("resources", [entry, ...resources]);
      }
      button.textContent = "✓ Saved to Resource Library";
      button.disabled = true;
    } catch (error) {
      console.warn("GCSE ONTRACK: couldn't save a recommended resource.", error);
      button.textContent = "Could not save — try Resource Library";
    }
  }

  function renderGuide(card, session, guide, key) {
    if (card.dataset.gcoTopicGuideKey === key && card.querySelector(".gco-precise-topic-guide")) return;
    $$(".session-steps", card).forEach(node => node.remove());
    const panel = makeElement("details", "session-steps phase3-session-steps gco-precise-topic-guide");
    panel.open = false;
    panel.dataset.gcoInitiallyCollapsed = "true";
    panel.appendChild(makeElement("summary", "", `Exactly what to do: ${clean(session.topic, 90)}`));
    panel.appendChild(makeElement("p", "phase3-focus-line", `${clean(session.subject)} · ${clean(session.topic)}${session.examBoard ? ` · ${clean(session.examBoard, 40)}` : ""}`));
    const list = makeElement("ol", "topic-guide-steps");
    guide.steps.forEach(step => list.appendChild(makeElement("li", "", step)));
    panel.appendChild(list);
    const actions = card.querySelector(".session-actions");
    if (actions) card.insertBefore(panel, actions);
    else card.appendChild(panel);
    card.dataset.gcoTopicGuideKey = key;
    card.dataset.refinedGuideKey = key;
    card.dataset.phase3Key = key;
  }

  function renderResources(card, session, pack, board, key) {
    if (card.dataset.gcoTopicResourceKey === key && card.querySelector(".gco-topic-resource-panel")) return;
    $$(".session-resources", card).forEach(node => node.remove());
    const panel = makeElement("details", "session-resources gco-topic-resource-panel");
    panel.open = false;
    panel.dataset.gcoInitiallyCollapsed = "true";
    panel.appendChild(makeElement("summary", "", "Direct video, practice and past-paper links"));

    if (!pack) {
      panel.appendChild(makeElement("p", "topic-guide-resource-note",
        `No verified three-link resource set is mapped yet for “${clean(session.subject)} — ${clean(session.topic)}”. GCSE ONTRACK is not substituting a general subject homepage or a search-results page.`));
      panel.appendChild(makeElement("p", "resource-disclaimer", "The exact topic link set will appear here once a direct video, practice page and topic past-paper page have all been checked."));
      const actions = card.querySelector(".session-actions");
      if (actions) card.insertBefore(panel, actions); else card.appendChild(panel);
      card.dataset.gcoTopicResourceKey = key;
      card.dataset.refinedResourceKey = [session.id, session.topic, board].join("|");
      card.dataset.filteredResourceKey = [session.id, session.durationMinutes, session.subject, session.topic, board].join("|");
      return;
    }

    panel.appendChild(makeElement("p", "field-hint", `${pack.topicLabel} · ${board}. Each link opens the named topic resource directly.`));
    const list = makeElement("div", "session-resource-list");
    [pack.video, pack.practice, pack.paper].forEach(resource => {
      const item = makeElement("article", "session-resource-item gco-topic-resource-item");
      item.appendChild(makeElement("span", "resource-role", resource.role));
      const link = makeElement("a", "session-resource-link", resource.title);
      link.href = resource.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      item.appendChild(link);
      item.appendChild(makeElement("p", "muted", resource.description));
      const save = makeElement("button", "btn secondary small", "＋ Save to Resource Library");
      save.type = "button";
      save.addEventListener("click", () => saveResourceToLibrary(resource, session, save));
      item.appendChild(save);
      list.appendChild(item);
    });
    panel.appendChild(list);
    panel.appendChild(makeElement("p", "resource-disclaimer", "Check that the topic, exam board and tier match your course. External providers may change access or content."));
    const actions = card.querySelector(".session-actions");
    if (actions) card.insertBefore(panel, actions); else card.appendChild(panel);
    card.dataset.gcoTopicResourceKey = key;
    // Prevent the earlier topic-guide observer from re-inserting its legacy
    // generic balancing-equations resource panel after this exact-match pass.
    card.dataset.refinedResourceKey = [session.id, session.topic, board].join("|");
    card.dataset.filteredResourceKey = [session.id, session.durationMinutes, session.subject, session.topic, board].join("|");
  }

  function collapseExpanders(card) {
    $$('details', card).forEach(details => {
      if (details.dataset.gcoInitiallyCollapsed === "true") return;
      details.open = false;
      details.dataset.gcoInitiallyCollapsed = "true";
    });
  }

  function enhanceAll() {
    const host = $("#weeklySchedule");
    if (!host) return;
    const model = readModel();
    if (!model) return;
    let changed = false;
    $$(".timetable-session-card", host).forEach(card => {
      if (card.classList.contains("kind-break")) return;
      const session = getSession(card, model);
      if (!session) return;
      const subjectRecord = model.subjects.find(item => item && item.name === session.subject);
      const board = clean(session.examBoard || subjectRecord?.examBoard || "", 50);
      session.examBoard = board;
      const { pack, steps } = getGuide(session);
      if (JSON.stringify(session.steps || []) !== JSON.stringify(steps)) {
        session.steps = steps;
        changed = true;
      }
      // Match the existing Phase 3/topic-guide key so earlier observers do not
      // replace the more precise guide or reopen its collapsed section.
      const guideKey = [session.id, session.durationMinutes, session.subject, session.topic, board].join("|");
      const resourceKey = [guideKey, pack?.id || "unmapped"].join("|");
      renderGuide(card, session, { steps }, guideKey);
      renderResources(card, session, pack && (!pack.board || board === pack.board) ? pack : null, board, resourceKey);
      collapseExpanders(card);
    });
    if (changed) saveModel(model);
  }

  function install() {
    const host = $("#weeklySchedule");
    if (!host || host.dataset.gcoTopicRefinementInstalled === "true") return;
    const observer = new MutationObserver(() => enhanceAll());
    observer.observe(host, { childList: true, subtree: true });
    host.dataset.gcoTopicRefinementInstalled = "true";
    enhanceAll();
  }

  document.addEventListener("DOMContentLoaded", install, { once: true });
  if (document.readyState !== "loading") install();

  if (window.__GCO_TOPIC_REFINEMENT_TEST_MODE__ === true) {
    window.GCOTopicRefinementTest = {
      subjectKey,
      getGuide,
      topicPacks: TOPIC_PACKS.map(item => ({ id: item.id, subject: item.subject, board: item.board, topicLabel: item.topicLabel }))
    };
  }
})();
