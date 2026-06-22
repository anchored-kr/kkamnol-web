/* ===========================================================================
   깜놀 슬라이스 — 웹캠 손 추적 과일 베기 (PoC)
   - 손 추적: MediaPipe Hand Landmarker (브라우저, WASM, 21 키포인트)
   - 렌더: Canvas 2D (게임 로직은 렌더와 분리 → 추후 PixiJS 포팅 용이)
   - 폴백: 카메라 없거나 손 미검출 시 마우스/터치로 베기
   =========================================================================== */

import {
  FilesetResolver,
  HandLandmarker,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

// ---------- DOM ----------
const video = document.getElementById("cam");
const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const modeEl = document.getElementById("mode");
const startScreen = document.getElementById("startScreen");
const overScreen = document.getElementById("overScreen");
const overReason = document.getElementById("overReason");
const overScore = document.getElementById("overScore");
const overBest = document.getElementById("overBest");
const toastEl = document.getElementById("toast");

// ---------- 상태 ----------
let DPR = 1, W = 0, H = 0, MIN = 0;
let running = false;
let score = 0, lives = 3, best = Number(localStorage.getItem("kkamnol-slice-best") || 0);
let fruits = [], bits = []; // bits = 반쪽/즙/점수팝업 파티클
let lastSpawn = 0, spawnGap = 950, prevT = 0;
let shakeUntil = 0, shakeMag = 0;

// 손/포인터 입력
let handLandmarker = null, camOn = false, lastVideoTime = -1;
let bladePts = []; // {x, y, t}  최근 칼끝 궤적
let pointer = { x: 0, y: 0, t: -9999 };
let usingHandT = -9999; // 마지막으로 '손'으로 벤 시각

const FRUITS = ["🍉", "🍊", "🍎", "🍌", "🍓", "🥝", "🍑", "🍍"];

// ---------- 캔버스 크기 ----------
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = canvas.width = Math.floor(innerWidth * DPR);
  H = canvas.height = Math.floor(innerHeight * DPR);
  MIN = Math.min(W, H);
}
addEventListener("resize", resize);
resize();

// ---------- 입력: 포인터 폴백 ----------
function onPointer(e) {
  pointer.x = e.clientX * DPR;
  pointer.y = e.clientY * DPR;
  pointer.t = performance.now();
}
addEventListener("pointermove", onPointer, { passive: true });
addEventListener("pointerdown", onPointer, { passive: true });

// ---------- 카메라 + 손 추적 초기화 ----------
async function initCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  await new Promise((r) => {
    if (video.videoWidth) return r();
    video.onloadedmetadata = () => r();
  });
}

async function initHand() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
  );
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 1,
  });
}

// 비디오를 cover+거울로 그릴 때의 변환 (랜드마크 → 화면좌표 매핑에 동일 적용)
function camTransform() {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) return null;
  const scale = Math.max(W / vw, H / vh);
  const dw = vw * scale, dh = vh * scale;
  return { vw, vh, scale, dw, dh, ox: (W - dw) / 2, oy: (H - dh) / 2 };
}

// 검지 끝(landmark 8)을 칼끝으로 사용. 거울모드라 x 반전.
function handTip(t) {
  if (!handLandmarker || !camOn || video.readyState < 2) return null;
  if (video.currentTime === lastVideoTime) return null;
  lastVideoTime = video.currentTime;
  let res;
  try {
    res = handLandmarker.detectForVideo(video, t);
  } catch {
    return null;
  }
  if (!res || !res.landmarks || !res.landmarks.length) return null;
  const lm = res.landmarks[0][8]; // index fingertip
  const tr = camTransform();
  if (!tr) return null;
  return {
    x: W - (tr.ox + lm.x * tr.vw * tr.scale),
    y: tr.oy + lm.y * tr.vh * tr.scale,
  };
}

// ---------- 게임 흐름 ----------
function start() {
  score = 0; lives = 3; fruits = []; bits = [];
  lastSpawn = performance.now(); spawnGap = 950;
  running = true;
  startScreen.hidden = true;
  overScreen.hidden = true;
  syncHud();
}

function gameOver(reason) {
  running = false;
  best = Math.max(best, score);
  localStorage.setItem("kkamnol-slice-best", best);
  overReason.textContent = reason;
  overScore.textContent = score;
  overBest.textContent = best;
  overScreen.hidden = false;
}

function syncHud() {
  scoreEl.textContent = score;
  livesEl.textContent = "❤️".repeat(Math.max(0, lives)) || "💀";
}

// ---------- 스폰 ----------
function spawn() {
  const bomb = Math.random() < 0.16;
  const r = MIN * (bomb ? 0.06 : 0.066) * (0.9 + Math.random() * 0.3);
  const g = 2.0 * H;
  const f = 0.55 + Math.random() * 0.3; // 정점 높이 비율
  const vy0 = -Math.sqrt(2 * g * f * H);
  const x = W * (0.18 + Math.random() * 0.64);
  fruits.push({
    x, y: H + r,
    vx: (Math.random() - 0.5) * 0.5 * H + (W / 2 - x) * 0.55,
    vy: vy0, g,
    r, rot: Math.random() * 6.28, vrot: (Math.random() - 0.5) * 4,
    char: bomb ? "💣" : FRUITS[(Math.random() * FRUITS.length) | 0],
    bomb, sliced: false,
  });
}

// ---------- 썰기 판정 ----------
function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function sliceFruit(fr) {
  if (fr.bomb) {
    shakeUntil = performance.now() + 500; shakeMag = MIN * 0.02;
    burst(fr.x, fr.y, "#ff5252", 26, MIN * 0.9);
    for (let i = 0; i < 4; i++) addHalf(fr.x, fr.y, "💥");
    gameOver("💥 깜놀! 폭탄을 베었다");
    return;
  }
  score++;
  if (score % 12 === 0) spawnGap = Math.max(480, spawnGap - 60); // 점점 빨라짐
  syncHud();
  bits.push({ type: "pop", x: fr.x, y: fr.y, life: 0.8, text: "+1" });
  addHalf(fr.x, fr.y, fr.char, -1);
  addHalf(fr.x, fr.y, fr.char, 1);
  burst(fr.x, fr.y, juiceColor(fr.char), 14, MIN * 0.6);
}

function addHalf(x, y, char, dir = (Math.random() < 0.5 ? -1 : 1)) {
  bits.push({
    type: "half", x, y, char,
    vx: dir * (0.18 + Math.random() * 0.2) * H,
    vy: -(0.1 + Math.random() * 0.25) * H,
    g: 2.0 * H, rot: Math.random() * 6.28, vrot: dir * (3 + Math.random() * 4),
    r: MIN * 0.05, life: 1.1,
  });
}

function burst(x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.28, s = speed * (0.3 + Math.random() * 0.7);
    bits.push({
      type: "juice", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      g: 1.4 * H, r: MIN * (0.006 + Math.random() * 0.012), color, life: 0.5 + Math.random() * 0.4,
    });
  }
}

function juiceColor(c) {
  return { "🍉": "#ff5a7a", "🍊": "#ffa726", "🍎": "#ff5252", "🍌": "#ffe14d",
    "🍓": "#ff4d6d", "🥝": "#9ccc65", "🍑": "#ffb37a", "🍍": "#ffd54f" }[c] || "#fff";
}

// ---------- 메인 루프 ----------
function frame(now) {
  const dt = Math.min(0.05, (now - prevT) / 1000 || 0);
  prevT = now;

  // 입력 소스 결정: 손 우선, 없으면 포인터(최근 120ms)
  let tip = handTip(now);
  let src = "idle";
  if (tip) { src = "hand"; usingHandT = now; }
  else if (now - pointer.t < 120) { tip = { x: pointer.x, y: pointer.y }; src = "pointer"; }

  if (tip) bladePts.push({ x: tip.x, y: tip.y, t: now });
  while (bladePts.length && now - bladePts[0].t > 130) bladePts.shift();
  if (bladePts.length > 10) bladePts.shift();

  // 칼끝 속도
  let speed = 0, a = null, b = null;
  if (bladePts.length >= 2) {
    a = bladePts[bladePts.length - 2];
    b = bladePts[bladePts.length - 1];
    const ddt = (b.t - a.t) / 1000 || 0.016;
    speed = Math.hypot(b.x - a.x, b.y - a.y) / ddt;
  }
  const slicing = speed > MIN * 0.9;

  // 스폰
  if (running && now - lastSpawn > spawnGap) {
    lastSpawn = now;
    spawn();
    if (Math.random() < 0.25) spawn(); // 가끔 더블
  }

  // 과일 물리 + 썰기 + 미스
  for (let i = fruits.length - 1; i >= 0; i--) {
    const fr = fruits[i];
    fr.vy += fr.g * dt; fr.x += fr.vx * dt; fr.y += fr.vy * dt; fr.rot += fr.vrot * dt;

    if (running && slicing && a && b && !fr.sliced) {
      if (distToSeg(fr.x, fr.y, a.x, a.y, b.x, b.y) < fr.r + MIN * 0.03) {
        fr.sliced = true;
        sliceFruit(fr);
        fruits.splice(i, 1);
        continue;
      }
    }
    if (fr.y > H + fr.r * 1.6 && fr.vy > 0) {
      fruits.splice(i, 1);
      if (running && !fr.bomb) {
        lives--; syncHud();
        if (lives <= 0) gameOver("과일을 너무 많이 놓쳤다");
      }
    }
  }

  // 파티클 갱신
  for (let i = bits.length - 1; i >= 0; i--) {
    const p = bits[i];
    p.life -= dt;
    if (p.life <= 0) { bits.splice(i, 1); continue; }
    if (p.type !== "pop") {
      p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.vrot) p.rot += p.vrot * dt;
    } else { p.y -= 40 * dt; }
  }

  render(now, src);
  requestAnimationFrame(frame);
}

// ---------- 렌더 ----------
function render(now, src) {
  ctx.save();
  if (now < shakeUntil) {
    ctx.translate((Math.random() - 0.5) * shakeMag, (Math.random() - 0.5) * shakeMag);
  }

  // 배경: 웹캠 (cover + 거울) 또는 단색
  ctx.fillStyle = "#0a0d0a";
  ctx.fillRect(0, 0, W, H);
  const tr = camOn ? camTransform() : null;
  if (tr) {
    ctx.save();
    ctx.translate(W, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, tr.ox, tr.oy, tr.dw, tr.dh);
    ctx.restore();
    ctx.fillStyle = "rgba(10,13,10,0.45)"; // 과일 잘 보이게 어둡게
    ctx.fillRect(0, 0, W, H);
  }

  // 파티클 (과일 뒤 즙)
  for (const p of bits) {
    if (p.type === "juice") {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // 과일
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const fr of fruits) {
    ctx.save();
    ctx.translate(fr.x, fr.y); ctx.rotate(fr.rot);
    ctx.font = `${fr.r * 2}px "Noto Color Emoji", "Apple Color Emoji", sans-serif`;
    ctx.fillText(fr.char, 0, 0);
    ctx.restore();
  }

  // 반쪽 / 점수팝업
  for (const p of bits) {
    if (p.type === "half") {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.font = `${p.r * 2}px "Noto Color Emoji", "Apple Color Emoji", sans-serif`;
      ctx.fillText(p.char, 0, 0);
      ctx.restore();
    } else if (p.type === "pop") {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = "#ffd23f";
      ctx.font = `900 ${MIN * 0.05}px "Inter", sans-serif`;
      ctx.fillText(p.text, p.x, p.y);
    }
  }
  ctx.globalAlpha = 1;

  // 칼날 궤적
  if (bladePts.length >= 2) {
    for (let i = 1; i < bladePts.length; i++) {
      const p0 = bladePts[i - 1], p1 = bladePts[i];
      const k = i / bladePts.length;
      ctx.strokeStyle = `rgba(255,255,255,${0.15 + k * 0.6})`;
      ctx.lineWidth = MIN * 0.012 * k + 1;
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
    }
    const tip = bladePts[bladePts.length - 1];
    ctx.fillStyle = src === "hand" ? "#84e2bf" : "#ff7ab8";
    ctx.beginPath(); ctx.arc(tip.x, tip.y, MIN * 0.012, 0, 6.2832); ctx.fill();
  }
  ctx.restore();

  // 모드 표시
  if (modeEl) {
    modeEl.textContent =
      now - usingHandT < 400 ? "✋ 손 추적 중" : src === "pointer" ? "🖱 마우스/터치" : camOn ? "✋ 손을 보여주세요" : "· · ·";
  }
}

// ---------- 토스트 ----------
let toastTimer = null;
function toast(msg, ms = 2600) {
  toastEl.textContent = msg; toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.hidden = true), ms);
}

// ---------- 공유 ----------
async function share() {
  const url = "https://kkamnol.xyz/fruitslice";
  const text = `깜놀 슬라이스에서 ${best}점! 너도 손으로 과일 베어봐 🍉🥷`;
  try {
    if (navigator.share) { await navigator.share({ title: "깜놀 슬라이스", text, url }); return; }
  } catch { /* 취소 무시 */ }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    toast("링크를 복사했어요! 붙여넣어 공유하세요.");
  } catch {
    toast(url);
  }
}

// ---------- 버튼 ----------
document.getElementById("startBtn").addEventListener("click", async () => {
  const btn = document.getElementById("startBtn");
  btn.textContent = "카메라 준비 중…"; btn.disabled = true;
  try {
    await initCamera();
    try { await initHand(); camOn = true; }
    catch { camOn = true; toast("손 추적 모델 로드 실패 — 마우스/터치로도 벨 수 있어요."); }
  } catch {
    toast("카메라를 못 켰어요 — 마우스/터치로 플레이합니다.");
  }
  btn.textContent = "카메라 켜고 시작"; btn.disabled = false;
  start();
});
document.getElementById("startNoCam").addEventListener("click", () => start());
document.getElementById("retryBtn").addEventListener("click", () => start());
document.getElementById("shareBtn").addEventListener("click", share);

// 시작 전에도 배경 루프 돌려 칼날 미리보기
prevT = performance.now();
requestAnimationFrame(frame);
