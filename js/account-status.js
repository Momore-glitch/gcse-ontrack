/* GCSE ONTRACK — global brand loading, engagement UI and account status.
 * Revision Mission is no longer injected as a separate destination: focused
 * sessions are now part of the connected Study Planner and timetable.
 */
(() => {
  "use strict";

  const ownScript = document.currentScript;
  const siteRoot = new URL(
    "../",
    ownScript && ownScript.src ? ownScript.src : new URL("./", location.href)
  );

  try {
    if (!document.querySelector("link[data-gco-engagement-css]")) {
      const engagementCss = document.createElement("link");
      engagementCss.rel = "stylesheet";
      engagementCss.href = new URL("css/site-engagement.css", siteRoot).href;
      engagementCss.dataset.gcoEngagementCss = "true";
      document.head.append(engagementCss);
    }

    const existingBrandLink = document.querySelector(
      'link[data-gco-brand-theme], link[rel="stylesheet"][href*="brand-theme.css"]'
    );
    const brandLink = existingBrandLink || document.createElement("link");
    brandLink.rel = "stylesheet";
    brandLink.href = new URL("css/brand-theme.css?v=20261101-study-planner", siteRoot).href;
    brandLink.dataset.gcoBrandTheme = "true";
    document.head.append(brandLink);

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
        .gco-feedback-launcher:hover { background: #e0b957 !important; }
        .gco-privacy-link {
          color: #72520f !important;
          background: #fffdf8 !important;
          border-color: #e3d8bf !important;
        }
        .gco-consent { border-color: #dfd0a9 !important; background: #fffdf8 !important; }
        .gco-consent-copy p { color: #696a6c !important; }
        .resource-intro .badge { color: #72520f !important; background: #f2e8cf !important; }
        .lesson-thumb { background: #eee6d2 !important; }
        #ttGrid .ttHead { color: #202329 !important; background: #eee6d2 !important; border-color: #e5dfd2 !important; }
        #ttGrid .ttTime { color: #805e18 !important; background: #faf7ef !important; border-color: #e5dfd2 !important; }
        #ttGrid .ttCell { background: #fffefa !important; border-color: #e5dfd2 !important; }
        #ttGrid .ttBlock { color: #211f1b !important; background: #f2e8cf !important; }
        #ttGrid .ttBlock small { color: #62532f !important; }
      `;
      document.head.append(polish);
    }

    if (!document.querySelector("script[data-gco-engagement-script]")) {
      const engagementScript = document.createElement("script");
      engagementScript.src = new URL("js/site-engagement.js", siteRoot).href;
      engagementScript.dataset.gcoEngagementScript = "true";
      document.body.append(engagementScript);
    }
  } catch (error) {
    console.warn("GCSE ONTRACK shared styling or engagement tools could not load.");
  }

  async function updateAccountStatus() {
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
      console.warn("GCSE ONTRACK account status could not be checked.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateAccountStatus, { once: true });
  } else {
    updateAccountStatus();
  }
})();
