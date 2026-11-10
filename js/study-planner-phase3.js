/* GCSE ONTRACK Phase 3 refinement
 * Adds subject/topic-specific study instructions, directly matched learning
 * links, and a strict availability-window scheduler without changing the
 * existing data model or deleting legacy/manual timetable entries.
 */
(() => {
  "use strict";

  const STORE_KEY = "gcoStudyPlanner_v1";
  const DAYS = [
    ["Mon", "Monday"], ["Tue", "Tuesday"], ["Wed", "Wednesday"],
    ["Thu", "Thursday"], ["Fri", "Friday"], ["Sat", "Saturday"], ["Sun", "Sunday"]
  ];
  const $ = id => document.getElementById(id);
  const clean = (value, max = 160) => String(value ?? "").trim().slice(0, max);
  const safeArray = value => Array.isArray(value) ? value : [];
  const makeId = prefix => `${prefix}_${window.crypto?.randomUUID ? window.crypto.randomUUID().replace(/-/g, "") : Date.now().toString(36) + Math.random().toString(36).slice(2, 10)}`;

  function readModel() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      parsed.subjects = safeArray(parsed.subjects);
      parsed.sessions = safeArray(parsed.sessions);
      return parsed;
    } catch (error) {
      console.error("GCSE ONTRACK could not read its study plan.", error);
      return null;
    }
  }

  function saveModel(model) {
    try {
      model.updatedAt = new Date().toISOString();
      localStorage.setItem(STORE_KEY, JSON.stringify(model));
      return true;
    } catch (error) {
      console.error("GCSE ONTRACK could not save its study plan.", error);
      return false;
    }
  }

  function setMessage(message, isError = false) {
    const host = $("planFormMessage");
    if (!host) return;
    host.textContent = message;
    host.classList.toggle("is-error", Boolean(isError));
  }

  function timeToMinutes(value) {
    const match = String(value || "").match(/^(\d{2}):(\d{2})$/);
    if (!match) return null;
    const h = Number(match[1]);
    const m = Number(match[2]);
    return h <= 23 && m <= 59 ? h * 60 + m : null;
  }

  function minutesToTime(value) {
    const n = Math.max(0, Math.min(1440, Number(value) || 0));
    return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  }

  function localDate() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function readSelectedSubjects() {
    const selected = [...document.querySelectorAll("#subjectChoices input[type=checkbox]:checked")]
      .map(input => clean(input.value, 60)).filter(Boolean);
    const subjects = [];
    for (const name of selected) {
      const topicField = [...document.querySelectorAll("[data-subject-topics]")].find(el => el.dataset.subjectTopics === name);
      const gradeField = [...document.querySelectorAll("[data-subject-grade]")].find(el => el.dataset.subjectGrade === name);
      const timeField = [...document.querySelectorAll("[data-subject-minutes]")].find(el => el.dataset.subjectMinutes === name);
      const boardField = [...document.querySelectorAll("[data-subject-board]")].find(el => el.dataset.subjectBoard === name);
      const topics = clean(topicField?.value, 700).split(/[;\n]+/).map(value => clean(value, 120)).filter(Boolean);
      if (!topics.length) throw new Error(`Add at least one topic for ${name}. Separate different topics with semicolons.`);
      const rawTarget = String(timeField?.value || "").trim();
      const weeklyMinutes = rawTarget === "" ? null : Number(rawTarget);
      if (rawTarget && (!Number.isInteger(weeklyMinutes) || weeklyMinutes < 15 || weeklyMinutes > 1800 || weeklyMinutes % 5 !== 0)) {
        throw new Error(`The weekly time target for ${name} must be 15–1,800 minutes in five-minute steps, or left blank.`);
      }
      const board = clean(boardField?.value, 40);
      subjects.push({
        id: makeId("subject"), name, topics,
        targetGrade: /^[1-9]$/.test(String(gradeField?.value || "")) ? String(gradeField.value) : "",
        weeklyMinutes,
        examBoard: ["AQA", "Pearson Edexcel", "OCR", "Eduqas", "WJEC", "CCEA", "Pearson BTEC"].includes(board) ? board : ""
      });
    }
    if (!subjects.length) throw new Error("Select at least one subject.");
    const names = subjects.map(item => item.name.toLowerCase());
    if (new Set(names).size !== names.length) throw new Error("A subject has been selected more than once. Remove the duplicate before continuing.");
    const hasScience = subjects.some(item => item.name.toLowerCase() === "science");
    const specificScience = subjects.some(item => ["biology", "chemistry", "physics"].includes(item.name.toLowerCase()));
    if (hasScience && specificScience) {
      const proceed = window.confirm("You selected both Science and a separate Biology, Chemistry or Physics subject. Keep both only if Science is a separate Combined Science course. Continue?");
      if (!proceed) throw new Error("Check the Science subject selection, then generate your plan again.");
    }
    return subjects;
  }

  function readAvailability() {
    const availability = {};
    let total = 0;
    for (const [day, label] of DAYS) {
      const windows = [1, 2].map(index => {
        const raw = String(document.querySelector(`[data-day-window-minutes="${day}-${index}"]`)?.value ?? "0").trim();
        const minutes = raw === "" ? 0 : Number(raw);
        const start = document.querySelector(`[data-day-window-start="${day}-${index}"]`)?.value || "";
        const startMinutes = timeToMinutes(start);
        if (!Number.isInteger(minutes) || minutes < 0 || minutes > 180 || minutes % 5 !== 0) {
          throw new Error(`${label}, Window ${index}: enter 0–180 minutes in five-minute steps.`);
        }
        if (minutes > 0 && (startMinutes === null || startMinutes + minutes > 1440)) {
          throw new Error(`${label}, Window ${index}: check the start time and duration. The window cannot run past midnight.`);
        }
        total += minutes;
        return { minutes, start };
      });
      const active = windows.filter(item => item.minutes > 0).sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
      if (active.reduce((sum, item) => sum + item.minutes, 0) > 180) {
        throw new Error(`${label}: the combined daily availability cannot exceed 180 minutes.`);
      }
      for (let i = 1; i < active.length; i += 1) {
        if (timeToMinutes(active[i].start) < timeToMinutes(active[i - 1].start) + active[i - 1].minutes) {
          throw new Error(`${label}: your two study windows overlap. Adjust one of the start times.`);
        }
      }
      availability[day] = { windows };
    }
    if (!total) throw new Error("Enter at least one available study window.");
    return { availability, total };
  }

  function allocateTargets(subjects, totalMinutes) {
    const fixed = subjects.filter(subject => Number(subject.weeklyMinutes) > 0);
    const flexible = subjects.filter(subject => !Number(subject.weeklyMinutes));
    const fixedTotal = fixed.reduce((sum, subject) => sum + Number(subject.weeklyMinutes), 0);
    if (fixedTotal > totalMinutes) throw new Error("Your subject time targets exceed your total available study time. Reduce the targets or add availability.");
    if (flexible.length && fixedTotal >= totalMinutes) throw new Error("There is no available time left for subjects without a weekly target. Adjust the allocations.");
    const shared = flexible.length ? Math.floor(((totalMinutes - fixedTotal) / flexible.length) / 5) * 5 : 0;
    if (flexible.length && shared < 5) throw new Error("There is not enough time to allocate at least five minutes to every untargeted subject. Reduce the number of subjects or add availability.");
    return subjects.map(subject => Number(subject.weeklyMinutes) || shared);
  }

  function topicTasks(subjectValue, topicValue, boardValue) {
    const rawSubject = clean(subjectValue, 60).toLowerCase();
    const t = clean(topicValue, 120).toLowerCase();
    // Combined Science is routed through the relevant discipline based on
    // the student's own topic, without silently renaming their saved subject.
    const s = rawSubject === "science"
      ? (/cell|organism|pathogen|photosynthesis|respiration|inheritance|ecology|homeostasis|enzyme|biology/.test(t) ? "biology"
        : /atom|bond|mole|chemical|acid|reaction|periodic|electrolysis|chemistry/.test(t) ? "chemistry"
        : /energy|electric|force|motion|wave|particle|radioactiv|magnet|physics|pressure/.test(t) ? "physics" : "science")
      : rawSubject;
    const board = clean(boardValue, 40);
    const suffix = board ? ` Keep the terminology and assessment style aligned to ${board}.` : " Use the terminology from your course specification.";

    if (/math/.test(s)) {
      if (/sequence|nth term/.test(t)) return [
        "Retrieve the first terms and first differences. Decide whether the pattern is linear or whether its differences change.",
        "Derive the nth-term rule. Test the rule at two term positions and explain how the coefficient and constant are obtained.",
        "Solve one routine and one unfamiliar sequence question. Show the algebra and substitute a term number to verify the rule.",
        "Mark each step, correct the first error and explain why the final rule works." + suffix
      ];
      if (/ratio|proportion|best buy|scale/.test(t)) return [
        "Retrieve the ratio relationship and identify what each quantity represents.",
        "Work through one model question. Identify the scale factor or equivalent ratio before calculating.",
        "Solve one direct and one contextual question. Include units and state the comparison the question asks for.",
        "Check the scale of the answer, correct any multiplier error and redo the hardest step without notes." + suffix
      ];
      if (/equation|simultaneous|quadratic|inequalit|factoris|expand/.test(t)) return [
        "Retrieve the algebraic rule and identify the inverse operation needed.",
        "Follow a worked example line by line. Keep the equation balanced and show each transformation.",
        "Solve one routine and one exam-style problem independently. Check by substitution or expansion.",
        "Find the first invalid algebraic step, correct it and complete a final question without notes." + suffix
      ];
      if (/trig|pythag|sine rule|cosine rule|circle theorem/.test(t)) return [
        "Sketch and label the diagram. Retrieve the theorem or formula and identify known and unknown values.",
        "Choose the correct method and rearrange the formula before substituting values.",
        "Complete a diagram-based question, showing substitution, calculator mode, units and appropriate rounding.",
        "Check the answer against the diagram and estimate. Correct any formula-selection or rounding error." + suffix
      ];
      return [
        "Write the key rule, formula or definition from memory and make one quick example.",
        "Study one worked example and explain why each step is valid. Note any condition or restriction.",
        "Try one routine and one unfamiliar question. Show all working and use correct notation.",
        "Mark the method, locate the first incorrect step and redo it without looking at the example." + suffix
      ];
    }

    if (/biology/.test(s)) {
      if (/cell|organelle|microscop|mitosis|cell division/.test(t)) return [
        "Draw and label the relevant cell or process from memory. Add the function of each named structure.",
        "Explain how the structures support the cell's function. Include adaptations and plant/animal differences where relevant.",
        "Answer a labelled-diagram, magnification or application question. Show calculations and units if required.",
        "Correct missing labels or inaccurate functions, then recreate the diagram or explanation from memory." + suffix
      ];
      if (/organisation|digest|enzyme|heart|blood|plant tissue/.test(t)) return [
        "Retrieve the relevant organs, tissues, enzymes or structures and state each role precisely.",
        "Build the process in the correct order. Explain how structure links to function using biological vocabulary.",
        "Apply the process to an unfamiliar diagram, data set or exam question. Explain cause and effect.",
        "Check the sequence and terminology, correct the weakest link and summarise the process unaided." + suffix
      ];
      if (/infection|pathogen|immune|disease|antibiotic|vaccin/.test(t)) return [
        "Classify the pathogen, transmission route or defence involved and retrieve one accurate example.",
        "Explain the mechanism in order: exposure, body response and outcome. Distinguish prevention from treatment.",
        "Apply the mechanism to a disease or treatment scenario and answer an explain question.",
        "Correct any confusion between pathogen type, immune response and treatment, then recall the chain unaided." + suffix
      ];
      if (/photosynthesis|respiration|bioenergetic|limiting factor/.test(t)) return [
        "Retrieve the word equation, location and conditions for the process.",
        "Explain how the process works and how the named variables affect its rate.",
        "Interpret a graph or practical result and explain a limiting factor or rate change.",
        "Check reactants, products and scientific vocabulary. Correct the explanation and retest it." + suffix
      ];
      if (/inheritance|genetic|variation|evolution|natural selection/.test(t)) return [
        "Retrieve the key genetic terms and distinguish genes, alleles, chromosomes and DNA.",
        "Explain the inheritance or selection process in a clear sequence, using accurate vocabulary.",
        "Interpret a genetic diagram, probability or selection scenario and show the reasoning.",
        "Correct any mix-up in terminology or probability and explain the process without notes." + suffix
      ];
      return [
        "Retrieve the key biological terms, structures and one relevant example from memory.",
        "Build a labelled process or cause-and-effect map. Link each term to its function or consequence.",
        "Apply the idea to a diagram, data set or unfamiliar organism and complete an exam-style question.",
        "Correct missing scientific detail and reproduce the explanation without notes." + suffix
      ];
    }

    if (/chemistry/.test(s)) {
      if (/atomic|periodic|isotope|electron|proton|neutron/.test(t)) return [
        "Retrieve subatomic particles, charges and relative masses. Sketch an atom or isotope notation.",
        "Work out proton, neutron and electron numbers. Connect electron arrangement to periodic-table patterns.",
        "Complete an isotope, electronic-structure or periodic-trend question and show the reasoning.",
        "Check particle counts and charges, correct the first error and explain the periodic pattern." + suffix
      ];
      if (/bond|structure|ionic|covalent|metallic/.test(t)) return [
        "Identify the bonding type and retrieve which particles are involved.",
        "Draw or describe the particle/electron model. Connect the structure to the substance's properties.",
        "Compare two substances or explain melting point/conductivity using the model.",
        "Correct any mix-up between particles, bonds and forces. Finish with a structure–property explanation." + suffix
      ];
      if (/quantitative|mole|mass|concentration|formula|titration/.test(t)) return [
        "Retrieve the relevant equation and define each symbol, quantity and unit.",
        "Set out the calculation route: convert units, rearrange if needed and substitute carefully.",
        "Complete one calculation and one exam-style application, showing every step.",
        "Check significant figures, units and equation choice. Redo the calculation if the units do not make sense." + suffix
      ];
      if (/rate|extent|equilibrium|collision/.test(t)) return [
        "Retrieve collision theory and identify the variables that affect rate or equilibrium.",
        "Explain the particle-level effect of the named variable. Distinguish reaction rate from equilibrium position.",
        "Interpret a rate graph or practical method using collision frequency and successful collisions.",
        "Check the explanation and identify the evidence needed for a fair conclusion." + suffix
      ];
      if (/chemical change|reactivity|electrolysis|acid|neutralis/.test(t)) return [
        "Retrieve the reactivity or reaction pattern and define the key chemical terms.",
        "Explain the particle or electron change. Write a balanced symbol equation where appropriate.",
        "Apply the pattern to an unfamiliar reaction or practical result. Include state symbols if required.",
        "Check atom/charge conservation, observations and the explanation of the result." + suffix
      ];
      return [
        "Retrieve definitions, symbols, formulae or the reaction pattern for the named topic.",
        "Explain the chemical model using particles, ions, electrons or bonds as appropriate.",
        "Complete an equation, practical-data or application question. Include conditions and units where required.",
        "Check atom/charge conservation and scientific terminology; correct the first error and retest." + suffix
      ];
    }

    if (/physics/.test(s)) {
      if (/energy|efficien|power|work done/.test(t)) return [
        "Retrieve energy stores, transfer pathways and the relevant equation.",
        "Trace energy transfer in a system. Explain conservation, dissipation and efficiency accurately.",
        "Solve an energy/power calculation or interpret a Sankey diagram or practical result.",
        "Check units, rearrangement and physical sense. Correct the first error and repeat the calculation." + suffix
      ];
      if (/electric|current|voltage|resistance|circuit/.test(t)) return [
        "Draw the circuit or retrieve the circuit rule. Identify current, potential difference and resistance.",
        "Explain series/parallel behaviour and select the correct equation for the circuit.",
        "Calculate an unknown quantity and interpret a circuit diagram or I–V graph, showing units.",
        "Check the circuit rule, equation and units. Explain why the result fits the diagram." + suffix
      ];
      if (/force|motion|velocity|acceleration|momentum|pressure/.test(t)) return [
        "Draw a force or motion diagram and retrieve the relevant equation and units.",
        "Explain the physical model: identify resultant force, direction and relationships between quantities.",
        "Solve a calculation or interpret a distance–time/velocity–time graph, showing each step.",
        "Check vector direction, gradient and units. Correct the first reasoning error." + suffix
      ];
      if (/wave|frequency|wavelength|sound|light/.test(t)) return [
        "Sketch and label the wave. Retrieve amplitude, wavelength, frequency and the relevant equation.",
        "Explain the property being studied and distinguish transverse from longitudinal features where relevant.",
        "Interpret a wave diagram or solve a speed/frequency/wavelength question with units.",
        "Check labels, equation choice and units. Explain the result precisely." + suffix
      ];
      if (/particle|density|specific heat|gas pressure|state change/.test(t)) return [
        "Draw the particle arrangement and retrieve the definitions for the state or property being studied.",
        "Explain changes in particle motion, spacing and energy using the particle model.",
        "Complete a density, specific heat capacity or gas-pressure question where relevant; show units.",
        "Check the model, equation and units, then explain the result using particle behaviour." + suffix
      ];
      return [
        "Retrieve the physical quantities, definitions, units and equation for the named topic.",
        "Explain the physical model and connect the variables to the topic focus.",
        "Work through a diagram, graph, practical or calculation question with clear working and units.",
        "Check the model and equation, correct the first error and repeat the key step from memory." + suffix
      ];
    }

    if (/history/.test(s)) {
      if (/health|medicine|disease|surgery|public health|nhs|medical/.test(t)) return [
        "Place the development in its period. Retrieve the relevant people, dates and conditions.",
        "Explain why change happened: knowledge, technology, individuals, government, communication or attitudes.",
        "Build a cause, consequence or change-and-continuity paragraph using precise historical evidence.",
        "Make a supported judgement about the most important factor and explain why the evidence supports it." + suffix
      ];
      if (/germany|weimar|nazi|hitler|dictator|stresemann/.test(t)) return [
        "Place the event or policy on a timeline and retrieve key people, dates and political/economic conditions.",
        "Explain links between conditions, decisions and consequences. Separate triggers from longer-term causes.",
        "Use precise evidence to explain significance or impact for a named group in Germany.",
        "Support a judgement with evidence and consider another factor or interpretation." + suffix
      ];
      if (/conflict|tension|versailles|league|appeasement|war|international/.test(t)) return [
        "Build a short chronology. Retrieve the countries, leaders, agreements and dates relevant to the question.",
        "Explain motives and consequences from more than one country's viewpoint. Separate event from significance.",
        "Answer a causation or significance question using specific evidence and linked explanation.",
        "Compare another factor and reach a justified judgement supported by evidence." + suffix
      ];
      if (/elizabeth|armada|mary queen|poverty|religious settlement|spanish/.test(t)) return [
        "Retrieve the key people, dates and challenges in Elizabethan England relevant to the topic.",
        "Explain the context: power, religion, society, exploration or foreign threats as appropriate.",
        "Use precise evidence to explain consequence, significance or the challenge facing Elizabeth.",
        "Reach a supported judgement and check that the evidence belongs to the correct period." + suffix
      ];
      return [
        "Retrieve a dated fact, a named person/group and a precise example for the topic.",
        "Place the evidence in context and explain causation, consequence, change, continuity or significance.",
        "Write one developed exam-style paragraph with evidence clearly linked to the question.",
        "Check chronology and factual precision. Add one missing piece of evidence and strengthen the explanation." + suffix
      ];
    }

    if (/business/.test(s)) {
      if (/cash ?flow|cashflow/.test(t)) return [
        "Define cash flow, inflows, outflows, net cash flow and closing balance. Distinguish cash flow from profit.",
        "Work through the forecast: net cash flow = inflows − outflows; closing balance = opening balance + net cash flow.",
        "Calculate a deficit/surplus period and recommend a suitable response for the business.",
        "Check every figure and explain one limitation of the proposed solution in context." + suffix
      ];
      if (/break.?even|contribution|margin of safety/.test(t)) return [
        "Retrieve fixed costs, variable costs, selling price, contribution and the break-even formula.",
        "Set up the calculation carefully, distinguishing per-unit figures from totals.",
        "Calculate break-even output or margin of safety, then interpret what the result means for the business.",
        "Check the arithmetic and explain one benefit and one limitation of break-even analysis." + suffix
      ];
      if (/market|promotion|price|place|product|customer/.test(t)) return [
        "Define the key marketing term and identify the target customer or market.",
        "Explain how the decision fits the target customer and other elements of the marketing mix.",
        "Apply the concept to a business scenario: decision → customer effect → business outcome.",
        "Evaluate an alternative and finish with a conditional judgement supported by the scenario." + suffix
      ];
      if (/finance|profit|revenue|cost|margin/.test(t)) return [
        "Retrieve the financial definitions and distinguish revenue, costs, profit and cash flow.",
        "Select the appropriate formula and identify which figures are totals and which are per unit.",
        "Complete a calculation and explain what the result means for the business decision.",
        "Check the calculation and evaluate one implication or limitation in the given context." + suffix
      ];
      return [
        "Recall the key definition, one advantage and one limitation for the topic.",
        "Explain how the business concept affects costs, revenue, employees or customers.",
        "Apply the concept to a short business context and develop a cause-and-effect chain.",
        "Evaluate an alternative and reach a justified judgement that depends on the business circumstances." + suffix
      ];
    }

    if (/english language/.test(s)) {
      if (/question ?2|\bq2\b|language analys/.test(t)) return [
        "Read only the lines named by the question. Select two or three precise words or phrases.",
        "Annotate connotations and methods. Explain what each choice suggests in this particular context.",
        "Write two developed points: short quotation → language choice → meaning → intended effect.",
        "Check that every point answers the focus and analyses the writer's choices, not just technique names." + suffix
      ];
      if (/structure|question ?3|\bq3\b/.test(t)) return [
        "Identify the opening focus, any shift in viewpoint or focus, and the ending.",
        "Track how the reader's attention moves through the extract and select structural choices.",
        "Explain the beginning-to-middle-to-end development using short evidence and reader effect.",
        "Check that you analysed whole-extract structure rather than listing language techniques." + suffix
      ];
      if (/evaluat|question ?4|\bq4\b/.test(t)) return [
        "Identify the statement you must evaluate and decide your overall position before writing.",
        "Select precise evidence and explain how it supports or challenges the statement.",
        "Develop two evaluative points with a clear judgement and close analysis of the source.",
        "Check that each paragraph evaluates the statement rather than summarising the extract." + suffix
      ];
      if (/creative|writing|question ?5|\bq5\b|descriptive|narrative/.test(t)) return [
        "Identify the task, audience and purpose. Plan a clear sequence and one deliberate structural choice.",
        "Choose precise vocabulary, varied sentence forms and a consistent viewpoint.",
        "Write a timed section with controlled paragraphs, accurate punctuation and deliberate language choices.",
        "Edit for clarity, accuracy and effect. Improve one sentence and one structural decision." + suffix
      ];
      return [
        "Identify the exact reading or writing skill being assessed and retrieve its success criteria.",
        "Study a short model and identify how its choices meet task, audience and purpose.",
        "Complete a timed practice section, using evidence for reading or deliberate structure for writing.",
        "Self-assess against the question focus and improve one specific feature." + suffix
      ];
    }

    if (/english literature|^english$/.test(s)) return [
      "Retrieve the central theme or character idea and select two short, accurate quotations from your studied text.",
      "Explore a writer's language, form or structure choice. Explain what it suggests and use context only where relevant.",
      "Build an analytical paragraph: argument → embedded evidence → close analysis → writer's idea.",
      "Check that the paragraph answers the question and develops an interpretation rather than retelling the plot." + suffix
    ];

    if (/\bit\b|digital information technology|computer science|computing/.test(s)) {
      if (/user interface|interface|design principle|wireframe|prototype/.test(t)) return [
        "Identify the user, purpose, platform and requirements. Retrieve the relevant interface-design principles.",
        "Evaluate how layout, navigation, consistency, accessibility and feedback support the stated user needs.",
        "Annotate or improve a screen/wireframe and justify each change against a specific requirement.",
        "Check that every design decision is justified by user needs and the assessment brief." + suffix
      ];
      if (/data|spreadsheet|database|information|interpret/.test(t)) return [
        "Define the data terms and distinguish raw data from meaningful information.",
        "Identify fields, data types, validation and the method used to collect or organise the data.",
        "Interpret a small data set or create an appropriate table/chart and explain what it shows.",
        "Check accuracy, suitability and privacy/security implications where relevant." + suffix
      ];
      if (/project|proposal|planning|requirement|stakeholder/.test(t)) return [
        "Identify the project purpose, user/client, stakeholders and the problem being addressed.",
        "Separate objectives, requirements, constraints and success criteria. Make each one testable.",
        "Produce or review a piece of project evidence and justify choices against the brief.",
        "Check traceability: show how the evidence meets the requirement and identify one improvement." + suffix
      ];
      return [
        "Identify the relevant component or learning outcome and retrieve its key terminology.",
        "Connect the concept to a realistic user, organisation or project brief. Identify requirements and constraints.",
        "Create, interpret or evaluate evidence relevant to the topic and justify choices against the brief.",
        "Check that the evidence meets the requirement and explain one improvement using qualification vocabulary." + suffix
      ];
    }

    return [
      `Retrieve the key terms and explain what they mean for ${clean(topic, 100)}.`,
      "Use the course specification or class notes to identify the essential concepts and one worked example.",
      "Complete a short application or exam-style task without copying a model answer.",
      "Check the answer, correct one gap and record what to retrieve in the next session." + suffix
    ];
  }

  function timedSteps(subject, topic, board, duration) {
    const tasks = topicTasks(subject, topic, board);
    const total = Math.max(5, Number(duration) || 25);
    if (total < 12) return [`${total} min — ${tasks[0]} Then answer one quick retrieval question and check it.`];
    const weights = total < 20 ? [0.45, 0.55] : [0.18, 0.27, 0.35, 0.20];
    const selected = total < 20 ? [tasks[0], tasks[2]] : tasks;
    const times = weights.map(weight => Math.floor(total * weight));
    let remaining = total - times.reduce((sum, value) => sum + value, 0);
    for (let i = 0; remaining > 0; i = (i + 1) % times.length) { times[i] += 1; remaining -= 1; }
    return selected.map((task, index) => `${times[index]} min — ${task}`);
  }

  const AQA_TOPIC_PAGES = {
    biology: [
      [["cell", "organelle", "microscopy", "mitosis", "cell division"], "Cell Biology", "cell-biology"],
      [["organisation", "digest", "enzyme", "heart", "blood", "plant tissue"], "Organisation", "organisation"],
      [["infection", "pathogen", "immune", "disease", "antibiotic", "vaccin"], "Infection and Response", "infection-and-response"],
      [["photosynthesis", "respiration", "bioenergetic", "limiting factor"], "Bioenergetics", "bioenergetics"],
      [["homeostasis", "nervous", "hormone", "kidney", "menstrual"], "Homeostasis and Response", "homeostasis-and-response"],
      [["inheritance", "genetic", "variation", "evolution", "natural selection"], "Inheritance, Variation and Evolution", "inheritance-variation-and-evolution"],
      [["ecology", "ecosystem", "food chain", "biodiversity", "decay"], "Ecology", "ecology"]
    ],
    chemistry: [
      [["atomic", "periodic", "isotope", "electron", "proton", "neutron"], "Atomic Structure and the Periodic Table", "atomic-structure-and-periodic-table"],
      [["bond", "structure", "ionic", "covalent", "metallic"], "Bonding, Structure and the Properties of Matter", "bonding-structure-properties-of-matter"],
      [["quantitative", "mole", "formula mass", "concentration", "titration"], "Quantitative Chemistry", "quantitative-chemistry"],
      [["chemical change", "reactivity", "electrolysis", "acid", "neutralisation"], "Chemical Changes", "chemical-changes"],
      [["energy change", "exothermic", "endothermic", "reaction profile"], "Energy Changes", "energy-changes"],
      [["rate", "equilibrium", "collision", "extent of chemical"], "The Rate and Extent of Chemical Change", "rate-and-extent-of-chemical-change"],
      [["organic", "alkane", "alkene", "polymer", "crude oil"], "Organic Chemistry", "organic-chemistry"],
      [["analysis", "chromatography", "gas test", "ion test"], "Chemical Analysis", "chemical-analysis"],
      [["atmosphere", "greenhouse", "climate"], "Chemistry of the Atmosphere", "chemistry-of-the-atmosphere"],
      [["resources", "sustainable", "life cycle", "potable water"], "Using Resources", "using-resources"]
    ],
    physics: [
      [["energy", "efficiency", "power", "work done"], "Energy", "energy"],
      [["electric", "current", "voltage", "resistance", "circuit"], "Electricity", "electricity"],
      [["particle", "density", "specific heat", "gas pressure", "state change"], "Particle Model of Matter", "particle-model-of-matter"],
      [["atomic", "radioactivity", "isotope", "nuclear", "fission", "fusion"], "Atomic Structure", "atomic-structure"],
      [["force", "motion", "velocity", "acceleration", "momentum", "pressure"], "Forces", "forces"],
      [["wave", "frequency", "wavelength", "sound", "light"], "Waves", "waves"],
      [["magnet", "electromagnet", "motor effect", "transformer"], "Magnetism and Electromagnetism", "magnetism-and-electromagnetism"],
      [["space", "star", "solar system", "orbital"], "Space Physics", "space-physics"]
    ]
  };

  function officialPastPaper(board, subject) {
    const urls = {
      "AQA": "https://www.aqa.org.uk/past-papers-and-mark-schemes-finder",
      "Pearson Edexcel": "https://qualifications.pearson.com/en/support/support-topics/exams/past-papers.html",
      "OCR": "https://www.ocr.org.uk/qualifications/past-paper-finder/",
      "Eduqas": "https://www.eduqas.co.uk/home/past-papers-and-mark-schemes/",
      "WJEC": "https://questionbank.resources.wjec.co.uk/",
      "CCEA": "https://apps.ccea.org.uk/pastpapers/"
    };
    const url = board === "Pearson BTEC"
      ? "https://qualifications.pearson.com/en/qualifications/btec-tech-awards/digital-information-technology-2022.html"
      : urls[board];
    if (!url) return null;
    return {
      role: "Official assessment materials",
      title: `${board} — ${subject} assessment materials`,
      url,
      match: "Official exam-board source",
      description: `Use the official ${board} assessment area after practising your topic. Select the exact ${subject} qualification and the correct specification or component. Recent papers may have access restrictions.`
    };
  }

  function topicResources(session) {
    const subject = clean(session.subject, 60);
    const topic = clean(session.topic, 120);
    const board = clean(session.examBoard || readModel()?.subjects.find(item => item.name === subject)?.examBoard, 40);
    const s = subject.toLowerCase();
    const t = topic.toLowerCase();
    const items = [];
    const add = (role, title, url, match, description) => {
      if (url && !items.some(item => item.url === url)) items.push({ role, title, url, match, description });
    };

    if (board === "AQA" && AQA_TOPIC_PAGES[s]) {
      const entry = AQA_TOPIC_PAGES[s].find(row => row[0].some(keyword => t.includes(keyword)));
      if (entry) {
        const root = `https://www.physicsandmathstutor.com/${s}-revision/gcse-aqa/${entry[2]}/`;
        add("Exact-topic revision and questions", `Physics & Maths Tutor — AQA GCSE ${subject}: ${entry[1]}`, root, "Exact topic page", `Direct AQA ${subject} page for ${entry[1]}. Open the subtopic that matches “${topic}” and use the notes, flashcards and topic questions. The page identifies the relevant paper.`);
      } else {
        add("AQA subject topic index", `Physics & Maths Tutor — AQA GCSE ${subject} topic list`, `https://www.physicsandmathstutor.com/${s}-revision/gcse-aqa/`, "AQA topic index", `Open the AQA ${subject} specification topic list and select the section that contains “${topic}”. Do not use material from a different topic.`);
      }
    }

    if (/math/.test(s)) {
      if ((board === "Pearson Edexcel" || board === "AQA") && /sequence|nth term/.test(t) && board === "Pearson Edexcel") {
        add("Exact-topic lesson and practice", "MathsGenie — Edexcel GCSE Maths: Sequences (Nth Term)", "https://mathsgenie.co.uk/gcse/maths/edexcel/grade-4-4-7-sequences-nth-term", "Exact topic page", `Direct Sequences (Nth Term) page: lessons, revision guides, flashcards and exam-style practice for ${topic}.`);
      } else if (board === "Pearson Edexcel" || board === "AQA") {
        const boardSlug = board === "Pearson Edexcel" ? "edexcel" : "aqa";
        const query = `site:mathsgenie.co.uk/gcse/maths/${boardSlug} GCSE Maths ${topic}`;
        add("Topic-specific lesson search", `MathsGenie — find ${topic}`, `https://www.google.com/search?q=${encodeURIComponent(query)}`, "Targeted topic search", `Searches MathsGenie's ${board} GCSE Maths pages for the exact topic “${topic}”. Check the page heading before using it.`);
      }
      if (board === "Pearson Edexcel") {
        add("Topic exam questions", "Physics & Maths Tutor — Edexcel GCSE Maths topic questions", "https://www.physicsandmathstutor.com/maths-revision/gcse-questions-edexcel/", "Edexcel question bank", `Choose the question set for “${topic}” and use the matching mark scheme only after attempting the questions.`);
      }
    }

    if (/history/.test(s) && board === "AQA") {
      if (/birth of the nhs|nhs|welfare state/.test(t)) {
        add("Exact-topic interactive module", "DoRevision — The Birth of the NHS (AQA History)", "https://dorevision.com/learn/birth-of-the-nhs", "Exact topic module", `Direct interactive module for “${topic}”: trace the poverty studies, Liberal reforms, Beveridge Report and creation of the NHS, then practise the explanation.`);
      } else if (/elizabethan.*poverty|poverty.*elizabethan/.test(t)) {
        add("Exact-topic interactive module", "DoRevision — Elizabethan Poverty (AQA History)", "https://dorevision.com/learn/elizabethan-poverty", "Exact topic module", `Direct interactive module for “${topic}”: revise the causes of poverty, contemporary attitudes and the Poor Law of 1601, then practise explaining and judging the response.`);
      } else if (/rise of the nazis|nazi rise/.test(t)) {
        add("Exact-topic interactive module", "DoRevision — The Rise of the Nazis (AQA History)", "https://dorevision.com/learn/rise-of-the-nazis", "Exact topic module", `Direct interactive module for “${topic}”: order the events, explain the Depression's impact and test the reasons for Nazi electoral growth.`);
      } else {
        add("Specification-matched topic modules", "DoRevision — AQA GCSE History (8145)", "https://dorevision.com/revise/aqa/gcse/history-8145", "AQA course topic index", `This AQA History course lists modules across the four 8145 studies. Choose the module whose title matches “${topic}”; then test the knowledge with an AQA paper.`);
      }
    }

    if (/business/.test(s)) {
      if (board === "Pearson Edexcel" && /cash ?flow|cashflow/.test(t)) {
        add("Exact-topic interactive module", "DoRevision — Cash and Cash-Flow (Edexcel Business)", "https://dorevision.com/learn/cash-flow-edexcel", "Exact topic module", `Direct Edexcel Business module for “${topic}”: distinguish cash from profit, calculate net cash flow and complete a cash-flow forecast.`);
      } else if (board === "Pearson Edexcel" && /break.?even|contribution|margin of safety/.test(t)) {
        add("Exact-topic interactive module", "DoRevision — Calculating Break-Even (Edexcel Business)", "https://dorevision.com/learn/calculating-break-even", "Exact topic module", `Direct Edexcel Business module for “${topic}”: calculate contribution, break-even output and margin of safety, then interpret the result.`);
      } else if (board === "Pearson Edexcel") {
        add("Specification-matched interactive modules", "DoRevision — Edexcel GCSE Business (1BS0)", "https://dorevision.com/revise/edexcel/gcse/business", "Edexcel course topic index", `Open the Edexcel Business module that matches “${topic}”, then apply the concept to a business scenario and evaluate the outcome.`);
      } else if (board === "AQA") {
        add("Specification-matched interactive modules", "DoRevision — AQA GCSE Business (8132)", "https://dorevision.com/revise/aqa/gcse/business", "AQA course topic index", `Select the AQA Business module for “${topic}” and practise applying it to a business context.`);
      }
    }

    if (/english language/.test(s) && board === "AQA") {
      if (/question ?2|\bq2\b|language|effect|word choice|imagery/.test(t)) {
        add("Exact-skill interactive practice", "DoRevision — Language & Effect (AQA English Language Q2)", "https://dorevision.com/learn/language-and-effect", "Exact question-skill module", `Direct Q2 module for “${topic}”: practise precise word/phrase selection, method identification and explaining the effect on the reader.`);
      } else {
        add("Specification-matched reading and writing", "DoRevision — AQA GCSE English Language (8700)", "https://dorevision.com/revise/aqa/gcse/english-language", "AQA course topic index", `Select the reading or writing activity that matches “${topic}”. Finish by practising the corresponding AQA question.`);
      }
    }
    if (/english literature/.test(s) && board === "AQA") {
      if (/macbeth|shakespeare|extract analysis|ao2/.test(t)) {
        add("Text-specific interactive practice", "DoRevision — Extract Explorer: Shakespeare (AQA Literature)", "https://dorevision.com/learn/extract-explorer-shakespeare", "Shakespeare text-skill module", `Direct Shakespeare analysis module for “${topic}”: practise building an argument, analysing methods and integrating relevant context. Check it against the exact play and extract studied in class.`);
      } else if (/context|ao3/.test(t)) {
        add("Exact-skill interactive practice", "DoRevision — Context in Context (AQA Literature)", "https://dorevision.com/learn/context-in-context", "Exact assessment-skill module", `Practise selecting context that genuinely strengthens an interpretation of “${topic}”, rather than adding unrelated historical facts.`);
      } else {
        add("Specification-matched literature modules", "DoRevision — AQA GCSE English Literature (8702)", "https://dorevision.com/revise/aqa/gcse/english-literature", "AQA course topic index", `Select the studied text, poem or analytical skill related to “${topic}”. Check that the text matches your school's set-text choice before using the quotations or examples.`);
      }
    }
    if ((/\bit\b|digital information technology/.test(s)) && board === "Pearson BTEC") {
      add("Official qualification resources", "Pearson BTEC Tech Award — Digital Information Technology (2022)", "https://qualifications.pearson.com/en/qualifications/btec-tech-awards/digital-information-technology-2022.html", "Qualification-specific page", `Check the component and learning outcome that contains “${topic}”. Use this only if your school teaches the 2022 BTEC Tech Award in Digital Information Technology.`);
      add("Official specification", "Pearson — BTEC Digital Information Technology specification", "https://qualifications.pearson.com/content/dam/pdf/btec-tec-awards/information-technology/2022/specification-and-sample-assessments/btec-tech-award-digital-information-technology-spec.pdf", "Official specification PDF", `Find the section for “${topic}” and check the learning outcome and assessment criteria. Your teacher's current assignment brief takes priority for internally assessed work.`);
    }

    // A topic-targeted search is safer than sending students to a generic homepage
    // when the exact exam-board page is not mapped yet.
    if (!items.length) {
      const query = `GCSE ${board} ${subject} "${topic}" revision notes lesson questions`;
      add("Find the exact topic page", `Search ${subject} — ${topic}`, `https://www.google.com/search?q=${encodeURIComponent(query)}`, "Exact subject/topic search", `Search uses your subject, exam board and exact topic. Check the qualification and topic heading before using a result.`);
    }

    const paper = officialPastPaper(board, subject);
    if (paper && items.length < 3 && !items.some(item => item.url === paper.url)) items.push(paper);
    return { subject, topic, board, items: items.slice(0, 3) };
  }

  function makeElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function addRecommendedToLibrary(item, session, button) {
    if (typeof window.getCollection !== "function" || typeof window.setCollection !== "function") {
      button.textContent = "Open Resource Library to save";
      return;
    }
    try {
      const resources = window.getCollection("resources");
      const existing = resources.find(row => row && row.url === item.url && !row.deleted);
      const tag = clean(session.topic, 100);
      if (existing) {
        const tags = String(existing.tag || "").split(";").map(value => value.trim()).filter(Boolean);
        if (tag && !tags.some(value => value.toLowerCase() === tag.toLowerCase())) tags.push(tag);
        existing.tag = tags.join("; ").slice(0, 100);
        if (session.subject && existing.subject !== session.subject) {
          existing.relatedSubjects = [...new Set([...safeArray(existing.relatedSubjects), session.subject])].slice(0, 20);
        }
        const note = `Also recommended for ${session.subject}: ${session.topic}.`;
        if (!String(existing.note || "").includes(note)) existing.note = `${String(existing.note || "").trim()} ${note}`.trim().slice(0, 1200);
        window.setCollection("resources", resources);
      } else {
        const entry = {
          id: typeof window.uid === "function" ? window.uid("res") : makeId("res"),
          shortId: Math.random().toString(36).slice(2, 8).toUpperCase(),
          title: `${session.subject}: ${session.topic} — ${item.role}`.slice(0, 140),
          url: item.url,
          subject: session.subject || "General",
          tag: tag || "GCSE revision",
          note: `Recommended for ${session.subject}: ${session.topic}. Resource type: ${item.role}. Match: ${item.match}. Exam board: ${session.examBoard || "not set"}. Check the exact qualification and topic before using the material.`,
          priority: "Medium", rating: 3, favourite: false, pinned: false,
          archived: false, deleted: false, deletedDate: null, clicks: 0,
          created: Date.now(), lastEdited: null, lastOpened: null
        };
        window.setCollection("resources", [entry, ...resources]);
      }
      button.textContent = "✓ Saved to Resource Library";
      button.disabled = true;
    } catch (error) {
      console.error("Could not save topic recommendation.", error);
      button.textContent = "Could not save — try Resource Library";
    }
  }

  function appendTopicResources(card, session) {
    const data = topicResources(session);
    const details = makeElement("details", "session-resources phase3-topic-resources");
    details.appendChild(makeElement("summary", "", "📚 Resources matched to this topic"));
    details.appendChild(makeElement("p", "field-hint", `Focus: ${data.subject} · ${data.topic}${data.board ? ` · ${data.board}` : " · exam board not set"}`));
    const list = makeElement("div", "session-resource-list");
    data.items.forEach(item => {
      const resource = makeElement("div", "session-resource-item phase3-resource-item");
      resource.appendChild(makeElement("span", "resource-role", item.role));
      resource.appendChild(makeElement("span", "phase3-resource-match", item.match));
      const link = makeElement("a", "session-resource-link", item.title);
      link.href = item.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      resource.appendChild(link);
      resource.appendChild(makeElement("p", "muted", item.description));
      const save = makeElement("button", "btn secondary small", "＋ Save to Resource Library");
      save.type = "button";
      save.addEventListener("click", () => addRecommendedToLibrary(item, session, save));
      resource.appendChild(save);
      list.appendChild(resource);
    });
    details.appendChild(list);
    details.appendChild(makeElement("p", "resource-disclaimer", "GCSE ONTRACK links to external providers. Check the exact course, topic and specification; access conditions and topic coverage can change."));
    const actions = card.querySelector(".session-actions");
    if (actions) card.insertBefore(details, actions);
    else card.appendChild(details);
  }

  const DAY_LABEL_TO_ID = Object.fromEntries(DAYS.map(([id, label]) => [label, id]));
  function enhanceTimetableCards() {
    const model = readModel();
    if (!model) return;
    let changed = false;
    document.querySelectorAll(".timetable-session-card").forEach(card => {
      if (card.classList.contains("kind-break")) return;
      const heading = card.querySelector(":scope > h3");
      const time = card.querySelector(".session-time")?.textContent || "";
      const dayLabel = card.closest(".timetable-day")?.querySelector(".timetable-day-heading h3")?.textContent?.trim();
      const day = DAY_LABEL_TO_ID[dayLabel];
      const start = timeToMinutes(time.split(/[–-]/)[0]?.trim());
      let session = model.sessions.find(item => item.day === day && item.startMinutes === start && item.kind !== "break");
      if (!session && heading) {
        const title = heading.textContent.trim();
        session = model.sessions.find(item => item.day === day && `${item.subject} — ${item.topic}` === title && item.kind !== "break");
      }
      if (!session) return;
      const subjectSettings = model.subjects.find(item => item.name === session.subject);
      session.examBoard = subjectSettings ? (subjectSettings.examBoard || "") : (session.examBoard || "");
      const renderKey = [session.id, session.durationMinutes, session.subject, session.topic, session.examBoard].join("|");
      if (card.dataset.phase3Key === renderKey) return;
      const steps = timedSteps(session.subject, session.topic, session.examBoard, session.durationMinutes);
      if (JSON.stringify(session.steps || []) !== JSON.stringify(steps)) {
        session.steps = steps;
        changed = true;
      }
      card.querySelectorAll(".session-steps, .session-resources").forEach(node => node.remove());
      const details = makeElement("details", "session-steps phase3-session-steps");
      details.appendChild(makeElement("summary", "", "How to study this topic"));
      details.appendChild(makeElement("p", "phase3-focus-line", `${session.subject} · ${session.topic}${session.examBoard ? ` · ${session.examBoard}` : ""}`));
      const list = makeElement("ol");
      steps.forEach(step => list.appendChild(makeElement("li", "", step)));
      details.appendChild(list);
      const actions = card.querySelector(".session-actions");
      if (actions) card.insertBefore(details, actions); else card.appendChild(details);
      appendTopicResources(card, session);
      card.dataset.phase3Key = renderKey;
    });
    if (changed) saveModel(model);
  }

  function readPlanMode() {
    const mode = document.querySelector('input[name="planMode"]:checked')?.value === "exam" ? "exam" : "weekly";
    const examDate = mode === "exam" ? $("examDate")?.value || "" : "";
    if (mode === "exam" && !examDate) throw new Error("Choose the exam date before generating an exam-preparation plan.");
    if (mode === "exam" && examDate < localDate()) throw new Error("Choose today or a future exam date.");
    return { mode, examDate };
  }

  function buildSessions(subjects, availability, totalAvailableMinutes, sessionLength, breakMinutes, existingSessions) {
    const targets = allocateTargets(subjects, totalAvailableMinutes);
    const assigned = subjects.map(() => 0);
    const nextSessions = safeArray(existingSessions).filter(session => session.source !== "generated");
    let generatedCount = 0;
    let studyMinutes = 0;
    let breakTime = 0;
    const now = new Date().toISOString();

    for (const [day, dayLabel] of DAYS) {
      const windows = availability[day].windows
        .map((window, index) => ({ ...window, index }))
        .filter(window => window.minutes > 0)
        .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

      for (const window of windows) {
        const windowStart = timeToMinutes(window.start);
        const windowEnd = windowStart + window.minutes;
        const preExisting = nextSessions.find(item => item.day === day &&
          item.startMinutes < windowEnd && item.startMinutes + item.durationMinutes > windowStart);
        if (preExisting) {
          throw new Error(`${dayLabel} Window ${window.index + 1} overlaps an existing ${preExisting.kind === "break" ? "break" : "timetable session"} at ${minutesToTime(preExisting.startMinutes)}. Move that block or adjust this availability window. No new plan has been saved.`);
        }

        // Each window gets its own cursor and remaining-time budget. There is
        // deliberately no carry-over from one window into a later window.
        let remaining = window.minutes;
        let cursor = windowStart;
        let breakDue = false;
        while (remaining >= 5) {
          const eligible = subjects.map((subject, index) => ({
            subject, index, left: targets[index] - assigned[index]
          })).filter(item => item.left >= 5);
          if (!eligible.length) break;

          if (breakDue && breakMinutes > 0 && remaining >= breakMinutes + 5) {
            nextSessions.push({
              id: makeId("break"), day, startMinutes: cursor, durationMinutes: breakMinutes,
              kind: "break", subject: "", examBoard: "", topic: "Short rest", title: "Short break",
              status: "planned", source: "generated", steps: [], createdAt: now, completedAt: ""
            });
            cursor += breakMinutes;
            remaining -= breakMinutes;
            breakTime += breakMinutes;
            breakDue = false;
          }

          let chosen = eligible[0];
          let bestRatio = Infinity;
          for (let index = 0; index < subjects.length; index += 1) {
            const left = targets[index] - assigned[index];
            if (left < 5) continue;
            const ratio = assigned[index] / Math.max(1, targets[index]);
            if (ratio < bestRatio) {
              bestRatio = ratio;
              chosen = { subject: subjects[index], index, left };
            }
          }

          // A task can be shorter than the preferred duration, but can never
          // cross the end of its current availability window.
          const duration = Math.floor(Math.min(sessionLength, remaining, chosen.left) / 5) * 5;
          if (duration < 5) break;
          const overlap = nextSessions.find(item => item.day === day &&
            cursor < item.startMinutes + item.durationMinutes &&
            cursor + duration > item.startMinutes);
          if (overlap) {
            throw new Error(`${dayLabel} Window ${window.index + 1} would overlap an existing block at ${minutesToTime(overlap.startMinutes)}. No new plan has been saved.`);
          }

          const subject = chosen.subject;
          const topicIndex = Math.floor(assigned[chosen.index] / Math.max(5, sessionLength)) % subject.topics.length;
          const topic = subject.topics[topicIndex];
          const examBoard = subject.examBoard || "";
          nextSessions.push({
            id: makeId("session"), day, startMinutes: cursor, durationMinutes: duration,
            kind: "study", subject: subject.name, examBoard, topic,
            title: `${subject.name} — ${topic}`, status: "planned", source: "generated",
            steps: timedSteps(subject.name, topic, examBoard, duration), createdAt: now, completedAt: ""
          });
          assigned[chosen.index] += duration;
          studyMinutes += duration;
          generatedCount += 1;
          cursor += duration;
          remaining -= duration;
          breakDue = true;
        }
      }
    }

    if (!generatedCount) throw new Error("There is not enough unallocated time to create a study task. Increase a window or adjust subject targets.");
    const allInsideWindows = nextSessions.filter(session => session.source === "generated").every(session => {
      const window = availability[session.day]?.windows?.find(item => {
        const start = timeToMinutes(item.start);
        return item.minutes > 0 && session.startMinutes >= start &&
          session.startMinutes + session.durationMinutes <= start + item.minutes;
      });
      return Boolean(window);
    });
    if (!allInsideWindows) throw new Error("A generated session would cross an availability boundary. Nothing has been saved; adjust the windows and try again.");
    return { sessions: nextSessions, generatedCount, studyMinutes, breakTime };
  }

  function generatePlan(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    setMessage("");
    try {
      const model = readModel();
      if (!model) throw new Error("The saved planner data could not be read. Refresh the page and try again; no existing data has been changed.");
      const subjects = readSelectedSubjects();
      const { mode, examDate } = readPlanMode();
      const availabilityData = readAvailability();
      const sessionLength = Number($("sessionLength")?.value);
      if (!Number.isInteger(sessionLength) || sessionLength < 15 || sessionLength > 90 || sessionLength % 5 !== 0) {
        throw new Error("Choose a preferred session length from 15 to 90 minutes in five-minute steps.");
      }
      const breakMinutes = Number($("breakLength")?.value ?? 5);
      if (![0, 5, 10, 15].includes(breakMinutes)) throw new Error("Choose a break length of 0, 5, 10 or 15 minutes.");
      const scheduled = buildSessions(
        subjects,
        availabilityData.availability,
        availabilityData.total,
        sessionLength,
        breakMinutes,
        model.sessions
      );
      const generatedCount = scheduled.generatedCount;
      const studyMinutes = scheduled.studyMinutes;
      const breakTime = scheduled.breakTime;
      model.version = 2;
      model.mode = mode;
      model.examDate = examDate;
      model.subjects = subjects;
      model.sessionLength = sessionLength;
      model.breakMinutes = breakMinutes;
      model.availability = availabilityData.availability;
      model.sessions = scheduled.sessions;
      model.planCreatedAt = new Date().toISOString();
      if (!saveModel(model)) throw new Error("The browser could not save the new plan. Your previous plan has not been intentionally cleared; check available browser storage and try again.");
      const unused = Math.max(0, availabilityData.total - studyMinutes - breakTime);
      setMessage(`${generatedCount} topic-focused sessions created · ${studyMinutes} study minutes · ${unused} available minutes left free. Each separate study window was scheduled independently. Reloading your saved timetable…`);
      window.setTimeout(() => window.location.reload(), 450);
    } catch (error) {
      setMessage(error.message || "The plan could not be generated. Check your entries and try again.", true);
    }
  }

  if (window.__GCO_PHASE3_TEST_MODE__ === true) {
    window.GCOPhase3Test = { buildSessions, timedSteps, topicResources };
  }

  function install() {
    const form = $("studyPlanForm");
    if (form && !form.dataset.phase3Bound) {
      // Capture phase runs before the original form-level submit handler.
      document.addEventListener("submit", event => {
        if (event.target === form) generatePlan(event);
      }, true);
      form.dataset.phase3Bound = "true";
    }
    const manualDuration = $("manualDuration");
    if (manualDuration) {
      [5, 10].forEach(value => {
        if (![...manualDuration.options].some(option => Number(option.value) === value)) {
          const option = document.createElement("option");
          option.value = String(value);
          option.textContent = `${value} minutes`;
          manualDuration.insertBefore(option, manualDuration.firstChild);
        }
      });
    }
    const schedule = $("weeklySchedule");
    if (schedule && !schedule.dataset.phase3Observer) {
      const observer = new MutationObserver(() => {
        enhanceTimetableCards();
        schedule.querySelectorAll(".move-session-form").forEach(form => {
          const selects = form.querySelectorAll("select");
          const durationSelect = selects[1];
          if (!durationSelect) return;
          [5, 10].forEach(value => {
            if (![...durationSelect.options].some(option => Number(option.value) === value)) {
              const option = document.createElement("option");
              option.value = String(value);
              option.textContent = `${value} minutes`;
              durationSelect.insertBefore(option, durationSelect.firstChild);
            }
          });
          const text = form.closest(".timetable-session-card")?.querySelector(".session-duration")?.textContent || "";
          const match = text.match(/^(\d+) minutes/);
          if (match && [5, 10].includes(Number(match[1]))) durationSelect.value = match[1];
        });
      });
      observer.observe(schedule, { childList: true, subtree: true });
      schedule.dataset.phase3Observer = "true";
      enhanceTimetableCards();
    }
  }

  document.addEventListener("DOMContentLoaded", install, { once: true });
  // Also support a script inserted after DOMContentLoaded on the static pages.
  if (document.readyState !== "loading") install();
})();
