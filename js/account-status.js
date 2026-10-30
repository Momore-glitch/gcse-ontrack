/* GCSE OnTrack — Global account status, brand navigation and homepage feature card. */
(() => {
  "use strict";

  // Load the shared feedback UI and stylesheet where this script is present.
  try {
    const ownScript = document.currentScript;
    const siteRoot = new URL("../", ownScript && ownScript.src ? ownScript.src : location.href);

    if (!document.querySelector("[data-gco-engagement-css]")) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = new URL("css/site-engagement.css", siteRoot).href;
      css.dataset.gcoEngagementCss = "true";
      document.head.append(css);
    }

    if (!document.querySelector("[data-gco-engagement-script]")) {
      const js = document.createElement("script");
      js.src = new URL("js/site-engagement.js", siteRoot).href;
      js.dataset.gcoEngagementScript = "true";
      document.body.append(js);
    }
  } catch (error) {
    console.warn("GCSE OnTrack shared engagement tools could not load.");
  }

  function addMissionNavigation() {
    const nav = document.querySelector(".container nav, nav[aria-label='Main navigation']");
    if (!nav || nav.querySelector('a[href="mission.html"]')) return;

    const link = document.createElement("a");
    link.href = "mission.html";
    link.textContent = "🎯 Mission";
    link.title = "Build a focused revision session";
    nav.append(link);
  }

  function addHomepageMissionCard() {
    const isHome = location.pathname.endsWith("/") || location.pathname.endsWith("/index.html");
    if (!isHome) return;

    const grid = document.querySelector("main .grid.grid3");
    if (!grid || grid.querySelector('a[href="mission.html"]')) return;

    const card = document.createElement("a");
    card.className = "card feature-card gco-mission-card";
    card.href = "mission.html";

    const icon = document.createElement("span");
    icon.className = "feature-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "🎯";

    const heading = document.createElement("h3");
    heading.textContent = "Revision Mission";

    const description = document.createElement("p");
    description.textContent =
      "Turn one topic into a focused, timed study session with clear steps and a saved completion record.";

    card.append(icon, heading, description);
    grid.append(card);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    addMissionNavigation();
    addHomepageMissionCard();

    const accountLink = document.querySelector('a[href="account.html"]');
    if (!accountLink) return;

    if (!window.supabaseClient || !window.supabaseClient.auth) {
      accountLink.textContent = "👤 Account";
      return;
    }

    try {
      const { data, error } = await window.supabaseClient.auth.getSession();

      if (error || !data.session) {
        accountLink.textContent = "👤 Sign In";
        accountLink.href = "account.html";
        return;
      }

      const email = data.session.user.email || "Account";
      accountLink.textContent = `👤 ${email}`;
      accountLink.title = `Signed in as ${email}`;

      const prompt = document.getElementById("accountPrompt");
      if (prompt) {
        prompt.hidden = true;
        prompt.style.display = "none";
      }
    } catch (error) {
      console.warn("GCSE OnTrack account status could not be checked.");
    }
  });
})();
