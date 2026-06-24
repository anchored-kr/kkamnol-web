/* ===========================================================================
   흐물흐물 댄스 (Wobble Dance) — 내 몸을 캡쳐해서 젤리처럼 흐느적 춤추게
   카메라로 전신 캡쳐 → 누끼(ImageSegmenter) + 관절(PoseLandmarker)
   → 그리드 메시 + 2-bone LBS 스키닝 + FK 댄스 + 스프링 흔들림(흐물흐물)
   → Canvas 2D 어파인 텍스처 워프 → 9:16 숏폼 녹화/공유 (18장 표준)
   카메라 없으면 내장 캐릭터로 데모(헤드리스 검증 가능).
   =========================================================================== */

import {
  FilesetResolver,
  PoseLandmarker,
  ImageSegmenter,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
import { bumpPlay, bumpShare } from "/analytics.js";

// ---------- i18n ----------
// 재사용 키(langTitle·privacy·shareSave·shareLink·again·linkCopied)는 16개국 전부,
// 게임 고유 키(title·tagline·how·startCam·startMouse·shareTitle·outroCta·mode*·snap)는
// ko/en/ja/zh 네이티브 + 그 외 언어는 en 폴백(tk()).
const I18N = {
  ko: { nat:"한국어", langTitle:"언어를 선택하세요", privacy:"영상은 기기 안에서만 처리돼요", shareSave:"영상 저장", shareLink:"링크 공유", again:"다시 하기", linkCopied:"링크를 복사했어요!",
        title:"흐물흐물 댄스", tagline:"내 몸을 찍으면 흐물흐물 춤춰요!", how:"전신이 보이게 서면 자동 캡쳐 → 춤!", startCam:"카메라 켜고 시작", startMouse:"카메라 없이 데모 보기", shareTitle:"완성! 영상으로 공유하세요", outroCta:"이 게임을 하고 싶다면?", modeShow:"🕺 전신이 보이게 서세요", modeBody:"🕺 전신 인식", modeDemo:"🎬 데모", snap:"찰칵!" },
  en: { nat:"English", langTitle:"Choose your language", privacy:"Your video never leaves this device", shareSave:"Save video", shareLink:"Share link", again:"Play again", linkCopied:"Link copied!",
        title:"Wobble Dance", tagline:"Snap your body — watch it wobble-dance!", how:"Stand so your whole body shows → auto-capture → dance!", startCam:"Start with camera", startMouse:"Watch a demo (no camera)", shareTitle:"Done! Share your clip", outroCta:"Want to try this game?", modeShow:"🕺 Show your whole body", modeBody:"🕺 Body detected", modeDemo:"🎬 Demo", snap:"Snap!" },
  ja: { nat:"日本語", langTitle:"言語を選んでください", privacy:"映像は端末内だけで処理されます", shareSave:"動画を保存", shareLink:"リンクを共有", again:"もう一度", linkCopied:"リンクをコピーしました！",
        title:"ぐにゃぐにゃダンス", tagline:"体を撮ると、ぐにゃぐにゃ踊り出す！", how:"全身が映るように立つと自動キャプチャ→ダンス！", startCam:"カメラを使って開始", startMouse:"カメラなしでデモを見る", shareTitle:"完成！シェアしよう", outroCta:"このゲームをやってみたい？", modeShow:"🕺 全身を映して", modeBody:"🕺 全身を認識", modeDemo:"🎬 デモ", snap:"パシャ！" },
  zh: { nat:"中文", langTitle:"请选择语言", privacy:"影像仅在本机处理", shareSave:"保存视频", shareLink:"分享链接", again:"再玩一次", linkCopied:"链接已复制！",
        title:"软绵绵舞蹈", tagline:"拍下身体，它就软绵绵跳起舞！", how:"站到全身入镜，自动捕捉→跳舞！", startCam:"开启摄像头开始", startMouse:"无摄像头看演示", shareTitle:"完成！快来分享", outroCta:"想玩这个游戏吗？", modeShow:"🕺 请露出全身", modeBody:"🕺 已识别全身", modeDemo:"🎬 演示", snap:"咔嚓！" },
  es: { nat:"Español", langTitle:"Elige tu idioma", privacy:"Tu vídeo no sale de este dispositivo", shareSave:"Guardar vídeo", shareLink:"Compartir enlace", again:"Jugar otra vez", linkCopied:"¡Enlace copiado!" },
  pt: { nat:"Português", langTitle:"Escolha seu idioma", privacy:"Seu vídeo não sai deste aparelho", shareSave:"Salvar vídeo", shareLink:"Compartilhar link", again:"Jogar de novo", linkCopied:"Link copiado!" },
  fr: { nat:"Français", langTitle:"Choisis ta langue", privacy:"Ta vidéo reste sur cet appareil", shareSave:"Enregistrer la vidéo", shareLink:"Partager le lien", again:"Rejouer", linkCopied:"Lien copié !" },
  de: { nat:"Deutsch", langTitle:"Wähle deine Sprache", privacy:"Dein Video bleibt auf diesem Gerät", shareSave:"Video speichern", shareLink:"Link teilen", again:"Nochmal spielen", linkCopied:"Link kopiert!" },
  it: { nat:"Italiano", langTitle:"Scegli la lingua", privacy:"Il tuo video resta sul dispositivo", shareSave:"Salva video", shareLink:"Condividi link", again:"Gioca ancora", linkCopied:"Link copiato!" },
  ru: { nat:"Русский", langTitle:"Выберите язык", privacy:"Видео не покидает устройство", shareSave:"Сохранить видео", shareLink:"Поделиться ссылкой", again:"Ещё раз", linkCopied:"Ссылка скопирована!" },
  tr: { nat:"Türkçe", langTitle:"Dilini seç", privacy:"Videon bu cihazdan çıkmaz", shareSave:"Videoyu kaydet", shareLink:"Bağlantıyı paylaş", again:"Tekrar oyna", linkCopied:"Bağlantı kopyalandı!" },
  id: { nat:"Bahasa Indonesia", langTitle:"Pilih bahasa", privacy:"Videomu tetap di perangkat ini", shareSave:"Simpan video", shareLink:"Bagikan tautan", again:"Main lagi", linkCopied:"Tautan disalin!" },
  vi: { nat:"Tiếng Việt", langTitle:"Chọn ngôn ngữ", privacy:"Video không rời thiết bị này", shareSave:"Lưu video", shareLink:"Chia sẻ liên kết", again:"Chơi lại", linkCopied:"Đã sao chép liên kết!" },
  th: { nat:"ไทย", langTitle:"เลือกภาษา", privacy:"วิดีโออยู่แค่ในเครื่องนี้", shareSave:"บันทึกวิดีโอ", shareLink:"แชร์ลิงก์", again:"เล่นอีกครั้ง", linkCopied:"คัดลอกลิงก์แล้ว!" },
  ar: { nat:"العربية", langTitle:"اختر لغتك", privacy:"الفيديو لا يغادر جهازك", shareSave:"حفظ الفيديو", shareLink:"مشاركة الرابط", again:"العب مجددًا", linkCopied:"تم نسخ الرابط!" },
  hi: { nat:"हिन्दी", langTitle:"अपनी भाषा चुनें", privacy:"आपका वीडियो डिवाइस में ही रहता है", shareSave:"वीडियो सेव करें", shareLink:"लिंक शेयर करें", again:"फिर से खेलें", linkCopied:"लिंक कॉपी हो गया!" },
};
let lang = "ko";
const T = () => I18N[lang];
const tk = (key) => (I18N[lang] && I18N[lang][key] != null) ? I18N[lang][key] : I18N.en[key];

// 상단 훅 — "그냥 사진 찍는 줄 알았는데…" (반전 예고. 게임 내내 표시, 녹화에도 박힘)
const HOOK = {
  ko:"그냥 사진 찍는 줄 알았는데…", en:"Thought it was just a photo…", ja:"ただの写真かと思いきや…", zh:"还以为只是拍张照…",
  es:"Creías que era solo una foto…", pt:"Achou que era só uma foto…", fr:"Tu croyais à une simple photo…", de:"Dachtest, es wäre nur ein Foto…",
  it:"Pensavi fosse solo una foto…", ru:"Думали, это просто фото…", tr:"Sadece bir fotoğraf sandın ama…", id:"Kira cuma foto biasa, ternyata…",
  vi:"Tưởng chỉ là một tấm ảnh…", th:"นึกว่าแค่ถ่ายรูป…", ar:"ظننتها مجرد صورة…", hi:"समझे थे बस एक फोटो है…",
};
const hook = () => HOOK[lang] ?? HOOK.en;

// 캔버스 동적 문구 (ko/en/ja/zh + en 폴백)
const PROMPT = {
  stand: { ko:"🕺 전신이 보이게 서세요!", en:"🕺 Stand so your whole body shows!", ja:"🕺 全身が映るように立って！", zh:"🕺 站到全身都入镜！" },
};
const px = (k) => PROMPT[k][lang] ?? PROMPT[k].en;

// ---------- 룩북 시그니처 토큰 (docs/signature-lookbook.md) ----------
const INK = "#111114", PAPER = "#F7F7F2", SIGNAL = "#E8FF2E", SHOCK = "#FF2D6F", MUTE = "#6B6B70";
const FONT = '"Pretendard", system-ui, sans-serif';

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
let phase = "idle";          // idle | ready | snap | dance | outro
let phaseStart = 0;
let camOn = false, isDemo = false;
let countdownStart = 0, lastTick = -1;
let flashUntil = 0, shakeUntil = 0, snapFlashUntil = 0;
let danceT0 = 0;
let notes = [];              // 떠다니는 음표 파티클(시그널/쇼크)

// 캡쳐물(누끼) + 메시 + 스켈레톤
let cut = null;              // 누끼 캔버스(투명 배경, vw×vh 또는 데모 크기)
let frozen = null;          // 캡쳐 직전 프레임(스냅 화면 표시용)
let bbox = null;            // 누끼 바운딩박스(cut px)
let bones = [], verts = [], tris = [];
let stageFromCut = null;    // cut px → 스테이지 device px 어파인
const DANCE_MS = 7200;

// ---------- 캔버스 9:16 ----------
let pendingResize = false;
function applyResize() {
  let boxW = innerWidth, boxH = innerWidth * 16 / 9;
  if (boxH > innerHeight) { boxH = innerHeight; boxW = innerHeight * 9 / 16; }
  boxW = Math.floor(boxW); boxH = Math.floor(boxH);
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.floor(boxW * DPR) & ~1, h = Math.floor(boxH * DPR) & ~1;
  if (w === canvas.width && h === canvas.height) return;
  canvas.style.width = boxW + "px"; canvas.style.height = boxH + "px";
  W = canvas.width = w; H = canvas.height = h; MIN = Math.min(W, H);
}
function resize() { if (recording) { pendingResize = true; return; } applyResize(); }
addEventListener("resize", resize);
applyResize();

// ---------- 오디오 (idealcatch와 동일 구조) ----------
let audioCtx = null, masterGain = null;
function ensureAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.5;
  masterGain.connect(audioCtx.destination);
  try { const b = audioCtx.createBuffer(1, 1, 22050); const s = audioCtx.createBufferSource(); s.buffer = b; s.connect(audioCtx.destination); s.start(0); } catch {}
}
function unlockAudio() { ensureAudio(); if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {}); }
addEventListener("pointerdown", unlockAudio, { passive: true });
addEventListener("touchend", unlockAudio, { passive: true });

function toneAt(ctx2, master, freq, when, dur, type = "sine", peak = 0.3) {
  const o = ctx2.createOscillator(), g = ctx2.createGain();
  o.type = type; o.frequency.value = freq; o.connect(g); g.connect(master);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(peak, when + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.start(when); o.stop(when + dur + 0.05);
}
function sfxBeat(ctx2, master, base) { // 댄스 비트(킥+하이햇 느낌)
  toneAt(ctx2, master, 120, base, 0.16, "sine", 0.34);
  toneAt(ctx2, master, 90, base + 0.005, 0.12, "triangle", 0.22);
}
function sfxSting(ctx2, master, base) { // 🔑 깜놀 스팅어(룩북 오디오 로고)
  const o = ctx2.createOscillator(), g = ctx2.createGain();
  o.type = "sawtooth"; o.connect(g); g.connect(master);
  o.frequency.setValueAtTime(260, base); o.frequency.exponentialRampToValueAtTime(1500, base + 0.17);
  g.gain.setValueAtTime(0.0001, base); g.gain.exponentialRampToValueAtTime(0.22, base + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, base + 0.2);
  o.start(base); o.stop(base + 0.24);
  toneAt(ctx2, master, 660, base + 0.16, 0.05, "square", 0.3);
  toneAt(ctx2, master, 1320, base + 0.19, 0.5, "triangle", 0.34);
  toneAt(ctx2, master, 1976, base + 0.21, 0.45, "sine", 0.2);
}
function sfxOutro(ctx2, master, base) { // 엔드 3노트 "깜-놀-!" 모티프
  toneAt(ctx2, master, 784, base, 0.5, "triangle", 0.34);
  toneAt(ctx2, master, 1175, base + 0.12, 0.6, "triangle", 0.3);
  toneAt(ctx2, master, 1568, base + 0.26, 0.9, "sine", 0.26);
}
const SOUND_RENDERERS = { beat: sfxBeat, sting: sfxSting, outro: sfxOutro };
let soundLog = [];
function playSound(name) {
  ensureAudio();
  SOUND_RENDERERS[name](audioCtx, masterGain, audioCtx.currentTime);
  if (recording) soundLog.push({ name, t: Math.max(0, (performance.now() - recStartT) / 1000) });
}
const playKkamnolSting = () => playSound("sting");
const playOutro = () => playSound("outro");
function playTone(freq, dur, type, peak) {
  ensureAudio();
  toneAt(audioCtx, masterGain, freq, audioCtx.currentTime, dur, type, peak);
  if (recording) soundLog.push({ tone: [freq, dur, type, peak], t: Math.max(0, (performance.now() - recStartT) / 1000) });
}
async function renderSoundtrack(durSec) {
  const sr = (audioCtx && audioCtx.sampleRate) || 48000;
  const len = Math.max(1, Math.ceil((durSec + 0.15) * sr));
  const oac = new OfflineAudioContext(1, len, sr);
  const gain = oac.createGain(); gain.gain.value = 0.5; gain.connect(oac.destination);
  for (const e of soundLog) {
    if (e.tone) toneAt(oac, gain, e.tone[0], e.t, e.tone[1], e.tone[2], e.tone[3]);
    else { const fn = SOUND_RENDERERS[e.name]; if (fn) fn(oac, gain, e.t); }
  }
  return await oac.startRendering();
}

// ---------- 녹화 (WebCodecs/mediabunny — 17.3 그대로) ----------
let mbOut = null, mbVideo = null, mbAudio = null, recording = false, recStartT = 0, lastFrameT = 0, addInFlight = false, lastAddP = null;
let lastVideoUrl = null, lastExt = "mp4";
async function startRecording() {
  if (typeof VideoEncoder === "undefined") return false;
  try {
    const mb = await import("https://esm.sh/mediabunny");
    mbOut = new mb.Output({ format: new mb.Mp4OutputFormat(), target: new mb.BufferTarget() });
    mbVideo = new mb.CanvasSource(canvas, { codec: "avc", bitrate: 6_000_000 });
    mbOut.addVideoTrack(mbVideo, { frameRate: 30 });
    mbAudio = null; soundLog = [];
    try {
      const acodec = (typeof AudioEncoder !== "undefined" && await mb.canEncodeAudio("aac")) ? "aac"
                   : (typeof AudioEncoder !== "undefined" && await mb.canEncodeAudio("opus")) ? "opus" : null;
      if (acodec) { mbAudio = new mb.AudioBufferSource({ codec: acodec, bitrate: 128_000 }); mbOut.addAudioTrack(mbAudio); }
    } catch { mbAudio = null; }
    await mbOut.start();
    recStartT = performance.now(); lastFrameT = 0; recording = true;
    recEl.hidden = false;
    return true;
  } catch (e) { console.warn("[rec] start", e); mbOut = null; mbVideo = null; mbAudio = null; recording = false; return false; }
}
function captureFrame(now) {
  if (!recording || !mbVideo || addInFlight || now - lastFrameT < 33) return;
  lastFrameT = now; addInFlight = true;
  try { lastAddP = Promise.resolve(mbVideo.add((now - recStartT) / 1000, 1 / 30)).catch(() => {}).finally(() => { addInFlight = false; }); }
  catch { addInFlight = false; }
}
async function stopRecording() {
  if (!recording || !mbOut) return null;
  recording = false; recEl.hidden = true;
  if (pendingResize) { pendingResize = false; applyResize(); }
  const out = mbOut, aud = mbAudio; mbOut = null; mbVideo = null; mbAudio = null;
  const durSec = (performance.now() - recStartT) / 1000;
  try {
    if (lastAddP) await lastAddP.catch(() => {});
    if (aud) { try { await aud.add(await renderSoundtrack(durSec)); } catch (e) { console.warn("[rec] audio", e); } }
    await out.finalize();
    return new Blob([out.target.buffer], { type: "video/mp4" });
  } catch (e) { console.warn("[rec] finalize", e); return null; }
}

// ---------- 카메라 + 모델 ----------
let poseLm = null, segmenter = null;
async function initCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false,
  });
  video.srcObject = stream;
  await video.play();
  await new Promise((r) => { if (video.videoWidth) return r(); video.onloadedmetadata = () => r(); });
}
async function initModels() {
  const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
  poseLm = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task", delegate: "GPU" },
    runningMode: "IMAGE", numPoses: 1,
  });
  segmenter = await ImageSegmenter.createFromOptions(vision, {
    baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite", delegate: "GPU" },
    runningMode: "IMAGE", outputCategoryMask: false, outputConfidenceMasks: true,
  });
}
function camTransform() {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) return null;
  const scale = Math.max(W / vw, H / vh), dw = vw * scale, dh = vh * scale;
  return { vw, vh, scale, dw, dh, ox: (W - dw) / 2, oy: (H - dh) / 2 };
}

// ===========================================================================
//  캡쳐 → 누끼 + 스켈레톤 + 메시
// ===========================================================================
function newCanvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }

// 누끼/메시 공통: cut(투명 배경 캔버스), J(관절 좌표 cut px) → 메시 빌드
function buildFromCutout(cutCanvas, J) {
  cut = cutCanvas;
  bbox = bboxFromAlpha(cut);
  bones = buildBones(J);
  buildMesh();
  computeStagePlacement();
}

// 누끼 캔버스의 알파에서 바운딩박스
function bboxFromAlpha(c) {
  const cw = c.width, ch = c.height;
  const s = Math.min(1, 200 / Math.max(cw, ch));     // 다운샘플 커버리지
  const sw = Math.max(1, Math.round(cw * s)), sh = Math.max(1, Math.round(ch * s));
  const tmp = newCanvas(sw, sh), tc = tmp.getContext("2d");
  tc.drawImage(c, 0, 0, sw, sh);
  const data = tc.getImageData(0, 0, sw, sh).data;
  let minX = sw, minY = sh, maxX = 0, maxY = 0, any = false;
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    if (data[(y * sw + x) * 4 + 3] > 24) { any = true; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  // 커버리지 샘플러 보관(빈 삼각형 스킵용)
  coverage = { data, sw, sh, sx: sw / cw, sy: sh / ch };
  if (!any) return { minX: 0, minY: 0, maxX: cw, maxY: ch };
  const padX = (maxX - minX) * 0.06 + 2, padY = (maxY - minY) * 0.05 + 2;
  return {
    minX: Math.max(0, (minX - padX)) / s, minY: Math.max(0, (minY - padY)) / s,
    maxX: Math.min(sw, (maxX + padX)) / s, maxY: Math.min(sh, (maxY + padY)) / s,
  };
}
let coverage = null;
function alphaAt(ux, uy) {
  if (!coverage) return 255;
  const x = Math.max(0, Math.min(coverage.sw - 1, Math.floor(ux * coverage.sx)));
  const y = Math.max(0, Math.min(coverage.sh - 1, Math.floor(uy * coverage.sy)));
  return coverage.data[(y * coverage.sw + x) * 4 + 3];
}

// ---------- 스켈레톤 (관절 J → 본 배열, FK 계층) ----------
// 본: {name,S,E,parent,restAng,len, lr,lv, k,c}.  parent는 앞선 인덱스만 참조(처리 순서=계층 순서)
function buildBones(J) {
  const B = [];
  const mk = (name, S, E, parent, k, c) => {
    const dx = E[0] - S[0], dy = E[1] - S[1];
    B.push({ name, S, E, parent, restAng: Math.atan2(dy, dx), len: Math.hypot(dx, dy), lr: 0, lv: 0, k, c, M: null });
    return B.length - 1;
  };
  const spine = mk("spine", J.midHip, J.midSh, -1, 70, 8);
  mk("head", J.midSh, J.head, spine, 52, 6);
  const uAL = mk("uArmL", J.shL, J.elL, spine, 58, 7); mk("fArmL", J.elL, J.wrL, uAL, 42, 5);
  const uAR = mk("uArmR", J.shR, J.elR, spine, 58, 7); mk("fArmR", J.elR, J.wrR, uAR, 42, 5);
  const tL = mk("thighL", J.hipL, J.knL, spine, 82, 9); mk("shinL", J.knL, J.anL, tL, 62, 7);
  const tR = mk("thighR", J.hipR, J.knR, spine, 82, 9); mk("shinR", J.knR, J.anR, tR, 62, 7);
  return B;
}

// ---------- 메시(그리드) + 2-bone LBS 바인딩 ----------
function distToSeg(px2, py2, S, E) {
  const vx = E[0] - S[0], vy = E[1] - S[1];
  const wx = px2 - S[0], wy = py2 - S[1];
  const len2 = vx * vx + vy * vy || 1e-6;
  let t = (wx * vx + wy * vy) / len2; t = Math.max(0, Math.min(1, t));
  const cx = S[0] + t * vx, cy = S[1] + t * vy;
  return Math.hypot(px2 - cx, py2 - cy);
}
function bindVertex(ux, uy) {
  let i0 = -1, i1 = -1, d0 = Infinity, d1 = Infinity;
  for (let i = 0; i < bones.length; i++) {
    const d = distToSeg(ux, uy, bones[i].S, bones[i].E);
    if (d < d0) { d1 = d0; i1 = i0; d0 = d; i0 = i; }
    else if (d < d1) { d1 = d; i1 = i; }
  }
  const eps = (MIN || 600) * 0.0008 + 1;
  const w0 = 1 / (d0 * d0 + eps), w1 = i1 >= 0 ? 1 / (d1 * d1 + eps) : 0;
  const s = w0 + w1;
  return i1 >= 0 ? [{ i: i0, w: w0 / s }, { i: i1, w: w1 / s }] : [{ i: i0, w: 1 }];
}
function buildMesh() {
  const COLS = 11, ROWS = 15;
  verts = []; tris = [];
  const x0 = bbox.minX, y0 = bbox.minY, gw = bbox.maxX - bbox.minX, gh = bbox.maxY - bbox.minY;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ux = x0 + gw * c / (COLS - 1), uy = y0 + gh * r / (ROWS - 1);
    verts.push({ ux, uy, b: bindVertex(ux, uy), sx: 0, sy: 0 });
  }
  const idx = (r, c) => r * COLS + c;
  const cellInk = (a, b, c, d) => {
    const V = [verts[a], verts[b], verts[c], verts[d]];
    let mx = 0;
    for (const v of V) mx = Math.max(mx, alphaAt(v.ux, v.uy));
    // 셀 중심도 확인
    const cx = (V[0].ux + V[3].ux) / 2, cy = (V[0].uy + V[3].uy) / 2;
    mx = Math.max(mx, alphaAt(cx, cy));
    return mx > 14;
  };
  for (let r = 0; r < ROWS - 1; r++) for (let c = 0; c < COLS - 1; c++) {
    const a = idx(r, c), b = idx(r, c + 1), d = idx(r + 1, c), e = idx(r + 1, c + 1);
    if (cellInk(a, b, d, e)) { tris.push([a, b, d]); tris.push([b, e, d]); }
  }
}

// ---------- 스테이지 배치 (cut px → device px) ----------
function computeStagePlacement() {
  const bw = bbox.maxX - bbox.minX, bh = bbox.maxY - bbox.minY;
  let scale = (H * 0.56) / bh;                 // 키를 화면 56%로
  if (bw * scale > W * 0.86) scale = (W * 0.86) / bw;
  const bcx = (bbox.minX + bbox.maxX) / 2;
  const footY = H * 0.86;                       // 발끝을 86% 지점에
  stageFromCut = { a: scale, d: scale, e: W / 2 - bcx * scale, f: footY - bbox.maxY * scale };
}

// ===========================================================================
//  댄스 모션 (FK + 스프링 흐물흐물)
// ===========================================================================
const TAU = 6.2832, PERIOD = 1.05;
function danceLR(name, ph) {
  switch (name) {
    case "spine":  return 0.10 * Math.sin(ph);
    case "head":   return 0.18 * Math.sin(ph * 2 + 1.0);
    case "uArmL":  return  0.95 * Math.sin(ph) - 0.25;
    case "fArmL":  return  0.70 * Math.sin(ph + 0.8) - 0.1;
    case "uArmR":  return -0.95 * Math.sin(ph) - 0.25;
    case "fArmR":  return -0.70 * Math.sin(ph + 0.8) - 0.1;
    case "thighL": return  0.12 * Math.sin(ph);
    case "shinL":  return  0.16 * Math.sin(ph + 0.6);
    case "thighR": return -0.12 * Math.sin(ph);
    case "shinR":  return -0.16 * Math.sin(ph + 0.6);
  }
  return 0;
}
// 어파인 헬퍼 (2x3: {a,b,c,d,e,f} = [[a c e],[b d f]])
function affMul(M, N) {
  return {
    a: M.a * N.a + M.c * N.b, b: M.b * N.a + M.d * N.b,
    c: M.a * N.c + M.c * N.d, d: M.b * N.c + M.d * N.d,
    e: M.a * N.e + M.c * N.f + M.e, f: M.b * N.e + M.d * N.f + M.f,
  };
}
function rotAbout(cx, cy, ang) {
  const co = Math.cos(ang), si = Math.sin(ang);
  return { a: co, b: si, c: -si, d: co, e: cx - co * cx + si * cy, f: cy - si * cx - co * cy };
}
function scaleAbout(cx, cy, sx, sy) { return { a: sx, b: 0, c: 0, d: sy, e: cx - sx * cx, f: cy - sy * cy }; }
function transl(dx, dy) { return { a: 1, b: 0, c: 0, d: 1, e: dx, f: dy }; }

function updateBones(t, dt) {
  const ph = t * TAU / PERIOD;
  const bh = bbox.maxY - bbox.minY;
  const root = bones[0].S;     // midHip
  const dx = 0.045 * bh * Math.sin(ph);
  const dy = -0.075 * bh * (0.5 - 0.5 * Math.cos(2 * ph));
  const rot = 0.10 * Math.sin(ph);
  const sxx = 1 + 0.06 * Math.cos(2 * ph), syy = 1 - 0.06 * Math.cos(2 * ph);
  const G = affMul(transl(dx, dy), affMul(rotAbout(root[0], root[1], rot), scaleAbout(root[0], root[1], sxx, syy)));
  for (const bn of bones) {
    const target = danceLR(bn.name, ph);
    const acc = bn.k * (target - bn.lr) - bn.c * bn.lv;
    bn.lv += acc * dt; bn.lr += bn.lv * dt;
  }
  for (const bn of bones) {
    const local = rotAbout(bn.S[0], bn.S[1], bn.lr);
    bn.M = bn.parent < 0 ? affMul(G, local) : affMul(bones[bn.parent].M, local);
  }
}

// ===========================================================================
//  렌더
// ===========================================================================
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function fitFont(text, base, maxW, weight, fam) {
  ctx.font = `${weight} ${base}px ${fam}`;
  const w = ctx.measureText(text).width;
  return w > maxW ? base * maxW / w : base;
}

function drawKkamnolFrame() {
  const pad = Math.max(7, MIN * 0.013);
  ctx.save();
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.font = `900 ${MIN * 0.03}px ${FONT}`; ctx.fillStyle = SIGNAL;
  ctx.fillText("깜놀", pad * 2, H - pad * 2.1);
  ctx.restore();
}

let hookBottomY = 0;
function drawHook() {
  const t = hook(), maxW = W * 0.94;
  let fs = MIN * 0.085;
  const wrapLines = (size) => {
    ctx.font = `900 ${size}px ${FONT}`;
    const out = [""];
    for (const wd of t.split(" ")) {
      const test = out[out.length - 1] ? out[out.length - 1] + " " + wd : wd;
      if (ctx.measureText(test).width > maxW && out[out.length - 1]) out.push(wd);
      else out[out.length - 1] = test;
    }
    return out;
  };
  let lines = wrapLines(fs);
  while (lines.length > 2 && fs > MIN * 0.05) { fs *= 0.9; lines = wrapLines(fs); }
  ctx.font = `900 ${fs}px ${FONT}`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.lineJoin = "round"; ctx.miterLimit = 2; ctx.lineWidth = fs * 0.26; ctx.strokeStyle = "#0a0d0a";
  const lh = fs * 1.14, y0 = H * 0.18;
  hookBottomY = y0 + (lines.length - 1) * lh + fs * 0.75;
  lines.forEach((ln, i) => {
    const yy = y0 + i * lh;
    ctx.strokeText(ln, W / 2, yy);
    ctx.fillStyle = i % 2 === 0 ? "#ffe14d" : "#ffffff";
    ctx.fillText(ln, W / 2, yy);
  });
}

// 무대 — 스포트라이트 + 바닥 그림자 + 음표 파티클
function drawStage(now) {
  // 스포트라이트(시그널 살짝)
  const g = ctx.createRadialGradient(W / 2, H * 0.34, MIN * 0.05, W / 2, H * 0.5, MIN * 0.95);
  g.addColorStop(0, "rgba(232,255,46,0.10)");
  g.addColorStop(0.5, "rgba(232,255,46,0.03)");
  g.addColorStop(1, "rgba(17,17,20,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // 바닥 그림자(바운스에 따라 크기 변함)
  if (stageFromCut) {
    const ph = ((now - danceT0) / 1000) * TAU / PERIOD;
    const lift = 0.5 - 0.5 * Math.cos(2 * ph);     // 0(바닥)~1(점프)
    const sh = 1 - lift * 0.35;
    const cy = H * 0.875, rx = (bbox.maxX - bbox.minX) * stageFromCut.a * 0.42 * sh;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.globalAlpha = 0.5 * sh;
    ctx.beginPath(); ctx.ellipse(W / 2, cy, rx, rx * 0.22, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

function spawnNote(now) {
  const sig = Math.random() < 0.78;
  notes.push({
    x: W * (0.12 + Math.random() * 0.76), y: H * 0.95,
    vy: -(MIN * (0.18 + Math.random() * 0.16)), vx: (Math.random() - 0.5) * MIN * 0.06,
    life: 2.4 + Math.random() * 1.2, t: 2.4, rot: (Math.random() - 0.5) * 1.2,
    s: MIN * (0.03 + Math.random() * 0.025), color: sig ? SIGNAL : SHOCK,
    ch: Math.random() < 0.5 ? "♪" : "♫",
  });
}
function updateNotes(dt) {
  for (let i = notes.length - 1; i >= 0; i--) {
    const n = notes[i]; n.life -= dt;
    if (n.life <= 0) { notes.splice(i, 1); continue; }
    n.x += n.vx * dt; n.y += n.vy * dt; n.vy += MIN * 0.05 * dt;
  }
}
function drawNotes() {
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const n of notes) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, n.life / n.t)) * 0.9;
    ctx.translate(n.x, n.y); ctx.rotate(n.rot);
    ctx.fillStyle = n.color; ctx.font = `900 ${n.s}px ${FONT}`;
    ctx.fillText(n.ch, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// 흐물흐물 몸 워프 — 각 삼각형을 cut(UV)→스테이지(device px) 어파인 텍스처 매핑
function renderBody(now, shx, shy) {
  if (!cut || !stageFromCut || !verts.length) return;
  const t = (now - danceT0) / 1000;
  const dt = Math.min(0.034, (now - (renderBody._p || now)) / 1000 || 0.016);
  renderBody._p = now;
  updateBones(t, dt);

  const sc = stageFromCut, bh = bbox.maxY - bbox.minY;
  const jt = 0.011 * bh, sp = t * 7.0;
  for (const v of verts) {
    let wx = 0, wy = 0;
    for (const bw of v.b) { const M = bones[bw.i].M; wx += bw.w * (M.a * v.ux + M.c * v.uy + M.e); wy += bw.w * (M.b * v.ux + M.d * v.uy + M.f); }
    wx += jt * Math.sin(v.uy * 0.05 + sp);          // 표면 젤리 리플
    v.sx = sc.a * wx + sc.e + shx;
    v.sy = sc.d * wy + sc.f + shy;
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);               // 절대 좌표(셰이크는 정점에 이미 반영)
  ctx.imageSmoothingEnabled = true;
  for (const tr of tris) drawTri(verts[tr[0]], verts[tr[1]], verts[tr[2]]);
  ctx.restore();
}
function drawTri(A, B, C) {
  const u0 = A.ux, v0 = A.uy, u1 = B.ux, v1 = B.uy, u2 = C.ux, v2 = C.uy;
  const den = u0 * (v1 - v2) + u1 * (v2 - v0) + u2 * (v0 - v1);
  if (Math.abs(den) < 1e-6) return;
  const id = 1 / den;
  const a = (A.sx * (v1 - v2) + B.sx * (v2 - v0) + C.sx * (v0 - v1)) * id;
  const c = (A.sx * (u2 - u1) + B.sx * (u0 - u2) + C.sx * (u1 - u0)) * id;
  const e = (A.sx * (u1 * v2 - u2 * v1) + B.sx * (u2 * v0 - u0 * v2) + C.sx * (u0 * v1 - u1 * v0)) * id;
  const b = (A.sy * (v1 - v2) + B.sy * (v2 - v0) + C.sy * (v0 - v1)) * id;
  const d = (A.sy * (u2 - u1) + B.sy * (u0 - u2) + C.sy * (u1 - u0)) * id;
  const f = (A.sy * (u1 * v2 - u2 * v1) + B.sy * (u2 * v0 - u0 * v2) + C.sy * (u0 * v1 - u1 * v0)) * id;
  // dest 삼각형을 무게중심에서 살짝 확장(이음새 AA 틈 메움)
  const gx = (A.sx + B.sx + C.sx) / 3, gy = (A.sy + B.sy + C.sy) / 3, ex = 0.6;
  const exp = (sx, sy) => { const dx = sx - gx, dy = sy - gy, l = Math.hypot(dx, dy) || 1; return [sx + dx / l * ex, sy + dy / l * ex]; };
  const p0 = exp(A.sx, A.sy), p1 = exp(B.sx, B.sy), p2 = exp(C.sx, C.sy);
  ctx.save();
  ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.closePath(); ctx.clip();
  ctx.setTransform(a, b, c, d, e, f);
  ctx.drawImage(cut, 0, 0);
  ctx.restore();
}

function renderPoseGuide(now) {
  const fade = countdownStart ? Math.max(0, 1 - (now - countdownStart) / 450) : 1;
  if (fade <= 0) return;
  const cx = W / 2, u = MIN;
  const headR = u * 0.052, hy = H * 0.34, shY = hy + headR * 1.7, shW = u * 0.13, hipY = H * 0.62;
  ctx.save();
  ctx.globalAlpha = fade * 0.5;
  ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  // 몸통
  ctx.beginPath();
  ctx.moveTo(cx - shW, shY);
  ctx.quadraticCurveTo(cx - shW * 1.05, (shY + hipY) / 2, cx - shW * 0.7, hipY);
  ctx.lineTo(cx + shW * 0.7, hipY);
  ctx.quadraticCurveTo(cx + shW * 1.05, (shY + hipY) / 2, cx + shW, shY);
  ctx.quadraticCurveTo(cx, shY - headR * 0.6, cx - shW, shY);
  ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(cx, hy, headR, 0, TAU); ctx.fill();
  // 다리
  ctx.lineWidth = u * 0.055;
  ctx.beginPath(); ctx.moveTo(cx - shW * 0.4, hipY); ctx.lineTo(cx - shW * 0.5, H * 0.82); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + shW * 0.4, hipY); ctx.lineTo(cx + shW * 0.5, H * 0.82); ctx.stroke();
  // 팔(살짝 든 자세)
  ctx.lineWidth = u * 0.045;
  ctx.beginPath(); ctx.moveTo(cx - shW * 0.85, shY + u * 0.01); ctx.quadraticCurveTo(cx - shW * 1.5, shY + u * 0.04, cx - shW * 1.6, shY - u * 0.05); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + shW * 0.85, shY + u * 0.01); ctx.quadraticCurveTo(cx + shW * 1.5, shY + u * 0.04, cx + shW * 1.6, shY - u * 0.05); ctx.stroke();
  ctx.restore();
}

function renderReady(now) {
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (!countdownStart) {
    ctx.fillStyle = "#fff";
    ctx.shadowBlur = MIN * 0.025; ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.font = `800 ${fitFont(px("stand"), MIN * 0.05, W * 0.9, 800, FONT)}px ${FONT}`;
    ctx.fillText(px("stand"), W / 2, H * 0.12);
    ctx.shadowBlur = 0;
  } else {
    const sec = (now - countdownStart) / 1000, cur = Math.ceil(3 - sec);
    if (sec < 3 && cur >= 1) {
      const within = (3 - sec) - (cur - 1);
      ctx.save();
      ctx.globalAlpha = Math.min(1, within * 2.4);
      ctx.fillStyle = "#fff";
      ctx.shadowBlur = MIN * 0.06; ctx.shadowColor = "rgba(255,45,111,0.9)";
      ctx.font = `900 ${MIN * 0.26 * (1.35 - within * 0.35)}px ${FONT}`;
      ctx.fillText(String(cur), W / 2, H * 0.5);
      ctx.restore();
    }
  }
}

function renderOutro(now) {
  const el = (now - phaseStart) / 1000;
  const fade = Math.min(1, el / 0.4) * Math.min(1, Math.max(0, (2.3 - el) / 0.4));
  ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = fade;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = SIGNAL; ctx.font = `800 ${MIN * 0.045}px ${FONT}`;
  ctx.fillText(tk("outroCta"), W / 2, H / 2 - MIN * 0.22);
  ctx.fillStyle = SIGNAL; ctx.font = `900 ${MIN * 0.16}px ${FONT}`;
  ctx.fillText("깜놀", W / 2, H / 2 + MIN * 0.01);
  ctx.fillStyle = PAPER; ctx.font = `900 ${MIN * 0.058}px ${FONT}`;
  ctx.fillText("KKAMNOL", W / 2, H / 2 + MIN * 0.11);
  ctx.fillStyle = "rgba(247,247,242,0.55)"; ctx.font = `700 ${MIN * 0.034}px ${FONT}`;
  ctx.fillText("kkamnol.xyz", W / 2, H / 2 + MIN * 0.18);
  ctx.globalAlpha = 1;
}

function updateModePill(now) {
  if (!modeEl) return;
  modeEl.textContent = isDemo ? tk("modeDemo") : phase === "dance" ? tk("modeBody") : camOn ? tk("modeShow") : "· · ·";
}

// ---------- 메인 렌더 ----------
function render(now) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
  const sh = now < shakeUntil ? (shakeUntil - now) / 420 : 0;
  const shx = sh > 0 ? (Math.random() * 2 - 1) * MIN * 0.02 * sh : 0;
  const shy = sh > 0 ? (Math.random() * 2 - 1) * MIN * 0.02 * sh : 0;
  ctx.save(); ctx.translate(shx, shy);
  renderScene(now, shx, shy);
  ctx.restore();
  if (now < flashUntil) {
    ctx.save(); ctx.globalAlpha = Math.min(1, (flashUntil - now) / 340) * 0.55;
    ctx.fillStyle = SHOCK; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  drawKkamnolFrame();
}

function renderScene(now, shx, shy) {
  if (phase === "outro") { renderOutro(now); return; }

  // ready/snap: 카메라 미리보기(거울)
  if ((phase === "ready" || phase === "snap") && camOn) {
    const tr = camTransform();
    if (tr) {
      ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1);
      ctx.drawImage(phase === "snap" && frozen ? frozen : video, tr.ox, tr.oy, tr.dw, tr.dh);
      ctx.restore();
      ctx.fillStyle = "rgba(17,17,20,0.35)"; ctx.fillRect(0, 0, W, H);
    }
  }

  if (phase === "ready") { renderPoseGuide(now); renderReady(now); updateModePill(now); return; }

  if (phase === "snap") {
    // 찰칵 화이트 플래시 + 문구
    if (now < snapFlashUntil) {
      ctx.save(); ctx.globalAlpha = Math.min(1, (snapFlashUntil - now) / 200);
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    ctx.fillStyle = SIGNAL; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `900 ${MIN * 0.12}px ${FONT}`;
    ctx.fillText(tk("snap"), W / 2, H * 0.5);
    updateModePill(now);
    return;
  }

  if (phase === "dance") {
    drawStage(now);
    drawNotes();                          // 몸 뒤로 음표
    renderBody(now, shx, shy);
    drawHook();
    updateModePill(now);
  }
}

// ---------- 메인 루프 ----------
function frame(now) {
  if (window.__manual) { requestAnimationFrame(frame); return; } // 헤드리스 검증 중엔 자동 렌더 정지(덮어쓰기 방지)
  const dt = Math.min(0.05, (now - (frame._p || now)) / 1000 || 0);
  frame._p = now;

  if (phase === "ready") {
    if (!countdownStart && now - phaseStart > 1800) { countdownStart = now; }
    if (countdownStart) {
      const sec = (now - countdownStart) / 1000, cur = Math.ceil(3 - sec);
      if (cur !== lastTick && cur >= 1 && cur <= 3) { lastTick = cur; playTone(620 + (3 - cur) * 140, 0.13, "square", 0.3); }
      if (sec >= 3 && phase === "ready") { phase = "snap"; phaseStart = now; snapFlashUntil = now + 220; playTone(1320, 0.18, "square", 0.32); doCapture(); }
    }
  }

  if (phase === "dance") {
    updateNotes(dt);
    if (now - (frame._note || 0) > 220) { frame._note = now; spawnNote(now); }
    // 비트 사운드(루프) — 녹화에도 박힘
    if (now - (frame._beat || 0) > PERIOD * 1000 / 2) { frame._beat = now; if (recording) playSound("beat"); }
  }

  render(now);
  captureFrame(now);
  requestAnimationFrame(frame);
}

// ===========================================================================
//  흐름: 캡쳐 → 반전 → 댄스 → 아웃트로 → 공유
// ===========================================================================
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function doCapture() {
  let built = false;
  try {
    if (camOn && poseLm && segmenter) built = await captureFromCamera();
  } catch (e) { console.warn("[capture]", e); }
  if (!built) { buildDemo(); }     // 캡쳐 실패 시 데모 캐릭터로 폴백
  await revealAndDance();
}

async function captureFromCamera() {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) return false;
  // 원본(미러 안 함) 프레임
  const frame0 = newCanvas(vw, vh), f0 = frame0.getContext("2d");
  f0.drawImage(video, 0, 0, vw, vh);
  frozen = frame0;

  const pr = poseLm.detect(frame0);
  if (!pr || !pr.landmarks || !pr.landmarks.length) return false;
  const lm = pr.landmarks[0];

  // 누끼: 미러된 프레임 + 미러된 마스크
  const c = newCanvas(vw, vh), cc = c.getContext("2d");
  cc.save(); cc.translate(vw, 0); cc.scale(-1, 1); cc.drawImage(frame0, 0, 0); cc.restore();
  try {
    const res = segmenter.segment(frame0);
    const masks = res.confidenceMasks || (res.categoryMask ? [res.categoryMask] : null);
    if (masks && masks.length) {
      const m = masks[0], mw = m.width, mh = m.height;
      const arr = m.getAsFloat32Array ? m.getAsFloat32Array() : null;
      const mk = newCanvas(mw, mh), mkc = mk.getContext("2d");
      const img = mkc.createImageData(mw, mh);
      // 마스크 극성 자동보정 — 몸통 중심 신뢰도가 낮으면 전경/배경 반전(모델 버전차 방어)
      let inv = false;
      if (arr) {
        const cxn = (lm[11].x + lm[12].x + lm[23].x + lm[24].x) / 4, cyn = (lm[11].y + lm[12].y + lm[23].y + lm[24].y) / 4;
        const mx = Math.min(mw - 1, Math.max(0, (cxn * mw) | 0)), my = Math.min(mh - 1, Math.max(0, (cyn * mh) | 0));
        if (arr[my * mw + mx] < 0.5) inv = true;
      }
      if (arr) for (let i = 0; i < mw * mh; i++) { let a = arr[i]; if (inv) a = 1 - a; a = Math.max(0, Math.min(1, a)); img.data[i * 4 + 3] = (a * 255) | 0; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = 255; }
      mkc.putImageData(img, 0, 0);
      cc.save(); cc.globalCompositeOperation = "destination-in";
      cc.translate(vw, 0); cc.scale(-1, 1); cc.drawImage(mk, 0, 0, vw, vh); cc.restore();
    }
    res.close && res.close();
  } catch (e) { console.warn("[seg]", e); /* 마스크 실패 시 사각 컷 그대로 */ }

  // 관절 → cut(미러) 좌표
  const P = (i) => [(1 - lm[i].x) * vw, lm[i].y * vh];
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const shL = P(11), shR = P(12), hipL = P(23), hipR = P(24);
  const midSh = mid(shL, shR), midHip = mid(hipL, hipR);
  const nose = P(0);
  const head = [nose[0], nose[1] - (midSh[1] - nose[1]) * 0.55];
  // 보이지 않는 하체는 추정(엉덩이→무릎→발목 연장)
  const vis = (i) => (lm[i].visibility == null ? 1 : lm[i].visibility);
  const knL = vis(25) > 0.25 ? P(25) : [hipL[0], hipL[1] + (midSh[1] - midHip[1]) * 0.9];
  const knR = vis(26) > 0.25 ? P(26) : [hipR[0], hipR[1] + (midSh[1] - midHip[1]) * 0.9];
  const anL = vis(27) > 0.25 ? P(27) : [knL[0], knL[1] + (knL[1] - hipL[1])];
  const anR = vis(28) > 0.25 ? P(28) : [knR[0], knR[1] + (knR[1] - hipR[1])];
  const J = {
    head, midSh, midHip,
    shL, shR, elL: P(13), elR: P(14), wrL: P(15), wrR: P(16),
    hipL, hipR, knL, knR, anL, anR,
  };
  buildFromCutout(c, J);
  return verts.length > 0 && tris.length > 0;
}

// ---------- 데모 캐릭터(카메라 없음/캡쳐 실패) ----------
function buildDemo() {
  isDemo = true;
  const cw = 540, ch = 760, c = newCanvas(cw, ch), g = c.getContext("2d");
  const cx = cw / 2;
  const J = {
    head: [cx, 150], midSh: [cx, 252], midHip: [cx, 470],
    shL: [cx - 78, 256], shR: [cx + 78, 256],
    elL: [cx - 120, 360], elR: [cx + 120, 360],
    wrL: [cx - 140, 466], wrR: [cx + 140, 466],
    hipL: [cx - 46, 470], hipR: [cx + 46, 470],
    knL: [cx - 44, 606], knR: [cx + 44, 606],
    anL: [cx - 42, 742], anR: [cx + 42, 742],
  };
  const limb = (A, B, w, col) => {
    g.strokeStyle = col; g.lineCap = "round"; g.lineWidth = w;
    g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke();
  };
  // 몸통
  g.fillStyle = SIGNAL;
  g.beginPath();
  g.moveTo(J.shL[0] - 6, J.shL[1]);
  g.quadraticCurveTo(cx - 96, 360, J.hipL[0] - 10, J.hipL[1] + 8);
  g.quadraticCurveTo(cx, J.hipL[1] + 34, J.hipR[0] + 10, J.hipR[1] + 8);
  g.quadraticCurveTo(cx + 96, 360, J.shR[0] + 6, J.shR[1]);
  g.quadraticCurveTo(cx, J.midSh[1] - 30, J.shL[0] - 6, J.shL[1]);
  g.closePath(); g.fill();
  // 팔/다리 캡슐
  limb(J.shL, J.elL, 40, SIGNAL); limb(J.elL, J.wrL, 32, SIGNAL);
  limb(J.shR, J.elR, 40, SIGNAL); limb(J.elR, J.wrR, 32, SIGNAL);
  limb(J.hipL, J.knL, 52, PAPER); limb(J.knL, J.anL, 42, PAPER);
  limb(J.hipR, J.knR, 52, PAPER); limb(J.knR, J.anR, 42, PAPER);
  // 손/발
  g.fillStyle = SIGNAL;
  for (const p of [J.wrL, J.wrR]) { g.beginPath(); g.arc(p[0], p[1], 22, 0, TAU); g.fill(); }
  g.fillStyle = PAPER;
  for (const p of [J.anL, J.anR]) { g.beginPath(); g.ellipse(p[0], p[1] + 6, 30, 18, 0, 0, TAU); g.fill(); }
  // 머리 + 얼굴
  g.fillStyle = PAPER; g.beginPath(); g.arc(J.head[0], J.head[1], 74, 0, TAU); g.fill();
  g.fillStyle = INK;
  g.beginPath(); g.arc(J.head[0] - 26, J.head[1] - 6, 9, 0, TAU); g.fill();
  g.beginPath(); g.arc(J.head[0] + 26, J.head[1] - 6, 9, 0, TAU); g.fill();
  g.strokeStyle = INK; g.lineWidth = 7; g.lineCap = "round";
  g.beginPath(); g.arc(J.head[0], J.head[1] + 16, 26, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
  // 볼터치(쇼크 핑크)
  g.fillStyle = "rgba(255,45,111,0.5)";
  g.beginPath(); g.arc(J.head[0] - 40, J.head[1] + 20, 12, 0, TAU); g.fill();
  g.beginPath(); g.arc(J.head[0] + 40, J.head[1] + 20, 12, 0, TAU); g.fill();

  buildFromCutout(c, J);
}

async function revealAndDance() {
  phase = "dance"; phaseStart = performance.now(); danceT0 = performance.now();
  notes = []; frame._note = 0; frame._beat = 0;
  const tnow = performance.now();
  flashUntil = tnow + 340; shakeUntil = tnow + 430;
  await startRecording();
  playKkamnolSting();
  bumpPlay("wobble");
  await wait(DANCE_MS);
  phase = "outro"; phaseStart = performance.now();
  playOutro();
  await wait(2300);
  const blob = await stopRecording();
  showShare(blob);
}

// ---------- 공유 ----------
function showShare(blob) {
  phase = "idle";
  shareScreen.hidden = false;
  const saveBtn = document.getElementById("saveBtn");
  if (blob && blob.size) {
    lastExt = "mp4";
    if (lastVideoUrl) URL.revokeObjectURL(lastVideoUrl);
    lastVideoUrl = URL.createObjectURL(blob);
    shareVid.src = lastVideoUrl; shareVid.hidden = false;
    saveBtn.onclick = () => downloadBlob(lastVideoUrl, `kkamnol-wobble.${lastExt}`);
  } else {
    shareVid.hidden = true;
    saveBtn.onclick = () => shareResultImage();
  }
}
function downloadBlob(url, name) { const a = document.createElement("a"); a.href = url; a.download = name; a.click(); }
async function shareLink() {
  const url = "https://kkamnol.xyz/wobble";
  try { if (navigator.share) { await navigator.share({ title: tk("title"), text: tk("tagline"), url }); bumpShare("wobble"); return; } } catch { return; }
  try { await navigator.clipboard.writeText(url); bumpShare("wobble"); toast(tk("linkCopied")); } catch { toast(url); }
}
async function shareResultImage() {
  canvas.toBlob(async (b) => {
    if (!b) return;
    const f = new File([b], "kkamnol-wobble.png", { type: "image/png" });
    try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: "Kkamnol" }); return; } } catch {}
    downloadBlob(URL.createObjectURL(b), "kkamnol-wobble.png");
  });
}

// ---------- 토스트 ----------
let toastTimer = null;
function toast(msg, ms = 2600) { toastEl.textContent = msg; toastEl.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => (toastEl.hidden = true), ms); }

// ---------- 언어 / UI ----------
function applyLang() {
  document.documentElement.lang = lang;
  document.getElementById("startTitle").textContent = tk("title");
  document.getElementById("startTagline").textContent = tk("tagline");
  document.getElementById("startHow").textContent = tk("how");
  document.getElementById("startBtn").textContent = tk("startCam");
  document.getElementById("startNoCam").textContent = tk("startMouse");
  document.getElementById("startPrivacy").textContent = tk("privacy");
  document.getElementById("shareTitle").textContent = tk("shareTitle");
  document.getElementById("saveBtn").textContent = tk("shareSave");
  document.getElementById("linkBtn").textContent = tk("shareLink");
  document.getElementById("againBtn").textContent = tk("again");
}
const FLAGS = { ko:"🇰🇷", en:"🇺🇸", ja:"🇯🇵", zh:"🇨🇳", es:"🇪🇸", pt:"🇧🇷", fr:"🇫🇷", de:"🇩🇪", it:"🇮🇹", ru:"🇷🇺", tr:"🇹🇷", id:"🇮🇩", vi:"🇻🇳", th:"🇹🇭", ar:"🇸🇦", hi:"🇮🇳" };
function buildLangGrid() {
  const grid = document.getElementById("langGrid");
  grid.innerHTML = "";
  for (const code of Object.keys(I18N)) {
    const b = document.createElement("button");
    b.className = "lang-btn"; b.textContent = (FLAGS[code] ? FLAGS[code] + "  " : "") + I18N[code].nat;
    b.onclick = () => { lang = code; applyLang(); langScreen.hidden = true; startScreen.hidden = false; };
    grid.appendChild(b);
  }
}

function beginReady() {
  phase = "ready"; phaseStart = performance.now();
  countdownStart = 0; lastTick = -1;
  startScreen.hidden = true; shareScreen.hidden = true;
}

document.getElementById("startBtn").addEventListener("click", async () => {
  unlockAudio();
  const btn = document.getElementById("startBtn");
  btn.disabled = true;
  isDemo = false;
  try {
    await initCamera();
    camOn = true;
    try { await initModels(); } catch (e) { console.warn("[models]", e); }
  } catch { camOn = false; }
  btn.disabled = false;
  if (camOn) beginReady();
  else { isDemo = true; buildDemo(); startScreen.hidden = true; revealAndDance(); }  // 카메라 거부 → 데모
});
document.getElementById("startNoCam").addEventListener("click", () => {
  unlockAudio(); isDemo = true; camOn = false;
  buildDemo(); startScreen.hidden = true; shareScreen.hidden = true; revealAndDance();
});
document.getElementById("linkBtn").addEventListener("click", shareLink);
document.getElementById("againBtn").addEventListener("click", () => { shareScreen.hidden = true; startScreen.hidden = false; });

// 헤드리스/디버그 훅 — 카메라 없이 데모 댄스를 즉시 구동(검증용)
window.__demoDance = () => { isDemo = true; camOn = false; langScreen.hidden = true; startScreen.hidden = true; buildDemo(); revealAndDance(); };
// 헤드리스 검증용 — rAF 루프를 동결(__manual)하고 합성 시계로 tSec 만큼 적분 후 마지막 포즈를 남김
window.__manual = false;
window.__pump = (tSec = 4, dtMs = 33) => {
  window.__manual = true;
  if (!cut) { isDemo = true; camOn = false; buildDemo(); }
  langScreen.hidden = true; startScreen.hidden = true; shareScreen.hidden = true;
  phase = "dance"; notes = [];
  const base = performance.now();
  danceT0 = base; flashUntil = 0; shakeUntil = 0; renderBody._p = undefined;
  const N = Math.max(1, Math.floor(tSec * 1000 / dtMs));
  for (let i = 0; i < N; i++) { updateNotes(dtMs / 1000); if (i % 7 === 0) spawnNote(base + i * dtMs); render(base + i * dtMs); }
  return window.__state();
};
window.__state = () => ({ phase, isDemo, verts: verts.length, tris: tris.length, hasCut: !!cut, bbox, recording });

// ---------- 부트 ----------
buildLangGrid();
applyLang();
frame._p = performance.now();
requestAnimationFrame(frame);
