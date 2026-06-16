const $ = (s) => document.querySelector(s);
const state = { item: null, caption: "", cardImg: null };

async function init() {
  try {
    const res = await fetch("/jaemok/daily.json", { cache: "no-store" });
    const data = await res.json();
    const dayIndex = Math.floor(Date.now() / 86400000); // 일 단위 인덱스
    state.item = data[dayIndex % data.length];
  } catch (e) {
    // 폴백
    state.item = { emoji: "🐵", bg: "#ffd93b", legends: ["월요일의 나", "출근 싫다", "김대리.exe"] };
  }
  renderScene();
  renderStreak();
  $("#form").addEventListener("submit", onSubmit);
  $("#retry").addEventListener("click", reset);
  $("#share").addEventListener("click", share);
  // 폰트 로드 대기(카드 렌더 품질)
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
}

function renderScene() {
  const s = $("#scene");
  s.style.background = state.item.bg || "#eee";
  state.cardImg = null;
  if (state.item.image) {
    s.textContent = "";
    s.style.backgroundImage = `url("${state.item.image}")`;
    s.style.backgroundSize = "cover";
    s.style.backgroundPosition = "center";
    const img = new Image();
    img.onload = () => { state.cardImg = img; }; // 결과 카드용 (동일 출처 → canvas 안전)
    img.src = state.item.image;
  } else {
    s.style.backgroundImage = "";
    s.textContent = state.item.emoji || "😮";
  }
}

/* ---- 스트릭 ---- */
const SKEY = "jaemok-streak";
const todayStr = () => new Date().toISOString().slice(0, 10);
function renderStreak() {
  const d = JSON.parse(localStorage.getItem(SKEY) || "{}");
  $("#streak").textContent = d.streak > 0 ? `· 🔥 ${d.streak}일째` : "";
}
function bumpStreak() {
  const d = JSON.parse(localStorage.getItem(SKEY) || "{}");
  const today = todayStr();
  if (d.last === today) return;
  const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  d.streak = d.last === yest ? (d.streak || 0) + 1 : 1;
  d.last = today;
  localStorage.setItem(SKEY, JSON.stringify(d));
  renderStreak();
}

/* ---- 플로우 ---- */
async function onSubmit(e) {
  e.preventDefault();
  const v = $("#caption").value.trim();
  if (!v) { $("#caption").focus(); return; }
  state.caption = v;
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  drawCard();
  renderLegends();
  $("#play").hidden = true;
  $("#result").hidden = false;
  bumpStreak();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderLegends() {
  $("#legendList").innerHTML = state.item.legends
    .map((l) => `<li>${escapeHtml(l)}</li>`)
    .join("");
}

function reset() {
  $("#result").hidden = true;
  $("#play").hidden = false;
  const c = $("#caption");
  c.value = "";
  c.focus();
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/* ---- Canvas 결과 카드 (1080x1350, 4:5) ---- */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = [...text];
  let line = "";
  const lines = [];
  for (const ch of chars) {
    if (ctx.measureText(line + ch).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line += ch;
    }
  }
  if (line) lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
  return lines.length;
}

function drawStamp(ctx, cx, cy) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.22);
  ctx.strokeStyle = "#e0245e";
  ctx.fillStyle = "#e0245e";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(0, 0, 92, 0, Math.PI * 2);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "800 58px 'Noto Sans KR', sans-serif";
  ctx.fillText("합격!", 0, 6);
  ctx.restore();
}

function drawCard() {
  const cv = $("#card");
  const ctx = cv.getContext("2d");
  const W = cv.width, H = cv.height;

  // 배경
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#fff7fb");
  g.addColorStop(1, "#f1e9fb");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";

  // 상단 라벨
  ctx.fillStyle = "#ff2e95";
  ctx.font = "800 40px 'Noto Sans KR', sans-serif";
  ctx.fillText("KKAMNOL · 제목학원", W / 2, 112);

  // 짤 패널
  const px = 90, py = 168, pw = W - px * 2, ph = 600;
  roundRect(ctx, px, py, pw, ph, 48);
  ctx.fillStyle = state.item.bg;
  ctx.fill();

  // 짤: 실사진 or 이모지 폴백
  if (state.cardImg) {
    ctx.save();
    roundRect(ctx, px, py, pw, ph, 48);
    ctx.clip();
    const img = state.cardImg;
    const r = Math.max(pw / img.width, ph / img.height);
    const w = img.width * r, h = img.height * r;
    ctx.drawImage(img, px + (pw - w) / 2, py + (ph - h) / 2, w, h);
    ctx.restore();
  } else {
    ctx.textBaseline = "middle";
    ctx.font = "320px 'Apple Color Emoji', 'Noto Color Emoji', sans-serif";
    ctx.fillText(state.item.emoji || "😮", W / 2, py + ph / 2);
    ctx.textBaseline = "alphabetic";
  }

  // 합격 도장
  drawStamp(ctx, px + pw - 96, py + ph - 70);

  // 내 제목 (따옴표 강조)
  ctx.fillStyle = "#18181b";
  ctx.font = "800 64px 'Noto Sans KR', sans-serif";
  wrapText(ctx, `“${state.caption}”`, W / 2, 960, W - 170, 88);

  // 푸터
  ctx.fillStyle = "#a0a0aa";
  ctx.font = "500 34px 'Noto Sans KR', sans-serif";
  ctx.fillText("@kkamnol.interactive · kkamnol.xyz", W / 2, H - 72);
}

/* ---- 공유 ---- */
function share() {
  const cv = $("#card");
  cv.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], "kkamnol-jaemok.png", { type: "image/png" });
    const data = { files: [file], title: "제목학원", text: "내 제목학원 작품 ㅋㅋ kkamnol.xyz/jaemok" };
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share(data); } catch (e) { /* 취소 */ }
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kkamnol-jaemok.png";
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

init();
