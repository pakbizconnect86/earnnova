// MineNova AdProvider abstraction
// -----------------------------------------------------------------------------
// RULES OF THIS MODULE
//  * A "rewarded ad" is ONLY an ad from a provider that natively supports rewarded
//    video on the web AND reports a real completion callback.
//  * Banners, popunders, direct links and page visits are NEVER rewarded ads.
//  * The client can NOT mark an ad as completed. Completion is written to Firestore
//    (status "Completed", verification "ServerVerified") only by a trusted backend
//    or an admin — Firestore rules block users from doing it themselves.
//  * If no real rewarded provider is registered/available, availability is false and
//    the UI shows: "No rewarded ad is currently available."
// -----------------------------------------------------------------------------
(function (global) {
  const NO_AD_MESSAGE = 'No rewarded ad is currently available.';
  const providers = {};

  // Default provider: intentionally does nothing. Never fakes a completion.
  const NullProvider = {
    name: 'none',
    supportsRewarded: false,
    async initialize() { return true; },
    async getAdAvailability() { return { available: false, reason: NO_AD_MESSAGE }; },
    async showRewardedAd() { return { completed: false, error: 'no-provider' }; }
  };
  providers.none = NullProvider;

  let active = NullProvider;
  let settings = {};
  const settledSessions = new Set(); // guards against duplicate provider callbacks

  const AdProvider = {
    NO_AD_MESSAGE,

    // Register a real provider adapter. It must implement:
    //   name, supportsRewarded (true), initialize(settings),
    //   getAdAvailability() -> {available, reason?},
    //   showRewardedAd(adSessionId) -> Promise<{completed:boolean, providerToken?:string}>
    register(name, impl) { providers[name] = impl; },

    get activeName() { return active.name; },

    async initialize(s) {
      settings = s || {};
      const wanted = providers[settings.adProvider];
      active = (wanted && wanted.supportsRewarded === true) ? wanted : NullProvider;
      try {
        await active.initialize(settings);
      } catch (err) {
        console.warn('AdProvider.initialize failed, falling back to none:', err);
        active = NullProvider;
      }
      return active.name;
    },

    async getAdAvailability() {
      try {
        const res = await active.getAdAvailability();
        return res && res.available === true ? res : { available: false, reason: (res && res.reason) || NO_AD_MESSAGE };
      } catch (err) {
        return { available: false, reason: NO_AD_MESSAGE };
      }
    },

    // Shows a real rewarded ad. Resolves at most ONCE per adSessionId.
    async showRewardedAd(adSessionId) {
      if (settledSessions.has(adSessionId)) return { completed: false, error: 'duplicate-callback' };
      let result;
      try {
        result = await active.showRewardedAd(adSessionId);
      } catch (err) {
        result = { completed: false, error: 'provider-error' };
      }
      if (result && result.completed === true) {
        if (settledSessions.has(adSessionId)) return { completed: false, error: 'duplicate-callback' };
        settledSessions.add(adSessionId);
      }
      return result || { completed: false, error: 'no-result' };
    },

    // Asks the trusted backend (settings.adVerifyEndpoint) to verify the completion with the
    // provider and write "ServerVerified" into Firestore. The client never sets that itself.
    async verifyReward(adSessionId, providerToken) {
      if (!settings.adVerifyEndpoint) return { verified: false, reason: 'no-verifier-configured' };
      try {
        const user = firebase.auth().currentUser;
        const idToken = user ? await user.getIdToken() : '';
        const res = await fetch(settings.adVerifyEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
          body: JSON.stringify({ adSessionId, providerToken: providerToken || null, provider: active.name })
        });
        if (!res.ok) return { verified: false, reason: 'verifier-rejected' };
        const data = await res.json();
        return { verified: data && data.verified === true };
      } catch (err) {
        return { verified: false, reason: 'verifier-unreachable' };
      }
    }
  };

  global.AdProvider = AdProvider;
})(window);
