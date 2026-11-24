/* GCSE ONTRACK — resource catalogue hotfix.
 * Adds checked three-link packs for the AQA History options and corrects the
 * expired Business cash-flow video. This runs after the existing topic pack.
 */
(() => {
  "use strict";
  const HOST_ID = "weeklySchedule";
  const MODEL_KEY = "gcoStudyPlanner_v1";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clean = (value, max = 180) => String(value ?? "").trim().slice(0, max);

  const SHERPA_HISTORY = "https://sherpa-online.com/study/aqa/gcse/history/practice-questions";
  const PACKS = [
    {
      id: "business-cash-flow-edexcel-verified",
      subject: "business", board: "Pearson Edexcel",
      match: /cash\s*flow|cashflow|cash inflow|cash outflow|cash-flow forecast/,
      topicLabel: "Pearson Edexcel GCSE Business 1.3.3 — Cash and cash-flow",
      resources: [
        {
          role: "Video lesson", title: "Business As Usual — Edexcel GCSE Business calculations (cash flow section)",
          url: "https://www.youtube.com/watch?v=aCNV_RzoU5c&t=631s",
          description: "Edexcel GCSE Business calculations lesson. The cash-flow section begins at 10:31 and cash-flow forecasts are revisited at 12:42. Pause at those sections and work through the examples."
        },
        {
          role: "Topic practice questions", title: "DoRevision — Edexcel GCSE Business: Cash and Cash-Flow",
          url: "https://dorevision.com/learn/cash-flow-edexcel",
          description: "A focused 16-minute interactive module with 14 activities covering cash versus profit, inflows, outflows, net cash flow, closing balances and forecasts. Open on the provider's site."
        },
        {
          role: "Topic past-paper questions", title: "Plumi — Edexcel GCSE Business 1.3.3 Cash and cash-flow (2019–2025)",
          url: "https://tryplumi.app/question-bank/edexcel-gcse-business/cash-and-cash-flow",
          description: "Topic-filtered Edexcel 1BS0 past-paper question bank with 377 questions, mark schemes and examiner reports where available. Open on the provider's site."
        }
      ]
    },
    {
      id: "history-health-and-people-verified",
      subject: "history", board: "AQA",
      match: /health|medicine|medical|disease|surgery|public health|\bnhs\b|health and the people/,
      topicLabel: "AQA GCSE History Paper 2 — Britain: Health and the people, c1000 to the present day",
      resources: [
        {
          role: "Video lesson", title: "Mr M Lewis — AQA GCSE History Paper 2: Health and the People (whole course)",
          url: "https://www.youtube.com/watch?v=VNo2SZD_Jao",
          description: "Whole-course revision video that breaks the AQA Health and the People study into its key periods and questions. Pause at the section relevant to your session."
        },
        {
          role: "Topic practice questions", title: "Sherpa — AQA GCSE History: Health and the People questions",
          url: SHERPA_HISTORY,
          description: "Choose Thematic Study → Health & the People. Practise source usefulness, significance, similarity and factor/judgement questions, then mark your answer."
        },
        {
          role: "Topic past-paper questions", title: "Sherpa / AQA — June 2024 Paper 2 Section A/A: Health and the People (8145/2A/A)",
          url: "https://cdn.sanity.io/files/p28bar15/green/67e9c77b77a52f710c10ec55b12c1ad45a8781cd.pdf",
          description: "Direct AQA 8145 question paper for Britain: Health and the people, c1000 to the present day. Attempt all four questions; use the matching mark scheme from the Sherpa past-paper page after finishing."
        }
      ]
    },
    {
      id: "history-conflict-and-tension-verified",
      subject: "history", board: "AQA",
      match: /conflict|tension|versailles|league of nations|appeasement|inter.?war|international relations|outbreak of (?:the )?second world war/,
      topicLabel: "AQA GCSE History Paper 1 — Conflict and tension: the inter-war years, 1918–1939",
      resources: [
        {
          role: "Video lesson", title: "Academyk — The Whole of the Conflict & Tension 1918–39 GCSE AQA History Course",
          url: "https://www.youtube.com/watch?v=eyyaj2C6wt0",
          description: "A whole-course AQA revision lesson covering the inter-war study. Use the part that matches your current focus, such as peacemaking, the League of Nations or the outbreak of war."
        },
        {
          role: "Topic practice questions", title: "Sherpa — AQA GCSE History: Inter-War Years questions",
          url: SHERPA_HISTORY,
          description: "Choose Wider World Depth Study → Inter-War Years. Practise source questions, writing an account and the 8-mark judgement question."
        },
        {
          role: "Topic past-paper questions", title: "Sherpa / AQA — June 2024 Paper 1 Section B/B: Conflict and tension, 1918–1939 (8145/1B/B)",
          url: "https://cdn.sanity.io/files/p28bar15/green/2ce185b03f0effa015975a2ddb05b604488080a3.pdf",
          description: "Direct AQA 8145 question paper for the inter-war years. The questions cover Wilson, the League of Nations, Anschluss and the Treaty of Versailles."
        }
      ]
    },
    {
      id: "history-elizabethan-england-verified",
      subject: "history", board: "AQA",
      match: /elizabeth|armada|drake|roanoke|mary queen|spanish threat|elizabethan|hardwick hall|globe theatre/,
      topicLabel: "AQA GCSE History Paper 2 — Elizabethan England, c1568–1603",
      resources: [
        {
          role: "Video lesson", title: "Mr M Lewis — AQA GCSE History Paper 2: Elizabethan England (whole course)",
          url: "https://www.youtube.com/watch?v=3ET3SQa5T_4",
          description: "Whole-course AQA revision video covering Elizabethan England. Pause at the chapter or key question relevant to your session."
        },
        {
          role: "Topic practice questions", title: "Sherpa — AQA GCSE History: Elizabethan England questions",
          url: SHERPA_HISTORY,
          description: "Choose British Depth Study → Elizabethan England. Practise interpretation, importance, account and historic-environment question types."
        },
        {
          role: "Topic past-paper questions", title: "Sherpa / AQA — June 2024 Paper 2 Section B/C: Elizabethan England (8145/2B/C)",
          url: "https://cdn.sanity.io/files/p28bar15/green/3fa0643a2a694bab83945c7bacc4230b73fd3524.pdf",
          description: "Direct AQA 8145 question paper for Elizabethan England. It includes questions on Elizabeth and Parliament, theatre, Catholic plots and Drake's circumnavigation."
        }
      ]
    },
    {
      id: "history-germany-verified",
      subject: "history", board: "AQA",
      match: /germany|weimar|nazi|hitler|reichstag|stresemann|night of the long knives|great depression/,
      topicLabel: "AQA GCSE History Paper 1 — Germany, 1890–1945: Democracy and dictatorship",
      resources: [
        {
          role: "Video lesson", title: "History Core — GCSE Germany 1890–1945",
          url: "https://www.youtube.com/watch?v=CbWbXw3JIgc",
          description: "A chronological revision lesson on Germany 1890–1945. Use the section matching the exact period or event in your session."
        },
        {
          role: "Topic practice questions", title: "Sherpa — AQA GCSE History: Germany questions",
          url: SHERPA_HISTORY,
          description: "Choose Period Study → Germany. Practise interpretation and explanation questions, then mark your answer."
        },
        {
          role: "Topic past-paper questions", title: "Sherpa / AQA — June 2024 Paper 1 Section A/B: Germany 1890–1945 (8145/1A/B)",
          url: "https://cdn.sanity.io/files/p28bar15/green/18a2f5872f1e18ac4f7bc6900adab8f7a876ee77.pdf",
          description: "Direct AQA 8145 question paper for Germany, 1890–1945. Attempt the six questions and use a matching mark scheme only after completing the paper."
        }
      ]
    }
  ];

  function readModel() {
    try {
      const model = JSON.parse(localStorage.getItem(MODEL_KEY) || "null");
      return model && typeof model === "object" && !Array.isArray(model) ? model : null;
    } catch (error) {
      console.warn("GCSE ONTRACK: could not read timetable for resource matching.", error);
      return null;
    }
  }

  function getSession(card, model) {
    const id = String(card.dataset.sessionId || "");
    const exact = id && model?.sessions?.find(item => String(item?.id || "") === id);
    if (exact) return exact;
    const title = $(":scope > h3", card)?.textContent?.trim() || "";
    const divider = title.indexOf(" — ");
    if (divider < 1) return null;
    return { subject: title.slice(0, divider).trim(), topic: title.slice(divider + 3).trim(), examBoard: "" };
  }

  function findPack(session, model) {
    const subject = clean(session.subject, 60).toLowerCase();
    const board = clean(session.examBoard || model?.subjects?.find(item => item?.name === session.subject)?.examBoard || "", 50);
    const topic = clean(session.topic, 120).toLowerCase();
    return PACKS.find(pack => pack.subject === (subject.includes("history") ? "history" : subject.includes("business") ? "business" : subject) &&
      pack.board === board && pack.match.test(topic));
  }

  function makeElement(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content !== undefined) element.textContent = String(content);
    return element;
  }

  function saveResource(resource, session, button) {
    if (typeof window.getCollection !== "function" || typeof window.setCollection !== "function") {
      button.textContent = "Open Resource Library to save";
      return;
    }
    try {
      const resources = window.getCollection("resources");
      const existing = resources.find(item => item && item.url === resource.url && !item.deleted);
      if (existing) {
        const tags = String(existing.tag || "").split(";").map(value => value.trim()).filter(Boolean);
        if (session.topic && !tags.some(value => value.toLowerCase() === session.topic.toLowerCase())) tags.push(session.topic);
        existing.tag = tags.join("; ").slice(0, 100);
      } else {
        resources.unshift({
          id: typeof window.uid === "function" ? window.uid("res") : `res_${Date.now()}`,
          shortId: Math.random().toString(36).slice(2, 8).toUpperCase(),
          title: `${session.subject}: ${session.topic} — ${resource.role}`.slice(0, 140),
          url: resource.url, subject: session.subject, tag: clean(session.topic, 100),
          note: `Topic resource for ${session.subject}: ${session.topic}. ${resource.description}`.slice(0, 1200),
          priority: "Medium", rating: 3, favourite: false, pinned: false,
          archived: false, deleted: false, deletedDate: null, clicks: 0,
          created: Date.now(), lastEdited: null, lastOpened: null
        });
      }
      window.setCollection("resources", resources);
      button.textContent = "✓ Saved to Resource Library";
      button.disabled = true;
    } catch (error) {
      console.warn("GCSE ONTRACK: resource could not be saved.", error);
      button.textContent = "Could not save — try Resource Library";
    }
  }

  function renderPack(card, session, pack) {
    const board = clean(session.examBoard || pack.board, 50);
    const key = [session.id || "", session.subject, session.topic, board, pack.id].join("|");
    if (card.dataset.gcoCatalogHotfixKey === key && card.querySelector(".gco-topic-resource-panel")) return;

    $$(".session-resources", card).forEach(node => node.remove());
    const panel = makeElement("details", "session-resources gco-topic-resource-panel");
    panel.open = false;
    panel.dataset.gcoInitiallyCollapsed = "true";
    panel.appendChild(makeElement("summary", "", "Direct video, practice and past-paper links"));
    panel.appendChild(makeElement("p", "field-hint", `${pack.topicLabel}. The resource pages are matched to AQA or Pearson Edexcel and the full topic named above.`));

    const list = makeElement("div", "session-resource-list");
    pack.resources.forEach(resource => {
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
      save.addEventListener("click", () => saveResource(resource, session, save));
      item.appendChild(save);
      list.appendChild(item);
    });
    panel.appendChild(list);
    panel.appendChild(makeElement("p", "resource-disclaimer", "Links were checked against the named topic and qualification when this update was prepared. Providers can change their pages; use the provider-page button if an in-site preview is blocked."));

    const actions = card.querySelector(".session-actions");
    if (actions) card.insertBefore(panel, actions); else card.appendChild(panel);
    card.dataset.gcoCatalogHotfixKey = key;
    // Keep the existing final-refinement observer from replacing this checked
    // panel with its older unverified URLs or its "unmapped" placeholder.
    const guideKey = [session.id, session.durationMinutes, session.subject, session.topic, board].join("|");
    const legacyPackId = pack.id === "business-cash-flow-edexcel-verified"
      ? "business-cash-flow-edexcel"
      : (pack.id === "history-germany-verified" && /rise of the nazis|nazi rise|hitler becomes chancellor|great depression.*nazi|nazi.*great depression|reichstag.*nazi/i.test(session.topic)
        ? "history-germany-1890-1945" : "unmapped");
    card.dataset.gcoTopicResourceKey = `${guideKey}|${legacyPackId}`;
    card.dataset.refinedResourceKey = [session.id, session.topic, board].join("|");
  }

  function enhanceAll() {
    const host = $("#" + HOST_ID);
    if (!host) return;
    const model = readModel();
    $$(".timetable-session-card", host).forEach(card => {
      if (card.classList.contains("kind-break")) return;
      const session = getSession(card, model || {});
      if (!session) return;
      const pack = findPack(session, model);
      if (pack) renderPack(card, session, pack);
    });
  }

  function install() {
    const host = $("#" + HOST_ID);
    if (!host || host.dataset.gcoResourceCatalogueHotfixInstalled === "true") return;
    const observer = new MutationObserver(() => enhanceAll());
    observer.observe(host, { childList: true, subtree: true });
    host.dataset.gcoResourceCatalogueHotfixInstalled = "true";
    enhanceAll();
  }

  document.addEventListener("DOMContentLoaded", install, { once: true });
  if (document.readyState !== "loading") install();

  if (window.__GCO_RESOURCE_CATALOGUE_TEST_MODE__ === true) {
    window.GCOResourceCatalogueTest = Object.freeze({
      findPack: (subject, board, topic) => {
        const session = { subject, examBoard: board, topic };
        return findPack(session, { subjects: [] })?.id || null;
      },
      packIds: PACKS.map(pack => pack.id)
    });
  }
})();
