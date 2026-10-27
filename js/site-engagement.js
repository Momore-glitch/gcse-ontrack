/* GCSE OnTrack — privacy-conscious engagement analytics + user feedback.
   Requires js/supabase.js to have initialised window.supabaseClient.
   Analytics is opt-in; feedback is available whether analytics is accepted or declined.
*/
(() => {
  "use strict";

  if (window.__gcoEngagementLoaded) return;
  window.__gcoEngagementLoaded = true;

  const CONSENT_KEY = "gcoAnalyticsConsent_v1";
  const VISITOR_KEY = "gcoAnalyticsVisitor_v1";
  const LAST_SEEN_KEY = "gcoAnalyticsLastSeen_v1";

  const $ = (tag, props = {}, text = "") => {
    const el = document.createElement(tag);

    Object.entries(props).forEach(([key, value]) => {
      if (key === "className") {
        el.className = value;
      } else if (key === "textContent") {
        el.textContent = value;
      } else {
        el.setAttribute(key, value);
      }
    });

    if (text) el.textContent = text;

    return el;
  };

  const safePath = () =>
    (location.pathname.split("/").pop() || "index.html").slice(0, 100);

  const makeId = () => {
    try {
      return crypto.randomUUID();
    } catch {
      return (
        "gco_" +
        Date.now().toString(36) +
        "_" +
        Math.random().toString(36).slice(2, 16)
      );
    }
  };

  const getOrCreate = (key) => {
    try {
      let value = localStorage.getItem(key);

      if (!value) {
        value = makeId();
        localStorage.setItem(key, value);
      }

      return value;
    } catch {
      return makeId();
    }
  };

  // Do not create persistent analytics IDs until the visitor opts in.
  const getVisitorId = () => getOrCreate(VISITOR_KEY);

  const getSessionId = () => {
    try {
      let value = sessionStorage.getItem("gcoAnalyticsSession_v1");

      if (!value) {
        value = makeId();
        sessionStorage.setItem("gcoAnalyticsSession_v1", value);
      }

      return value;
    } catch {
      return makeId();
    }
  };

  const consentValue = () => {
    try {
      return localStorage.getItem(CONSENT_KEY) || "unset";
    } catch {
      return "unset";
    }
  };

  const client = () =>
    window.supabaseClient &&
    typeof window.supabaseClient.from === "function"
      ? window.supabaseClient
      : null;

  let sessionStartSent = false;
  let fiveMinuteSent = false;
  let visibleSeconds = 0;
  let lastTick = Date.now();

  async function track(eventName, metadata = {}) {
    if (consentValue() !== "yes") return;

    const db = client();
    if (!db) return;

    const event = {
      event_name: eventName,
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      page_path: safePath(),
      metadata:
        metadata && typeof metadata === "object"
          ? metadata
          : {}
    };

    try {
      const { error } = await db
        .from("site_events")
        .insert(event);

      if (error) {
        console.info("GCSE OnTrack analytics is not configured yet.");
      }
    } catch (error) {
      console.info("GCSE OnTrack analytics is not configured yet.");
    }
  }

  window.gcoTrack = track;

  // Track successful account actions from existing account.js messages.
  const accountMessage = document.getElementById("accountMessage");

  if (accountMessage && typeof MutationObserver === "function") {
    let lastTrackedMessage = "";

    new MutationObserver(() => {
      const message = (accountMessage.textContent || "").trim();

      if (!message || message === lastTrackedMessage) return;

      lastTrackedMessage = message;

      if (message.includes("Account created")) {
        track("signup_success");
      } else if (message.includes("You're signed in")) {
        track("login_success");
      }
    }).observe(accountMessage, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function recordVisit() {
    if (consentValue() !== "yes") return;

    track("page_view");

    if (!sessionStartSent) {
      sessionStartSent = true;

      let alreadyLogged = false;
      const sessionId = getSessionId();

      try {
        alreadyLogged =
          sessionStorage.getItem("gcoSessionStartLogged_v1") ===
          sessionId;
      } catch {
        /* no-op */
      }

      if (!alreadyLogged) {
        try {
          sessionStorage.setItem(
            "gcoSessionStartLogged_v1",
            sessionId
          );
        } catch {
          /* no-op */
        }

        track("session_start");
      }
    }

    try {
      const previous = Number(
        localStorage.getItem(LAST_SEEN_KEY) || 0
      );

      const now = Date.now();

      if (previous && now - previous >= 24 * 60 * 60 * 1000) {
        track("return_visit", {
          days_since_last_visit: Math.floor(
            (now - previous) / 86400000
          )
        });
      }

      localStorage.setItem(LAST_SEEN_KEY, String(now));
    } catch {
      /* Storage may be disabled; continue without persistence. */
    }
  }

  // Count visible time only. Report one engaged_5m event per page session.
  document.addEventListener("visibilitychange", () => {
    lastTick = Date.now();
  });

  window.setInterval(() => {
    const now = Date.now();

    if (!document.hidden) {
      visibleSeconds += Math.max(
        0,
        Math.min(5, (now - lastTick) / 1000)
      );
    }

    lastTick = now;

    if (
      visibleSeconds >= 300 &&
      !fiveMinuteSent &&
      consentValue() === "yes"
    ) {
      fiveMinuteSent = true;

      track("engaged_5m", {
        visible_seconds: Math.floor(visibleSeconds)
      });
    }
  }, 5000);

  const consentBanner = () => {
    if (consentValue() !== "unset") return;

    const banner = $("section", {
      className: "gco-consent",
      role: "dialog",
      "aria-label": "Anonymous analytics choice"
    });

    const copy = $("div", {
      className: "gco-consent-copy"
    });

    copy.append(
      $("strong", {}, "Help improve GCSE OnTrack")
    );

    copy.append(
      $("p", {},
        "You can allow anonymous usage statistics to help us understand which pages are useful and whether students return. We do not send your email, revision notes or resource contents. You can decline and still use the site."
      )
    );

    const actions = $("div", {
      className: "gco-consent-actions"
    });

    const allow = $("button", {
      type: "button",
      className: "btn",
      textContent: "Allow analytics"
    });

    const decline = $("button", {
      type: "button",
      className: "btn secondary",
      textContent: "No thanks"
    });

    const close = (choice) => {
      try {
        localStorage.setItem(CONSENT_KEY, choice);
      } catch {
        /* Continue for this page. */
      }

      banner.remove();

      if (choice === "yes") {
        recordVisit();
      }
    };

    allow.addEventListener("click", () => close("yes"));
    decline.addEventListener("click", () => close("no"));

    actions.append(allow, decline);
    banner.append(copy, actions);

    document.body.append(banner);
  };

  function feedbackUI() {
    const launcher = $("button", {
      type: "button",
      className: "gco-feedback-launcher",
      "aria-haspopup": "dialog",
      "aria-controls": "gcoFeedbackDialog"
    }, "Feedback");

    const shade = $("div", {
      className: "gco-modal-shade",
      id: "gcoFeedbackDialog",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "gcoFeedbackTitle",
      hidden: ""
    });

    const panel = $("section", {
      className: "gco-feedback-panel"
    });

    const top = $("div", {
      className: "gco-feedback-top"
    });

    const heading = $("h2", {
      id: "gcoFeedbackTitle"
    }, "Help us improve OnTrack");

    const close = $("button", {
      type: "button",
      className: "gco-modal-close",
      "aria-label": "Close feedback form"
    }, "×");

    close.addEventListener("click", () => {
      shade.hidden = true;
      launcher.focus();
    });

    top.append(heading, close);

    const intro = $("p", {
      className: "muted"
    },
      "Tell us what worked, what was confusing, or what you wish the site could do. Please do not include personal or sensitive information."
    );

    const form = $("form", {
      id: "gcoFeedbackForm"
    });

    const categoryLabel = $("label", {
      for: "gcoFeedbackCategory"
    }, "Feedback type");

    const category = $("select", {
      id: "gcoFeedbackCategory",
      required: ""
    });

    [
      ["suggestion", "Suggestion"],
      ["problem", "Something isn't working"],
      ["confusing", "Something is confusing"],
      ["praise", "Something I like"],
      ["other", "Other"]
    ].forEach(([value, label]) => {
      category.append($("option", { value }, label));
    });

    const ratingLabel = $("label", {
      for: "gcoFeedbackRating"
    }, "How useful is GCSE OnTrack so far? (optional)");

    const rating = $("select", {
      id: "gcoFeedbackRating"
    });

    rating.append(
      $("option", { value: "" }, "Choose a rating")
    );

    [1, 2, 3, 4, 5].forEach(n => {
      rating.append(
        $("option", { value: String(n) }, `${n} / 5`)
      );
    });

    const messageLabel = $("label", {
      for: "gcoFeedbackMessage"
    }, "Your feedback");

    const message = $("textarea", {
      id: "gcoFeedbackMessage",
      rows: "5",
      maxlength: "1000",
      required: "",
      placeholder: "What should we improve? (1000 characters max)"
    });

    const submit = $("button", {
      type: "submit",
      className: "btn"
    }, "Send feedback");

    const status = $("p", {
      className: "gco-feedback-status",
      role: "status",
      "aria-live": "polite"
    });

    form.append(
      categoryLabel,
      category,
      ratingLabel,
      rating,
      messageLabel,
      message,
      submit,
      status
    );

    form.addEventListener("submit", async event => {
      event.preventDefault();

      const value = message.value.trim();

      if (value.length < 4) {
        status.textContent = "Please enter a little more detail.";
        return;
      }

      const db = client();

      if (!db) {
        status.textContent =
          "Feedback is temporarily unavailable. Please try again later.";
        return;
      }

      submit.disabled = true;
      status.textContent = "Sending…";

      try {
        const payload = {
          category: category.value,
          rating: rating.value ? Number(rating.value) : null,
          message: value,
          page_path: safePath()
        };

        const { error } = await db
          .from("site_feedback")
          .insert(payload);

        if (error) throw error;

        status.textContent =
          "Thank you — your feedback has been sent.";

        message.value = "";

        if (typeof window.gcoTrack === "function") {
          track("feedback_submitted", {
            category: category.value
          });
        }

        window.setTimeout(() => {
          shade.hidden = true;
        }, 1200);
      } catch (error) {
        status.textContent =
          "We couldn't send that right now. Please try again later.";
      } finally {
        submit.disabled = false;
      }
    });

    panel.append(top, intro, form);
    shade.append(panel);

    launcher.addEventListener("click", () => {
      shade.hidden = false;
      message.focus();
    });

    shade.addEventListener("click", event => {
      if (event.target === shade) {
        shade.hidden = true;
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !shade.hidden) {
        shade.hidden = true;
      }
    });

    document.body.append(launcher, shade);
  }

  function preferenceLink() {
    const link = $("button", {
      type: "button",
      className: "gco-privacy-link"
    }, "Analytics settings");

    link.addEventListener("click", () => {
      let choice = "no";

      try {
        choice = localStorage.getItem(CONSENT_KEY) || "unset";
      } catch {
        /* no-op */
      }

      const next = window.confirm(
        "Allow anonymous GCSE OnTrack usage analytics? Choose OK to allow, or Cancel to decline."
      );

      try {
        localStorage.setItem(CONSENT_KEY, next ? "yes" : "no");
      } catch {
        /* no-op */
      }

      if (next && choice !== "yes") {
        recordVisit();
      }

      if (!next) {
        // Future events stop because track checks consent each time.
      }
    });

    document.body.append(link);
  }

  function init() {
    if (consentValue() === "yes") {
      recordVisit();
    } else {
      consentBanner();
    }

    feedbackUI();
    preferenceLink();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
      once: true
    });
  } else {
    init();
  }
})();
