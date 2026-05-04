(() => {
  const POPUP_HOST_ID = "voca-extension-popup-host";
  const POPUP_WIDTH = 360;
  const EDGE_PADDING = 12;
  const VERTICAL_OFFSET = 18;
  const DRAG_THRESHOLD_PX = 8;
  const DBLCLICK_GAP_MS = 400;
  const MAX_WORDS = 5;

  let cssText = "";
  fetch(chrome.runtime.getURL("popup.css"))
    .then((r) => r.text())
    .then((t) => (cssText = t))
    .catch(() => {});

  function removePopup() {
    const host = document.getElementById(POPUP_HOST_ID);
    if (host) host.remove();
  }

  function mountPopup(html, anchorEvent) {
    removePopup();

    const host = document.createElement("div");
    host.id = POPUP_HOST_ID;
    host.style.all = "initial";
    host.style.position = "absolute";
    host.style.zIndex = "2147483647";
    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = cssText;
    shadow.appendChild(style);

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    shadow.appendChild(wrapper);

    document.body.appendChild(host);

    positionHost(host, anchorEvent);
    stopEventPropagation(host);
    return shadow;
  }

  function sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve(response || { ok: false, error: "no response" });
      });
    });
  }

  function extractUser(session) {
    if (!session?.user) return null;
    const u = session.user;
    const appMeta = u.app_metadata || {};
    return {
      email: u.email || "",
      provider: appMeta.provider || "",
    };
  }

  function getContextSentence() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const node = sel.anchorNode;
    if (!node) return null;
    const block = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    if (!block) return null;
    const text = (block.textContent || "").trim();
    if (!text) return null;
    return text.length > 280 ? text.slice(0, 280) + "…" : text;
  }

  function positionHost(host, e) {
    const popupEl = host.shadowRoot.querySelector(".voca-popup");
    const popupHeight = popupEl ? popupEl.offsetHeight : 200;

    let top = e.clientY + window.scrollY + VERTICAL_OFFSET;
    let left = e.clientX + window.scrollX - POPUP_WIDTH / 2;

    if (left < window.scrollX + EDGE_PADDING) {
      left = window.scrollX + EDGE_PADDING;
    }
    const rightLimit = window.scrollX + window.innerWidth - POPUP_WIDTH - EDGE_PADDING;
    if (left > rightLimit) left = rightLimit;

    const wouldOverflowBottom =
      e.clientY + VERTICAL_OFFSET + popupHeight > window.innerHeight;
    if (wouldOverflowBottom && e.clientY > popupHeight) {
      top = e.clientY + window.scrollY - popupHeight - VERTICAL_OFFSET;
    }

    host.style.top = `${Math.round(top)}px`;
    host.style.left = `${Math.round(left)}px`;
  }

  function stopEventPropagation(host) {
    ["mousedown", "mouseup", "mousemove", "click", "dblclick"].forEach((ev) => {
      host.addEventListener(ev, (e) => e.stopPropagation());
    });
  }

  function isValidEnglishSelection(text) {
    if (!text) return false;
    const trimmed = text.trim();
    if (!trimmed) return false;
    if (!/^[A-Za-z]/.test(trimmed)) return false;
    const words = trimmed.split(/\s+/);
    if (words.length > MAX_WORDS) return false;
    if (!/^[A-Za-z][A-Za-z\s'-]*$/.test(trimmed)) return false;
    return true;
  }

  async function lookup(word, anchorEvent) {
    mountPopup(window.VocaPopup.renderLoading(), anchorEvent);

    const contextSentence = getContextSentence();

    const [lookupResp, sessionResp] = await Promise.all([
      sendMessage({ action: "lookup", word }),
      sendMessage({ action: "auth.getSession" }),
    ]);

    if (!lookupResp.ok) {
      mountPopup(
        window.VocaPopup.renderError(word, lookupResp.error || "요청 실패"),
        anchorEvent
      );
      return;
    }

    const model = window.VocaParser.parseEntry(lookupResp.data);
    if (!model) {
      mountPopup(
        window.VocaPopup.renderError(word, "이 단어의 사전 결과가 없습니다."),
        anchorEvent
      );
      return;
    }

    const session = sessionResp.session;
    const isSignedIn = !!session;
    const user = extractUser(session);
    const shadow = mountPopup(
      window.VocaPopup.createCardHtml(model, { isSignedIn, user }),
      anchorEvent
    );
    window.VocaPopup.bindAudioButtons(shadow);
    window.VocaPopup.bindActionSlot(shadow, {
      onLogin: (provider) =>
        handleLoginClick(shadow, provider, model, contextSentence),
      onSave: () => handleSaveClick(shadow, model, contextSentence),
    });
    window.VocaPopup.bindSettingsMenu(shadow, () => handleLogout(shadow));
  }

  async function handleLogout(shadow) {
    await sendMessage({ action: "auth.signOut" });
    window.VocaPopup.removeSettings(shadow);
    window.VocaPopup.setSaveButtonState(shadow, "anon");
  }

  async function handleLoginClick(shadow, provider, model, contextSentence) {
    window.VocaPopup.setSaveButtonState(shadow, "saving");
    const signInResp = await sendMessage({ action: "auth.signIn", provider });
    if (!signInResp.ok || !signInResp.session) {
      window.VocaPopup.setSaveButtonState(
        shadow,
        "error",
        signInResp.error || "로그인 실패"
      );
      setTimeout(() => {
        window.VocaPopup.setSaveButtonState(shadow, "anon");
      }, 2000);
      return;
    }
    await persistWord(shadow, model, contextSentence);
  }

  async function handleSaveClick(shadow, model, contextSentence) {
    window.VocaPopup.setSaveButtonState(shadow, "saving");
    await persistWord(shadow, model, contextSentence);
  }

  async function persistWord(shadow, model, contextSentence) {
    const saveResp = await sendMessage({
      action: "vocab.add",
      lemma: model.word,
      snapshot: model,
      sourceUrl: window.location.href,
      contextSentence,
    });

    if (!saveResp.ok) {
      window.VocaPopup.setSaveButtonState(
        shadow,
        "error",
        saveResp.error || "저장 실패"
      );
      setTimeout(() => {
        window.VocaPopup.setSaveButtonState(shadow, "ready");
      }, 2500);
      return;
    }

    window.VocaPopup.setSaveButtonState(
      shadow,
      saveResp.wasNew ? "saved" : "alreadySaved"
    );
  }

  function getSelectedWord() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return "";
    return sel.toString();
  }

  function init() {
    let mouseDown = false;
    let dragging = false;
    let downX = 0;
    let clickCount = 0;
    let clickTimer = null;

    document.addEventListener("mousedown", (e) => {
      mouseDown = true;
      dragging = false;
      downX = e.pageX;
    });

    document.addEventListener("mousemove", (e) => {
      if (mouseDown && Math.abs(e.pageX - downX) > DRAG_THRESHOLD_PX) {
        dragging = true;
      }
    });

    document.addEventListener("mouseup", (e) => {
      const wasDragging = dragging;
      mouseDown = false;
      dragging = false;

      if (wasDragging) {
        const word = getSelectedWord().trim();
        if (isValidEnglishSelection(word)) {
          lookup(word.toLowerCase(), e);
        } else {
          removePopup();
        }
        return;
      }

      clickCount += 1;
      if (clickCount === 1) {
        removePopup();
        clearTimeout(clickTimer);
        clickTimer = setTimeout(() => {
          clickCount = 0;
        }, DBLCLICK_GAP_MS);
        return;
      }

      clearTimeout(clickTimer);
      clickCount = 0;
      const word = getSelectedWord().trim();
      if (isValidEnglishSelection(word)) {
        lookup(word.toLowerCase(), e);
      } else {
        removePopup();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") removePopup();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
