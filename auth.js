(function (g) {
  const SESSION_KEY = "voca_session";
  const REFRESH_BUFFER_SEC = 60;

  async function getSession() {
    const result = await chrome.storage.local.get(SESSION_KEY);
    return result[SESSION_KEY] || null;
  }

  async function setSession(session) {
    await chrome.storage.local.set({ [SESSION_KEY]: session });
  }

  async function clearSession() {
    await chrome.storage.local.remove(SESSION_KEY);
  }

  function isExpired(session) {
    if (!session?.expires_at) return true;
    return session.expires_at <= Math.floor(Date.now() / 1000) + REFRESH_BUFFER_SEC;
  }

  async function getValidAccessToken() {
    const session = await getSession();
    if (!session) return null;

    if (!isExpired(session)) return session.access_token;

    if (!session.refresh_token) {
      await clearSession();
      return null;
    }

    try {
      const fresh = await g.VocaSupabase.refreshSession(session.refresh_token);
      const newSession = {
        access_token: fresh.access_token,
        refresh_token: fresh.refresh_token,
        expires_at:
          Math.floor(Date.now() / 1000) + (fresh.expires_in || 3600),
        user: fresh.user || session.user,
      };
      await setSession(newSession);
      return newSession.access_token;
    } catch (e) {
      await clearSession();
      return null;
    }
  }

  function parseFragment(redirectUrl) {
    const hashIndex = redirectUrl.indexOf("#");
    if (hashIndex < 0) return null;
    return new URLSearchParams(redirectUrl.slice(hashIndex + 1));
  }

  const SUPPORTED_PROVIDERS = new Set(["google"]);

  function signInWithProvider(provider) {
    const normalized = (provider || "google").toLowerCase();
    if (!SUPPORTED_PROVIDERS.has(normalized)) {
      return Promise.reject(new Error(`지원하지 않는 provider: ${provider}`));
    }
    return new Promise((resolve, reject) => {
      let redirectURL;
      try {
        redirectURL = chrome.identity.getRedirectURL();
      } catch (e) {
        reject(new Error("identity API 사용 불가: " + e.message));
        return;
      }
      const authURL = g.VocaSupabase.buildAuthorizeUrl(redirectURL, normalized);

      chrome.identity.launchWebAuthFlow(
        { url: authURL, interactive: true },
        async (responseURL) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!responseURL) {
            reject(new Error("로그인이 취소되었습니다."));
            return;
          }

          const params = parseFragment(responseURL);
          if (!params) {
            reject(new Error("응답에 토큰 fragment 없음"));
            return;
          }

          const errorDesc = params.get("error_description");
          if (errorDesc) {
            reject(new Error(errorDesc));
            return;
          }

          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          const expiresIn = parseInt(params.get("expires_in") || "3600", 10);

          if (!accessToken) {
            reject(new Error("토큰을 받지 못했습니다."));
            return;
          }

          try {
            const user = await g.VocaSupabase.fetchUser(accessToken);
            const session = {
              access_token: accessToken,
              refresh_token: refreshToken,
              expires_at: Math.floor(Date.now() / 1000) + expiresIn,
              user,
            };
            await setSession(session);
            resolve(session);
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  }

  async function signOut() {
    const session = await getSession();
    if (session?.access_token) {
      await g.VocaSupabase.logout(session.access_token);
    }
    await clearSession();
  }

  g.VocaAuth = {
    getSession,
    getValidAccessToken,
    signInWithProvider,
    signOut,
    clearSession,
  };
})(typeof self !== "undefined" ? self : this);
