importScripts("config.js", "supabase.js", "auth.js");

const NAVER_ENDPOINT =
  "https://en.dict.naver.com/api3/enko/search?m=mobile&lang=ko&query=";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const action = message?.action;

  if (action === "lookup") {
    handleLookup(message, sendResponse);
    return true;
  }

  if (action === "auth.getSession") {
    self.VocaAuth.getSession().then((session) => {
      sendResponse({ ok: true, session });
    });
    return true;
  }

  if (action === "auth.signIn") {
    self.VocaAuth.signInWithProvider(message.provider)
      .then((session) => sendResponse({ ok: true, session }))
      .catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }

  if (action === "auth.signOut") {
    self.VocaAuth.signOut().then(() => sendResponse({ ok: true }));
    return true;
  }

  if (action === "vocab.add") {
    handleAdd(message, sendResponse);
    return true;
  }

  return false;
});

function handleLookup(message, sendResponse) {
  const word = encodeURIComponent(String(message.word || "").trim());
  if (!word) {
    sendResponse({ ok: false, error: "empty word" });
    return;
  }
  fetch(NAVER_ENDPOINT + word, { method: "GET" })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => sendResponse({ ok: true, data }))
    .catch((err) => sendResponse({ ok: false, error: err.message }));
}

async function handleAdd(message, sendResponse) {
  try {
    const accessToken = await self.VocaAuth.getValidAccessToken();
    if (!accessToken) {
      sendResponse({ ok: false, error: "not_signed_in" });
      return;
    }

    const result = await self.VocaSupabase.rpc(
      "add_word_to_vocab",
      {
        p_lemma: message.lemma,
        p_snapshot: message.snapshot,
        p_source_url: message.sourceUrl || null,
        p_context_sentence: message.contextSentence || null,
      },
      accessToken
    );

    const row = Array.isArray(result) ? result[0] : result;
    sendResponse({
      ok: true,
      userWordId: row?.user_word_id || null,
      wasNew: !!row?.was_new,
    });
  } catch (e) {
    sendResponse({ ok: false, error: e.message });
  }
}
