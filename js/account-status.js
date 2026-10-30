/* GCSE OnTrack — Global brand loading, engagement UI and account status. */
(() => {
  "use strict";

  const ownScript = document.currentScript;
  const siteRoot = new URL(
    "../",
    ownScript && ownScript.src ? ownScript.src : new URL("./", location.href)
  );

  // Load engagement CSS before the brand theme.
  // The brand theme must be LAST to override legacy blue styles.
  try {
    if (!document.querySelector("link[data-gco-engagement-css]")) {
      const engagementCss = document.createElement("link");
      engagementCss.rel = "stylesheet";
      engagementCss.href = new URL(
        "css/site-engagement.css",
        siteRoot
      ).href;
      engagementCss.dataset.gcoEngagementCss = "true";
      document.head.append(engagementCss);
    }

    // Move an existing brand link to the end, or create one.
    const existingBrandLink = document.querySelector(
      'link[data-gco-brand-theme], link[rel="stylesheet"][href*="brand-theme.css"]'
    );

    const brandLink = existingBrandLink ||
      document.createElement("link");

    brandLink.rel = "stylesheet";
    brandLink.href = new URL(
      "css/brand-theme.css?v=20261030-4",
      siteRoot
    ).href;

    brandLink.dataset.gcoBrandTheme = "true";
    document.head.append(brandLink);

    // Match floating controls and special page elements to the gold theme.
    if (!document.querySelector("style[data-gco-brand-polish]")) {
      const polish = document.createElement("style");
      polish.dataset.gcoBrandPolish = "true";

      polish.textContent = `
        .gco-feedback-launcher {
          color: #211f1b !important;
          background: #d0a13c !important;
          border: 1px solid #c59628 !important;
          box-shadow: 0 8px 24px rgba(153,111,23,.20) !important;
        }

        .gco-feedback-launcher:hover {
          background: #e0b957 !important;
        }

        .gco-privacy-link {
          color: #72520f !important;
          background: #fffdf8 !important;
          border-color: #e3d8bf !important;
        }

        .gco-consent {
          border-color: #dfd0a9 !important;
          background: #fffdf8 !important;
        }

        .gco-consent-copy p {
          color: #696a6c !important;
        }

        .resource-intro .badge {
          color: #72520f !important;
          background: #f2e8cf !important;
        }

        .lesson-thumb {
          background: #eee6d2 !important;
        }

        #ttGrid .ttHead {
          color: #202329 !important;
          background: #eee6d2 !important;
          border-color: #e5dfd2 !important;
        }

        #ttGrid .ttTime {
          color: #805e18 !important;
          background: #faf7ef !important;
          border-color: #e5dfd2 !important;
        }

        #ttGrid .ttCell {
          background: #fffefa !important;
          border-color: #e5dfd2 !important;
        }

        #ttGrid .ttBlock {
          color: #211f1b !important;
          background: #f2e8cf !important;
        }

        #ttGrid .ttBlock small {
          color: #62532f !important;
        }
      `;

      document.head.append(polish);
    }

    // Load shared feedback and analytics.
    if (!document.querySelector("script[data-gco-engagement-script]")) {
      const engagementScript = document.createElement("script");
      engagementScript.src = new URL(
        "js/site-engagement.js",
        siteRoot
      ).href;
      engagementScript.dataset.gcoEngagementScript = "true";
      document.body.append(engagementScript);
    }

  } catch (error) {
    console.warn(
      "GCSE OnTrack shared styling or engagement tools could not load."
    );
  }

  function addMissionNavigation() {
    const nav = document.querySelector(
      ".container nav, nav[aria-label='Main navigation']"
    );

    if (!nav || nav.querySelector('a[href="mission.html"]')) return;

    const link = document.createElement("a");
    link.href = "mission.html";
    link.textContent = "🎯 Mission";
    link.title = "Build a focused revision session";

    nav.append(link);
  }

  function addHomepageMissionCard() {
    const isHome =
      location.pathname.endsWith("/") ||
      location.pathname.endsWith("/index.html");

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

  async function updateAccountStatus() {
    addMissionNavigation();
    addHomepageMissionCard();

    const accountLink = document.querySelector(
      'a[href="account.html"]'
    );

    if (!accountLink) return;

    if (!window.supabaseClient || !window.supabaseClient.auth) {
      accountLink.textContent = "👤 Account";
      return;
    }

    try {
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

      const prompt = document.getElementById("accountPrompt");

      if (prompt) {
        prompt.hidden = true;
        prompt.style.display = "none";
      }

    } catch (error) {
      console.warn(
        "GCSE OnTrack account status could not be checked."
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      updateAccountStatus,
      { once: true }
    );
  } else {
    updateAccountStatus();
  }

})();
