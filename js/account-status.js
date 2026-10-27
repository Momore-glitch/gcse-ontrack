/* GCSE OnTrack — Global Account Status + shared engagement tools loader */
(() => {
  "use strict";

  // Load shared feedback/analytics UI on pages that include this global script.
  // Requires the SQL in supabase/engagement.sql.
  try {
    const ownScript = document.currentScript;
    const base = new URL(
      "../",
      ownScript && ownScript.src ? ownScript.src : location.href
    );

    if (
      !document.querySelector(
        'link[data-gco-engagement-css], link[href*=' +
          JSON.stringify("site-engagement.css") +
          "]"
      )
    ) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = new URL("css/site-engagement.css", base).href;
      css.dataset.gcoEngagementCss = "true";
      document.head.append(css);
    }

    if (!document.querySelector("script[data-gco-engagement-script]")) {
      const js = document.createElement("script");
      js.src = new URL("js/site-engagement.js", base).href;
      js.dataset.gcoEngagementScript = "true";
      document.body.append(js);
    }
  } catch (error) {
    console.warn("GCSE OnTrack engagement tools could not load.");
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const accountLink = document.querySelector('a[href="account.html"]');

    if (!accountLink) return;

    if (
      !window.supabaseClient ||
      !window.supabaseClient.auth
    ) {
      accountLink.textContent = "👤 Account";
      return;
    }

    const { data, error } =
      await window.supabaseClient.auth.getSession();

    if (error || !data.session) {
      accountLink.textContent = "👤 Sign In";
      accountLink.href = "account.html";
      return;
    }

    const email = data.session.user.email || "Account";

    accountLink.textContent = `👤 ${email}`;
    accountLink.title = `Signed in as ${email}`;

    const accountPrompt = document.getElementById("accountPrompt");

    if (accountPrompt) {
      accountPrompt.hidden = true;
      accountPrompt.style.display = "none";
    }
  });
})();
