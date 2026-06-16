// 게임을 추가하려면 이 배열에 객체 하나만 추가하면 카드가 생깁니다.
//   status: "live"  → url 로 연결되는 플레이 카드
//   status: "soon"  → Coming soon 카드
const GAMES = [
  {
    title: "깜놀타임",
    en: "Kkamnol Time",
    desc: "평온하다가 갑자기 깜짝! 반응속도로 겨루는 데일리 게임.",
    tags: ["반응속도", "데일리", "AR · 웹"],
    status: "soon",
    url: "",
  },
];

function gameCard(g) {
  const isLive = g.status === "live" && g.url;
  const badge = isLive
    ? '<span class="badge badge--live">LIVE</span>'
    : '<span class="badge">COMING SOON</span>';
  const tags = (g.tags || []).map((t) => `<span class="tag">${t}</span>`).join("");
  const inner = `
    <div class="card__top">${badge}</div>
    <h3 class="card__title">${g.title}</h3>
    <p class="card__en">${g.en || ""}</p>
    <p class="card__desc">${g.desc || ""}</p>
    <div class="card__tags">${tags}</div>`;

  if (isLive) {
    return `<a class="card card--live" href="${g.url}" target="_blank" rel="noopener">
      ${inner}<span class="card__cta">플레이 →</span>
    </a>`;
  }
  return `<div class="card">${inner}</div>`;
}

function renderGames() {
  const grid = document.getElementById("games-grid");
  if (!grid) return;

  const cards = GAMES.map(gameCard).join("");

  // 최소 3칸이 차도록 "다음 깜놀" 플레이스홀더 채우기
  const ghostCount = Math.max(0, 3 - GAMES.length);
  const ghosts = Array.from({ length: ghostCount })
    .map(
      () => `<div class="card card--ghost">
        <div class="card__top"><span class="badge badge--ghost">NEXT</span></div>
        <p class="card__desc">곧 다음 깜놀이 도착합니다.</p>
      </div>`
    )
    .join("");

  grid.innerHTML = cards + ghosts;
}

renderGames();
