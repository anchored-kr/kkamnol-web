import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { t, lang, applyI18n } from "/grandprix/i18n.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (s) => document.querySelector(s);
if (window.self !== window.top) document.documentElement.classList.add("framed"); // 폰 목업 안 → 아일랜드 여백

applyI18n();                                   // 접속 언어로 HTML 전체 번역
$("#bigboard").textContent = t("kkamnol") + " 🎉"; // 깜놀! (언어별)
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
    type() { if (!muted) tone("square", 1450 + Math.random() * 480, ensure().currentTime, 0.03, 0.045); }, // 키 입력음(소프트)
    riser(dur = 1.5) {  // 아이리스 줌인 긴장 고조(피치 상승 + 휘이)
      if (muted) return; const c = ensure(), t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(900, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.11, t + dur * 0.85); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.05);
      const s = c.createBufferSource(); s.buffer = noise(dur);
      const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(3200, t + dur); f.Q.value = 1.1;
      const ng = c.createGain(); ng.gain.setValueAtTime(0.0001, t); ng.gain.linearRampToValueAtTime(0.06, t + dur * 0.8); ng.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(f).connect(ng).connect(bus); s.start(t);
    },
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
function drawImageCover(img, zoom = 1) {
  const r = Math.max(1024 / img.width, 600 / img.height) * zoom, w = img.width * r, h = img.height * r;
  sctx.fillStyle = "#000"; sctx.fillRect(0, 0, 1024, 600);
  sctx.drawImage(img, (1024 - w) / 2, (600 - h) / 2, w, h); screenTex.needsUpdate = true;
}
function drawPlaceholder() {
  sctx.fillStyle = "#1a1407"; sctx.fillRect(0, 0, 1024, 600);
  sctx.fillStyle = "#ffce2e"; sctx.textAlign = "center"; sctx.textBaseline = "middle";
  sctx.font = "800 230px 'Noto Sans KR',sans-serif"; sctx.fillText("?", 512, 310); screenTex.needsUpdate = true;
}
function drawItemToScreen(i, zoom = 1) {
  const it = items[i], img = itemImgs[i];
  if (img && img.complete && img.naturalWidth) drawImageCover(img, zoom);
  else drawEmojiScene(it);
}

/* ---- IPPON식 채점 연출: 전광판 8각 아이리스(터널) 줌 ---- */
function octPath2D(ctx, cx, cy, rx, ry) {   // 서브패스만 추가(beginPath는 호출부에서)
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}
// p: 1(활짝) → 0(가느다란 가로 틈). 얼굴 위로 골드 8각 터널이 조여듦.
function drawIris(p) {
  const cx = 512, cy = 290, e = ease(Math.max(0, Math.min(1, p)));
  drawItemToScreen(chosenIndex, 1 + (1 - e) * 0.9); // 닫힐수록 얼굴로 줌인
  const AX = 92 + 720 * e;          // 조리개 가로 반경
  const AY = 13 + 300 * (e * e);    // 세로는 더 빨리 닫혀 가로 틈으로
  sctx.save();
  sctx.beginPath(); sctx.rect(0, 0, 1024, 600);
  octPath2D(sctx, cx, cy, AX, AY);
  sctx.clip("evenodd");             // 조리개 바깥만 그림(사진은 가운데 틈으로)
  sctx.fillStyle = "#0a0702"; sctx.fillRect(0, 0, 1024, 600);
  let idx = 0;                       // 정팔각형 동심 링 = 터널
  for (let r = 1000; r > 36; r -= 34) {
    sctx.beginPath(); octPath2D(sctx, cx, cy, r, r);
    sctx.lineWidth = 18; sctx.strokeStyle = (idx++ % 2) ? "#ffce2e" : "#1c1404"; sctx.stroke();
  }
  sctx.restore();
  sctx.beginPath(); octPath2D(sctx, cx, cy, AX, AY);  // 조리개 테두리 하이라이트
  sctx.lineWidth = 11; sctx.strokeStyle = "#fff3c4";
  sctx.shadowColor = "#ffb300"; sctx.shadowBlur = 26; sctx.stroke(); sctx.shadowBlur = 0;
  screenTex.needsUpdate = true;
}
// IPPON식 점수 공개 — 빨강 + 깜놀!
function drawScoreReveal() {
  const g = sctx.createLinearGradient(0, 0, 0, 600);
  g.addColorStop(0, "#ff4646"); g.addColorStop(1, "#c00f1d");
  sctx.fillStyle = g; sctx.fillRect(0, 0, 1024, 600);
  sctx.fillStyle = "rgba(8,7,3,0.92)"; sctx.fillRect(0, 238, 1024, 124);
  sctx.fillStyle = "#ffce2e"; sctx.textAlign = "center"; sctx.textBaseline = "middle";
  sctx.font = "900 italic 148px 'Inter','Noto Sans KR',sans-serif";
  sctx.fillText(t("kkamnol"), 512, 304);
  screenTex.needsUpdate = true;
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
  const person = new THREE.Group(); // GLB 캐릭터가 로드되면 채워짐
  g.add(person);
  g.position.set(x, 0, -3.7);
  g.userData = { barMat, person, pulse: 0 };
  judges.push(g); return g;
}
[-4.7, -2.35, 0, 2.35, 4.7].forEach((x, i) => scene.add(makeJudge(x, i)));

/* ---- TripoSR GLB 캐릭터 로드 → 심사위원 5명 교체 ---- */
const CHAR_STAND = -Math.PI / 2; // 세우기(모델 X)
const CHAR_FACE = -Math.PI / 2;  // 정면(카메라) 보게 — 바깥 그룹 Y
const CHAR_H = 1.55;                              // 캐릭터 키
new GLTFLoader().load("/grandprix/models/character.glb", (gltf) => {
  const src = gltf.scene;
  src.traverse((o) => { if (o.isMesh && o.material) o.material.side = THREE.DoubleSide; });
  src.rotation.x = CHAR_STAND;
  src.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(src);
  const size = new THREE.Vector3(); box.getSize(size);
  const center = new THREE.Vector3(); box.getCenter(center);
  const s = CHAR_H / (size.y || 1);
  judges.forEach((j) => {
    const rig = new THREE.Group();
    const m = src.clone(true);
    m.scale.setScalar(s);
    m.position.set(-center.x * s, -box.min.y * s, -center.z * s); // 베이스 y=0
    rig.add(m);
    rig.position.y = 1.18;      // 책상 위
    rig.rotation.y = CHAR_FACE; // 정면 회전(월드 Y)
    j.userData.person.add(rig);
  });
}, undefined, (e) => console.warn("character.glb load fail", e));

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
drawLabel(t("me"));
const meSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthTest: false }));
meSprite.scale.set(1.9, 0.63, 1);
meSprite.position.set(0, 3.05, -3.5);
scene.add(meSprite);
// 가운데 캐릭터: 핑크 보타이로 구분
// (가운데 "나" 구분은 닉네임 라벨 + 스포트라이트로)
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

// 영상 리플레이: 캡션을 '고민하며 한 글자씩' 타이핑 (입력 과정 = 고민의 흔적)
async function typeCaption(text) {
  const chars = [...text];
  let shown = "";
  const ponderAt = chars.length > 6 ? Math.floor(chars.length * 0.55) : -1; // 중반 한 번 멈칫
  for (let i = 0; i < chars.length; i++) {
    shown += chars[i];
    drawVideoCaption(shown + "▌");           // 블록 커서
    Sfx.type();
    let d = 60 + Math.random() * 75;          // 사람 같은 불규칙 리듬
    if (/[ ,.…!?·~]/.test(chars[i])) d += 150; // 띄어쓰기·문장부호에서 살짝 호흡
    await sleep(d);
    if (i === ponderAt) { drawVideoCaption(shown + "▌"); await sleep(560); } // 고민 멈칫
  }
  for (let k = 0; k < 4; k++) { drawVideoCaption(shown + (k % 2 ? "▌" : " ")); await sleep(200); } // 커서 깜빡 → 제출 직전
  drawVideoCaption(shown);
}

const boomCanvas = document.createElement("canvas"); boomCanvas.width = 760; boomCanvas.height = 300;
{
  const x = boomCanvas.getContext("2d");
  x.font = "900 italic 170px 'Noto Sans KR','Apple Color Emoji',sans-serif";
  x.textAlign = "center"; x.textBaseline = "middle";
  x.fillStyle = "#ffce2e"; x.fillText(t("kkamnol") + " 🎉", 380, 160);
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
  scorePos: new THREE.Vector3(0, 3.95, 1.1), scoreLook: new THREE.Vector3(0, 4.4, -8), // 전광판 다이브
  zoom: 0, zoomCur: 0, punch: 0, punchCur: 0, shake: 0, score: 0, scoreCur: 0,
};
let clock = 0, framePulse = 0;
function animate() {
  requestAnimationFrame(animate);
  clock += 0.016;
  cam.zoomCur += (cam.zoom - cam.zoomCur) * 0.045;
  cam.punchCur += (cam.punch - cam.punchCur) * 0.1;
  const z = ease(cam.zoomCur);
  let sh = 0;
  if (cam.shake > 0.001) { cam.shake *= 0.88; sh = cam.shake; }
  let px = lerp(cam.estPos.x, cam.playPos.x, z) + Math.sin(clock * 0.25) * 0.55 * z;
  let py = lerp(cam.estPos.y, cam.playPos.y, z) + Math.sin(clock * 0.4) * 0.07 * z;
  let pz = lerp(cam.estPos.z, cam.playPos.z, z) - cam.punchCur * 1.6;
  let lx = lerp(cam.estLook.x, cam.playLook.x, z);
  let ly = lerp(cam.estLook.y, cam.playLook.y, z);
  let lz = lerp(cam.estLook.z, cam.playLook.z, z);
  cam.scoreCur += (cam.score - cam.scoreCur) * 0.07;      // 전광판 다이브 블렌드
  if (cam.scoreCur > 0.001) {
    const s = ease(cam.scoreCur);
    px = lerp(px, cam.scorePos.x, s); py = lerp(py, cam.scorePos.y, s); pz = lerp(pz, cam.scorePos.z, s);
    lx = lerp(lx, cam.scoreLook.x, s); ly = lerp(ly, cam.scoreLook.y, s); lz = lerp(lz, cam.scoreLook.z, s);
  }
  camera.position.set(px + (Math.random() - 0.5) * sh * 0.35, py + (Math.random() - 0.5) * sh * 0.35, pz);
  camera.lookAt(lx, ly, lz);
  frameMat.emissiveIntensity = 0.8 + Math.sin(clock * 2.2) * 0.18 + framePulse;
  if (framePulse > 0.001) framePulse *= 0.9;
  judges.forEach((j) => {
    if (j.userData.pulse > 0.001) { j.userData.pulse *= 0.9; j.userData.person.position.y = Math.abs(Math.sin(clock * 22)) * j.userData.pulse * 0.22; }
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

/* ---- 데이터 (grandprix 전용 500장 풀 · 지연 로딩) ---- */
let items = [{ emoji: "🐵", bg: "#ffd93b" }];
let itemImgs = [];          // 인덱스별 Image 캐시(필요할 때만 생성)
let chosenIndex = 0;
let item = items[0];
drawPlaceholder();

// 500장을 한 번에 preload하면 안 됨 → 필요한 것만 lazy 로드
function preload(i) {
  const it = items[i];
  if (!it || !it.image) return null;
  if (!itemImgs[i]) {
    const im = new Image(); im.crossOrigin = "anonymous"; im.decoding = "async"; im.src = it.image;
    itemImgs[i] = im;
  }
  return itemImgs[i];
}
function ensureLoaded(i, timeout = 2600) {
  const im = preload(i);
  if (!im) return Promise.resolve(null);
  if (im.complete && im.naturalWidth) return Promise.resolve(im);
  return new Promise((res) => {
    let done = false;
    const fin = () => { if (done) return; done = true; res(im); };
    im.addEventListener("load", fin, { once: true });
    im.addEventListener("error", fin, { once: true });
    setTimeout(fin, timeout);
  });
}

fetch("/grandprix/photos.json", { cache: "no-store" })
  .then((r) => r.json())
  .then((data) => {
    if (Array.isArray(data) && data.length) {
      items = data;
      chosenIndex = Math.floor(Date.now() / 86400000) % data.length; // 데일리 사진
      item = items[chosenIndex];
      ensureLoaded(chosenIndex); // 오늘의 사진 미리 준비
    }
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
  for (let k = 0; k < ticks; k++) preload((i + 1 + k) % n); // 스핀에 비칠 사진들 미리 로드
  ensureLoaded(targetIndex);                                 // 타깃은 우선 로드 시작
  for (let k = 0; k < ticks; k++) {
    i = (i + 1) % n;
    drawItemToScreen(i);
    Sfx.tick();
    await sleep(50 + (k / ticks) * (k / ticks) * 360); // 가속 → 감속
  }
  await ensureLoaded(targetIndex); // 결정 직전, 타깃 사진 로드 보장
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

  // (1) 전광판으로 카메라 다이브 + 8각 아이리스가 얼굴 위로 조여듦
  cam.score = 1;
  Sfx.riser(1.55);
  const steps = 36;
  for (let k = 0; k < steps; k++) {
    drawIris(1 - k / (steps - 1));        // 1(활짝) → 0(틈)
    if (k % 3 === 0) Sfx.tick();
    await sleep(16 + k * 1.7);            // 점점 느려지며 긴장
  }
  drawIris(0);                            // 가느다란 틈에서 정지
  $("#suspense").hidden = true;
  await sleep(420);                       // 정적 — 긴장 최고조

  // (2) 점수 공개 — 빵! (IPPON식: 전광판이 빨강+깜놀!로 폭발)
  drawScoreReveal();
  flashScreen(); burstConfetti(); framePulse = 3.0; cam.shake = 1.3;
  Sfx.impact(); Sfx.cheer(1.6);
  for (let i = 0; i < judges.length; i++) { judges[i].userData.barMat.emissiveIntensity = 2.6; judges[i].userData.pulse = 1; }
  const bb = $("#bigboard");
  bb.hidden = false; bb.classList.remove("slam"); void bb.offsetWidth; bb.classList.add("slam");
  await sleep(950);

  // (3) 결과 카드 — 카메라 복귀 + 전광판 사진 복원
  cam.score = 0;
  drawItemToScreen(chosenIndex);
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
  x.fillText(t("shareCardTitle"), 540, 116);
  const pw = 900, ph = pw * (600 / 1024), py = 180, px = 90;
  x.save(); roundRectPath(0, x, px, py, pw, ph, 36); x.lineWidth = 14; x.strokeStyle = "#ffc21e"; x.stroke(); x.clip();
  x.drawImage(screenCanvas, px, py, pw, ph); x.restore();
  x.save(); x.translate(900, py + ph - 60); x.rotate(-0.22);
  x.strokeStyle = "#e0245e"; x.fillStyle = "#e0245e"; x.lineWidth = 9;
  x.beginPath(); x.arc(0, 0, 84, 0, Math.PI * 2); x.stroke();
  x.font = "800 50px 'Noto Sans KR',sans-serif"; x.textBaseline = "middle"; x.fillText(t("kkamnol"), 0, 4); x.restore();
  x.textBaseline = "alphabetic"; x.fillStyle = "#fff"; x.font = "800 60px 'Noto Sans KR',sans-serif";
  wrapText(x, `“${lastCaption}”`, 540, 1010, 920, 84);
  x.fillStyle = "#8a8a80"; x.font = "500 34px 'Noto Sans KR',sans-serif";
  x.fillText("@kkamnol.interactive · kkamnol.xyz/grandprix", 540, 1290);
  cv.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], "kkamnol-grandprix.png", { type: "image/png" });
    const data = { files: [file], title: t("brand"), text: t("shareText") };
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
  btn.textContent = t("recording"); btn.disabled = true;
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
  drawVideoCaption("▌");                        // 빈 입력칸 + 커서
  capSprite.visible = true;
  await sleep(420);
  await typeCaption(lastCaption);               // 한 글자씩 타이핑 = 고민의 흔적
  await sleep(360);                             // 제출 직전 망설임

  // IPPON식 채점 연출: 8각 아이리스 줌 → 점수 공개 (전광판·카메라 모두 녹화에 담김)
  capSprite.visible = false;
  cam.score = 1; Sfx.riser(1.25);
  const rsteps = 28;
  for (let k = 0; k < rsteps; k++) { drawIris(1 - k / (rsteps - 1)); if (k % 3 === 0) Sfx.tick(); await sleep(15 + k * 1.5); }
  drawIris(0); await sleep(320);
  drawScoreReveal();                            // 빨강 + 깜놀!
  boomSprite.visible = true;
  Sfx.impact(); Sfx.cheer(1.4); cam.shake = 1.25; framePulse = 3.0;
  await sleep(1700);
  cam.score = 0; drawItemToScreen(chosenIndex); // 카메라·전광판 복귀

  rec.stop();
  await stopped;
  capSprite.visible = false; boomSprite.visible = false;
  recording = false;
  btn.textContent = prev; btn.disabled = false;
  $("#result").hidden = false;

  const blob = new Blob(chunks, { type: chunks[0] ? chunks[0].type : "video/webm" });
  const ext = blob.type.includes("mp4") ? "mp4" : "webm";
  const file = new File([blob], `kkamnol-grandprix.${ext}`, { type: blob.type || "video/webm" });
  const data = { files: [file], title: t("brand"), text: t("shareTextVideo") };
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share(data); return; } catch (e) {}
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = file.name; a.click(); URL.revokeObjectURL(url);
}

/* ---- 리더보드 (국적별 답변 + 좋아요/순위) — 로컬 데모 시드 ----
   사진 500장 각각에 고정(결정론적)으로 글로벌 답변이 깔리도록 범용 시드 풀 사용.
   ⚠️ 데모: 영속화·실제 타 유저 답변 아님 → 추후 백엔드 연동 시 교체. */
const GENERIC = [
  ["🇰🇷","만두","이거 완전 나야",150],["🇰🇷","코코","오늘의 짤 당첨 ㅋㅋ",120],["🇰🇷","보리","레전드 갱신했다",105],
  ["🇰🇷","뚱이","저장 안 할 수가 없네",88],["🇰🇷","초록","이거 보고 빵 터짐",70],["🇰🇷","호빵","월요일 표정 클럽 회장",55],
  ["🇺🇸","Mike","POV: it's Monday again",140],["🇺🇸","Jess","this is so me fr 😭",118],["🇬🇧","Tom","caption of the year tbh",96],
  ["🇺🇸","Sam","I felt this in my soul",78],["🇨🇦","Alex","main character energy",62],["🇦🇺","Liam","ok this is gold lmao",47],
  ["🇯🇵","ユキ","もう優勝でいい",132],["🇯🇵","ハナ","今日のベストショット",100],["🇯🇵","ケロ","完全に自分で草",74],["🇯🇵","タケシ","月曜の俺の顔",52],
  ["🇪🇸","Sofía","soy yo, literalmente",110],["🇲🇽","Diego","ganador del día 🏆",84],["🇪🇸","Lucía","no puedo, jajaja",58],
  ["🇧🇷","João","eu numa segunda-feira",115],["🇧🇷","Lucas","campeão do dia kkkk",80],
  ["🇫🇷","Léa","c'est tellement moi",108],["🇫🇷","Hugo","la légende du jour",66],
  ["🇩🇪","Anna","das bin zu 100% ich",98],["🇩🇪","Lukas","Spruch des Jahres",54],
  ["🇮🇹","Giulia","sono io, giuro 😂",90],["🇮🇩","Putri","ini gue banget sih",86],["🇮🇩","Budi","juara hari ini wkwk",60],
  ["🇻🇳","Linh","đúng là tôi luôn",82],["🇹🇭","Ploy","นี่มันตัวเราชัดๆ",76],["🇮🇳","Raj","bilkul main hi hoon 😂",70],
  ["🇵🇭","Mar","grabe ako 'to eh",64],["🇹🇼","小美","這根本是我本人",92],["🇨🇳","小李","笑死，这就是我",100],
];
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
// 사진 id로 결정론적 시드 5개 선택 (같은 사진 = 항상 같은 리더보드)
function seedFor(id) {
  let cur = hashStr(id || "x"), n = GENERIC.length, used = new Set(), out = [];
  while (out.length < 5 && used.size < n) {
    cur = (Math.imul(cur, 1103515245) + 12345) >>> 0;
    const idx = cur % n;
    if (used.has(idx)) continue;
    used.add(idx);
    const [flag, nick, text, base] = GENERIC[idx];
    out.push({ flag, nick, text, likes: base + (cur % 55), liked: false });
  }
  return out;
}
let lbData = [];
let lbFilter = "all";
function openLeaderboard(myCaption) {
  const id = (items[chosenIndex] && items[chosenIndex].id) || "x";
  lbData = [...seedFor(id), { flag: player.flag, nick: player.nick, text: myCaption, likes: 0, liked: false, mine: true }];
  lbFilter = "all";
  renderFilter();
  renderLb();
}
function renderFilter() {
  const flags = [...new Set(lbData.map((a) => a.flag))];
  const mk = (f, label) => `<button class="chip ${lbFilter === f ? "on" : ""}" data-f="${f}">${label}</button>`;
  $("#lbFilter").innerHTML = [mk("all", t("all")), ...flags.map((f) => mk(f, f))].join("");
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
      <div class="main"><div class="who">${a.flag} ${escapeHtml(a.nick)}${a.mine ? " · " + t("me") : ""}</div><div class="txt">${escapeHtml(a.text)}</div></div>
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
const player = { nick: t("me"), flag: "🇰🇷", nation: "한국" };
const nickEl = $("#nick"), natEl = $("#nat");

// 국가코드 → 옵션값 (접속 지역 기본값용)
const CC2VAL = {
  KR: "🇰🇷|한국", US: "🇺🇸|USA", JP: "🇯🇵|日本", CN: "🇨🇳|中国", TW: "🇹🇼|台灣",
  GB: "🇬🇧|UK", FR: "🇫🇷|France", DE: "🇩🇪|Deutschland", ES: "🇪🇸|España", IT: "🇮🇹|Italia",
  BR: "🇧🇷|Brasil", MX: "🇲🇽|México", IN: "🇮🇳|भारत", ID: "🇮🇩|Indonesia", VN: "🇻🇳|Việt Nam",
  TH: "🇹🇭|ไทย", PH: "🇵🇭|Pilipinas", CA: "🇨🇦|Canada", AU: "🇦🇺|Australia",
};
const natHas = (v) => [...natEl.options].some((o) => o.value === v);
let defaultLocked = false; // 저장값 있거나 유저가 직접 고르면 자동 변경 중단
function setDefaultNat(cc) {
  if (defaultLocked) return;
  const v = CC2VAL[(cc || "").toUpperCase()];
  natEl.value = v && natHas(v) ? v : "🌍|기타";
}
try {
  const s = JSON.parse(localStorage.getItem("gp-player") || "{}");
  if (s.nick) { nickEl.value = s.nick; $("#startBtn").disabled = false; }
  if (s.nat && natHas(s.nat)) { natEl.value = s.nat; defaultLocked = true; }
} catch (e) {}
if (!defaultLocked) {
  const reg = (navigator.language || (navigator.languages && navigator.languages[0]) || "").split("-")[1];
  if (reg) setDefaultNat(reg); // 1) 브라우저 로캘 즉시
  fetch("https://get.geojs.io/v1/ip/country.json", { cache: "no-store" }) // 2) 접속 IP 지역으로 보정
    .then((r) => r.json()).then((d) => { if (d && d.country) setDefaultNat(d.country); })
    .catch(() => {});
}
nickEl.addEventListener("input", () => { $("#startBtn").disabled = !nickEl.value.trim(); });
natEl.addEventListener("change", () => { defaultLocked = true; });
function readPlayer() {
  player.nick = nickEl.value.trim() || t("me");
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
