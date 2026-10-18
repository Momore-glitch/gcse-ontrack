/* Show Premium insights only after checking the signed-in user's subscription. */
(() => {
  "use strict";
  document.addEventListener("DOMContentLoaded", async () => {
    const locked = document.getElementById("premiumInsightsLocked");
    const insights = document.getElementById("premiumStudyInsights");
    if (!locked || !insights) return;

    // Default to locked so Premium-only statistics are never briefly shown to free users.
    locked.hidden = false;
    insights.hidden = true;

    try {
      if (typeof window.isPremiumUser !== "function") return;
      const isPremium = await window.isPremiumUser();
      locked.hidden = isPremium;
      insights.hidden = !isPremium;
    } catch (error) {
      console.error("Could not verify Premium insights access:", error);
      locked.hidden = false;
      insights.hidden = true;
    }
  });
})();
