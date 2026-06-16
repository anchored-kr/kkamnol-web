import * as THREE from "three";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (s) => document.querySelector(s);
if (window.self !== window.top) document.documentElement.classList.add("framed"); // 폰 목업 안 → 아일랜드 여백
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

/* ============ 오디오 (Web Audio 합성) ============ */
const Sfx = (() => {
  let ctx = null, muted = false, bus = null, rdest = null;
  const ensure = () => {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      bus = ctx.createGain(); bus.connect(ctx.destination);
      rdest = ctx.createMediaStreamDestination(); bus.connect(rdest); // 영상 녹음용
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };
  const noise = (dur) => {
    const c = ensure(), len = Math.floor(c.sampleRate * dur);
    const b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  };
  const tone = (type, fr, t0, dur, peak) => {
    const c = ensure(), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = fr;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g).connect(bus); o.start(t0); o.stop(t0 + dur + 0.02);
  };
  return {
    resume: () => ensure(),
    toggle: () => (muted = !muted),
    get muted() { return muted; },
    recordTrack: () => { ensure(); return rdest.stream.getAudioTracks()[0]; }, // 영상 녹음용 오디오
    tick() { if (!muted) tone("triangle", 900, ensure().currentTime, 0.08, 0.12); },        // 슬롯 띵
    click() { if (!muted) tone("square", 440, ensure().currentTime, 0.08, 0.09); },          // 레버
    boom() {  // 두둥
      if (muted) return; const c = ensure(), t = c.currentTime;
      [72, 108].forEach((fr, i) => tone("sine", fr, t + i * 0.15, 0.55, 0.34));
      const s = c.createBufferSource(); s.buffer = noise(0.2);
      const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 240;
      const g = c.createGain(); g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      s.connect(f).connect(g).connect(bus); s.start(t);
    },
    gong() {  // 땅~
      if (muted) return; const c = ensure(), t = c.currentTime;
      [392, 523, 784, 1046, 1318].forEach((fr, i) => tone("sine", fr * (1 + i * 0.002), t, 1.6, 0.14 / (i + 1)));
    },
    impact() {
      if (muted) return; const c = ensure(), t = c.currentTime;
      [523, 659, 784, 1046].forEach((fr) => tone("triangle", fr, t, 0.8, 0.13));
      const s = c.createBufferSource(); s.buffer = noise(0.25);
      const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 2200;
      const g = c.createGain(); g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      s.connect(f).connect(g).connect(bus); s.start(t);
    },
    cheer(dur = 1.5) {
      if (muted) return; const c = ensure(), t = c.currentTime;
      const s = c.createBufferSource(); s.buffer = noise(dur);
      const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1600; f.Q.value = 0.5;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.13, t + 0.25);
      g.gain.linearRampToValueAtTime(0.1, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(f).connect(g).connect(bus); s.start(t);
    },
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
scene.fog = new THREE.Fog(0x0a0d0a, 18, 38);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);

scene.add(new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshStandardMaterial({ color: 0x0e130f, roughness: 0.85, metalness: 0.15 })
).rotateX(-Math.PI / 2));
const wall = new THREE.Mesh(new THREE.PlaneGeometry(80, 34), new THREE.MeshStandardMaterial({ color: 0x0b0f0c, roughness: 1 }));
wall.position.set(0, 9, -12); scene.add(wall);

/* ---- 전광판 ---- */
const screenCanvas = document.createElement("canvas");
screenCanvas.width = 1024; screenCanvas.height = 600;
const sctx = screenCanvas.getContext("2d");
const screenTex = new THREE.CanvasTexture(screenCanvas);
screenTex.colorSpace = THREE.SRGBColorSpace;
const screen = new THREE.Mesh(new THREE.PlaneGeometry(9, 5.2), new THREE.MeshBasicMaterial({ map: screenTex }));
screen.position.set(0, 4.4, -8); scene.add(screen);

function drawEmojiScene(it) {
  sctx.fillStyle = it.bg || "#ffd93b"; sctx.fillRect(0, 0, 1024, 600);
  sctx.textAlign = "center"; sctx.textBaseline = "middle";
  sctx.font = '360px "Apple Color Emoji","Noto Color Emoji",sans-serif';
  sctx.fillText(it.emoji || "🐵", 512, 300); screenTex.needsUpdate = true;
}
function drawImageCover(img) {
  const r = Math.max(1024 / img.width, 600 / img.height), w = img.width * r, h = img.height * r;
  sctx.fillStyle = "#000"; sctx.fillRect(0, 0, 1024, 600);
  sctx.drawImage(img, (1024 - w) / 2, (600 - h) / 2, w, h); screenTex.needsUpdate = true;
}
function drawPlaceholder() {
  sctx.fillStyle = "#1a1407"; sctx.fillRect(0, 0, 1024, 600);
  sctx.fillStyle = "#ffce2e"; sctx.textAlign = "center"; sctx.textBaseline = "middle";
  sctx.font = "800 230px 'Noto Sans KR',sans-serif"; sctx.fillText("?", 512, 310); screenTex.needsUpdate = true;
}
function drawItemToScreen(i) {
  const it = items[i], img = itemImgs[i];
  if (img && img.complete && img.naturalWidth) drawImageCover(img);
  else drawEmojiScene(it);
}

/* ---- 골드 8각 프레임 ---- */
function octShape(r) {
  const s = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath(); return s;
}
const ring = octShape(3.95);
ring.holes.push(new THREE.Path(octShape(3.3).getPoints()));
const frameGeo = new THREE.ExtrudeGeometry(ring, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 1 });
const frameMat = new THREE.MeshStandardMaterial({ color: 0xffc21e, emissive: 0xffae00, emissiveIntensity: 0.9, metalness: 0.7, roughness: 0.28 });
const frame = new THREE.Mesh(frameGeo, frameMat);
frame.position.set(0, 4.4, -8.4); frame.scale.set(1.55, 1.08, 1); scene.add(frame);
const frameLight = new THREE.PointLight(0xffb300, 40, 26, 2);
frameLight.position.set(0, 4.4, -6.4); scene.add(frameLight);

/* ---- 심사위원 5인 ---- */
const judges = [];
const SKINS = [0xe7b699, 0xf1c9a5, 0xd9a07a, 0xeabd96, 0xc98b66];
const SUITS = [0x191e22, 0x20242a, 0x15181c, 0x232026, 0x1a1d1f];
function pm(geo, mat, x, y, z) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; }
function makeJudge(x, i) {
  const g = new THREE.Group();
  g.add(pm(new THREE.BoxGeometry(1.95, 1.15, 0.75), new THREE.MeshStandardMaterial({ color: 0x10140f, roughness: 0.8, metalness: 0.2 }), 0, 0.575, 0));
  const barMat = new THREE.MeshStandardMaterial({ color: 0xffd000, emissive: 0xffae00, emissiveIntensity: 0.7 });
  for (let k = 0; k < 7; k++) g.add(pm(new THREE.BoxGeometry(0.15, 0.55, 0.07), barMat, -0.62 + k * 0.205, 0.6, 0.39));
  const person = new THREE.Group();
  person.add(pm(new THREE.BoxGeometry(0.66, 0.9, 0.42), new THREE.MeshStandardMaterial({ color: SUITS[i], roughness: 0.7 }), 0, 1.55, -0.05));
  person.add(pm(new THREE.BoxGeometry(0.22, 0.1, 0.05), new THREE.MeshStandardMaterial({ color: 0xffce2e, emissive: 0x553f00, emissiveIntensity: 0.3 }), 0, 1.86, 0.17));
  person.add(pm(new THREE.SphereGeometry(0.27, 24, 24), new THREE.MeshStandardMaterial({ color: SKINS[i], roughness: 0.85 }), 0, 2.12, -0.05));
  person.add(pm(new THREE.SphereGeometry(0.285, 20, 16, 0, Math.PI * 2, 0, Math.PI / 1.7), new THREE.MeshStandardMaterial({ color: 0x18120e, roughness: 0.95 }), 0, 2.16, -0.05));
  if (i === 3) {
    const gm = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5, roughness: 0.4 });
    [-0.1, 0.1].forEach((gx) => person.add(pm(new THREE.TorusGeometry(0.07, 0.015, 8, 16), gm, gx, 2.12, 0.22)));
  }
  g.add(person);
  g.position.set(x, 0, -3.7);
  g.userData = { barMat, person, pulse: 0 };
  judges.push(g); return g;
}
[-4.7, -2.35, 0, 2.35, 4.7].forEach((x, i) => scene.add(makeJudge(x, i)));

/* ---- 내 캐릭터 = 가운데(인덱스 2) 하이라이트 + 닉네임 라벨 ---- */
const labelCanvas = document.createElement("canvas");
labelCanvas.width = 420; labelCanvas.height = 140;
const labelTex = new THREE.CanvasTexture(labelCanvas);
labelTex.colorSpace = THREE.SRGBColorSpace;
function drawLabel(text) {
  const c = labelCanvas, x = c.getContext("2d");
  x.clearRect(0, 0, c.width, c.height);
  x.font = "800 52px 'Noto Sans KR','Apple Color Emoji',sans-serif";
  const tw = x.measureText(text).width;
  const w = Math.min(c.width - 16, tw + 56), h = 90, ox = (c.width - w) / 2, oy = (c.height - h) / 2, r = 28;
  x.fillStyle = "#ff5a5f";
  x.beginPath(); x.moveTo(ox + r, oy); x.arcTo(ox + w, oy, ox + w, oy + h, r); x.arcTo(ox + w, oy + h, ox, oy + h, r); x.arcTo(ox, oy + h, ox, oy, r); x.arcTo(ox, oy, ox + w, oy, r); x.closePath(); x.fill();
  x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(text, c.width / 2, oy + h / 2 + 2);
  labelTex.needsUpdate = true;
}
drawLabel("나");
const meSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthTest: false }));
meSprite.scale.set(1.9, 0.63, 1);
meSprite.position.set(0, 3.05, -3.5);
scene.add(meSprite);
// 가운데 캐릭터: 핑크 보타이로 구분
judges[2].userData.person.children[1].material = new THREE.MeshStandardMaterial({ color: 0xff5a5f, emissive: 0x551015, emissiveIntensity: 0.4 });
const meSpot = new THREE.SpotLight(0xfff0d8, 95, 16, 0.5, 0.5, 1.2);
meSpot.position.set(0, 9, 2); meSpot.target.position.set(0, 2, -3.7); scene.add(meSpot, meSpot.target);

/* ---- 영상용 캡션/깜놀 스프라이트 (캔버스 녹화에 담기도록 3D로) ---- */
const capCanvas = document.createElement("canvas"); capCanvas.width = 1024; capCanvas.height = 220;
const capTex = new THREE.CanvasTexture(capCanvas); capTex.colorSpace = THREE.SRGBColorSpace;
function drawVideoCaption(text) {
  const x = capCanvas.getContext("2d");
  x.clearRect(0, 0, 1024, 220);
  x.font = "800 64px 'Noto Sans KR','Apple Color Emoji',sans-serif";
  let t = text, tw = x.measureText(t).width;
  while (tw > 950 && t.length > 5) { t = t.slice(0, -2); tw = x.measureText(t + "…").width; }
  if (t !== text) t += "…";
  const w = Math.min(1006, tw + 70), h = 130, ox = (1024 - w) / 2, oy = 45, r = 40;
  x.fillStyle = "rgba(10,10,12,0.82)";
  x.beginPath(); x.moveTo(ox + r, oy); x.arcTo(ox + w, oy, ox + w, oy + h, r); x.arcTo(ox + w, oy + h, ox, oy + h, r); x.arcTo(ox, oy + h, ox, oy, r); x.arcTo(ox, oy, ox + w, oy, r); x.closePath(); x.fill();
  x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(t, 512, oy + h / 2);
  capTex.needsUpdate = true;
}
const capSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: capTex, transparent: true, depthTest: false }));
capSprite.scale.set(8.4, 1.8, 1); capSprite.position.set(0, 1.8, -7.8); capSprite.visible = false;
scene.add(capSprite);

const boomCanvas = document.createElement("canvas"); boomCanvas.width = 760; boomCanvas.height = 300;
{
  const x = boomCanvas.getContext("2d");
  x.font = "900 italic 170px 'Noto Sans KR','Apple Color Emoji',sans-serif";
  x.textAlign = "center"; x.textBaseline = "middle";
  x.fillStyle = "#ffce2e"; x.fillText("깜놀! 🎉", 380, 160);
}
const boomTex = new THREE.CanvasTexture(boomCanvas); boomTex.colorSpace = THREE.SRGBColorSpace;
const boomSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: boomTex, transparent: true, depthTest: false }));
boomSprite.scale.set(6.2, 2.4, 1); boomSprite.position.set(0, 5.4, -7.6); boomSprite.visible = false;
scene.add(boomSprite);

/* ---- 조명 ---- */
scene.add(new THREE.HemisphereLight(0x6f8fb0, 0x0a0a0a, 0.5));
scene.add(new THREE.AmbientLight(0x223322, 0.5));
const key = new THREE.SpotLight(0xfff2cc, 60, 34, 0.62, 0.45, 1.2);
key.position.set(0, 12, 8); key.target.position.set(0, 1, -2); scene.add(key, key.target);
const rim = new THREE.PointLight(0x66ccff, 12, 24, 2); rim.position.set(-7, 5, 2); scene.add(rim);

/* ---- 카메라 컨트롤러 (establish → play) ---- */
const cam = {
  estPos: new THREE.Vector3(0.9, 5.7, 12), estLook: new THREE.Vector3(0, 3.4, -3),
  playPos: new THREE.Vector3(0, 2.5, 6.4), playLook: new THREE.Vector3(0, 3.3, -7),
  zoom: 0, zoomCur: 0, punch: 0, punchCur: 0, shake: 0,
};
let t = 0, framePulse = 0;
function animate() {
  requestAnimationFrame(animate);
  t += 0.016;
  cam.zoomCur += (cam.zoom - cam.zoomCur) * 0.045;
  cam.punchCur += (cam.punch - cam.punchCur) * 0.1;
  const z = ease(cam.zoomCur);
  let sh = 0;
  if (cam.shake > 0.001) { cam.shake *= 0.88; sh = cam.shake; }
  camera.position.set(
    lerp(cam.estPos.x, cam.playPos.x, z) + Math.sin(t * 0.25) * 0.55 * z + (Math.random() - 0.5) * sh * 0.35,
    lerp(cam.estPos.y, cam.playPos.y, z) + Math.sin(t * 0.4) * 0.07 * z + (Math.random() - 0.5) * sh * 0.35,
    lerp(cam.estPos.z, cam.playPos.z, z) - cam.punchCur * 1.6
  );
  camera.lookAt(
    lerp(cam.estLook.x, cam.playLook.x, z),
    lerp(cam.estLook.y, cam.playLook.y, z),
    lerp(cam.estLook.z, cam.playLook.z, z)
  );
  frameMat.emissiveIntensity = 0.8 + Math.sin(t * 2.2) * 0.18 + framePulse;
  if (framePulse > 0.001) framePulse *= 0.9;
  judges.forEach((j) => {
    if (j.userData.pulse > 0.001) { j.userData.pulse *= 0.9; j.userData.person.position.y = Math.abs(Math.sin(t * 22)) * j.userData.pulse * 0.22; }
    else j.userData.person.position.y = 0;
  });
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ---- 효과 ---- */
function flashScreen() { const f = $("#flash"); f.classList.remove("on"); void f.offsetWidth; f.classList.add("on"); }
function burstConfetti() {
  const wrap = $("#confetti"), colors = ["#ffce2e", "#ff5a5f", "#5ad1ff", "#7af0a0", "#ff7ab8", "#ffffff"];
  for (let i = 0; i < 46; i++) {
    const d = document.createElement("div");
    d.className = "conf"; d.style.left = Math.random() * 100 + "vw"; d.style.background = colors[i % colors.length];
    d.style.animationDuration = 1.6 + Math.random() * 1.4 + "s"; d.style.animationDelay = Math.random() * 0.25 + "s";
    d.style.transform = `rotate(${Math.random() * 360}deg)`; wrap.appendChild(d);
    setTimeout(() => d.remove(), 3200);
  }
}

/* ---- 데이터 ---- */
let items = [{ emoji: "🐵", bg: "#ffd93b", legends: ["월요일의 나", "출근 싫다", "김대리.exe"] }];
let itemImgs = [];
let chosenIndex = 0;
let item = items[0];
drawPlaceholder();

fetch("/jaemok/daily.json", { cache: "no-store" })
  .then((r) => r.json())
  .then((data) => {
    items = data;
    chosenIndex = Math.floor(Date.now() / 86400000) % data.length;
    item = items[chosenIndex];
    itemImgs = data.map((it) => { if (!it.image) return null; const im = new Image(); im.crossOrigin = "anonymous"; im.src = it.image; return im; });
    drawPlaceholder();
  })
  .catch(() => drawPlaceholder());

/* ---- 슬롯 사진릴: 삭삭삭 + 띵띵 → 두둥/땅 ---- */
let started = false;
let revealing = false;
async function slotReveal(targetIndex) {
  revealing = true;
  $("#prompt").hidden = true;
  const n = items.length;
  let i = Math.floor(Date.now() / 997) % n;
  const ticks = 24;
  for (let k = 0; k < ticks; k++) {
    i = (i + 1) % n;
    drawItemToScreen(i);
    Sfx.tick();
    await sleep(50 + (k / ticks) * (k / ticks) * 360); // 가속 → 감속
  }
  drawItemToScreen(targetIndex); // 딱! 결정
  Sfx.boom();
  await sleep(240);
  Sfx.gong();
  flashScreen();
  framePulse = 2.6;
  cam.shake = 1.2;
  await sleep(950);
  revealing = false;
}

// 첫 회: 데일리 사진 + 내 캐릭터로 줌인
async function intro() {
  if (started) return; started = true;
  Sfx.resume();
  readPlayer(); // 닉네임/국적 반영 + 라벨 갱신
  $("#startScreen").hidden = true;
  await slotReveal(chosenIndex);
  cam.zoom = 1;
  await sleep(1500);
  $("#prompt").hidden = false;
  $("#play").hidden = false;
  $("#caption").focus();
}

// 다시 도전: 랜덤 사진으로 슬롯부터 다시
async function retry() {
  if (revealing || busy) return;
  $("#result").hidden = true;
  $("#bigboard").hidden = true;
  $("#caption").value = "";
  judges.forEach((j) => { j.userData.barMat.emissiveIntensity = 0.7; });
  chosenIndex = Math.floor(Math.random() * items.length); // 랜덤 사진 선택
  item = items[chosenIndex];
  await slotReveal(chosenIndex);
  $("#prompt").hidden = false;
  $("#play").hidden = false;
  $("#caption").focus();
}

/* ---- 반응 시퀀스 ---- */
let busy = false;
function escapeHtml(s) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
async function judgeReaction(caption) {
  if (busy) return; busy = true;
  Sfx.resume();
  $("#play").hidden = true;
  $("#suspense").hidden = false;
  cam.punch = 1;
  for (let k = 0; k < 9; k++) { Sfx.tick(); await sleep(110); } // 드럼롤 대용
  $("#suspense").hidden = true;
  for (let i = 0; i < judges.length; i++) { judges[i].userData.barMat.emissiveIntensity = 2.6; judges[i].userData.pulse = 1; Sfx.click(); await sleep(105); }

  const bb = $("#bigboard");
  bb.hidden = false; bb.classList.remove("slam"); void bb.offsetWidth; bb.classList.add("slam");
  flashScreen(); burstConfetti(); framePulse = 2.6; cam.shake = 1.0;
  Sfx.impact(); Sfx.cheer(1.5);
  cam.punch = 0;
  await sleep(650);
  $("#myCaption").textContent = `“${caption}”`;
  openLeaderboard(caption);
  $("#result").hidden = false;
  busy = false;
}

/* ---- 공유 카드 ---- */
function roundRectPath(x, ctx, X, Y, W, H, R) { ctx.beginPath(); ctx.moveTo(X + R, Y); ctx.arcTo(X + W, Y, X + W, Y + H, R); ctx.arcTo(X + W, Y + H, X, Y + H, R); ctx.arcTo(X, Y + H, X, Y, R); ctx.arcTo(X, Y, X + W, Y, R); ctx.closePath(); }
function wrapText(ctx, text, cx, cy, maxW, lh) {
  const chars = [...text]; let line = ""; const lines = [];
  for (const ch of chars) { if (ctx.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch; } else line += ch; }
  if (line) lines.push(line);
  const y0 = cy - ((lines.length - 1) * lh) / 2; lines.forEach((l, i) => ctx.fillText(l, cx, y0 + i * lh));
}
let lastCaption = "";
async function shareResult() {
  await (document.fonts && document.fonts.ready);
  const cv = document.createElement("canvas"); cv.width = 1080; cv.height = 1350;
  const x = cv.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, 1350); g.addColorStop(0, "#16140d"); g.addColorStop(1, "#0c0e0a");
  x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
  x.textAlign = "center"; x.fillStyle = "#ffce2e"; x.font = "800 44px 'Noto Sans KR',sans-serif";
  x.fillText("깜놀 그랑프리 · 사진 한 줄 평", 540, 116);
  const pw = 900, ph = pw * (600 / 1024), py = 180, px = 90;
  x.save(); roundRectPath(0, x, px, py, pw, ph, 36); x.lineWidth = 14; x.strokeStyle = "#ffc21e"; x.stroke(); x.clip();
  x.drawImage(screenCanvas, px, py, pw, ph); x.restore();
  x.save(); x.translate(900, py + ph - 60); x.rotate(-0.22);
  x.strokeStyle = "#e0245e"; x.fillStyle = "#e0245e"; x.lineWidth = 9;
  x.beginPath(); x.arc(0, 0, 84, 0, Math.PI * 2); x.stroke();
  x.font = "800 50px 'Noto Sans KR',sans-serif"; x.textBaseline = "middle"; x.fillText("깜놀!", 0, 4); x.restore();
  x.textBaseline = "alphabetic"; x.fillStyle = "#fff"; x.font = "800 60px 'Noto Sans KR',sans-serif";
  wrapText(x, `“${lastCaption}”`, 540, 1010, 920, 84);
  x.fillStyle = "#8a8a80"; x.font = "500 34px 'Noto Sans KR',sans-serif";
  x.fillText("@kkamnol.interactive · kkamnol.xyz/grandprix", 540, 1290);
  cv.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], "kkamnol-grandprix.png", { type: "image/png" });
    const data = { files: [file], title: "깜놀 그랑프리", text: "내 깜놀 그랑프리 답변 ㅋㅋ kkamnol.xyz/grandprix" };
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share(data); } catch (e) {} return; }
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "kkamnol-grandprix.png"; a.click(); URL.revokeObjectURL(url);
  }, "image/png");
}

/* ---- 영상 녹화 + 공유 (슬롯→사진→캡션→깜놀 리플레이) ---- */
let recording = false;
function pickMime() {
  const opts = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  for (const m of opts) if (window.MediaRecorder && MediaRecorder.isTypeSupported(m)) return m;
  return "";
}
async function recordReplay() {
  if (recording || busy) return;
  if (!window.MediaRecorder || !canvas.captureStream) { shareResult(); return; } // 미지원 → 이미지 폴백
  recording = true;
  const btn = $("#share"), prev = btn.textContent;
  btn.textContent = "🎬 녹화 중…"; btn.disabled = true;
  $("#result").hidden = true; $("#bigboard").hidden = true;
  Sfx.resume();

  const stream = canvas.captureStream(30);
  try { const at = Sfx.recordTrack(); if (at) stream.addTrack(at); } catch (e) {}
  const mime = pickMime();
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise((res) => (rec.onstop = res));
  rec.start();

  capSprite.visible = false; boomSprite.visible = false;
  await slotReveal(chosenIndex);               // 슬롯 → 사진 결정 (띵띵·두둥·땅 녹음됨)
  drawVideoCaption(`“${lastCaption}”`);
  capSprite.visible = true;                     // 캡션 등장
  await sleep(800);
  boomSprite.visible = true;                    // 깜놀!
  Sfx.impact(); Sfx.cheer(1.3); cam.shake = 1.1;
  await sleep(1700);

  rec.stop();
  await stopped;
  capSprite.visible = false; boomSprite.visible = false;
  recording = false;
  btn.textContent = prev; btn.disabled = false;
  $("#result").hidden = false;

  const blob = new Blob(chunks, { type: chunks[0] ? chunks[0].type : "video/webm" });
  const ext = blob.type.includes("mp4") ? "mp4" : "webm";
  const file = new File([blob], `kkamnol-grandprix.${ext}`, { type: blob.type || "video/webm" });
  const data = { files: [file], title: "깜놀 그랑프리", text: "내 깜놀 그랑프리 ㅋㅋ kkamnol.xyz/grandprix" };
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share(data); return; } catch (e) {}
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = file.name; a.click(); URL.revokeObjectURL(url);
}

/* ---- 리더보드 (국적별 답변 + 좋아요/순위) — 시드/로컬 데모 ---- */
const SEED = {
  cats: [["🇰🇷","만두","둘이 합쳐도 월세 못 냄",142],["🇯🇵","ユキ","猫バス、定員2名です",98],["🇺🇸","Mike","POV: roommates who never leave",87],["🇧🇷","João","transporte público lotado",51],["🇰🇷","코코","여기 원래 내 자린데요",33]],
  "dog-portrait": [["🇫🇷","Léa","portrait d'un noble fatigué",120],["🇰🇷","보리","조선시대 셋째 도련님",110],["🇬🇧","Tom","Sir Barksalot, oil on canvas",76],["🇰🇷","흰둥","어제 과음한 게 티남",60],["🇩🇪","Anna","Hund mit Existenzkrise",40]],
  pug: [["🇰🇷","콩이","혼나기 직전 인턴",155],["🇺🇸","Sam","I did nothing wrong (I did)",130],["🇯🇵","ハナ","上司に呼ばれた瞬間",88],["🇰🇷","뚱이","월급 언제 들어와요",64],["🇮🇳","Raj","puppy eyes: 100% charged",45]],
  goats: [["🇰🇷","등산왕","정상 인증샷 강요 중",99],["🇺🇸","Alex","corporate retreat gone wrong",70],["🇰🇷","메에","여기서 밀면 칼퇴",66],["🇯🇵","タケシ","崖っぷち会議",50],["🇫🇷","Marie","team building au sommet",31]],
  alpaca: [["🇰🇷","알파","월요일 아침 내 얼굴",168],["🇧🇷","Lucas","segunda-feira be like",121],["🇺🇸","Jess","when payday is 2 weeks away",95],["🇰🇷","라마","주말 잘 보냈냐고 묻지마",72],["🇯🇵","ミク","歯医者の予約を思い出した",44]],
  ducks: [["🇰🇷","부장님","회의 폭풍 속의 평온",133],["🇬🇧","Will","keep calm and stay dry",90],["🇰🇷","동동","급류=내 일정, 바위=나",77],["🇻🇳","Linh","bình tĩnh giữa deadline",53],["🇺🇸","Chris","ducks don't do Mondays",38]],
  frog: [["🇰🇷","사장님","그래서 결론이 뭐죠?",147],["🇰🇷","초록","보고서 다시 써오세요",102],["🇯🇵","ケロ","で、要点は?",80],["🇺🇸","Pat","the stare of judgment",59],["🇪🇸","Sofía","esperando tu excusa",35]],
};
let lbData = [];
let lbFilter = "all";
function openLeaderboard(myCaption) {
  const id = (items[chosenIndex] && items[chosenIndex].id) || "cats";
  const seed = (SEED[id] || []).map(([flag, nick, text, likes]) => ({ flag, nick, text, likes, liked: false }));
  lbData = [...seed, { flag: player.flag, nick: player.nick, text: myCaption, likes: 0, liked: false, mine: true }];
  lbFilter = "all";
  renderFilter();
  renderLb();
}
function renderFilter() {
  const flags = [...new Set(lbData.map((a) => a.flag))];
  const mk = (f, label) => `<button class="chip ${lbFilter === f ? "on" : ""}" data-f="${f}">${label}</button>`;
  $("#lbFilter").innerHTML = [mk("all", "전체"), ...flags.map((f) => mk(f, f))].join("");
  $("#lbFilter").querySelectorAll(".chip").forEach((c) =>
    c.addEventListener("click", () => { lbFilter = c.dataset.f; renderFilter(); renderLb(); }));
}
function renderLb() {
  const rows = lbData
    .map((a) => ({ a, i: lbData.indexOf(a) }))
    .filter(({ a }) => lbFilter === "all" || a.flag === lbFilter)
    .sort((x, y) => y.a.likes - x.a.likes);
  $("#lbList").innerHTML = rows.map(({ a, i }, r) => `
    <li class="lb-row ${a.mine ? "mine" : ""}">
      <span class="rank">${r + 1}</span>
      <div class="main"><div class="who">${a.flag} ${escapeHtml(a.nick)}${a.mine ? " · 나" : ""}</div><div class="txt">${escapeHtml(a.text)}</div></div>
      <button class="like" data-i="${i}">${a.liked ? "❤️" : "🤍"} ${a.likes}</button>
    </li>`).join("");
  $("#lbList").querySelectorAll(".like").forEach((b) =>
    b.addEventListener("click", () => {
      const a = lbData[+b.dataset.i];
      a.liked ? (a.likes--, (a.liked = false)) : (a.likes++, (a.liked = true)); // 토글
      renderLb();
    }));
}

/* ---- 닉네임 / 국적 ---- */
const player = { nick: "나", flag: "🇰🇷", nation: "한국" };
const nickEl = $("#nick"), natEl = $("#nat");
try {
  const s = JSON.parse(localStorage.getItem("gp-player") || "{}");
  if (s.nick) { nickEl.value = s.nick; $("#startBtn").disabled = false; }
  if (s.nat) natEl.value = s.nat;
} catch (e) {}
nickEl.addEventListener("input", () => { $("#startBtn").disabled = !nickEl.value.trim(); });
function readPlayer() {
  player.nick = nickEl.value.trim() || "나";
  const [flag, nation] = (natEl.value || "🇰🇷|한국").split("|");
  player.flag = flag; player.nation = nation;
  localStorage.setItem("gp-player", JSON.stringify({ nick: player.nick, nat: natEl.value }));
  drawLabel(`${player.flag} ${player.nick}`);
}

/* ---- 이벤트 ---- */
$("#startBtn").addEventListener("click", intro);
$("#form").addEventListener("submit", (e) => { e.preventDefault(); const v = $("#caption").value.trim(); if (!v) return; lastCaption = v; judgeReaction(v); });
$("#retry").addEventListener("click", retry);
$("#share").addEventListener("click", recordReplay);
$("#mute").addEventListener("click", (e) => { e.currentTarget.textContent = Sfx.toggle() ? "🔇" : "🔊"; });
