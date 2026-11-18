/* GCSE ONTRACK — final timetable resource refinement.
 * Loaded after study-planner-topic-guides.js on timetable.html.
 * Adds three subject-matched resource types without changing saved sessions.
 */
(() => {
  "use strict";

  const STORE_KEY = "gcoStudyPlanner_v1";
  const AQA_PAST_PAPERS = "https://www.aqa.org.uk/past-papers-and-mark-schemes-finder";
  const PEARSON_PAST_PAPERS = "https://qualifications.pearson.com/en/support/support-topics/exams/past-papers.html";
  const BTEC_COURSE = "https://qualifications.pearson.com/en/qualifications/btec-tech-awards/digital-information-technology-2022.html";
  const BTEC_MATERIALS = "https://qualifications.pearson.com/en/qualifications/btec-tech-awards/digital-information-technology-2022.coursematerials.html";
  const BTEC_SAMPLE = "https://qualifications.pearson.com/content/dam/pdf/btec-tec-awards/information-technology/2022/specification-and-sample-assessments/60370506-BTEC-Tech-Award-Digital-Information-Technology-2022-SAMs-Component-3-PP1.pdf";

  const SUBJECTS = {
    maths: {
      label: "Maths",
      learn: {
        title: "MathsGenie — GCSE Maths videos and lessons",
        url: "https://www.mathsgenie.co.uk/gcse/maths",
        description: "Choose your exam board, then open the exact topic under Videos or Lessons. The site also has worksheets and worked examples."
      },
      practice: {
        title: "Cognito — GCSE Maths quizzes and practice",
        url: "https://www.cognito.org/courses/gcse/maths",
        description: "Choose your exam board and the topic you are revising, then complete the matching quiz or exam-style questions."
      }
    },
    biology: {
      label: "Biology",
      learn: {
        title: "Cognito — GCSE Biology topic videos and notes",
        url: "https://www.cognito.org/courses/gcse/biology",
        description: "Choose your exam board and open the exact subtopic. Science topics include a matching video and notes."
      },
      practice: {
        title: "Physics & Maths Tutor — GCSE Biology revision and questions",
        url: "https://www.physicsandmathstutor.com/biology-revision/gcse-aqa/",
        description: "For AQA Biology: open the matching topic and use its topic questions. For another board, use the exam-board selector on Cognito instead."
      }
    },
    chemistry: {
      label: "Chemistry",
      learn: {
        title: "Cognito — GCSE Chemistry topic videos and notes",
        url: "https://www.cognito.org/courses/gcse/chemistry",
        description: "Choose your exam board and open the exact subtopic. Science topics include a matching video and notes."
      },
      practice: {
        title: "Physics & Maths Tutor — GCSE Chemistry revision and questions",
        url: "https://www.physicsandmathstutor.com/chemistry-revision/gcse-aqa/",
        description: "For AQA Chemistry: open the matching topic and use its topic questions. For another board, use the exam-board selector on Cognito instead."
      }
    },
    physics: {
      label: "Physics",
      learn: {
        title: "Cognito — GCSE Physics topic videos and notes",
        url: "https://www.cognito.org/courses/gcse/physics",
        description: "Choose your exam board and open the exact subtopic. Science topics include a matching video and notes."
      },
      practice: {
        title: "Physics & Maths Tutor — GCSE Physics revision and questions",
        url: "https://www.physicsandmathstutor.com/physics-revision/gcse-aqa/",
        description: "For AQA Physics: open the matching topic and use its topic questions. For another board, use the exam-board selector on Cognito instead."
      }
    },
    englishlanguage: {
      label: "English Language",
      learn: {
        title: "Cognito — GCSE English Language course",
        url: "https://www.cognito.org/courses/gcse/english-language",
        description: "Choose your exam board and focus on the reading or writing skill named in your timetable."
      },
      practice: {
        title: "DoRevision — GCSE English Language interactive practice",
        url: "https://dorevision.com/revise/gcse/english-language",
        description: "Choose the module matching your reading question, writing skill or spoken-language task, then answer the questions actively."
      }
    },
    englishliterature: {
      label: "English Literature",
      learn: {
        title: "Cognito — GCSE English Literature course",
        url: "https://www.cognito.org/courses/gcse/english-literature",
        description: "Choose your exam board and revise the studied text, poem or analytical skill that matches your timetable topic."
      },
      practice: {
        title: "DoRevision — GCSE English Literature interactive practice",
        url: "https://dorevision.com/revise/gcse/english-literature",
        description: "Practise the relevant literature skill or text area. Check that the activity matches your exam board and your school's set texts."
      }
    },
    history: {
      label: "History",
      learn: {
        title: "Cognito — GCSE History course",
        url: "https://www.cognito.org/courses/gcse/history",
        description: "Choose your exam board and open the period, event or historical concept that matches your timetable topic."
      },
      practice: {
        title: "DoRevision — GCSE History interactive revision (board matched)",
        url: "https://dorevision.com/revise/gcse/history",
        description: "Choose your exact specification (AQA, CCEA, Edexcel, Eduqas or WJEC), then complete the matching short interactive history activity."
      }
    },
    geography: {
      label: "Geography",
      learn: {
        title: "Cognito — GCSE Geography course",
        url: "https://www.cognito.org/courses/gcse/geography",
        description: "Choose your exam board and open the matching physical, human or fieldwork topic."
      },
      practice: {
        title: "DoRevision — GCSE Geography interactive revision",
        url: "https://dorevision.com/revise/gcse/geography",
        description: "Choose the exact AQA, CCEA or WJEC specification, then complete the matching short interactive geography activity. Edexcel/Eduqas Geography A students should use the separate Geography A course."
      }
    },
    business: {
      label: "Business",
      learn: {
        title: "Cognito — GCSE Business course",
        url: "https://www.cognito.org/courses/gcse/business",
        description: "Choose your exam board and open the business topic that matches your session."
      },
      practice: {
        title: "DoRevision — Edexcel GCSE Business interactive modules",
        url: "https://dorevision.com/revise/edexcel/gcse/business",
        description: "Edexcel/Pearson GCSE Business 1BS0 interactive modules. Practise the matching topic, then apply it to a business scenario."
      }
    },
    computerscience: {
      label: "Computer Science",
      learn: {
        title: "Cognito — GCSE Computer Science course",
        url: "https://www.cognito.org/courses/gcse/computer-science",
        description: "Choose your exam board and open the relevant algorithms, programming, data, systems or network topic."
      },
      practice: {
        title: "Williams Physics Education — GCSE Computer Science topic tests",
        url: "https://www.williamsphysics.co.uk/computerscience/",
        description: "Use the exam-board section for auto-marked topic tests, structured revision and longer-answer practice."
      }
    },
    it: {
      label: "Digital Information Technology",
      learn: {
        title: "TFA Study Support — BTEC Digital Information Technology",
        url: "https://www.tfastudysupport.co.uk/digital-information-technology/",
        description: "Open the component and learning aim that match your session. The page includes DIT videos and revision resources."
      },
      practice: {
        title: "Pearson — BTEC Digital Information Technology sample assessment",
        url: BTEC_SAMPLE,
        description: "This is a Component 3 sample assessment paper. Use it only when your session relates to Component 3; use your teacher's brief for internal assessment work."
      }
    },
    combinedscience: {
      label: "Combined Science",
      learn: {
        title: "Cognito — GCSE Combined Science course",
        url: "https://www.cognito.org/courses/gcse/combined-science",
        description: "Choose your exam board, then open the Biology, Chemistry or Physics subtopic named in your timetable."
      },
      practice: {
        title: "Cognito — GCSE Combined Science quizzes and exam questions",
        url: "https://www.cognito.org/courses/gcse/combined-science",
        description: "Use the matching board and topic quiz or exam-style questions. Do not use Triple Science-only content unless it is on your course."
      }
    }
  };

  const AQA_ASSESSMENT = {
    maths: "https://www.aqa.org.uk/subjects/mathematics/gcse/mathematics-8300/assessment-resources",
    biology: "https://www.aqa.org.uk/subjects/biology/gcse/biology-8461/assessment-resources",
    chemistry: "https://www.aqa.org.uk/subjects/chemistry/gcse/chemistry-8462/assessment-resources",
    physics: "https://www.aqa.org.uk/subjects/physics/gcse/physics-8463/assessment-resources",
    englishlanguage: "https://www.aqa.org.uk/subjects/english/gcse/english-8700/assessment-resources",
    englishliterature: "https://www.aqa.org.uk/subjects/english/gcse/english-8702/assessment-resources",
    history: "https://www.aqa.org.uk/subjects/history/gcse/history-8145/assessment-resources",
    geography: "https://www.aqa.org.uk/subjects/geography/gcse/geography-8035/assessment-resources",
    computerscience: "https://www.aqa.org.uk/subjects/computer-science/gcse/computer-science-8525/assessment-resources"
  };

  function clean(value, max = 160) {
    return String(value ?? "").trim().slice(0, max);
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

  function subjectKey(value) {
    const s = clean(value, 80).toLowerCase();
    if (/combined\s*science|combined science/.test(s) || /^science$/.test(s)) return "combinedscience";
    if (/biology/.test(s)) return "biology";
    if (/chemistry/.test(s)) return "chemistry";
    if (/physics/.test(s)) return "physics";
    if (/math/.test(s)) return "maths";
    if (/english.*literature|literature/.test(s)) return "englishliterature";
    if (/english.*language|language/.test(s) && /english/.test(s)) return "englishlanguage";
    if (/history/.test(s)) return "history";
    if (/geography/.test(s)) return "geography";
    if (/business/.test(s)) return "business";
    if (/computer science|computing/.test(s)) return "computerscience";
    if (/\bit\b|digital information technology|digital it/.test(s)) return "it";
    return "";
  }

  function currentBoard(session, model) {
    const subject = model.subjects.find(item => item && item.name === session.subject);
    return clean(session.examBoard || subject?.examBoard || "", 60);
  }

  function officialAssessment(subject, board) {
    const key = subjectKey(subject);
    if (board === "Pearson BTEC" && key === "it") {
      return {
        title: "Pearson — BTEC Digital Information Technology course materials",
        url: BTEC_MATERIALS,
        description: "Official Component 1–3 materials, including sample assessment, external assessment and internal assessment resources."
      };
    }
    if (board === "AQA" && AQA_ASSESSMENT[key]) {
      return {
        title: `AQA — GCSE ${SUBJECTS[key].label} assessment resources`,
        url: AQA_ASSESSMENT[key],
        description: `Official AQA assessment resources for GCSE ${SUBJECTS[key].label}, including available past papers, mark schemes and related assessment material.`
      };
    }
    if (board === "Pearson Edexcel" && key === "maths") {
      return {
        title: "Pearson Edexcel — GCSE Maths past papers and mark schemes",
        url: "https://qualifications.pearson.com/en/support/support-topics/exams/past-papers.html?Qualification-Family=GCSE&Qualification-Subject=Mathematics%2B%289-1%29%2Bfrom%2B2015&Specification-Code=Pearson-UK%3ASpecification-Code%2Fgcse15-maths&Status=Pearson-UK%3AStatus%2FLive",
        description: "Official Edexcel GCSE Maths assessment search. Recent papers may be restricted to teachers and exams officers."
      };
    }
    if (board === "Pearson Edexcel" && key === "business") {
      return {
        title: "Pearson Edexcel — GCSE Business (1BS0) assessment materials",
        url: "https://qualifications.pearson.com/en/qualifications/edexcel-gcses/business-2017.html",
        description: "Official GCSE Business 1BS0 qualification page. Open Course materials or Exam materials for the relevant paper and mark scheme."
      };
    }
    const finders = {
      "AQA": AQA_PAST_PAPERS,
      "Pearson Edexcel": PEARSON_PAST_PAPERS,
      "OCR": "https://www.ocr.org.uk/qualifications/past-paper-finder/",
      "Eduqas": "https://www.eduqas.co.uk/home/past-papers-and-mark-schemes/",
      "WJEC": "https://questionbank.resources.wjec.co.uk/",
      "CCEA": "https://ccea.org.uk/downloads/past-papers-mark-schemes"
    };
    const url = finders[board];
    if (!url) return null;
    return {
      title: `${board} — GCSE ${SUBJECTS[key]?.label || clean(subject, 60)} past papers`,
      url,
      description: `Official ${board} assessment finder. Select GCSE ${SUBJECTS[key]?.label || clean(subject, 60)} and the exact specification before opening a paper or mark scheme.`
    };
  }

  function resourcePack(session, board) {
    const key = subjectKey(session.subject);
    const subject = SUBJECTS[key];
    if (!subject) return [];

    const learn = { ...subject.learn };
    const practice = { ...subject.practice };
    const topic = clean(session.topic, 120).toLowerCase();

    // For a common Maths topic, send students straight to the matching
    // exam-board topic page rather than a generic subject index.
    if (key === "maths" && /sequence|nth term/.test(topic) && ["AQA", "Pearson Edexcel"].includes(board)) {
      const boardSlug = board === "AQA" ? "aqa" : "edexcel";
      const topicUrl = `https://mathsgenie.co.uk/gcse/maths/${boardSlug}/grade-4-4-7-sequences-nth-term`;
      learn.title = `MathsGenie — ${board} GCSE Maths: Sequences (Nth Term)`;
      learn.url = topicUrl;
      learn.description = `Direct ${board} Sequences page with topic videos, revision notes and worked examples for ${clean(session.topic, 120)}.`;
      practice.title = `MathsGenie — ${board} Sequences exam-style questions`;
      practice.url = `${topicUrl}/questions`;
      practice.description = `Direct question bank for ${clean(session.topic, 120)} with exam-style questions, worked solutions and a mark scheme.`;
    }

    // Keep balancing-equations links at the exact skill level.
    if (key === "chemistry" && /balanc(?:e|ed|ing).*equation|equation.*balanc(?:e|ed|ing)/.test(topic)) {
      learn.title = "Cognito — How to balance chemical equations";
      learn.url = "https://www.cognito.org/blog/gcse-chemistry-balancing-equations";
      learn.description = "Direct GCSE Chemistry lesson with a step-by-step balancing method and worked examples.";
      practice.title = "Science GCSE — Balance chemical equations";
      practice.url = "https://www.sciencegcse.co.uk/quantitative-balancing";
      practice.description = "Direct interactive balancing activity with atom-counting examples and practice questions. The lesson is labelled AQA Combined Science; check it matches your course.";
    }

    if (key === "geography" && ["Pearson Edexcel", "Eduqas"].includes(board)) {
      practice.title = "DoRevision — GCSE Geography A interactive revision";
      practice.url = "https://dorevision.com/revise/gcse/geography-a";
      practice.description = "Choose the Edexcel/Pearson or Eduqas Geography A specification, then complete the matching interactive topic activity.";
    }

    if (key === "business") {
      const businessRoutes = {
        "AQA": "https://dorevision.com/revise/aqa/gcse/business",
        "Pearson Edexcel": "https://dorevision.com/revise/edexcel/gcse/business",
        "OCR": "https://dorevision.com/revise/ocr/gcse/business",
        "Eduqas": "https://dorevision.com/revise/eduqas/gcse/business"
      };
      if (businessRoutes[board]) {
        practice.title = `DoRevision — ${board} GCSE Business interactive practice`;
        practice.url = businessRoutes[board];
        practice.description = `Interactive revision activities matched to the ${board} GCSE Business specification. Choose the module that matches ${clean(session.topic, 120)}.`;
      }
    }

    const items = [
      {
        role: key === "maths" || ["biology", "chemistry", "physics"].includes(key) || key === "it"
          ? "LEARN · Videos and lessons"
          : "LEARN · Subject lessons",
        title: learn.title,
        url: learn.url,
        description: learn.description
      },
      {
        role: key === "it" ? "PRACTISE · Component assessment" : "PRACTISE · Topic questions and quizzes",
        title: practice.title,
        url: practice.url,
        description: practice.description
      }
    ];

    const assessment = officialAssessment(session.subject, board);
    if (assessment) {
      items.push({
        role: key === "it" ? "ASSESS · Official BTEC materials" : "ASSESS · Past papers and mark schemes",
        title: assessment.title,
        url: assessment.url,
        description: assessment.description
      });
    }

    // Remove duplicate destinations while preserving the three resource roles.
    const seen = new Set();
    return items.filter(item => {
      if (!item.url || seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    }).slice(0, 3);
  }

  function makeElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function addToLibrary(item, session, button) {
    if (typeof window.getCollection !== "function" || typeof window.setCollection !== "function") {
      button.textContent = "Open Resource Library to save";
      return;
    }
    try {
      const stored = window.getCollection("resources");
      const resources = Array.isArray(stored) ? stored : [];
      const existing = resources.find(row => row && row.url === item.url && !row.deleted);
      const topic = clean(session.topic, 100);
      if (existing) {
        const tags = String(existing.tag || "").split(";").map(value => value.trim()).filter(Boolean);
        if (topic && !tags.some(value => value.toLowerCase() === topic.toLowerCase())) tags.push(topic);
        existing.tag = tags.join("; ").slice(0, 100);
        window.setCollection("resources", resources);
      } else {
        const entry = {
          id: typeof window.uid === "function" ? window.uid("res") : `res_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
          shortId: Math.random().toString(36).slice(2, 8).toUpperCase(),
          title: `${clean(session.subject, 60)}: ${topic} — ${item.role}`.slice(0, 140),
          url: item.url,
          subject: clean(session.subject, 60),
          tag: topic || "GCSE revision",
          note: `${item.description} Recommended for ${clean(session.subject, 60)}: ${topic}. Exam board: ${clean(session.examBoard || "not set", 40)}.`,
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

  function renderResources(card, session, board) {
    const key = [session.id, session.subject, session.topic, board].join("|");
    if (card.dataset.finalResourceKey === key) return;

    card.querySelectorAll(".session-resources").forEach(node => node.remove());
    const items = resourcePack(session, board);
    if (!items.length) return;

    const panel = makeElement("details", "session-resources final-subject-resources");
    panel.appendChild(makeElement("summary", "", "📚 Subject-specific resources"));
    panel.appendChild(makeElement(
      "p", "topic-guide-resource-note",
      `Selected for ${clean(session.subject, 60)} · ${clean(session.topic, 120)}${board ? ` · ${board}` : " · exam board not set"}. Open the exact topic and check the course or component before practising.`
    ));

    const list = makeElement("div", "topic-guide-resource-list");
    items.forEach(item => {
      const row = makeElement("article", "topic-guide-resource-card");
      row.appendChild(makeElement("span", "topic-guide-resource-role", item.role));
      const link = makeElement("a", "session-resource-link", item.title);
      link.href = item.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      row.appendChild(link);
      row.appendChild(makeElement("p", "", item.description));
      const save = makeElement("button", "btn secondary small", "＋ Save to Resource Library");
      save.type = "button";
      save.addEventListener("click", () => addToLibrary(item, session, save));
      row.appendChild(save);
      list.appendChild(row);
    });
    panel.appendChild(list);
    panel.appendChild(makeElement(
      "p", "topic-guide-disclaimer",
      "GCSE ONTRACK links to external providers. Some sites have free and paid features; check the exact specification, tier, set text or BTEC component before using a resource."
    ));

    const actions = card.querySelector(".session-actions");
    if (actions) card.insertBefore(panel, actions);
    else card.appendChild(panel);

    card.dataset.finalResourceKey = key;
    // Prevent the earlier Phase 3/topic-guide observers from replacing this panel.
    card.dataset.refinedResourceKey = [session.id, session.topic, board].join("|");
    card.dataset.filteredResourceKey = [session.id, session.durationMinutes, session.subject, session.topic, board].join("|");
    card.dataset.phase3Key = [session.id, session.durationMinutes, session.subject, session.topic, board].join("|");
  }

  function closeInitialPanels(card) {
    card.querySelectorAll("details").forEach(details => { details.open = false; });
  }

  function enhanceTimetable() {
    const host = document.getElementById("weeklySchedule");
    if (!host) return;
    const model = readModel();
    if (!model) return;

    host.querySelectorAll(".timetable-session-card").forEach(card => {
      if (card.classList.contains("kind-break")) return;
      const id = String(card.dataset.sessionId || "");
      const session = model.sessions.find(item => item && String(item.id || "") === id && item.kind !== "break");
      if (!session) return;

      const board = clean(session.examBoard || model.subjects.find(item => item && item.name === session.subject)?.examBoard || "", 60);
      const currentKey = [session.id, session.durationMinutes, session.subject, session.topic, board].join("|");
      if (card.dataset.finalRefinementKey === currentKey) return;

      closeInitialPanels(card);
      renderResources(card, session, board);
      card.dataset.finalRefinementKey = currentKey;
    });
  }

  function install() {
    const host = document.getElementById("weeklySchedule");
    if (!host) return;
    enhanceTimetable();
    const observer = new MutationObserver(() => enhanceTimetable());
    observer.observe(host, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
