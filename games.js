// 포트폴리오를 추가하려면 GAMES 배열에 객체 하나만 추가하면 카드가 생깁니다.
//   status: "live" + url → 클릭 시 플레이로 연결
//   status: "soon"       → Coming soon
//   color                → 카드 그라데이션 키 (아래 GRADIENTS)
const GRADIENTS = {
  pink: "linear-gradient(145deg,#ffd1e8,#ff7ab8)",
  mint: "linear-gradient(145deg,#cff5e7,#84e2bf)",
  sky: "linear-gradient(145deg,#d6ecff,#8fc2ff)",
  peach: "linear-gradient(145deg,#ffe3c7,#ffb27a)",
  lavender: "linear-gradient(145deg,#e7dbff,#b89cff)",
  ghost: "linear-gradient(145deg,#f4f4f6,#e8e8ec)",
};

const GAMES = [
  {
    title: "깜놀 그랑프리",
    en: "Kkamnol Grand Prix",
    emoji: "🏆",
    status: "live",
    url: "/grandprix",
    color: "lavender",
  },
  {
    title: "제목학원",
    en: "Caption Academy",
    emoji: "😆",
    status: "live",
    url: "/jaemok",
    color: "peach",
  },
  {
    title: "깜놀타임",
    en: "Kkamnol Time",
    emoji: "😮",
    status: "soon",
    url: "",
    color: "pink",
  },
];

function cardHTML(g, rotation) {
  const isLive = g.status === "live" && g.url;
  const grad = GRADIENTS[g.color] || GRADIENTS.sky;
  const badge = isLive
    ? '<span class="badge badge--live">PLAY</span>'
    : '<span class="badge">SOON</span>';

  const icon = `
    <div class="appcard__icon" style="--grad:${grad}">
      ${badge}
      <span class="appcard__emoji" aria-hidden="true">${g.emoji || "😮"}</span>
    </div>
    <div class="appcard__label">${g.title}</div>
    <div class="appcard__en">${g.en || ""}</div>`;

  const style = `--r:${rotation}deg`;
  if (isLive) {
    const external = /^https?:/.test(g.url);
    const attrs = external ? ' target="_blank" rel="noopener"' : "";
    return `<a class="appcard" style="${style}" href="${g.url}"${attrs}>${icon}</a>`;
  }
  return `<div class="appcard" style="${style}">${icon}</div>`;
}

function ghostHTML(rotation) {
  return `<div class="appcard appcard--ghost" style="--r:${rotation}deg">
    <div class="appcard__icon" style="--grad:${GRADIENTS.ghost}">
      <span class="appcard__emoji" aria-hidden="true">+</span>
    </div>
    <div class="appcard__label">다음 깜놀</div>
    <div class="appcard__en">Coming soon</div>
  </div>`;
}

function renderCards() {
  const wrap = document.getElementById("cards");
  if (!wrap) return;

  const total = Math.max(5, GAMES.length);
  const center = (total - 1) / 2;
  const step = 7;

  const html = [];
  for (let i = 0; i < total; i++) {
    const rot = Math.round((i - center) * step);
    html.push(i < GAMES.length ? cardHTML(GAMES[i], rot) : ghostHTML(rot));
  }
  wrap.innerHTML = html.join("");
}

renderCards();

/* ===== 데스크톱: 폰 목업 안에서 게임 미리보기 / 모바일: 풀스크린 이동 ===== */
function isDesktop() {
  return window.matchMedia("(min-width: 820px)").matches;
}
function setupPhonePreview() {
  const overlay = document.getElementById("phoneOverlay");
  if (!overlay) return;
  const iframe = overlay.querySelector(".phone-frame");
  const fsLink = overlay.querySelector(".phone-fullscreen");
  let closeTimer = null;

  function open(url) {
    clearTimeout(closeTimer);
    iframe.src = url;
    fsLink.href = url;
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add("open")); // 슬라이드업
    document.body.style.overflow = "hidden";
  }
  function close() {
    overlay.classList.remove("open");
    document.body.style.overflow = "";
    closeTimer = setTimeout(() => {
      overlay.hidden = true;
      iframe.src = "about:blank"; // 게임/사운드 정지
    }, 550);
  }

  document.querySelectorAll("a.appcard").forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || /^https?:/.test(href)) return; // 외부 링크는 그대로
      if (!isDesktop()) return; // 모바일: 기존처럼 풀스크린 이동
      e.preventDefault();
      open(href);
    });
  });

  overlay.querySelector(".phone-close").addEventListener("click", close);
  overlay.querySelector(".phone-backdrop").addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("open")) close();
  });
}
setupPhonePreview();
