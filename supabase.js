(function (g) {
  function cfg() {
    if (!g.VocaConfig?.SUPABASE_URL || !g.VocaConfig?.SUPABASE_ANON_KEY) {
      throw new Error("VocaConfig 누락 — config.js의 SUPABASE_URL/ANON_KEY를 채워주세요.");
    }
    return g.VocaConfig;
  }

  async function rpc(fnName, body, accessToken) {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = cfg();
    const headers = {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    };
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body || {}),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Supabase RPC ${fnName} ${res.status}: ${text}`);
    }
    return text ? JSON.parse(text) : null;
  }

  function buildAuthorizeUrl(redirectTo, provider) {
    const { SUPABASE_URL } = cfg();
    const params = new URLSearchParams({
      provider: provider || "google",
      redirect_to: redirectTo,
    });
    return `${SUPABASE_URL}/auth/v1/authorize?${params}`;
  }

  async function refreshSession(refreshToken) {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = cfg();
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`refresh failed ${res.status}: ${text}`);
    }
    return res.json();
  }

  async function fetchUser(accessToken) {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = cfg();
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY,
      },
    });
    if (!res.ok) throw new Error(`user fetch failed: ${res.status}`);
    return res.json();
  }

  async function logout(accessToken) {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = cfg();
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: SUPABASE_ANON_KEY,
        },
      });
    } catch (_) {}
  }

  g.VocaSupabase = { rpc, buildAuthorizeUrl, refreshSession, fetchUser, logout };
})(typeof self !== "undefined" ? self : this);
