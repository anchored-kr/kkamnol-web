// 포트폴리오를 추가하려면 이 배열에 객체 하나만 추가하면 카드가 생깁니다.
//   status: "live" + url  → 클릭 시 플레이로 연결되는 카드 (썸네일 hover에 Play →)
//   status: "soon"        → Coming soon 카드
//   thumb (선택)          → 썸네일 이미지 URL. 없으면 emoji 플레이스홀더 사용.
const GAMES = [
  {
    title: "깜놀타임",
    en: "Kkamnol Time",
    emoji: "😮",
    status: "soon",
    url: "",
    thumb: "",
  },
];

function gameCard(g) {
  const isLive = g.status === "live" && g.url;
  const badge = isLive
    ? '<span class="badge badge--live">LIVE</span>'
    : '<span class="badge">COMING SOON</span>';
  const thumbInner = g.thumb
    ? `<img src="${g.thumb}" alt="${g.title}" loading="lazy" />`
    : `<span aria-hidden="true">${g.emoji || "😮"}</span>`;

  const inner = `
    <div class="thumb">${thumbInner}${badge}</div>
    <div class="meta">
      <h3>${g.title}</h3>
      <p class="en">${g.en || ""}</p>
    </div>`;

  if (isLive) {
    return `<a class="card card--live" href="${g.url}" target="_blank" rel="noopener">${inner}</a>`;
  }
  return `<article class="card">${inner}</article>`;
}

function renderGames() {
  const grid = document.getElementById("games-grid");
  if (!grid) return;

  const cards = GAMES.map(gameCard).join("");

  // 그리드가 비어 보이지 않게 "다음 깜놀" 플레이스홀더로 채우기 (최소 4칸)
  const ghostCount = Math.max(0, 4 - GAMES.length);
  const ghosts = Array.from({ length: ghostCount })
    .map(
      () => `<article class="card card--ghost">
        <div class="thumb"><span aria-hidden="true">+</span></div>
        <div class="meta"><h3>다음 깜놀</h3><p class="en">Coming soon</p></div>
      </article>`
    )
    .join("");

  grid.innerHTML = cards + ghosts;
}

renderGames();
