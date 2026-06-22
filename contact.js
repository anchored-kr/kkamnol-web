/* ============================================================
   Kkamnol — 브랜드 협업 문의 (버튼 클릭 시 열리는 모달)
   평소엔 #contactOverlay가 숨김. [data-contact-open] 버튼 클릭 → 열림.
   배경/✕/ESC로 닫힘. 제출은 FormSubmit.co(ajax) → contact@anchored.kr.
   JS 없을 땐 일반 POST + _next 리다이렉트(?sent=1)로 폴백.
   ⚠️ 최초 1회: 첫 제출 후 contact@anchored.kr로 오는
      FormSubmit 활성화 메일의 링크를 눌러야 수신이 켜진다. (이미 활성화됨)
   ============================================================ */
(function () {
  const overlay = document.getElementById("contactOverlay");
  const form = document.getElementById("contactForm");
  if (!overlay || !form) return;

  const statusEl = form.querySelector(".contact-form__status");
  const submitBtn = form.querySelector(".contact-form__submit");
  const submitLabel = submitBtn ? submitBtn.textContent : "";
  let lastFocus = null;
  let closeTimer = null;

  /* ---------- 모달 열기/닫기 ---------- */
  function openModal() {
    clearTimeout(closeTimer);
    lastFocus = document.activeElement;
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add("open"));
    document.body.style.overflow = "hidden";
    const first = form.querySelector("input:not([type=hidden]), textarea, select");
    if (first) setTimeout(() => first.focus(), 90);
  }
  function closeModal() {
    overlay.classList.remove("open");
    document.body.style.overflow = "";
    closeTimer = setTimeout(() => { overlay.hidden = true; }, 320);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // 여는 버튼 (헤더 협업 문의 · 히어로 CTA · 푸터 Contact)
  document.querySelectorAll("[data-contact-open]").forEach((el) => {
    el.addEventListener("click", (e) => { e.preventDefault(); openModal(); });
  });
  // 닫기 (배경 · ✕)
  overlay.querySelectorAll("[data-contact-close]").forEach((el) => {
    el.addEventListener("click", closeModal);
  });
  // ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("open")) closeModal();
  });

  /* ---------- 상태 메시지 ---------- */
  function showStatus(msg, kind) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.hidden = false;
    statusEl.classList.remove("is-ok", "is-error");
    if (kind) statusEl.classList.add(kind === "ok" ? "is-ok" : "is-error");
  }

  // JS 없는 환경의 _next 폴백 리다이렉트 처리 (?sent=1) → 모달 열고 성공 표시
  if (new URLSearchParams(location.search).get("sent") === "1") {
    openModal();
    showStatus("문의가 접수됐어요. 곧 답장드릴게요! 🙌", "ok");
    if (submitBtn) submitBtn.disabled = true;
    history.replaceState(null, "", location.pathname);
  }

  /* ---------- 제출 (AJAX) ---------- */
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // 허니팟에 값이 차 있으면 봇 → 조용히 무시
    if (form._honey && form._honey.value) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "보내는 중…";
    }
    showStatus("", null);
    if (statusEl) statusEl.hidden = true;

    try {
      const res = await fetch("https://formsubmit.co/ajax/contact@anchored.kr", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && (data.success === "true" || data.success === true)) {
        form.reset();
        showStatus("문의가 접수됐어요. 보통 1~2영업일 안에 답장드릴게요! 🙌", "ok");
        if (submitBtn) submitBtn.textContent = "보냈어요 ✓";
        return; // 성공 시 버튼 비활성 유지
      }
      throw new Error(data.message || "전송 실패");
    } catch (err) {
      console.warn("[contact] submit failed", err);
      showStatus(
        "전송에 문제가 생겼어요. contact@anchored.kr 로 직접 메일 주시면 빠르게 답장드릴게요.",
        "error"
      );
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitLabel;
      }
    }
  });
})();
