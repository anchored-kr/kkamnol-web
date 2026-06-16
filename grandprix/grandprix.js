import * as THREE from "three";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (s) => document.querySelector(s);

/* ============ 오디오 (Web Audio 합성, 무에셋) ============ */
const Sfx = (() => {
  let ctx = null;
  let muted = false;
  const ensure = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };
  const noise = (dur) => {
    const c = ensure();
    const len = Math.floor(c.sampleRate * dur);
    const b = c.createBuffer(1, len, c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  };
  function click() {
    if (muted) return;
    const c = ensure(), t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = "square";
    o.frequency.value = 440;
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 0.09);
  }
  function drumroll(dur = 1.1) {
    if (muted) return;
    const c = ensure(), t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = noise(dur);
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 190;
    f.Q.value = 1.3;
    const g = c.createGain();
    g.gain.value = 0.12;
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.type = "square";
    lfo.frequency.value = 17;
    lg.gain.value = 0.16;
    lfo.connect(lg).connect(g.gain);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t); lfo.start(t);
    src.stop(t + dur); lfo.stop(t + dur);
  }
  function impact() {
    if (muted) return;
    const c = ensure(), t = c.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((fr) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = "triangle";
      o.frequency.value = fr;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.14, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      o.connect(g).connect(c.destination);
      o.start(t); o.stop(t + 0.85);
    });
    const src = c.createBufferSource();
    src.buffer = noise(0.25);
    const f = c.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 2200;
    const g = c.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t);
  }
  function cheer(dur = 1.5) {
    if (muted) return;
    const c = ensure(), t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = noise(dur);
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 1600;
    f.Q.value = 0.5;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.13, t + 0.25);
    g.gain.linearRampToValueAtTime(0.1, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t);
  }
  return {
    click, drumroll, impact, cheer,
    resume: () => ensure(),
    toggle: () => (muted = !muted),
    get muted() { return muted; },
  };
})();

/* ============ 렌더러 / 씬 ============ */
const canvas = $("#stage");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0d0a);
scene.fog = new THREE.Fog(0x0a0d0a, 16, 34);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2.7, 9);

scene.add(new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshStandardMaterial({ color: 0x0e130f, roughness: 0.85, metalness: 0.15 })
).rotateX(-Math.PI / 2));

const wall = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 34),
  new THREE.MeshStandardMaterial({ color: 0x0b0f0c, roughness: 1 })
);
wall.position.set(0, 9, -12);
scene.add(wall);

/* ---- 전광판(스크린): 이모지 또는 실사진 ---- */
const screenCanvas = document.createElement("canvas");
screenCanvas.width = 1024;
screenCanvas.height = 600;
const sctx = screenCanvas.getContext("2d");
const screenTex = new THREE.CanvasTexture(screenCanvas);
screenTex.colorSpace = THREE.SRGBColorSpace;
const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
const screen = new THREE.Mesh(new THREE.PlaneGeometry(9, 5.2), screenMat);
screen.position.set(0, 4.4, -8);
scene.add(screen);

let item = { emoji: "🐵", bg: "#ffd93b", legends: ["월요일의 나", "출근 싫다", "김대리.exe"] };

function drawEmojiScene(it) {
  sctx.fillStyle = it.bg || "#ffd93b";
  sctx.fillRect(0, 0, 1024, 600);
  sctx.textAlign = "center";
  sctx.textBaseline = "middle";
  sctx.font = '360px "Apple Color Emoji","Noto Color Emoji",sans-serif';
  sctx.fillText(it.emoji || "🐵", 512, 300);
  screenTex.needsUpdate = true;
}
function drawImageCover(img) {
  const cw = 1024, ch = 600;
  const r = Math.max(cw / img.width, ch / img.height);
  const w = img.width * r, h = img.height * r;
  sctx.fillStyle = "#000";
  sctx.fillRect(0, 0, cw, ch);
  sctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  screenTex.needsUpdate = true;
}
function updateScreen(it) {
  drawEmojiScene(it); // 즉시 폴백
  if (it.image) {
    const img = new Image();
    img.crossOrigin = "anonymous"; // 같은 도메인이면 무해
    img.onload = () => drawImageCover(img);
    img.src = it.image; // 예: /grandprix/img/foo.jpg (동일 출처 → canvas 오염 없음)
  }
}
updateScreen(item);

/* ---- 골드 8각 프레임 ---- */
function octShape(r) {
  const s = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    const px = Math.cos(a) * r, py = Math.sin(a) * r;
    i ? s.lineTo(px, py) : s.moveTo(px, py);
  }
  s.closePath();
  return s;
}
const ring = octShape(3.95);
ring.holes.push(new THREE.Path(octShape(3.3).getPoints()));
const frameGeo = new THREE.ExtrudeGeometry(ring, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 1 });
const frameMat = new THREE.MeshStandardMaterial({ color: 0xffc21e, emissive: 0xffae00, emissiveIntensity: 0.9, metalness: 0.7, roughness: 0.28 });
const frame = new THREE.Mesh(frameGeo, frameMat);
frame.position.set(0, 4.4, -8.4);
frame.scale.set(1.55, 1.08, 1);
scene.add(frame);

const frameLight = new THREE.PointLight(0xffb300, 40, 26, 2);
frameLight.position.set(0, 4.4, -6.4);
scene.add(frameLight);

/* ---- 심사위원 5인 (디테일·리액션) ---- */
const judges = [];
const SKINS = [0xe7b699, 0xf1c9a5, 0xd9a07a, 0xeabd96, 0xc98b66];
const SUITS = [0x191e22, 0x20242a, 0x15181c, 0x232026, 0x1a1d1f];
function makeJudge(x, i) {
  const g = new THREE.Group();
  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(1.95, 1.15, 0.75),
    new THREE.MeshStandardMaterial({ color: 0x10140f, roughness: 0.8, metalness: 0.2 })
  );
  desk.position.set(0, 0.575, 0);
  g.add(desk);

  const barMat = new THREE.MeshStandardMaterial({ color: 0xffd000, emissive: 0xffae00, emissiveIntensity: 0.7 });
  for (let k = 0; k < 7; k++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.55, 0.07), barMat);
    b.position.set(-0.62 + k * 0.205, 0.6, 0.39);
    g.add(b);
  }

  const person = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.66, 0.9, 0.42),
    new THREE.MeshStandardMaterial({ color: SUITS[i], roughness: 0.7 })
  );
  body.position.set(0, 1.55, -0.05);
  person.add(body);
  // 보타이
  const tie = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.1, 0.05),
    new THREE.MeshStandardMaterial({ color: 0xffce2e, emissive: 0x553f00, emissiveIntensity: 0.3 })
  );
  tie.position.set(0, 1.86, 0.17);
  person.add(tie);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 24, 24),
    new THREE.MeshStandardMaterial({ color: SKINS[i], roughness: 0.85 })
  );
  head.position.set(0, 2.12, -0.05);
  person.add(head);
  // 머리카락
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.285, 20, 16, 0, Math.PI * 2, 0, Math.PI / 1.7),
    new THREE.MeshStandardMaterial({ color: 0x18120e, roughness: 0.95 })
  );
  hair.position.set(0, 2.16, -0.05);
  person.add(hair);
  // 안경(한 명)
  if (i === 3) {
    const gm = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5, roughness: 0.4 });
    [-0.1, 0.1].forEach((gx) => {
      const lens = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 8, 16), gm);
      lens.position.set(gx, 2.12, 0.22);
      person.add(lens);
    });
  }
  g.add(person);

  g.position.set(x, 0, -3.7);
  g.userData = { barMat, person, pulse: 0 };
  judges.push(g);
  return g;
}
[-4.7, -2.35, 0, 2.35, 4.7].forEach((x, i) => scene.add(makeJudge(x, i)));

/* ---- 조명 ---- */
scene.add(new THREE.HemisphereLight(0x6f8fb0, 0x0a0a0a, 0.55));
scene.add(new THREE.AmbientLight(0x223322, 0.55));
const key = new THREE.SpotLight(0xfff2cc, 70, 32, 0.62, 0.45, 1.2);
key.position.set(0, 11, 7);
key.target.position.set(0, 1, -2);
scene.add(key, key.target);
const rim = new THREE.PointLight(0x66ccff, 12, 24, 2);
rim.position.set(-7, 5, 2);
scene.add(rim);

/* ---- 루프 (카메라 줌 + 심사위원 바운스) ---- */
const cam = { zoom: 0, zoomCur: 0 };
let t = 0;
function animate() {
  requestAnimationFrame(animate);
  t += 0.016;
  cam.zoomCur += (cam.zoom - cam.zoomCur) * 0.08;
  camera.position.x = Math.sin(t * 0.25) * 0.55;
  camera.position.y = 2.7 + Math.sin(t * 0.4) * 0.07;
  camera.position.z = 9 - cam.zoomCur * 1.9;
  camera.lookAt(0, 4.1, -8);
  frameMat.emissiveIntensity = 0.8 + Math.sin(t * 2.2) * 0.18;
  judges.forEach((j) => {
    if (j.userData.pulse > 0.001) {
      j.userData.pulse *= 0.9;
      j.userData.person.position.y = Math.abs(Math.sin(t * 22)) * j.userData.pulse * 0.22;
    } else {
      j.userData.person.position.y = 0;
    }
  });
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ---- 연출 효과 ---- */
function flashScreen() {
  const f = $("#flash");
  f.classList.remove("on");
  void f.offsetWidth;
  f.classList.add("on");
}
function burstConfetti() {
  const wrap = $("#confetti");
  const colors = ["#ffce2e", "#ff5a5f", "#5ad1ff", "#7af0a0", "#ff7ab8", "#ffffff"];
  for (let i = 0; i < 46; i++) {
    const d = document.createElement("div");
    d.className = "conf";
    d.style.left = Math.random() * 100 + "vw";
    d.style.background = colors[i % colors.length];
    d.style.animationDuration = 1.6 + Math.random() * 1.4 + "s";
    d.style.animationDelay = Math.random() * 0.25 + "s";
    d.style.transform = `rotate(${Math.random() * 360}deg)`;
    wrap.appendChild(d);
    setTimeout(() => d.remove(), 3200);
  }
}

/* ---- 반응 시퀀스 ---- */
let busy = false;
async function judgeReaction(caption) {
  if (busy) return;
  busy = true;
  Sfx.resume();
  $("#play").hidden = true;

  // 긴장 (드럼롤 + 줌인)
  $("#suspense").hidden = false;
  cam.zoom = 1;
  Sfx.drumroll(1.1);
  await sleep(1050);
  $("#suspense").hidden = true;

  // 심사위원 순차 점등
  for (let i = 0; i < judges.length; i++) {
    judges[i].userData.barMat.emissiveIntensity = 2.6;
    judges[i].userData.pulse = 1;
    Sfx.click();
    await sleep(105);
  }

  // 깜놀 보드 슬램
  const bb = $("#bigboard");
  bb.hidden = false;
  bb.classList.remove("slam");
  void bb.offsetWidth;
  bb.classList.add("slam");
  flashScreen();
  burstConfetti();
  Sfx.impact();
  Sfx.cheer(1.5);
  cam.zoom = 0;

  await sleep(650);
  $("#myCaption").textContent = `“${caption}”`;
  $("#legendList").innerHTML = (item.legends || []).map((l) => `<li>${escapeHtml(l)}</li>`).join("");
  $("#result").hidden = false;
  busy = false;
}
function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/* ---- 공유 결과 카드 (1080x1350) ---- */
function buildShareCard(caption) {
  const cv = document.createElement("canvas");
  cv.width = 1080; cv.height = 1350;
  const x = cv.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, 1350);
  g.addColorStop(0, "#16140d");
  g.addColorStop(1, "#0c0e0a");
  x.fillStyle = g;
  x.fillRect(0, 0, 1080, 1350);
  x.textAlign = "center";
  x.fillStyle = "#ffce2e";
  x.font = "800 44px 'Noto Sans KR', sans-serif";
  x.fillText("깜놀 그랑프리 · 사진 한 줄 평", 540, 116);
  // 전광판 사진 (스크린 캔버스 재사용)
  const pw = 900, ph = pw * (600 / 1024), py = 180;
  x.save();
  x.beginPath();
  const r = 36, px = 90;
  x.moveTo(px + r, py); x.arcTo(px + pw, py, px + pw, py + ph, r);
  x.arcTo(px + pw, py + ph, px, py + ph, r); x.arcTo(px, py + ph, px, py, r);
  x.arcTo(px, py, px + pw, py, r); x.closePath();
  x.lineWidth = 14; x.strokeStyle = "#ffc21e"; x.stroke(); x.clip();
  x.drawImage(screenCanvas, px, py, pw, ph);
  x.restore();
  // 합격 도장
  x.save();
  x.translate(900, 200 + ph - 60); x.rotate(-0.22);
  x.strokeStyle = "#e0245e"; x.fillStyle = "#e0245e"; x.lineWidth = 9;
  x.beginPath(); x.arc(0, 0, 84, 0, Math.PI * 2); x.stroke();
  x.font = "800 50px 'Noto Sans KR', sans-serif"; x.textBaseline = "middle";
  x.fillText("깜놀!", 0, 4); x.restore();
  x.textBaseline = "alphabetic";
  // 내 답변
  x.fillStyle = "#fff";
  x.font = "800 60px 'Noto Sans KR', sans-serif";
  wrapText(x, `“${caption}”`, 540, 1010, 920, 84);
  // 워터마크
  x.fillStyle = "#8a8a80";
  x.font = "500 34px 'Noto Sans KR', sans-serif";
  x.fillText("@kkamnol.interactive · kkamnol.xyz/grandprix", 540, 1290);
  return cv;
}
function wrapText(ctx, text, cx, cy, maxW, lh) {
  const chars = [...text];
  let line = "";
  const lines = [];
  for (const ch of chars) {
    if (ctx.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch; }
    else line += ch;
  }
  if (line) lines.push(line);
  const y0 = cy - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => ctx.fillText(l, cx, y0 + i * lh));
}
let lastCaption = "";
async function shareResult() {
  await (document.fonts && document.fonts.ready);
  const cv = buildShareCard(lastCaption);
  cv.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], "kkamnol-grandprix.png", { type: "image/png" });
    const data = { files: [file], title: "깜놀 그랑프리", text: "내 깜놀 그랑프리 답변 ㅋㅋ kkamnol.xyz/grandprix" };
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share(data); } catch (e) {}
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "kkamnol-grandprix.png"; a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

/* ---- 데일리 콘텐츠 ---- */
fetch("/jaemok/daily.json", { cache: "no-store" })
  .then((r) => r.json())
  .then((data) => {
    item = data[Math.floor(Date.now() / 86400000) % data.length];
    updateScreen(item);
  })
  .catch(() => {});

/* ---- 이벤트 ---- */
$("#form").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = $("#caption").value.trim();
  if (!v) return;
  lastCaption = v;
  judgeReaction(v);
});
$("#retry").addEventListener("click", () => {
  $("#result").hidden = true;
  $("#bigboard").hidden = true;
  $("#play").hidden = false;
  $("#caption").value = "";
  judges.forEach((j) => { j.userData.barMat.emissiveIntensity = 0.7; });
});
$("#share").addEventListener("click", shareResult);
$("#mute").addEventListener("click", (e) => {
  const m = Sfx.toggle();
  e.currentTarget.textContent = m ? "🔇" : "🔊";
});
