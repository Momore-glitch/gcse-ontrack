/* GCSE OnTrack — Premium access */
(function () {
  "use strict";

  window.isPremiumUser = async function () {
    if (!window.supabaseClient) return false;

    try {
      const {
        data: { session }
      } = await window.supabaseClient.auth.getSession();

      if (!session) return false;

      const { data, error } = await window.supabaseClient
        .from("subscriptions")
        .select("status,current_period_end,cancel_at_period_end")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error("Premium check failed:", error);
        return false;
      }

      if (!data) return false;

      return ["active", "trialing"].includes(data.status);
    } catch (error) {
      console.error("Premium check error:", error);
      return false;
    }
  };
})();
