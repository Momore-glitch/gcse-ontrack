/* GCSE ONTRACK — Study Planner quick-start availability preset.
 * Adds an optional starter week without changing the planner data model.
 * The student reviews and edits the times before generating a plan.
 */
(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  const STARTER_WEEK = [
    { day: "Mon", active: true, first: "16:00", second: "19:00" },
    { day: "Tue", active: true, first: "16:00", second: "19:00" },
    { day: "Wed", active: true, first: "16:00", second: "19:00" },
    { day: "Thu", active: true, first: "16:00", second: "19:00" },
    { day: "Fri", active: true, first: "16:00", second: "19:00" },
    { day: "Sat", active: true, first: "10:00", second: "14:00" },
    { day: "Sun", active: false, first: "10:00", second: "14:00" }
  ];

  function setField(selector, value) {
    const field = document.querySelector(selector);
    if (field) field.value = String(value);
  }

  function applyStarterWeek() {
    STARTER_WEEK.forEach(day => {
      setField(
        `[data-day-window-minutes="${day.day}-1"]`,
        day.active ? 25 : 0
      );
      setField(
        `[data-day-window-start="${day.day}-1"]`,
        day.first
      );
      setField(
        `[data-day-window-minutes="${day.day}-2"]`,
        0
      );
      setField(
        `[data-day-window-start="${day.day}-2"]`,
        day.second
      );
    });

    const status = $("availabilityPresetMessage");
    if (status) {
      status.textContent =
        "Starter week filled: 25 minutes Monday–Saturday, with Sunday free. Review or change any day before generating.";
    }

    const formMessage = $("planFormMessage");
    if (formMessage) {
      formMessage.textContent = "";
      formMessage.classList.remove("is-error");
    }
  }

  function addStarterWeekControl() {
    const list = document.querySelector(".availability-list");
    if (!list || $("applyStarterWeekPreset")) return;

    const panel = document.createElement("div");
    panel.className = "availability-explainer availability-quick-start";

    const button = document.createElement("button");
    button.type = "button";
    button.id = "applyStarterWeekPreset";
    button.className = "btn secondary small";
    button.textContent = "Use a simple starter week";
    button.addEventListener("click", applyStarterWeek);

    const explanation = document.createElement("p");
    explanation.className = "field-hint";
    explanation.textContent =
      "Optional: fills one 25-minute window from Monday to Saturday and leaves Sunday free. Applying it replaces the current availability values; every time and duration remains editable.";

    const status = document.createElement("p");
    status.id = "availabilityPresetMessage";
    status.className = "field-hint";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    panel.append(button, explanation, status);

    const existingNote = list.querySelector(".availability-explainer");
    if (existingNote) {
      existingNote.insertAdjacentElement("afterend", panel);
    } else {
      list.prepend(panel);
    }
  }

  function install() {
    if (!$("studyPlanForm")) return;
    addStarterWeekControl();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
