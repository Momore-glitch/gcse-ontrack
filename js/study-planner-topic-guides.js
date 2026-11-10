/* GCSE ONTRACK — topic guide refinement
 * Fixes the Science / Balancing Equations route and presents a clearer
 * chemistry method, worked example, success criteria and direct resources.
 * Uses the existing timetable data model and Resource Library APIs.
 */
(() => {
  "use strict";

  const STORE_KEY = "gcoStudyPlanner_v1";
  const DAY_IDS = {
    Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed",
    Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun"
  };

  const clean = (value, limit = 160) => String(value ?? "").trim().slice(0, limit);
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  };

  function readModel() {
    try {
      const model = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (!model || typeof model !== "object" || Array.isArray(model)) return null;
      model.sessions = Array.isArray(model.sessions) ? model.sessions : [];
      model.subjects = Array.isArray(model.subjects) ? model.subjects : [];
      return model;
    } catch (error) {
      console.warn("GCSE ONTRACK could not read the saved study plan.", error);
      return null;
    }
  }

  function isBalancingTopic(topic) {
    return /balanc(?:e|ed|ing)[\s\w-]{0,35}equations?|equations?[\s\w-]{0,35}balanc(?:e|ed|ing)|symbol equations?|chemical equations?|conservation of mass/i.test(clean(topic, 120));
  }

  function parseStartTime(value) {
    const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  function sessionForCard(card, model) {
    const dayLabel = card.closest(".timetable-day")
      ?.querySelector(".timetable-day-heading h3")?.textContent?.trim();
    const dayId = DAY_IDS[dayLabel];
    const timeText = card.querySelector(".session-time")?.textContent || "";
    const start = parseStartTime(timeText.split(/[–-]/)[0]);
    const heading = card.querySelector(":scope > h3")?.textContent?.trim() || "";

    let session = model.sessions.find(item =>
      item && item.kind !== "break" &&
      (!dayId || item.day === dayId) &&
      (start === null || Number(item.startMinutes) === start)
    );

    if (!session && heading) {
      session = model.sessions.find(item =>
        item && item.kind !== "break" &&
        `${clean(item.subject)} — ${clean(item.topic)}` === heading
      );
    }
    return session || null;
  }

  function getBoard(session, model) {
    if (session.examBoard) return clean(session.examBoard, 50);
    const subject = model.subjects.find(item => item && item.name === session.subject);
    return clean(subject?.examBoard || "", 50);
  }

  function allocateMinutes(duration) {
    const total = Math.max(5, Math.round(Number(duration) || 25));
    const weights = [0.20, 0.25, 0.35, 0.20];
    const result = weights.map(weight => Math.floor(total * weight));
    let remaining = total - result.reduce((sum, value) => sum + value, 0);
    for (let index = 0; remaining > 0; index = (index + 1) % result.length) {
      result[index] += 1;
      remaining -= 1;
    }
    return result;
  }

  function buildBalancingSteps(duration) {
    const minutes = allocateMinutes(duration);
    return [
      {
        label: "Count the atoms",
        minutes: minutes[0],
        instruction: "Copy the equation exactly. Make a left-side and right-side count for every element. For brackets, count the atoms inside the group and multiply by the small number outside the bracket."
      },
      {
        label: "Choose a coefficient",
        minutes: minutes[1],
        instruction: "Balance one element at a time by changing the large number in front of a formula. Start with an element that appears in one reactant and one product. Do not change any small subscripts."
      },
      {
        label: "Recount every element",
        minutes: minutes[2],
        instruction: "After each coefficient change, count all elements again on both sides. A coefficient multiplies every atom in the formula that follows it. Leave hydrogen and oxygen until later when that makes the counting easier."
      },
      {
        label: "Check and practise",
        minutes: minutes[3],
        instruction: "Confirm that every element has the same count on both sides. Use the smallest whole-number coefficients, remove any coefficient of 1, then balance a new equation without looking at the example."
      }
    ];
  }

  function resourceItems(board) {
    const items = [];
    if (board === "AQA") {
      items.push({
        role: "AQA topic lesson",
        title: "ScienceGCSE — Balancing chemical equations",
        url: "https://sciencegcse.co.uk/quantitative-balancing",
        description: "A focused AQA GCSE Chemistry / Combined Science lesson with worked examples, atom counting and interactive balancing practice."
      });
    }
    items.push({
      role: "Independent practice",
      title: "GCSE Chemistry — Balancing equation practice with answers",
      url: "https://gcse.wyattau.com/chemistry/4-chemical-changes/4_chemical_changes/",
      description: "Open the balancing-equations practice problems, attempt each one before checking the worked answers, and correct any coefficient errors. This is a general GCSE Chemistry practice page rather than an exam-board specification."
    });
    return items;
  }

  function saveToLibrary(item, session, button) {
    if (typeof window.getCollection !== "function" || typeof window.setCollection !== "function") {
      button.textContent = "Open Resource Library to save";
      return;
    }

    try {
      const resources = window.getCollection("resources");
      const existing = resources.find(row => row && row.url === item.url && !row.deleted);
      const topicTag = clean(session.topic, 100);

      if (existing) {
        const tags = String(existing.tag || "")
          .split(";").map(value => value.trim()).filter(Boolean);
        if (topicTag && !tags.some(value => value.toLowerCase() === topicTag.toLowerCase())) {
          tags.push(topicTag);
        }
        existing.tag = tags.join("; ").slice(0, 100);
        const note = `Also recommended for ${session.subject}: ${session.topic}.`;
        if (!String(existing.note || "").includes(note)) {
          existing.note = `${String(existing.note || "").trim()} ${note}`.trim().slice(0, 1200);
        }
        window.setCollection("resources", resources);
      } else {
        const makeId = typeof window.uid === "function"
          ? window.uid("res")
          : `res_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

        const entry = {
          id: makeId,
          shortId: Math.random().toString(36).slice(2, 8).toUpperCase(),
          title: `${session.subject}: ${session.topic} — ${item.role}`.slice(0, 140),
          url: item.url,
          subject: session.subject || "Science",
          tag: topicTag || "GCSE Chemistry",
          note: `Recommended for ${session.subject}: ${session.topic}. Resource type: ${item.role}. Check the exact qualification and topic before using the material.`,
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

  function appendResourceSection(card, session, model) {
    const board = getBoard(session, model);
    const items = resourceItems(board);
    const details = make("details", "session-resources topic-guide-resources");
    details.open = true;
    details.appendChild(make("summary", "", "Direct resources for balancing equations"));
    details.appendChild(make("p", "topic-guide-resource-note",
      board === "AQA"
        ? "The first link is AQA-specific. The second is a separate GCSE practice page."
        : "These are direct topic pages, not provider homepages. Check your own specification for any board-specific requirements."
    ));

    const list = make("div", "topic-guide-resource-list");
    items.forEach(item => {
      const cardItem = make("article", "topic-guide-resource-card");
      cardItem.appendChild(make("span", "topic-guide-resource-role", item.role));

      const link = make("a", "session-resource-link", item.title);
      link.href = item.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      cardItem.appendChild(link);
      cardItem.appendChild(make("p", "", item.description));

      const save = make("button", "btn secondary small", "＋ Save to Resource Library");
      save.type = "button";
      save.addEventListener("click", () => saveToLibrary(item, session, save));
      cardItem.appendChild(save);

      list.appendChild(cardItem);
    });

    details.appendChild(list);
    details.appendChild(make("p", "topic-guide-disclaimer",
      "GCSE ONTRACK links to external providers. Check the course, qualification and topic before relying on a resource."
    ));

    const actions = card.querySelector(".session-actions");
    if (actions) card.insertBefore(details, actions);
    else card.appendChild(details);
  }

  function renderBalancingGuide(card, session, model) {
    const key = [
      session.id,
      session.durationMinutes,
      session.subject,
      session.topic,
      getBoard(session, model)
    ].join("|");

    if (card.dataset.topicGuideKey === key) return;

    card.querySelectorAll(".session-steps, .session-resources").forEach(node => node.remove());

    const details = make("details", "session-steps phase3-session-steps topic-guide-structured");
    details.open = true;
    details.appendChild(make("summary", "", "How to study this topic"));
    details.appendChild(make("p", "phase3-focus-line",
      `${session.subject} · ${session.topic}${getBoard(session, model) ? ` · ${getBoard(session, model)}` : ""}`
    ));

    details.appendChild(make("p", "topic-guide-objective",
      "YOUR TARGET — Balance chemical symbol equations by changing coefficients only, then prove that each element has the same atom count on both sides."
    ));
    details.appendChild(make("p", "topic-guide-key-rule",
      "THE KEY RULE — Never change a formula's small subscript. Change only the large number in front of a formula. That coefficient multiplies the entire formula."
    ));

    const heading = make("h4", "topic-guide-section-heading", "Work through these steps");
    details.appendChild(heading);

    const list = make("ol", "topic-guide-steps");
    buildBalancingSteps(session.durationMinutes).forEach((step, index) => {
      const item = make("li", "topic-guide-step");
      const top = make("div", "topic-guide-step-top");
      top.appendChild(make("span", "topic-guide-step-number", String(index + 1).padStart(2, "0")));
      top.appendChild(make("strong", "", step.label));
      top.appendChild(make("span", "topic-guide-step-time", `${step.minutes} min`));
      item.appendChild(top);
      item.appendChild(make("p", "", step.instruction));
      list.appendChild(item);
    });
    details.appendChild(list);

    const example = make("section", "topic-guide-example");
    example.appendChild(make("h4", "", "Worked example: magnesium + oxygen"));
    example.appendChild(make("p", "topic-guide-equation", "Mg + O₂ → MgO"));
    example.appendChild(make("p", "topic-guide-equation topic-guide-equation-answer", "2Mg + O₂ → 2MgO"));
    example.appendChild(make("p", "", "Check the count: left side has Mg = 2 and O = 2; right side has Mg = 2 and O = 2. Only the coefficients changed."));
    details.appendChild(example);

    const challenge = make("details", "topic-guide-challenge");
    challenge.appendChild(make("summary", "", "Try this one before revealing the answer"));
    challenge.appendChild(make("p", "topic-guide-equation", "Al + O₂ → Al₂O₃"));
    challenge.appendChild(make("p", "", "Balance aluminium and oxygen, then recount both elements."));
    const reveal = make("details", "topic-guide-answer");
    reveal.appendChild(make("summary", "", "Reveal the balanced equation"));
    reveal.appendChild(make("p", "topic-guide-equation topic-guide-equation-answer", "4Al + 3O₂ → 2Al₂O₃"));
    challenge.appendChild(reveal);
    details.appendChild(challenge);

    details.appendChild(make("p", "topic-guide-output",
      "FINISH WITH — An atom-count table, the balanced magnesium equation, and the aluminium equation attempted independently."
    ));
    details.appendChild(make("p", "topic-guide-check",
      "SUCCESS CHECK — Every element matches on both sides; no formula subscript has changed; coefficients are the smallest whole-number ratio."
    ));
    details.appendChild(make("p", "topic-guide-common-errors",
      "COMMON ERRORS — Do not change O₂ into O or H₂O into H₂O₂. A coefficient multiplies every atom in the formula, including atoms inside brackets."
    ));

    const actions = card.querySelector(".session-actions");
    if (actions) card.insertBefore(details, actions);
    else card.appendChild(details);

    appendResourceSection(card, session, model);
    card.dataset.topicGuideKey = key;

    // The existing Phase 3 observer uses this key to avoid replacing the
    // refined guide with its older flat-list rendering.
    card.dataset.phase3Key = key;
  }

  function enhance() {
    const schedule = document.getElementById("weeklySchedule");
    if (!schedule) return;
    const model = readModel();
    if (!model) return;

    schedule.querySelectorAll(".timetable-session-card").forEach(card => {
      if (card.classList.contains("kind-break")) return;
      const session = sessionForCard(card, model);
      if (!session) return;

      const subject = clean(session.subject, 60).toLowerCase();
      const chemistrySubject = /science|chemistry/.test(subject);
      if (chemistrySubject && isBalancingTopic(session.topic)) {
        renderBalancingGuide(card, session, model);
      }
    });
  }

  function install() {
    const schedule = document.getElementById("weeklySchedule");
    if (!schedule || schedule.dataset.topicGuideObserver === "true") {
      enhance();
      return;
    }

    const observer = new MutationObserver(() => enhance());
    observer.observe(schedule, { childList: true, subtree: true });
    schedule.dataset.topicGuideObserver = "true";
    enhance();
  }

  document.addEventListener("DOMContentLoaded", install, { once: true });
  if (document.readyState !== "loading") install();

  if (window.__GCO_TOPIC_GUIDE_TEST_MODE__ === true) {
    window.GCOTopicGuideTest = {
      isBalancingTopic,
      allocateMinutes,
      buildBalancingSteps,
      resourceItems
    };
  }
})();
