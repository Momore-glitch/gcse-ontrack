
/* GCSE ONTRACK — structured, topic-specific timetable guides.
 * Adds clearer topic instructions without changing or deleting saved sessions.
 * Loaded after js/study-planner-phase3.js on timetable.html.
 */
(() => {
  "use strict";

  const STORE_KEY = "gcoStudyPlanner_v1";
  const DAY_IDS = {
    Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed",
    Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun"
  };

  const clean = (value, max = 160) => String(value ?? "").trim().slice(0, max);

  function makeElement(tag, className = "", text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function readModel() {
    try {
      const model = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (!model || typeof model !== "object" || Array.isArray(model)) return null;
      model.sessions = Array.isArray(model.sessions) ? model.sessions : [];
      model.subjects = Array.isArray(model.subjects) ? model.subjects : [];
      return model;
    } catch (error) {
      console.error("GCSE ONTRACK could not read the saved study plan.", error);
      return null;
    }
  }

  function subjectType(subject) {
    const value = clean(subject, 80).toLowerCase();
    if (/math/.test(value)) return "maths";
    if (/biology/.test(value)) return "biology";
    if (/chemistry/.test(value)) return "chemistry";
    if (/physics/.test(value)) return "physics";
    if (/science/.test(value)) return "science";
    if (/history/.test(value)) return "history";
    if (/business/.test(value)) return "business";
    if (/english/.test(value)) return "english";
    if (/geography/.test(value)) return "geography";
    if (/\bit\b|digital information technology|computer science|computing/.test(value)) return "computing";
    return "other";
  }

  function isBalancingTopic(topic) {
    return /balanc(?:e|ed|ing)[\s\w-]{0,45}equations?|equations?[\s\w-]{0,45}balanc(?:e|ed|ing)|chemical equations?|symbol equations?|conservation of mass/i.test(clean(topic, 120));
  }

  function getBoard(session, model) {
    const subject = model.subjects.find(item => item && item.name === session.subject);
    return clean(session.examBoard || subject?.examBoard || "", 50);
  }

  function parseStartTime(value) {
    const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  function findSessionForCard(card, model) {
    // Support a stable ID if a later version of the renderer adds one.
    const cardId = String(card.dataset.sessionId || "");
    if (cardId) {
      const byId = model.sessions.find(item =>
        item && String(item.id || "") === cardId && item.kind !== "break"
      );
      if (byId) return byId;
    }

    // Current timetable cards do not contain a session ID. Match all three
    // visible identifiers and refuse ambiguous matches rather than guessing.
    const dayLabel = card.closest(".timetable-day")
      ?.querySelector(".timetable-day-heading h3")?.textContent?.trim();
    const dayId = DAY_IDS[dayLabel];
    const timeText = card.querySelector(".session-time")?.textContent || "";
    const start = parseStartTime(timeText.split(/[–-]/)[0]);
    const heading = card.querySelector(":scope > h3")?.textContent?.trim() || "";

    const matches = model.sessions.filter(item => {
      if (!item || item.kind === "break") return false;
      if (dayId && item.day !== dayId) return false;
      if (start !== null && Number(item.startMinutes) !== start) return false;
      const expectedHeading = clean(item.subject)
        ? `${clean(item.subject)} — ${clean(item.topic)}`
        : clean(item.topic || item.title);
      return heading === expectedHeading;
    });

    return matches.length === 1 ? matches[0] : null;
  }

  function getPhase3Tasks(card, session, board) {
    const oldGuide = card.querySelector(".phase3-session-steps");
    if (!oldGuide) return [];

    const oldFocus = oldGuide.querySelector(".phase3-focus-line")?.textContent?.trim() || "";
    const expectedFocus = `${clean(session.subject)} · ${clean(session.topic)}${board ? ` · ${board}` : ""}`;
    if (oldFocus !== expectedFocus) return [];

    const list = oldGuide.querySelector("ol");
    if (!list) return [];

    return Array.from(list.querySelectorAll("li"))
      .map(item => item.textContent.replace(/^\s*\d+\s*min\s*[—-]\s*/i, "").trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  const GUIDANCE = {
    maths: {
      objective: topic => `Solve questions on ${topic} independently and show a method another student could follow.`,
      principle: "Show the working, not only the final answer. Keep each line clear enough to check.",
      labels: ["Retrieve the method", "Study a worked example", "Apply it independently", "Mark and improve"],
      tasks: topic => [
        `Write the rule, formula or method for ${topic} from memory. Note what each symbol or step represents.`,
        "Study one worked example. Explain why each step is valid, then cover it and reproduce the method.",
        `Attempt three questions on ${topic} without looking at the example. Show every line of working.`,
        "Mark the questions, correct the first error and write what you will check next time."
      ],
      output: topic => `Three attempted questions on ${topic}, full working and one corrected mistake.`,
      success: "The method is visible, calculations are checked and answers use the correct form or unit.",
      errors: "Do not skip working or copy a method without checking whether it fits the question."
    },
    biology: {
      objective: topic => `Explain ${topic} accurately using biological terms and a clear sequence or relationship.`,
      principle: "Name structures and substances precisely. Link each stage in a process with cause and effect.",
      labels: ["Retrieve key terms", "Build the model", "Explain from memory", "Check and improve"],
      tasks: topic => [
        `Write the key terms for ${topic} from memory, then check their definitions.`,
        `Draw or organise the process, structure or comparison for ${topic} in a logical order.`,
        "Answer one exam-style question using precise biological terms and linked explanations.",
        "Check the sequence and terminology, then add the detail you missed."
      ],
      output: topic => `A labelled diagram, flow sequence or comparison for ${topic}, plus one exam-style explanation.`,
      success: "The sequence is logical, key terms are accurate and each explanation links cause to effect.",
      errors: "Avoid vague words such as ‘it’ or ‘things’; name the structure, substance or process."
    },
    chemistry: {
      objective: topic => `Explain or apply ${topic} accurately, using correct formulae, equations and units where needed.`,
      principle: "Track particles, formulae and conditions carefully. Check atoms and units whenever the topic requires them.",
      labels: ["Retrieve the chemistry", "Work through a model", "Apply it independently", "Check the chemistry"],
      tasks: topic => [
        `List the key substances, formulae, particles or definitions connected to ${topic} from memory.`,
        "Work through one suitable example, showing each chemical step and why it is needed.",
        `Attempt a new question on ${topic} without looking at the example.`,
        "Check symbols, formulae, working and units; correct any error."
      ],
      output: topic => `A correct equation, calculation, particle explanation or comparison for ${topic}, with working shown.`,
      success: "Formulae and symbols are correct, working is shown, and atoms or units are checked where relevant.",
      errors: "Check chemical symbols, formulae and units. Never change a formula to make an equation balance."
    },
    physics: {
      objective: topic => `Apply the correct physics model to ${topic} and show how evidence or a calculation supports your answer.`,
      principle: "Choose the correct physical model, show substitutions and keep units attached to every calculated value.",
      labels: ["Select the model", "Study the method", "Attempt a new question", "Check units and meaning"],
      tasks: topic => [
        `Identify the model, law, quantities or definitions needed for ${topic}.`,
        "For a calculation, write and rearrange the equation before substituting values; otherwise draw and label the model.",
        `Complete a new calculation, explanation or graph question on ${topic}.`,
        "Check units, scale, direction and whether the answer is physically sensible."
      ],
      output: topic => `A labelled model or diagram, one worked calculation or explanation for ${topic}, and units where relevant.`,
      success: "The chosen model is appropriate, substitutions are clear and the final answer has a sensible unit.",
      errors: "Do not mix units or choose an equation just because it contains a familiar number."
    },
    science: {
      objective: topic => `Explain ${topic} clearly and apply the right scientific method, terminology or calculation.`,
      principle: "Use accurate scientific vocabulary. Separate what the question gives you from what you need to explain or calculate.",
      labels: ["Retrieve the science", "Build a clear model", "Apply it", "Check the explanation"],
      tasks: topic => [
        `Retrieve the key terms and state the scientific idea behind ${topic}.`,
        `Create a labelled diagram, sequence, equation or data table that represents ${topic}.`,
        `Answer one exam-style question on ${topic}, showing reasoning or working.`,
        "Check terminology and scientific accuracy, then add the detail you missed."
      ],
      output: topic => `A short scientific explanation or calculation on ${topic}, plus one answer checked against the success criteria.`,
      success: "Scientific vocabulary is accurate and the explanation, diagram, calculation or data interpretation is consistent.",
      errors: "Do not confuse information supplied in the question with the scientific explanation it asks you to provide."
    },
    history: {
      objective: topic => `Produce a supported historical explanation or judgement about ${topic} using precise evidence.`,
      principle: "Build an argument with relevant evidence. Explain how the evidence supports the point rather than listing facts.",
      labels: ["Retrieve precise evidence", "Explain the context", "Build an argument", "Check the judgement"],
      tasks: topic => [
        `Create a short timeline or evidence list for ${topic} with relevant dates, people and events.`,
        "Choose two precise facts and explain what each one demonstrates about the topic.",
        "Write a developed paragraph linking a point, evidence and explanation to the question.",
        "Check chronology, relevance and whether the explanation supports a clear judgement."
      ],
      output: topic => `One developed paragraph on ${topic} containing a clear point, precise evidence and explanation.`,
      success: "Evidence is accurate and relevant, chronology is secure, and the explanation supports the judgement.",
      errors: "Do not retell events without explaining why the evidence matters to the question."
    },
    business: {
      objective: topic => `Explain ${topic} and apply it to a business situation before analysing the likely impact.`,
      principle: "Move from knowledge to application, then analyse the business impact before reaching a justified judgement.",
      labels: ["Retrieve key knowledge", "Apply to a business", "Analyse the impact", "Evaluate"],
      tasks: topic => [
        `Define the key terms in ${topic} and note the formula or model if one applies.`,
        "Apply the idea to the business or scenario in your question. Use details from that context.",
        "Develop a cause-and-effect chain: decision or factor → impact on the business → consequence.",
        "Consider an alternative or limitation and justify your final judgement."
      ],
      output: topic => `A definition, one applied point, a developed impact and a justified judgement about ${topic}.`,
      success: "The answer uses the scenario, develops a cause-and-effect chain and justifies its judgement.",
      errors: "Do not describe a business concept without applying it to the business in the question."
    },
    english: {
      objective: topic => `Produce a focused English response on ${topic} supported by precise evidence and analysis.`,
      principle: "Make a clear interpretation. Support it with precise evidence and explain the writer’s choices or your own.",
      labels: ["Identify the task", "Select evidence", "Write and analyse", "Review the response"],
      tasks: topic => [
        `Identify the exact text, question focus or writing purpose linked to ${topic}.`,
        "Select brief, accurate evidence or plan the point you want to communicate.",
        "Write one focused paragraph and explain the meaning, method or effect of your choices.",
        "Check that the response answers the task and improve one specific sentence or point."
      ],
      output: topic => `One focused paragraph on ${topic} with a clear argument, brief evidence and analysis.`,
      success: "Evidence is accurate, analysis explains meaning or effect, and every point answers the task.",
      errors: "Do not name a technique and stop there; explain what the evidence suggests in context."
    },
    geography: {
      objective: topic => `Explain ${topic} using accurate geographical processes, evidence and place-specific detail.`,
      principle: "Connect the process to a named place or example, use accurate evidence and explain the links.",
      labels: ["Retrieve the process", "Use evidence", "Explain the links", "Check accuracy"],
      tasks: topic => [
        `Recall the key process and geographical vocabulary for ${topic}.`,
        "Draw a labelled sequence or retrieve precise evidence from the relevant case study.",
        "Explain how or why the process happens, using a named example where appropriate.",
        "Check that the evidence is accurate and the explanation links each stage."
      ],
      output: topic => `A process diagram or case-study fact set and one developed explanation about ${topic}.`,
      success: "Processes are linked logically and place-specific evidence is accurate and relevant.",
      errors: "Do not give a generic example when the question needs a named place or case study."
    },
    computing: {
      objective: topic => `Apply ${topic} to a realistic brief and produce evidence that meets the relevant requirement.`,
      principle: "Show the process or decision clearly, then test it against the requirement, user need or assessment criterion.",
      labels: ["Identify the requirement", "Break down the concept", "Produce evidence", "Check and improve"],
      tasks: topic => [
        `Identify the requirement, user need or learning outcome linked to ${topic}.`,
        "Break the process or concept into clear steps and use the correct technical vocabulary.",
        `Produce or analyse a small piece of evidence that demonstrates ${topic}.`,
        "Check it against the requirement and explain one improvement."
      ],
      output: topic => `A piece of annotated evidence or a short worked solution showing how ${topic} meets the task requirement.`,
      success: "Evidence meets the requirement, decisions are justified and the result has been checked or tested.",
      errors: "Do not describe a feature without linking it to a user need, requirement or criterion."
    },
    other: {
      objective: topic => `Show what you understand about ${topic} in a short, independently produced answer.`,
      principle: "Use the exact topic and course requirements. Retrieve, apply, check and correct.",
      labels: ["Retrieve the essentials", "Clarify the idea", "Apply it independently", "Check and improve"],
      tasks: topic => [
        `Write the key terms and intended learning outcome for ${topic} from memory.`,
        "Use the relevant class material to clarify the main idea and one suitable example.",
        "Complete a short application or exam-style task without copying a model answer.",
        "Check the work against the learning outcome and correct one gap."
      ],
      output: topic => `A short answer or piece of work demonstrating ${topic}, plus one correction.`,
      success: "You can explain the main idea without copying and have corrected at least one gap.",
      errors: "Keep the answer focused on the exact topic and use the wording of the task to guide your response."
    }
  };

  function allocateMinutes(duration, stepCount) {
    const total = Math.max(5, Math.round(Number(duration) || 25));
    const weights = stepCount === 2 ? [0.45, 0.55] : [0.18, 0.27, 0.35, 0.20];
    const minutes = weights.map(weight => Math.floor(total * weight));
    let remaining = total - minutes.reduce((sum, value) => sum + value, 0);
    for (let index = 0; remaining > 0; index = (index + 1) % minutes.length) {
      minutes[index] += 1;
      remaining -= 1;
    }
    return minutes;
  }

  function balancingSteps(duration) {
    const allSteps = [
      ["Count the atoms", "Copy the equation exactly. List each element and count its atoms on the left (reactants) and right (products). For brackets, multiply the atoms inside by the number outside."],
      ["Choose coefficients", "Balance one element at a time by adding a whole number in front of a formula. Never change a small subscript, because that changes the substance."],
      ["Recount every element", "A coefficient multiplies every atom in the formula that follows it. Recount all elements after each change; leave hydrogen and oxygen until later when that makes counting easier."],
      ["Check and practise", "Make every element match on both sides. Use the smallest whole-number coefficients, omit a coefficient of 1, then balance a new equation without looking at the example."]
    ];
    const selected = Number(duration) < 20 ? [allSteps[0], allSteps[3]] : allSteps;
    const minutes = allocateMinutes(duration, selected.length);
    return selected.map((step, index) => ({
      label: step[0], task: step[1], minutes: minutes[index]
    }));
  }

  function buildSteps(card, session, board, type, balancing) {
    const duration = Math.max(5, Number(session.durationMinutes) || 25);
    if (balancing) return balancingSteps(duration);

    const guide = GUIDANCE[type] || GUIDANCE.other;
    const existingTasks = getPhase3Tasks(card, session, board);
    const tasks = existingTasks.length >= 2
      ? existingTasks
      : guide.tasks(clean(session.topic, 120));
    const stepCount = duration < 20 ? 2 : 4;
    const selectedTasks = stepCount === 2
      ? [tasks[0], tasks[3] || tasks[1]]
      : tasks.slice(0, 4);
    const labels = stepCount === 2
      ? ["Learn and model", "Retrieve and check"]
      : guide.labels;
    const minutes = allocateMinutes(duration, stepCount);

    return selectedTasks.map((task, index) => ({
      label: labels[index], task, minutes: minutes[index]
    }));
  }

  function renderGuide(card, session, board) {
    const key = [
      session.id, session.durationMinutes, session.subject, session.topic, board
    ].join("|");
    if (card.dataset.refinedGuideKey === key) return;

    const type = subjectType(session.subject);
    const guide = GUIDANCE[type] || GUIDANCE.other;
    const balancing = (type === "science" || type === "chemistry") && isBalancingTopic(session.topic);

    card.querySelectorAll(".session-steps").forEach(node => node.remove());

    const details = makeElement("details", "session-steps phase3-session-steps topic-guide-structured");
    details.open = true;
    details.appendChild(makeElement("summary", "", "How to study this topic"));
    details.appendChild(makeElement(
      "p", "phase3-focus-line",
      `${session.subject} · ${session.topic}${board ? ` · ${board}` : ""}`
    ));
    details.appendChild(makeElement(
      "p", "topic-guide-objective",
      "YOUR TARGET — " + (balancing
        ? "Balance chemical symbol equations by changing coefficients only, then prove every element has the same atom count on both sides."
        : guide.objective(clean(session.topic, 120)))
    ));
    details.appendChild(makeElement(
      "p", "topic-guide-key-rule",
      "KEY APPROACH — " + (balancing
        ? "Change only the large numbers in front of formulae (coefficients). Never change small subscripts: that changes the substance."
        : guide.principle)
    ));

    details.appendChild(makeElement("h4", "topic-guide-section-heading", "Work through these steps"));
    const list = makeElement("ol", "topic-guide-steps");
    buildSteps(card, session, board, type, balancing).forEach((step, index) => {
      const item = makeElement("li", "topic-guide-step");
      const top = makeElement("div", "topic-guide-step-top");
      top.append(
        makeElement("span", "topic-guide-step-number", String(index + 1).padStart(2, "0")),
        makeElement("strong", "", step.label),
        makeElement("span", "topic-guide-step-time", `${step.minutes} min`)
      );
      item.append(top, makeElement("p", "", step.task));
      list.appendChild(item);
    });
    details.appendChild(list);

    if (balancing) appendBalancingExample(details);

    details.append(
      makeElement("p", "topic-guide-output", "FINISH WITH — " + (balancing
        ? "An atom-count table, the balanced magnesium equation and the aluminium equation attempted independently."
        : guide.output(clean(session.topic, 120)))),
      makeElement("p", "topic-guide-check", "SUCCESS CHECK — " + (balancing
        ? "Every element matches on both sides; no formula subscript has changed; coefficients are the smallest whole-number ratio."
        : guide.success)),
      makeElement("p", "topic-guide-common-errors", "COMMON ERRORS — " + (balancing
        ? "Do not change O₂ into O or H₂O into H₂O₂. A coefficient multiplies every atom in a formula, including atoms inside brackets."
        : guide.errors))
    );

    const actions = card.querySelector(".session-actions");
    if (actions) card.insertBefore(details, actions);
    else card.appendChild(details);

    card.dataset.refinedGuideKey = key;
    // Phase 3 uses the same key format. This prevents its observer from
    // replacing this improved guide with the older flat-list version.
    card.dataset.phase3Key = key;
  }

  function appendBalancingExample(details) {
    const example = makeElement("section", "topic-guide-example");
    example.append(
      makeElement("h4", "", "Worked example: magnesium + oxygen"),
      makeElement("p", "topic-guide-equation", "Mg + O₂ → MgO"),
      makeElement("p", "", "Before balancing: left side has Mg = 1 and O = 2; right side has Mg = 1 and O = 1."),
      makeElement("p", "topic-guide-equation topic-guide-equation-answer", "2Mg + O₂ → 2MgO"),
      makeElement("p", "", "After balancing: left side has Mg = 2 and O = 2; right side has Mg = 2 and O = 2. The coefficient multiplies every atom in the formula.")
    );
    details.appendChild(example);

    const challenge = makeElement("details", "topic-guide-challenge");
    challenge.append(
      makeElement("summary", "", "Try this before revealing the answer"),
      makeElement("p", "topic-guide-equation", "Al + O₂ → Al₂O₃"),
      makeElement("p", "", "Balance aluminium and oxygen, then count both elements on both sides.")
    );
    const reveal = makeElement("details", "topic-guide-answer");
    reveal.append(
      makeElement("summary", "", "Reveal the balanced equation"),
      makeElement("p", "topic-guide-equation topic-guide-equation-answer", "4Al + 3O₂ → 2Al₂O₃")
    );
    challenge.appendChild(reveal);
    details.appendChild(challenge);
  }

  const COGNITO_BALANCING_RESOURCE = {
    role: "GCSE Chemistry explanation and worked examples",
    title: "Cognito — How to balance chemical equations",
    url: "https://www.cognito.org/blog/gcse-chemistry-balancing-equations",
    description: "A focused GCSE Chemistry guide with a systematic method, worked examples and practice equations. Check it against your own specification."
  };

  const OCR_BALANCING_RESOURCE = {
    role: "OCR Foundation lesson",
    title: "Oak National Academy — Balancing equations (OCR Foundation)",
    url: "https://www.thenational.academy/teachers/programmes/chemistry-secondary-ks4-foundation-ocr/units/calculations-involving-masses/lessons/balancing-equations",
    description: "A direct Year 10 OCR Foundation lesson with lesson slides, a video, worksheet and quizzes. Use it only if the Foundation tier matches your course."
  };

  function saveResourceToLibrary(resource, session, button) {
    if (typeof window.getCollection !== "function" || typeof window.setCollection !== "function") {
      button.textContent = "Open Resource Library to save";
      return;
    }

    try {
      const stored = window.getCollection("resources");
      const resources = Array.isArray(stored) ? stored : [];
      const existing = resources.find(item => item && item.url === resource.url && !item.deleted);
      const topicTag = clean(session.topic, 100);

      if (existing) {
        const tags = String(existing.tag || "").split(";").map(value => value.trim()).filter(Boolean);
        if (topicTag && !tags.some(value => value.toLowerCase() === topicTag.toLowerCase())) tags.push(topicTag);
        existing.tag = tags.join("; ").slice(0, 100);
        window.setCollection("resources", resources);
      } else {
        const id = typeof window.uid === "function"
          ? window.uid("res")
          : `res_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
        const entry = {
          id,
          shortId: Math.random().toString(36).slice(2, 8).toUpperCase(),
          title: `${session.subject}: ${session.topic} — ${resource.role}`.slice(0, 140),
          url: resource.url,
          subject: session.subject || "Chemistry",
          tag: topicTag || "GCSE Chemistry",
          note: `Suggested for ${session.subject}: ${session.topic}. ${resource.description}`.slice(0, 1200),
          priority: "Medium",
          rating: 3,
          favourite: false,
          pinned: false,
          archived: false,
          deleted: false,
          deletedDate: null,
          clicks: 0,
          created: Date.now(),
          lastEdited: null,
          lastOpened: null
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

  function renderBalancingResources(card, session, board) {
    card.querySelectorAll(".session-resources").forEach(node => node.remove());

    const panel = makeElement("details", "session-resources topic-guide-resources");
    panel.open = true;
    panel.appendChild(makeElement("summary", "", "Direct resources for balancing equations"));
    panel.appendChild(makeElement(
      "p", "topic-guide-resource-note",
      board === "OCR"
        ? "Includes a general GCSE Chemistry guide and a direct OCR Foundation lesson. Check that the Foundation tier matches your course."
        : "A direct GCSE Chemistry guide is linked. No board-specific lesson is labelled as a match unless its course and tier have been checked."
    ));

    const resources = board === "OCR"
      ? [COGNITO_BALANCING_RESOURCE, OCR_BALANCING_RESOURCE]
      : [COGNITO_BALANCING_RESOURCE];
    const list = makeElement("div", "topic-guide-resource-list");

    resources.forEach(resource => {
      const item = makeElement("article", "topic-guide-resource-card");
      item.appendChild(makeElement("span", "topic-guide-resource-role", resource.role));
      const link = makeElement("a", "session-resource-link", resource.title);
      link.href = resource.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      item.append(link, makeElement("p", "", resource.description));

      const save = makeElement("button", "btn secondary small", "＋ Save to Resource Library");
      save.type = "button";
      save.addEventListener("click", () => saveResourceToLibrary(resource, session, save));
      item.appendChild(save);
      list.appendChild(item);
    });

    panel.appendChild(list);
    panel.appendChild(makeElement(
      "p", "topic-guide-disclaimer",
      "External pages can change. Check the exact qualification and tier before using them. GCSE ONTRACK does not host or reproduce their materials."
    ));

    const actions = card.querySelector(".session-actions");
    if (actions) card.insertBefore(panel, actions);
    else card.appendChild(panel);
  }

  function isGenericResourceUrl(url) {
    return /google\.[^/]+\/search|bing\.com\/search|go\.cognitoedu\.org\/gcse\/?$|senecalearning\.com\/en-gb\/?$|physicsandmathstutor\.com\/?$|mathsgenie\.co\.uk\/gcse\/maths\/?$/i.test(String(url || ""));
  }

  function removeGenericResourceLinks(card) {
    card.querySelectorAll(".session-resources a.session-resource-link").forEach(link => {
      if (!isGenericResourceUrl(link.href)) return;
      link.closest(".session-resource-item, .phase3-resource-item")?.remove();
    });

    card.querySelectorAll(".session-resources").forEach(panel => {
      const list = panel.querySelector(".session-resource-list");
      if (list && !list.querySelector("a.session-resource-link")) {
        list.replaceChildren(makeElement(
          "p", "topic-guide-resource-note",
          "No direct topic page is mapped for this session yet. A generic homepage or search-result page is not being presented as a topic resource."
        ));
      }
    });
  }

  function enhanceTimetable() {
    const host = document.getElementById("weeklySchedule");
    if (!host) return;
    const model = readModel();
    if (!model) return;

    host.querySelectorAll(".timetable-session-card").forEach(card => {
      if (card.classList.contains("kind-break")) return;
      const session = findSessionForCard(card, model);
      if (!session) return;

      const board = getBoard(session, model);
      if (session.examBoard !== board) session.examBoard = board;

      const type = subjectType(session.subject);
      const balancing = (type === "science" || type === "chemistry") && isBalancingTopic(session.topic);

      renderGuide(card, session, board);

      if (balancing) {
        const resourceKey = [session.id, session.topic, board].join("|");
        if (card.dataset.refinedResourceKey !== resourceKey) {
          renderBalancingResources(card, session, board);
          card.dataset.refinedResourceKey = resourceKey;
        }
      } else {
        const filterKey = [session.id, session.durationMinutes, session.subject, session.topic, board].join("|");
        if (card.dataset.filteredResourceKey !== filterKey) {
          removeGenericResourceLinks(card);
          card.dataset.filteredResourceKey = filterKey;
        }
      }
    });
  }

  function install() {
    const host = document.getElementById("weeklySchedule");
    if (!host) return;
    if (host.dataset.topicGuideObserver === "true") {
      enhanceTimetable();
      return;
    }

    const observer = new MutationObserver(() => enhanceTimetable());
    observer.observe(host, { childList: true, subtree: true });
    host.dataset.topicGuideObserver = "true";
    enhanceTimetable();
  }

  document.addEventListener("DOMContentLoaded", install, { once: true });
  if (document.readyState !== "loading") install();

  if (window.__GCO_TOPIC_GUIDE_TEST_MODE__ === true) {
    window.GCOTopicGuideTest = {
      subjectType,
      isBalancingTopic,
      allocateMinutes,
      balancingSteps
    };
  }
})();
