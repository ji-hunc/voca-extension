(() => {
  const { escapeHtml } = window.VocaParser;

  const SPEAKER_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 16.5 12zM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06a9 9 0 0 0 0-17.54z"/></svg>`;

  const GOOGLE_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>`;

  const SETTINGS_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.14 12.94c.04-.31.06-.62.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.4.12-.61l-1.92-3.32c-.12-.22-.37-.3-.59-.22l-2.39.96c-.5-.38-1.04-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.21 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.4-.12.61l1.92 3.32c.12.22.37.3.59.22l2.39-.96c.5.38 1.04.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`;

  function createCardHtml(model, options = {}) {
    const isSignedIn = !!options.isSignedIn;
    const user = options.user || null;
    return `
      <div class="voca-popup" role="dialog" aria-label="${escapeHtml(model.word)} 사전">
        <div class="voca-card-actions">
          <div class="voca-action-slot">${
            isSignedIn ? renderSaveButton("ready") : renderLoginGroup()
          }</div>
        </div>

        <div class="voca-header">
          <a class="voca-title" href="${escapeHtml(model.externalUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(model.word)}</a>
        </div>

        ${renderPronunciations(model.pronunciations)}
        ${renderImage(model.images)}

        ${model.partsOfSpeech.map(renderPos).join("")}

        ${renderRelated("유의어", model.synonyms)}
        ${renderRelated("반의어", model.antonyms)}

        <div class="voca-footer">
          <div class="voca-footer-left">
            ${isSignedIn ? renderSettings(user) : ""}
            ${model.source ? `<span class="voca-source">${escapeHtml(model.source)}</span>` : ""}
          </div>
          <a class="voca-more" href="${escapeHtml(model.externalUrl)}" target="_blank" rel="noopener noreferrer">자세히 보기 →</a>
        </div>
      </div>
    `;
  }

  function renderSettings(user) {
    return `
      <div class="voca-settings-wrap">
        <button type="button" class="voca-settings-btn" aria-label="설정" aria-haspopup="true" aria-expanded="false">${SETTINGS_ICON}</button>
        <div class="voca-settings-menu" hidden role="menu">
          ${user ? renderAccountInfo(user) : ""}
          <button type="button" class="voca-logout-btn" role="menuitem">로그아웃</button>
        </div>
      </div>
    `;
  }

  function renderAccountInfo(user) {
    const providerIcon = user.provider === "google" ? GOOGLE_ICON : "";
    const email = user.email || "(이메일 없음)";
    return `
      <div class="voca-account-info" role="presentation">
        ${providerIcon ? `<div class="voca-account-icon" data-provider="${escapeHtml(user.provider)}">${providerIcon}</div>` : ""}
        <div class="voca-account-email" title="${escapeHtml(email)}">${escapeHtml(email)}</div>
      </div>
    `;
  }

  const SAVE_LABELS = {
    ready: "+ 단어장에 저장",
    saving: "저장 중…",
    saved: "✓ 저장됨",
    alreadySaved: "✓ 이미 저장됨",
    error: "다시 시도",
  };

  function renderSaveButton(state) {
    const label = SAVE_LABELS[state] || SAVE_LABELS.ready;
    return `<button type="button" class="voca-save-btn" data-state="${state}">${escapeHtml(label)}</button>`;
  }

  function renderLoginGroup() {
    return `
      <div class="voca-anon-wrap">
        <button type="button" class="voca-save-btn" data-state="anon" aria-haspopup="true" aria-expanded="false">+ 단어장에 저장</button>
        <div class="voca-login-prompt" hidden role="menu">
          <button type="button" class="voca-login-cta-btn" data-provider="google" aria-label="Google 계정으로 로그인">${GOOGLE_ICON}<span>Google로 로그인</span></button>
          <p class="voca-login-desc">로그인하고 전용 앱까지 다운받으면, 저장한 단어를 체계적으로 학습할 수 있어요.</p>
        </div>
      </div>
    `;
  }

  function setSaveButtonState(root, state, errorMessage) {
    const slot = root.querySelector(".voca-action-slot");
    if (!slot) return;

    if (state === "anon") {
      slot.innerHTML = renderLoginGroup();
      return;
    }

    let btn = slot.querySelector(".voca-save-btn");
    const wasAnon = btn?.getAttribute("data-state") === "anon";
    if (!btn || wasAnon) {
      slot.innerHTML = renderSaveButton(state);
      btn = slot.querySelector(".voca-save-btn");
    }
    btn.setAttribute("data-state", state);
    btn.textContent = SAVE_LABELS[state] || SAVE_LABELS.ready;
    if (state === "error" && errorMessage) {
      btn.setAttribute("data-tooltip", errorMessage);
    } else {
      btn.removeAttribute("data-tooltip");
    }
    const isDone = state === "saved" || state === "alreadySaved" || state === "saving";
    btn.disabled = isDone;
  }

  function renderPronunciations(prons) {
    if (!prons || prons.length === 0) return "";
    const items = prons
      .map((p) => {
        const ipa = p.ipa ? `<span class="voca-pron-ipa">[${escapeHtml(p.ipa)}]</span>` : "";
        const audio = p.audioUrl
          ? `<button class="voca-audio-btn" data-audio-url="${escapeHtml(p.audioUrl)}" aria-label="${escapeHtml(p.label)} 발음 듣기" type="button">${SPEAKER_ICON}</button>`
          : "";
        const label = p.label ? `<span class="voca-pron-label">${escapeHtml(p.label)}</span>` : "";
        return `<span class="voca-pron">${label}${ipa}${audio}</span>`;
      })
      .join("");
    return `<div class="voca-pronunciations">${items}</div>`;
  }

  function renderImage(images) {
    if (!images || images.length === 0) return "";
    return `<img class="voca-image" src="${escapeHtml(images[0])}" alt="" loading="lazy" />`;
  }

  function renderPos(part) {
    return `
      <div class="voca-pos-block">
        ${part.pos ? `<div class="voca-pos-badge">${escapeHtml(part.pos)}</div>` : ""}
        ${part.meanings.map(renderMeaning).join("")}
      </div>
    `;
  }

  function renderMeaning(m) {
    const example =
      m.exampleEn || m.exampleKo
        ? `<div class="voca-example">
            ${m.exampleEn ? `<div class="voca-example-en">${m.exampleEn}</div>` : ""}
            ${m.exampleKo ? `<div class="voca-example-ko">${escapeHtml(m.exampleKo)}</div>` : ""}
          </div>`
        : "";
    return `
      <div class="voca-meaning">
        <div class="voca-order">${escapeHtml(m.order)}.</div>
        <div class="voca-meaning-body">
          <div class="voca-definition">${escapeHtml(m.definition)}</div>
          ${example}
        </div>
      </div>
    `;
  }

  function renderRelated(label, items) {
    if (!items || items.length === 0) return "";
    const chips = items
      .slice(0, 8)
      .map(
        (it) =>
          `<a class="voca-chip" href="${escapeHtml(it.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(it.word)}</a>`
      )
      .join("");
    return `
      <div class="voca-related">
        <div class="voca-related-label">${escapeHtml(label)}</div>
        <div class="voca-chips">${chips}</div>
      </div>
    `;
  }

  function renderLoading() {
    return `<div class="voca-popup"><div class="voca-loading"><div class="voca-spinner"></div>찾는 중…</div></div>`;
  }

  function renderError(word, message) {
    return `
      <div class="voca-popup">
        <div class="voca-error">
          <strong>${escapeHtml(word)}</strong>
          ${escapeHtml(message || "결과를 찾지 못했습니다.")}
        </div>
      </div>
    `;
  }

  function bindAudioButtons(root) {
    root.querySelectorAll(".voca-audio-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const url = btn.getAttribute("data-audio-url");
        if (!url) return;
        try {
          const audio = new Audio(url);
          audio.play().catch(() => {});
        } catch (_) {}
      });
    });
  }

  function bindActionSlot(root, { onLogin, onSave }) {
    const slot = root.querySelector(".voca-action-slot");
    if (!slot) return;
    slot.addEventListener("click", (e) => {
      e.stopPropagation();

      const loginBtn = e.target.closest(".voca-login-cta-btn");
      if (loginBtn) {
        const provider = loginBtn.getAttribute("data-provider") || "google";
        onLogin(provider);
        return;
      }

      const saveBtn = e.target.closest(".voca-save-btn");
      if (saveBtn && !saveBtn.disabled) {
        if (saveBtn.getAttribute("data-state") === "anon") {
          const wrap = saveBtn.closest(".voca-anon-wrap");
          const prompt = wrap?.querySelector(".voca-login-prompt");
          if (!prompt) return;
          const isOpen = !prompt.hasAttribute("hidden");
          if (isOpen) {
            prompt.setAttribute("hidden", "");
            saveBtn.setAttribute("aria-expanded", "false");
          } else {
            prompt.removeAttribute("hidden");
            saveBtn.setAttribute("aria-expanded", "true");
          }
          return;
        }
        onSave(saveBtn);
      }
    });
  }

  function bindSettingsMenu(root, onLogout) {
    const wrap = root.querySelector(".voca-settings-wrap");
    if (!wrap) return;
    const gear = wrap.querySelector(".voca-settings-btn");
    const menu = wrap.querySelector(".voca-settings-menu");
    if (!gear || !menu) return;

    gear.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = !menu.hasAttribute("hidden");
      if (isOpen) {
        menu.setAttribute("hidden", "");
        gear.setAttribute("aria-expanded", "false");
      } else {
        menu.removeAttribute("hidden");
        gear.setAttribute("aria-expanded", "true");
      }
    });

    menu.addEventListener("click", (e) => {
      e.stopPropagation();
      if (e.target.closest(".voca-logout-btn")) {
        menu.setAttribute("hidden", "");
        gear.setAttribute("aria-expanded", "false");
        onLogout();
      }
    });
  }

  function removeSettings(root) {
    const wrap = root.querySelector(".voca-settings-wrap");
    if (wrap) wrap.remove();
  }

  window.VocaPopup = {
    createCardHtml,
    renderLoading,
    renderError,
    bindAudioButtons,
    bindActionSlot,
    bindSettingsMenu,
    removeSettings,
    setSaveButtonState,
  };
})();
