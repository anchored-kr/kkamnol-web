/* ===========================================================================
   이상형 캐치캐치 — 손으로 이상형 조건을 잡아 배우자 완성 (PoC)
   - 손 추적: MediaPipe Hand Landmarker (브라우저 WASM)
   - 떠오르는 조건 5개를 손으로 캐치 → 결과 카드 → 검은 Kkamnol 아웃트로(2초·효과음)
   - 영상 녹화(canvas+오디오 → MediaRecorder) → SNS 공유 / 저장
   - 시작 시 언어 선택(ko/en/ja/zh) → 전체 번역
   - 폴백: 카메라/손 없으면 마우스·터치
   =========================================================================== */

import {
  FilesetResolver,
  HandLandmarker,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

// ---------- 조건(트레잇) 사전 ----------
const TRAITS = {
  looks:       { ko: "미모",     en: "Looks",       ja: "美貌",       zh: "颜值" },
  personality: { ko: "성격",     en: "Personality", ja: "性格",       zh: "性格" },
  stability:   { ko: "안정감",   en: "Stability",   ja: "安定感",     zh: "安全感" },
  humor:       { ko: "유머",     en: "Humor",       ja: "ユーモア",   zh: "幽默" },
  wealth:      { ko: "재력",     en: "Wealth",      ja: "財力",       zh: "财力" },
  warmth:      { ko: "다정함",   en: "Warmth",      ja: "優しさ",     zh: "体贴" },
  height:      { ko: "키",       en: "Height",      ja: "身長",       zh: "身高" },
  intellect:   { ko: "지성",     en: "Intellect",   ja: "知性",       zh: "智慧" },
  manners:     { ko: "매너",     en: "Manners",     ja: "マナー",     zh: "礼貌" },
  style:       { ko: "패션센스", en: "Style",       ja: "ファッション", zh: "时尚" },
  voice:       { ko: "목소리",   en: "Voice",       ja: "声",         zh: "声音" },
  cooking:     { ko: "요리실력", en: "Cooking",     ja: "料理上手",   zh: "厨艺" },
  health:      { ko: "건강",     en: "Health",      ja: "健康",       zh: "健康" },
  competence:  { ko: "능력",     en: "Competence",  ja: "能力",       zh: "能力" },
};
const TRAIT_KEYS = Object.keys(TRAITS);

// ---------- i18n ----------
const I18N = {
  ko: {
    nat: "한국어", langTitle: "언어를 선택하세요",
    title: "이상형 캐치캐치", tagline: "손으로 잡아 이상형을 완성!",
    how: "위로 떠오르는 조건을 5개 캐치하세요",
    startCam: "카메라 켜고 시작", startMouse: "마우스/터치로 플레이",
    privacy: "영상은 기기 안에서만 처리돼요",
    modeHand: "✋ 손 추적 중", modeMouse: "🖱 마우스/터치", modeShow: "✋ 손을 보여주세요",
    resultQ: "내 배우자는?", resultTmpl: (x) => `${x}의 배우자!`, resultAll: "이 모든 걸 갖춘 사람 💘",
    shareTitle: "완성! 영상으로 공유하세요", shareBtn: "영상 공유", shareSave: "영상 저장", again: "다시 하기",
    making: "영상 만드는 중…", caught: "캐치!",
  },
  en: {
    nat: "English", langTitle: "Choose your language",
    title: "Catch Your Type", tagline: "Grab traits to build your dream partner!",
    how: "Catch 5 traits floating up",
    startCam: "Start with Camera", startMouse: "Play with Mouse/Touch",
    privacy: "Your video never leaves this device",
    modeHand: "✋ Hand tracking", modeMouse: "🖱 Mouse/Touch", modeShow: "✋ Show your hand",
    resultQ: "Your future spouse?", resultTmpl: (x) => `${x}, above all!`, resultAll: "Someone with all of this 💘",
    shareTitle: "Done! Share your clip", shareBtn: "Share video", shareSave: "Save video", again: "Play again",
    making: "Making video…", caught: "Caught!",
  },
  ja: {
    nat: "日本語", langTitle: "言語を選んでください",
    title: "理想のタイプをキャッチ", tagline: "手で掴んで理想の相手を完成！",
    how: "浮かび上がる条件を5つキャッチ",
    startCam: "カメラを使って開始", startMouse: "マウス/タッチでプレイ",
    privacy: "映像は端末内だけで処理されます",
    modeHand: "✋ 手を認識中", modeMouse: "🖱 マウス/タッチ", modeShow: "✋ 手を見せて",
    resultQ: "あなたの伴侶は？", resultTmpl: (x) => `${x}の伴侶！`, resultAll: "全部揃った人 💘",
    shareTitle: "完成！動画でシェア", shareBtn: "動画をシェア", shareSave: "動画を保存", again: "もう一度",
    making: "動画を作成中…", caught: "キャッチ！",
  },
  zh: {
    nat: "中文", langTitle: "请选择语言",
    title: "理想型大作战", tagline: "用手抓取，拼出你的理想型！",
    how: "抓住飘上来的5个条件",
    startCam: "开启摄像头开始", startMouse: "用鼠标/触屏玩",
    privacy: "影像仅在本机处理",
    modeHand: "✋ 手部追踪中", modeMouse: "🖱 鼠标/触屏", modeShow: "✋ 请露出手",
    resultQ: "你的另一半？", resultTmpl: (x) => `${x}的另一半！`, resultAll: "拥有这一切的人 💘",
    shareTitle: "完成！分享你的视频", shareBtn: "分享视频", shareSave: "保存视频", again: "再玩一次",
    making: "正在生成视频…", caught: "抓到！",
  },
};
let lang = "ko";
const T = () => I18N[lang];
const traitLabel = (key) => TRAITS[key][lang];

// ---------- DOM ----------
const video = document.getElementById("cam");
const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");
const modeEl = document.getElementById("mode");
const recEl = document.getElementById("rec");
const langScreen = document.getElementById("langScreen");
const startScreen = document.getElementById("startScreen");
const shareScreen = document.getElementById("shareScreen");
const shareVid = document.getElementById("shareVid");
const toastEl = document.getElementById("toast");

// ---------- 상태 ----------
let DPR = 1, W = 0, H = 0, MIN = 0;
let phase = "idle"; // idle | play | result | outro
let phaseStart = 0;
let words = [], collected = [], effects = [];
let resultPrimary = null, finishing = false;
let lastSpawn = 0;

let handLandmarker = null, camOn = false, lastVideoTime = -1;
let bladePts = [];
let pointer = { x: 0, y: 0, t: -9999 };
let usingHandT = -9999;

// ---------- 캔버스 ----------
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = canvas.width = Math.floor(innerWidth * DPR);
  H = canvas.height = Math.floor(innerHeight * DPR);
  MIN = Math.min(W, H);
}
addEventListener("resize", resize);
resize();

// ---------- 포인터 폴백 ----------
function onPointer(e) { pointer.x = e.clientX * DPR; pointer.y = e.clientY * DPR; pointer.t = performance.now(); }
addEventListener("pointermove", onPointer, { passive: true });
addEventListener("pointerdown", onPointer, { passive: true });

// ---------- 오디오 (효과음 + 녹화 믹스) ----------
let audioCtx = null, masterGain = null, audioDest = null;
function ensureAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.5;
  masterGain.connect(audioCtx.destination);
}
function tone(freq, t0, dur, type = "sine", peak = 0.3) {
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type; o.frequency.value = freq;
  o.connect(g); g.connect(masterGain);
  const now = audioCtx.currentTime + t0;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(peak, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  o.start(now); o.stop(now + dur + 0.05);
}
const playCatch = () => { ensureAudio(); tone(660, 0, 0.12, "triangle", 0.3); tone(990, 0.05, 0.14, "triangle", 0.25); };
const playComplete = () => { ensureAudio(); [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.32, "triangle", 0.3)); };
const playOutro = () => { ensureAudio(); tone(784, 0, 0.55, "sine", 0.35); tone(1175, 0.13, 0.7, "sine", 0.3); tone(1568, 0.26, 0.95, "sine", 0.25); };

// ---------- 녹화 ----------
let rec = null, recChunks = [], recMime = "";
function pickMime() {
  const cands = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  return cands.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || "";
}
function startRecording() {
  if (!canvas.captureStream || !window.MediaRecorder) return false;
  try {
    const v = canvas.captureStream(30);
    const tracks = [...v.getVideoTracks()];
    ensureAudio();
    audioDest = audioCtx.createMediaStreamDestination();
    masterGain.connect(audioDest);
    tracks.push(...audioDest.stream.getAudioTracks());
    recMime = pickMime();
    rec = new MediaRecorder(new MediaStream(tracks), recMime ? { mimeType: recMime, videoBitsPerSecond: 6_000_000 } : undefined);
    recChunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) recChunks.push(e.data); };
    rec.start();
    recEl.hidden = false;
    return true;
  } catch (e) { return false; }
}
function stopRecording() {
  return new Promise((res) => {
    recEl.hidden = true;
    if (!rec || rec.state === "inactive") return res(null);
    rec.onstop = () => res(new Blob(recChunks, { type: (recMime || "video/webm").split(";")[0] }));
    rec.stop();
  });
}

// ---------- 카메라 + 손 ----------
async function initCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false,
  });
  video.srcObject = stream;
  await video.play();
  await new Promise((r) => { if (video.videoWidth) return r(); video.onloadedmetadata = () => r(); });
}
async function initHand() {
  const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO", numHands: 1,
  });
}
function camTransform() {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) return null;
  const scale = Math.max(W / vw, H / vh), dw = vw * scale, dh = vh * scale;
  return { vw, vh, scale, dw, dh, ox: (W - dw) / 2, oy: (H - dh) / 2 };
}
function handTip(t) {
  if (!handLandmarker || !camOn || video.readyState < 2) return null;
  if (video.currentTime === lastVideoTime) return null;
  lastVideoTime = video.currentTime;
  let res;
  try { res = handLandmarker.detectForVideo(video, t); } catch { return null; }
  if (!res || !res.landmarks || !res.landmarks.length) return null;
  const lm = res.landmarks[0][8]; // 검지 끝
  const tr = camTransform();
  if (!tr) return null;
  return { x: W - (tr.ox + lm.x * tr.vw * tr.scale), y: tr.oy + lm.y * tr.vh * tr.scale };
}

// ---------- 게임 흐름 ----------
async function startGame() {
  ensureAudio();
  if (audioCtx.state === "suspended") { try { await audioCtx.resume(); } catch {} }
  phase = "play"; phaseStart = performance.now();
  words = []; collected = []; effects = []; resultPrimary = null; finishing = false;
  lastSpawn = 0;
  startScreen.hidden = true; shareScreen.hidden = true;
  startRecording();
}

function availableKeys() {
  const used = new Set([...collected, ...words.map((w) => w.key)]);
  return TRAIT_KEYS.filter((k) => !used.has(k));
}
function spawnWord() {
  const avail = availableKeys();
  if (!avail.length) return;
  const key = avail[(Math.random() * avail.length) | 0];
  const fs = MIN * 0.052; // 글자 크기
  ctx.font = `800 ${fs}px "Noto Sans KR", sans-serif`;
  const w = ctx.measureText(traitLabel(key)).width + fs * 1.6;
  const h = fs * 1.9;
  words.push({
    key, x: W * (0.16 + Math.random() * 0.68), y: H + h,
    vx: (Math.random() - 0.5) * 0.05 * H, vy: -(0.12 + Math.random() * 0.05) * H,
    w, h, fs, hitR: Math.max(w, h) * 0.55, wob: Math.random() * 6.28, caught: false,
  });
}

function tryCatch(tip) {
  if (!tip) return;
  for (let i = words.length - 1; i >= 0; i--) {
    const wd = words[i];
    if (wd.caught) continue;
    if (Math.hypot(tip.x - wd.x, tip.y - wd.y) < wd.hitR + MIN * 0.02) {
      wd.caught = true;
      collected.push(wd.key);
      effects.push({ x: wd.x, y: wd.y, life: 0.7, label: traitLabel(wd.key) });
      burst(wd.x, wd.y);
      playCatch();
      words.splice(i, 1);
      if (collected.length >= 5 && !finishing) finishGame();
      return;
    }
  }
}
function burst(x, y) {
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * 6.28, s = MIN * (0.2 + Math.random() * 0.5);
    effects.push({ type: "spark", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: MIN * (0.006 + Math.random() * 0.01), life: 0.5 + Math.random() * 0.3 });
  }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function finishGame() {
  finishing = true;
  words = []; effects = []; // 결과 화면 깔끔하게(남은 단어/스파크 제거)
  resultPrimary = collected[(Math.random() * collected.length) | 0]; // 대표 조건 = 랜덤(깜놀)
  phase = "result"; phaseStart = performance.now();
  playComplete();
  await wait(2800);
  phase = "outro"; phaseStart = performance.now();
  playOutro();
  await wait(2100);
  const blob = await stopRecording();
  showShare(blob);
}

function showShare(blob) {
  phase = "idle";
  shareScreen.hidden = false;
  const sb = document.getElementById("shareBtn"), sv = document.getElementById("shareSave");
  if (blob && blob.size) {
    const url = URL.createObjectURL(blob);
    shareVid.src = url; shareVid.hidden = false;
    const ext = (recMime.includes("mp4")) ? "mp4" : "webm";
    const file = new File([blob], `kkamnol-idealtype.${ext}`, { type: blob.type });
    sb.onclick = async () => {
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "Kkamnol", text: T().title });
          return;
        }
      } catch {}
      // 공유 미지원 → 저장으로
      downloadBlob(url, `kkamnol-idealtype.${ext}`);
    };
    sv.onclick = () => downloadBlob(url, `kkamnol-idealtype.${ext}`);
  } else {
    shareVid.hidden = true;
    toast(T().making + " ✗"); // 녹화 미지원
    sb.onclick = sv.onclick = () => shareResultImage();
  }
}
function downloadBlob(url, name) {
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
}
async function shareResultImage() {
  // 녹화 미지원 폴백: 결과 한 장 이미지 공유
  canvas.toBlob(async (b) => {
    if (!b) return;
    const f = new File([b], "kkamnol-idealtype.png", { type: "image/png" });
    try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: "Kkamnol" }); return; } } catch {}
    downloadBlob(URL.createObjectURL(b), "kkamnol-idealtype.png");
  });
}

// ---------- 메인 루프 ----------
function frame(now) {
  const dt = Math.min(0.05, (now - (frame._p || now)) / 1000 || 0);
  frame._p = now;

  // 입력 소스
  let tip = handTip(now);
  let src = "idle";
  if (tip) { src = "hand"; usingHandT = now; }
  else if (now - pointer.t < 120) { tip = { x: pointer.x, y: pointer.y }; src = "pointer"; }
  if (tip) bladePts.push({ x: tip.x, y: tip.y, t: now });
  while (bladePts.length && now - bladePts[0].t > 200) bladePts.shift();
  if (bladePts.length > 16) bladePts.shift();

  if (phase === "play") {
    if (now - lastSpawn > 1100) { lastSpawn = now; spawnWord(); }
    for (let i = words.length - 1; i >= 0; i--) {
      const wd = words[i];
      wd.wob += dt * 2;
      wd.x += (wd.vx + Math.sin(wd.wob) * 0.04 * H) * dt;
      wd.y += wd.vy * dt;
      if (wd.y < -wd.h) words.splice(i, 1);
    }
    tryCatch(tip);
  }

  // 이펙트 갱신
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    e.life -= dt;
    if (e.life <= 0) { effects.splice(i, 1); continue; }
    if (e.type === "spark") { e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 1.2 * H * dt; }
    else e.y -= 50 * dt;
  }

  render(now, src);
  requestAnimationFrame(frame);
}

// ---------- 그리기 헬퍼 ----------
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function drawWord(wd) {
  ctx.save();
  ctx.translate(wd.x, wd.y);
  roundRect(-wd.w / 2, -wd.h / 2, wd.w, wd.h, wd.h / 2);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.shadowBlur = MIN * 0.03; ctx.shadowColor = "rgba(255,122,184,0.7)";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#1a0e16";
  ctx.font = `800 ${wd.fs}px "Noto Sans KR", sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(traitLabel(wd.key), 0, 0);
  ctx.restore();
}

// ---------- 렌더 ----------
function render(now, src) {
  ctx.fillStyle = "#0a0d0a";
  ctx.fillRect(0, 0, W, H);

  // 아웃트로(검은 화면 + 로고) — 배경 위에 전체 덮음
  if (phase === "outro") { renderOutro(now); return; }

  // 웹캠 배경
  const tr = camOn ? camTransform() : null;
  if (tr) {
    ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, tr.ox, tr.oy, tr.dw, tr.dh);
    ctx.restore();
    ctx.fillStyle = "rgba(10,13,10,0.5)"; ctx.fillRect(0, 0, W, H);
  }

  if (phase === "play" || phase === "result") {
    for (const wd of words) drawWord(wd);
    renderEffects();
    renderTray();
  }
  if (phase === "result") renderResult(now);

  if (phase === "play") renderCatcher(now, src); // 결과/아웃트로엔 캐처 숨김
  updateModePill(now, src);
}

function renderEffects() {
  for (const e of effects) {
    if (e.type === "spark") {
      ctx.globalAlpha = Math.max(0, e.life);
      ctx.fillStyle = "#ffd23f";
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 6.2832); ctx.fill();
    } else {
      ctx.globalAlpha = Math.max(0, Math.min(1, e.life));
      ctx.fillStyle = "#84e2bf";
      ctx.font = `900 ${MIN * 0.05}px "Noto Sans KR", sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(e.label, e.x, e.y);
    }
  }
  ctx.globalAlpha = 1;
}

function renderTray() {
  // 상단: 캐치한 조건 배지 + N/5
  const pad = MIN * 0.03, bh = MIN * 0.052, fs = MIN * 0.03;
  let x = pad, y = MIN * 0.10;
  ctx.font = `900 ${MIN * 0.04}px "Inter", sans-serif`;
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffd23f";
  ctx.fillText(`${collected.length} / 5`, pad, y - bh);
  ctx.font = `800 ${fs}px "Noto Sans KR", sans-serif`;
  for (const k of collected) {
    const label = traitLabel(k);
    const bw = ctx.measureText(label).width + fs * 1.4;
    roundRect(x, y, bw, bh, bh / 2);
    ctx.fillStyle = "rgba(255,210,63,0.95)"; ctx.fill();
    ctx.fillStyle = "#1a0e16";
    ctx.textAlign = "center"; ctx.fillText(label, x + bw / 2, y + bh / 2);
    ctx.textAlign = "left";
    x += bw + pad * 0.5;
    if (x > W - MIN * 0.2) { x = pad; y += bh + pad * 0.4; }
  }
}

function renderResult(now) {
  const t = Math.min(1, (now - phaseStart) / 350); // 등장
  const cw = Math.min(W * 0.86, MIN * 1.5), ch = Math.min(H * 0.62, MIN * 1.35);
  const cx = (W - cw) / 2, cy = (H - ch) / 2;
  ctx.globalAlpha = t;
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(0.94 + 0.06 * t, 0.94 + 0.06 * t); ctx.translate(-W / 2, -H / 2);

  roundRect(cx, cy, cw, ch, MIN * 0.06);
  ctx.fillStyle = "rgba(18,14,18,0.94)"; ctx.fill();
  ctx.strokeStyle = "rgba(255,122,184,0.5)"; ctx.lineWidth = 2; ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = `800 ${MIN * 0.045}px "Noto Sans KR", sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText(T().resultQ, W / 2, cy + ch * 0.16);

  // 대표 조건 헤드라인
  ctx.fillStyle = "#ff7ab8";
  ctx.font = `900 ${MIN * 0.085}px "Noto Sans KR", sans-serif`;
  ctx.fillText(T().resultTmpl(traitLabel(resultPrimary)), W / 2, cy + ch * 0.33);

  // 배지 5개
  const fs = MIN * 0.035, bh = fs * 1.9, pad = MIN * 0.02;
  let total = 0;
  ctx.font = `800 ${fs}px "Noto Sans KR", sans-serif`;
  const sizes = collected.map((k) => ctx.measureText(traitLabel(k)).width + fs * 1.5);
  total = sizes.reduce((a, b) => a + b + pad, -pad);
  let bx = W / 2 - total / 2;
  const by = cy + ch * 0.52;
  collected.forEach((k, i) => {
    const bw = sizes[i], gold = k === resultPrimary;
    roundRect(bx, by, bw, bh, bh / 2);
    ctx.fillStyle = gold ? "rgba(255,210,63,0.95)" : "rgba(255,255,255,0.14)"; ctx.fill();
    ctx.fillStyle = gold ? "#1a0e16" : "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText(traitLabel(k), bx + bw / 2, by + bh / 2);
    bx += bw + pad;
  });

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = `700 ${MIN * 0.04}px "Noto Sans KR", sans-serif`;
  ctx.fillText(T().resultAll, W / 2, cy + ch * 0.72);

  ctx.fillStyle = "rgba(132,226,191,0.9)";
  ctx.font = `800 ${MIN * 0.032}px "Inter", sans-serif`;
  ctx.fillText("kkamnol.xyz", W / 2, cy + ch * 0.87);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function renderOutro(now) {
  const el = (now - phaseStart) / 1000;
  const fade = Math.min(1, el / 0.4) * Math.min(1, Math.max(0, (2.1 - el) / 0.4));
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = fade;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `${MIN * 0.13}px "Noto Color Emoji", "Apple Color Emoji", sans-serif`;
  ctx.fillText("😮", W / 2, H / 2 - MIN * 0.11);
  ctx.fillStyle = "#fff";
  ctx.font = `900 ${MIN * 0.11}px "Inter", sans-serif`;
  ctx.fillText("Kkamnol", W / 2, H / 2 + MIN * 0.02);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = `700 ${MIN * 0.035}px "Inter", sans-serif`;
  ctx.fillText("kkamnol.xyz", W / 2, H / 2 + MIN * 0.13);
  ctx.globalAlpha = 1;
}

function renderCatcher(now, src) {
  if (bladePts.length < 1) return;
  const glow = src === "hand" ? "132,226,191" : "255,122,184";
  const n = bladePts.length;
  // 잔상 트레일
  for (let i = 1; i < n; i++) {
    const p0 = bladePts[i - 1], p1 = bladePts[i], k = i / (n - 1 || 1);
    ctx.strokeStyle = `rgba(${glow},${0.06 + k * 0.4})`;
    ctx.lineWidth = MIN * 0.02 * (0.2 + k * 0.9); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
  }
  // 캐쳐 링
  const tip = bladePts[n - 1];
  ctx.save();
  ctx.shadowBlur = MIN * 0.04; ctx.shadowColor = `rgba(${glow},1)`;
  ctx.strokeStyle = "#fff"; ctx.lineWidth = MIN * 0.01;
  ctx.beginPath(); ctx.arc(tip.x, tip.y, MIN * 0.035, 0, 6.2832); ctx.stroke();
  ctx.fillStyle = `rgba(${glow},0.9)`;
  ctx.beginPath(); ctx.arc(tip.x, tip.y, MIN * 0.01, 0, 6.2832); ctx.fill();
  ctx.restore();
}

function updateModePill(now, src) {
  if (!modeEl) return;
  modeEl.textContent = now - usingHandT < 400 ? T().modeHand : src === "pointer" ? T().modeMouse : camOn ? T().modeShow : "· · ·";
}

// ---------- 토스트 ----------
let toastTimer = null;
function toast(msg, ms = 2600) {
  toastEl.textContent = msg; toastEl.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (toastEl.hidden = true), ms);
}

// ---------- 언어 / UI ----------
function applyLang() {
  const t = T();
  document.documentElement.lang = lang;
  document.getElementById("startTitle").textContent = t.title;
  document.getElementById("startTagline").textContent = t.tagline;
  document.getElementById("startHow").textContent = t.how;
  document.getElementById("startBtn").textContent = t.startCam;
  document.getElementById("startNoCam").textContent = t.startMouse;
  document.getElementById("startPrivacy").textContent = t.privacy;
  document.getElementById("shareTitle").textContent = t.shareTitle;
  document.getElementById("shareBtn").textContent = t.shareBtn;
  document.getElementById("shareSave").textContent = t.shareSave;
  document.getElementById("againBtn").textContent = t.again;
}
function buildLangGrid() {
  const grid = document.getElementById("langGrid");
  grid.innerHTML = "";
  for (const code of Object.keys(I18N)) {
    const b = document.createElement("button");
    b.className = "lang-btn"; b.textContent = I18N[code].nat;
    b.onclick = () => { lang = code; applyLang(); langScreen.hidden = true; startScreen.hidden = false; };
    grid.appendChild(b);
  }
}

document.getElementById("startBtn").addEventListener("click", async () => {
  const btn = document.getElementById("startBtn");
  btn.disabled = true;
  try {
    await initCamera();
    try { await initHand(); camOn = true; } catch { camOn = true; toast("hand model ✗ → mouse ok"); }
  } catch { toast(T().privacy); }
  btn.disabled = false;
  startGame();
});
document.getElementById("startNoCam").addEventListener("click", () => startGame());
document.getElementById("againBtn").addEventListener("click", () => { shareScreen.hidden = true; startScreen.hidden = false; });

// ---------- 부트 ----------
buildLangGrid();
applyLang();
frame._p = performance.now();
requestAnimationFrame(frame);
