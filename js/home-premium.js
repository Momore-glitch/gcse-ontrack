/* GCSE OnTrack — Homepage Premium card. Keeps page-specific billing logic off Home. */
(() => {
  "use strict";
  document.addEventListener("DOMContentLoaded", async () => {
    const text = document.getElementById("premiumCardText");
    const button = document.getElementById("premiumHomeBtn");
    if (!text || !button) return;

    const freeCopy = "Premium adds the revision evidence tracker, structured study sessions and mistake logging on top of the free planning tools.";
    text.textContent = freeCopy;
    button.textContent = "Explore Premium →";
    button.href = "subscription.html";

    const client = window.supabaseClient;
    if (!client?.auth) return;
    try {
      const { data, error } = await client.auth.getSession();
      if (error || !data?.session) return;
      const result = await client.from("subscriptions")
        .select("status")
        .eq("user_id", data.session.user.id)
        .maybeSingle();
      if (result.error) throw result.error;
      if (result.data && ["active", "trialing"].includes(result.data.status)) {
        text.textContent = "Premium is active. Log paper scores, spot topics to revisit and plan your next focused session.";
        button.textContent = "Open Premium tools →";
        button.href = "premium-tracker.html";
      }
    } catch (error) {
      // Keep the useful default CTA visible if status cannot be checked.
      console.error("Homepage Premium status check failed:", error);
    }
  });
})();
