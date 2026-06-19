import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { t, getLang, applyI18n, setLang } from "/grandprix/i18n.js";
import { lbEnabled, fetchLeaderboard, submitEntry, likeEntry, reportEntry, uploadVideo, publicVideoUrl, cleanCaption, bumpPlay } from "/grandprix/leaderboard.js";

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
  // animalese.wav: A–Z 8bit·44100·mono 샘플 (data offset 44, 글자당 6615샘플=0.15s)
  // 코드 MIT / 오디오 CC BY 4.0 — © 2014 Josh Simmons (github.com/Acedio/animalese.js)
  let alib = null;
  fetch("/grandprix/animalese.wav").then((r) => r.arrayBuffer()).then((b) => { alib = new Uint8Array(b); }).catch(() => {});
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
    // 애니멀리즈: 글자 1개당 짧은 지저귐(동물의 숲 말투). 캐릭터가 말하는 소리.
    blip(ch, pitch = 1) {
      if (muted) return;
      const c = ensure(), t = c.currentTime;
      const code = (ch && ch.charCodeAt(0)) || 97;
      const base = 300 * pitch;                                   // 높은 피치 = 귀여운 보이스
      const f = base + (code % 14) * 26 + (Math.random() * 28 - 14);
      const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
      o.type = "square";
      o.frequency.setValueAtTime(f * 1.7, t);                     // 위→아래 살짝 처지는 지저귐
      o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.08, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.085);
      lp.type = "lowpass"; lp.frequency.value = 2400;
      o.connect(g).connect(lp).connect(bus); o.start(t); o.stop(t + 0.1);
    },
    // animalese.wav의 글자 샘플을 잘라 피치 조절 후 bus로 재생.
    // 비-알파벳(한글 등)은 무작위 A–Z로 → 동물의 숲식 횡설수설. 미로드 시 blip 폴백.
    animalese(ch, pitch = 1.4) {
      if (muted) return;
      if (!alib) { this.blip(ch); return; }
      const c = (ch || "").toUpperCase();
      const idx = (c >= "A" && c <= "Z") ? c.charCodeAt(0) - 65 : (Math.random() * 26) | 0;
      const SPL = 6615, OUT = 3307, start = 44 + SPL * idx; // 글자 0.15s 중 0.075s 사용
      const cx = ensure();
      const buf = cx.createBuffer(1, OUT, 44100), d = buf.getChannelData(0);
      const p = pitch + (Math.random() * 0.12 - 0.06);
      for (let i = 0; i < OUT; i++) { const s = alib[start + ((i * p) | 0)]; d[i] = s == null ? 0 : (s - 128) / 128; }
      const src = cx.createBufferSource(); src.buffer = buf;
      const g = cx.createGain(); g.gain.value = 0.9;
      src.connect(g).connect(bus); src.start();
    },
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
// p: 1(활짝) → 0(가느다란 가로 틈). 사진은 그대로 두고 골드 8각이 위로 덮어옴(줌X).
function drawIris(p) {
  const cx = 512, cy = 300, e = ease(Math.max(0, Math.min(1, p)));
  drawItemToScreen(chosenIndex, 1); // 사진 원본 크기·제자리 (작아지지 않음)
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
  g.userData = { barMat, person, pulse: 0, talking: 0 };
  judges.push(g); return g;
}
[-4.7, -2.35, 0, 2.35, 4.7].forEach((x, i) => scene.add(makeJudge(x, i)));

/* ---- 토끼 GLB(Mixamo 리깅: Idle/Excited) 로드 → 심사위원 5명 ---- */
const CHAR_STAND = 0;            // Mixamo 토끼는 이미 Y-up 서있음(TripoSR처럼 눕히지 않음)
const CHAR_FACE = 0;             // 정면(카메라) 보게 — 바깥 그룹 Y (프리뷰 검증: 0=정면)
const CHAR_H = 1.55;             // 캐릭터 키
const judgeAnim = [];            // 심사위원별 { mixer, idle, excited, state }
let charExcited = false;         // true면 Excited 재생(룰렛 도는 동안). animate()보다 먼저 선언
new GLTFLoader().load("/grandprix/models/bunny.glb", (gltf) => {
  const src = gltf.scene;
  src.traverse((o) => { if (o.isMesh && o.material) o.material.side = THREE.DoubleSide; });
  src.rotation.x = CHAR_STAND;
  src.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(src);  // 스케일/중심용(높이·좌우). 발 높이는 아래서 클론별 보정
  const size = new THREE.Vector3(); box.getSize(size);
  const center = new THREE.Vector3(); box.getCenter(center);
  const s = CHAR_H / (size.y || 1);
  const idleClip = THREE.AnimationClip.findByName(gltf.animations, "Idle") || gltf.animations[0];
  const exciClip = THREE.AnimationClip.findByName(gltf.animations, "Excited") || gltf.animations[1] || gltf.animations[0];
  judges.forEach((j) => {
    const rig = new THREE.Group();
    const m = cloneSkinned(src);             // 스킨드 메시 전용 클론(스켈레톤 포함)
    m.scale.setScalar(s);
    m.position.set(-center.x * s, -box.min.y * s, -center.z * s); // 베이스 y=0
    rig.add(m);
    rig.position.y = 1.18;      // 책상 위(초기값, 아래서 발 보정)
    rig.rotation.y = CHAR_FACE; // 정면 회전(월드 Y)
    j.userData.person.add(rig);
    // 발이 단상 윗면(world y=1.15)에 닿게 보정: 씬 투입 후 스켈레톤 반영 bbox로 실제 발 높이 측정해 맞춤
    rig.updateWorldMatrix(true, true);
    let skin = null; m.traverse((o) => { if (o.isSkinnedMesh) skin = o; });
    skin.computeBoundingBox();
    const feetY = skin.boundingBox.clone().applyMatrix4(skin.matrixWorld).min.y;
    rig.position.y += 1.15 - feetY;
    const mixer = new THREE.AnimationMixer(m);
    const idle = mixer.clipAction(idleClip);
    const excited = mixer.clipAction(exciClip);
    idle.play();                              // 기본 = Idle 루프
    judgeAnim.push({ mixer, idle, excited, state: "idle" });
  });
}, undefined, (e) => console.warn("bunny.glb load fail", e));

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

/* ---- 말풍선: 내 캐릭터가 답을 "말하는" 연출 (애니멀리즈와 동기) ---- */
const speechCanvas = document.createElement("canvas"); speechCanvas.width = 900; speechCanvas.height = 340;
const speechTex = new THREE.CanvasTexture(speechCanvas); speechTex.colorSpace = THREE.SRGBColorSpace;
function drawSpeech(text) {
  const x = speechCanvas.getContext("2d");
  x.clearRect(0, 0, 900, 340);
  const bx = 70, by = 26, bw = 760, bh = 196, r = 40;
  x.beginPath();
  x.moveTo(bx + r, by); x.arcTo(bx + bw, by, bx + bw, by + bh, r); x.arcTo(bx + bw, by + bh, bx, by + bh, r);
  x.arcTo(bx, by + bh, bx, by, r); x.arcTo(bx, by, bx + bw, by, r); x.closePath();
  x.moveTo(450 - 38, by + bh - 2); x.lineTo(442, by + bh + 56); x.lineTo(450 + 48, by + bh - 2); // 꼬리(아래 캐릭터로)
  x.fillStyle = "rgba(255,255,255,0.97)"; x.shadowColor = "rgba(0,0,0,0.3)"; x.shadowBlur = 18; x.shadowOffsetY = 5; x.fill();
  x.shadowColor = "transparent";
  x.fillStyle = "#16140d"; x.textAlign = "center"; x.textBaseline = "middle";
  x.font = "800 48px 'Noto Sans KR','Apple Color Emoji',sans-serif";
  wrapText(x, text || "", 450, by + bh / 2, 660, 60);
  speechTex.needsUpdate = true;
}
const speechSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: speechTex, transparent: true, depthTest: false }));
speechSprite.scale.set(3.7, 1.4, 1); speechSprite.position.set(0, 3.62, -3.3); speechSprite.visible = false;
scene.add(speechSprite);

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
const boomTex = new THREE.CanvasTexture(boomCanvas); boomTex.colorSpace = THREE.SRGBColorSpace;
function drawBoomCanvas() {            // 언어 전환 시 다시 구울 수 있도록 함수화
  const x = boomCanvas.getContext("2d");
  x.clearRect(0, 0, 760, 300);
  x.font = "900 italic 170px 'Noto Sans KR','Apple Color Emoji',sans-serif";
  x.textAlign = "center"; x.textBaseline = "middle";
  x.fillStyle = "#ffce2e"; x.fillText(t("kkamnol") + " 🎉", 380, 160);
  boomTex.needsUpdate = true;
}
drawBoomCanvas();
const boomSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: boomTex, transparent: true, depthTest: false }));
boomSprite.scale.set(6.2, 2.4, 1); boomSprite.position.set(0, 5.4, -7.6); boomSprite.visible = false;
scene.add(boomSprite);

/* ---- 시작 카운트다운: 카메라 부착 스프라이트(항상 중앙·녹화에 담김) ---- */
const cdCanvas = document.createElement("canvas"); cdCanvas.width = 1024; cdCanvas.height = 600;
const cdTex = new THREE.CanvasTexture(cdCanvas); cdTex.colorSpace = THREE.SRGBColorSpace;
function drawCountdownTex(text, go) {
  const x = cdCanvas.getContext("2d");
  x.clearRect(0, 0, 1024, 600);
  x.textAlign = "center"; x.textBaseline = "middle";
  let fs = go ? 200 : 460;
  x.font = `900 italic ${fs}px "Inter","Noto Sans KR",sans-serif`;
  while (x.measureText(text).width > 960 && fs > 48) { fs -= 8; x.font = `900 italic ${fs}px "Inter","Noto Sans KR",sans-serif`; }
  x.fillStyle = go ? "#7af0a0" : "#ffce2e";
  x.shadowColor = go ? "rgba(122,240,160,0.95)" : "rgba(255,176,0,0.95)"; x.shadowBlur = 48;
  x.fillText(text, 512, 308); x.fillText(text, 512, 308); // 두 번 = 글로우 강조
  x.shadowBlur = 0;
  cdTex.needsUpdate = true;
}
const cdSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: cdTex, transparent: true, depthTest: false, depthWrite: false }));
cdSprite.position.set(0, 0, -3.4); cdSprite.visible = false; cdSprite.userData = { w: 3, h: 1.8, pop: 0 };
camera.add(cdSprite); scene.add(camera); // 카메라를 씬에 넣어야 자식(스프라이트)이 렌더됨
function sizeCdSprite() {
  const d = 3.4, vh = 2 * d * Math.tan((camera.fov * Math.PI / 180) / 2), vw = vh * camera.aspect;
  const w = Math.min(vw * 0.92, vh * 0.92 * (cdCanvas.width / cdCanvas.height));
  cdSprite.userData.w = w; cdSprite.userData.h = w * (cdCanvas.height / cdCanvas.width);
}
function showCd(text, go) { drawCountdownTex(text, go); sizeCdSprite(); cdSprite.visible = true; cdSprite.userData.pop = go ? 0.5 : 0.62; }

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
  speakPos: new THREE.Vector3(0, 3.25, 2.9), speakLook: new THREE.Vector3(0, 2.95, -3.5), // 내 캐릭터 클로즈업(말풍선 포함)
  zoom: 0, zoomCur: 0, punch: 0, punchCur: 0, shake: 0, score: 0, scoreCur: 0, speak: 0, speakCur: 0,
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
  cam.speakCur += (cam.speak - cam.speakCur) * 0.08;      // 내 캐릭터 클로즈업 블렌드
  if (cam.speakCur > 0.001) {
    const s = ease(cam.speakCur);
    px = lerp(px, cam.speakPos.x, s); py = lerp(py, cam.speakPos.y, s); pz = lerp(pz, cam.speakPos.z, s);
    lx = lerp(lx, cam.speakLook.x, s); ly = lerp(ly, cam.speakLook.y, s); lz = lerp(lz, cam.speakLook.z, s);
  }
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
    const p = j.userData.person;
    if (j.userData.talking > 0) {                          // 말하는 중: 빠른 입놀림(바운스+스쿼시)
      const m = Math.abs(Math.sin(clock * 40));
      p.position.y = m * 0.11;
      p.scale.set(1, 1 - m * 0.08, 1);
    } else if (j.userData.pulse > 0.001) {
      j.userData.pulse *= 0.9;
      p.position.y = Math.abs(Math.sin(clock * 22)) * j.userData.pulse * 0.22;
      if (p.scale.y !== 1) p.scale.set(1, 1, 1);
    } else {
      if (p.position.y !== 0) p.position.y = 0;
      if (p.scale.y !== 1) p.scale.set(1, 1, 1);
    }
  });
  // 스켈레톤 애니: 룰렛 도는 동안(charExcited) Excited, 평소 Idle (크로스페이드)
  for (const a of judgeAnim) {
    a.mixer.update(0.016);
    const want = charExcited ? "excited" : "idle";
    if (a.state !== want) {
      const to = want === "excited" ? a.excited : a.idle;
      const from = want === "excited" ? a.idle : a.excited;
      to.reset(); to.play(); to.crossFadeFrom(from, 0.3, false);
      a.state = want;
    }
  }
  if (cdSprite.visible) {                              // 카운트다운 펑(pop) 후 안정
    const k = 1 + cdSprite.userData.pop;
    cdSprite.scale.set(cdSprite.userData.w * k, cdSprite.userData.h * k, 1);
    if (cdSprite.userData.pop > 0.001) cdSprite.userData.pop *= 0.86; else cdSprite.userData.pop = 0;
  }
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight);
  sizeCdSprite();
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

// 완전 랜덤 선택 (직전 사진은 피해 연속 중복 방지)
function pickRandomIndex() {
  if (items.length <= 1) return 0;
  let i; do { i = Math.floor(Math.random() * items.length); } while (i === chosenIndex);
  return i;
}

fetch("/grandprix/photos.json", { cache: "no-store" })
  .then((r) => r.json())
  .then((data) => {
    if (Array.isArray(data) && data.length) {
      items = data;
      chosenIndex = pickRandomIndex(); // 매 접속 완전 랜덤
      item = items[chosenIndex];
      ensureLoaded(chosenIndex);
    }
    drawPlaceholder();
  })
  .catch(() => drawPlaceholder());

/* ---- 슬롯 사진릴: 삭삭삭 + 띵띵 → 두둥/땅 ---- */
let started = false;
let revealing = false;
async function slotReveal(targetIndex) {
  revealing = true;
  charExcited = true;            // 룰렛 도는 동안 캐릭터 Excited
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
  charExcited = false;           // 룰렛 멈추면 다시 Idle
}

// 시작 카운트다운: 3 · 2 · 1 · 그랑프리 스타트! (캔버스 스프라이트 → 녹화에 담김)
async function countdown() {
  const pitch = { "3": 1.15, "2": 1.4, "1": 1.7 };
  for (const n of ["3", "2", "1"]) {
    showCd(n, false);
    Sfx.animalese(n, pitch[n]); Sfx.tick();
    await sleep(680);
  }
  showCd(t("goStart"), true);
  flashScreen(); Sfx.impact(); Sfx.cheer(1.2);  // 스타트 펑!
  for (const ch of [...t("goStart")]) { if (ch !== " ") Sfx.animalese(ch, 1.55); await sleep(54); }
  await sleep(720);
  cdSprite.visible = false;
}

// 첫 회: 데일리 사진 + 내 캐릭터로 줌인
async function intro() {
  if (started) return; started = true;
  bumpPlay("grandprix");           // 플레이 카운트 +1
  Sfx.resume();
  readPlayer(); // 닉네임/국적 반영 + 라벨 갱신
  $("#startScreen").hidden = true;
  startLiveRec();                  // ★ 카운트다운부터 녹화 (영상에 3·2·1 포함)
  await countdown();               // 3·2·1·그랑프리 스타트!
  await slotReveal(chosenIndex);
  cam.zoom = 1;
  await sleep(1500);
  $("#prompt").hidden = false;
  $("#play").hidden = false;
  pauseLiveRec();                  // 입력(고민) 동안 일시정지
  $("#caption").focus();
}

// 다시 도전: 랜덤 사진으로 슬롯부터 다시
async function retry() {
  if (revealing || busy) return;
  bumpPlay("grandprix");           // 재도전도 플레이 카운트 +1
  resetShareBtn();                 // 이전 라운드의 공유 대기 영상 정리
  discardLiveRec();                // 이전 라운드 녹화 폐기
  $("#result").hidden = true;
  $("#bigboard").hidden = true;
  $("#caption").value = "";
  judges.forEach((j) => { j.userData.barMat.emissiveIntensity = 0.7; });
  chosenIndex = pickRandomIndex(); // 랜덤(직전 사진 회피)
  item = items[chosenIndex];
  startLiveRec();                  // 새 라운드 녹화 시작
  await slotReveal(chosenIndex);
  $("#prompt").hidden = false;
  $("#play").hidden = false;
  pauseLiveRec();                  // 입력 동안 일시정지
  $("#caption").focus();
}

/* ---- 반응 시퀀스 ---- */
let busy = false;
const ME = 2; // 가운데 = 나(플레이어)
function escapeHtml(s) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

// 내 캐릭터가 답을 직접 "말하는" 연출 (입놀림 + 말풍선 + 애니멀리즈)
async function speakAnswer(caption) {
  const me = judges[ME];
  cam.speak = 1;                          // 내 캐릭터 클로즈업
  meSprite.visible = false;               // 닉네임 라벨 → 말풍선으로
  drawSpeech(""); speechSprite.visible = true;
  await sleep(300);                       // 카메라 들어오는 동안
  me.userData.talking = 1;                // 입놀림 시작
  let shown = "";
  for (const ch of [...caption]) {
    shown += ch; drawSpeech(shown);
    if (ch !== " " && ch !== "\n") Sfx.animalese(ch);     // 진짜 animalese 샘플
    await sleep(ch === " " ? 70 : /[.,!?…~]/.test(ch) ? 150 : 60 + Math.random() * 26);
  }
  await sleep(440);                        // 말 끝나고 잠깐 정지
  me.userData.talking = 0;
  speechSprite.visible = false; meSprite.visible = true;
  cam.speak = 0;
}

async function judgeReaction(caption) {
  if (busy) return; busy = true;
  Sfx.resume();
  $("#play").hidden = true;
  resumeLiveRec();                         // 채점 연출 녹화 재개(말하기·아이리스·깜놀)

  // 리더보드 제출(실백엔드면) — 채점 연출 동안 백그라운드로. 영상은 공유 시 opt-in 업로드.
  myEntryId = null; myOwnerToken = null;
  const submitP = lbEnabled()
    ? submitEntry({ photoId: (items[chosenIndex] && items[chosenIndex].id) || "x", nick: player.nick, flag: player.flag, nation: player.nation, caption, lang: getLang() })
    : Promise.resolve(null);

  // (0) 내 캐릭터가 답을 말함 — 예능 게스트처럼
  await speakAnswer(caption);

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
  finalizeLiveRec();                       // 깜놀 직후 녹화 종료 → 결과 뜨기 전 영상 준비완료

  // (3) 결과 카드 — 카메라 복귀 + 전광판 사진 복원
  cam.score = 0;
  drawItemToScreen(chosenIndex);
  $("#myCaption").textContent = `“${caption}”`;
  const ent = await submitP; if (ent) { myEntryId = ent.id; myOwnerToken = ent.owner_token; }
  await openLeaderboard(caption);
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
    const data = { files: [file], title: t("brand"), text: `${t("shareText")} ${HASHTAGS}` };
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share(data); return; } catch (e) { if (e && e.name === "AbortError") return; }
    }
    saveBlob(file);
  }, "image/png");
}

/* ---- 영상 녹화 + 공유 (슬롯→사진→캡션→깜놀 리플레이) ---- */
let recording = false;
function pickMime() {
  // MP4(H.264/AAC) 우선 — 인스타·틱톡·X 등 SNS가 받는 포맷. 미지원 시 WebM 폴백.
  const opts = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4;codecs=avc1.4d002a,mp4a.40.2",
    "video/mp4;codecs=h264,aac",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const m of opts) if (window.MediaRecorder && MediaRecorder.isTypeSupported(m)) return m;
  return "";
}
const SHARE_URL = "https://kkamnol.xyz/grandprix";
const HASHTAGS = "#깜놀그랑프리 #KkamnolGrandPrix";
// 토스트 안내 (자체 완결 · DOM 동적 생성)
let toastEl = null;
function toast(msg, ms = 2600) {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.style.cssText = "position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 96px);transform:translateX(-50%) translateY(12px);max-width:86vw;z-index:9;pointer-events:none;opacity:0;transition:opacity .25s,transform .25s;background:rgba(20,18,12,.94);color:#fff;font-weight:700;font-size:14px;line-height:1.4;text-align:center;padding:12px 18px;border-radius:14px;border:1px solid rgba(255,206,46,.5);box-shadow:0 8px 30px rgba(0,0,0,.5)";
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  requestAnimationFrame(() => { toastEl.style.opacity = "1"; toastEl.style.transform = "translateX(-50%) translateY(0)"; });
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toastEl.style.opacity = "0"; toastEl.style.transform = "translateX(-50%) translateY(12px)"; }, ms);
}
function saveBlob(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a"); a.href = url; a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
// 게임 링크 공유 (카카오·X·데스크톱 등 — 파일 대신 URL). 네이티브 공유 시트 or 클립보드 복사.
async function shareLink() {
  const data = { title: t("brand"), text: `${t("shareText")} ${HASHTAGS}`, url: SHARE_URL };
  if (navigator.share) {
    try { await navigator.share(data); return; }
    catch (e) { if (e && e.name === "AbortError") return; }
  }
  try { await navigator.clipboard.writeText(SHARE_URL); toast(t("linkCopied")); }
  catch (e) { toast(SHARE_URL); }
}
let pendingShareFile = null;                 // (폴백 재연출용) 녹화 영상 — 다음 탭 제스처에서 공유
function videoShareData(file) { return { files: [file], title: t("brand"), text: `${t("shareTextVideo")} ${HASHTAGS}` }; }
function resetShareBtn() {
  pendingShareFile = null;
  const b = $("#share"); b.textContent = t("shareVideo"); b.classList.remove("ready"); b.disabled = false;
}

/* ---- 라이브 녹화: 플레이를 따라 녹화(저장X), 결과 시점엔 영상이 준비됨 → 공유 1탭 ---- */
const liveSupported = !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream);
let liveRec = null, liveStream = null, liveChunks = [], liveVideoFile = null, liveMime = "";
function cleanupLiveStream() {
  try { if (liveStream) liveStream.getVideoTracks().forEach((t) => t.stop()); } catch (e) {} // 오디오(공유 버스)는 유지
  liveStream = null;
}
function startLiveRec() {
  if (!liveSupported) return;
  discardLiveRec();
  try {
    liveStream = canvas.captureStream(30);
    try { const at = Sfx.recordTrack(); if (at) liveStream.addTrack(at); } catch (e) {}
    liveMime = pickMime();
    liveRec = new MediaRecorder(liveStream, liveMime ? { mimeType: liveMime, videoBitsPerSecond: 6_000_000 } : undefined);
    liveChunks = [];
    liveRec.ondataavailable = (e) => { if (e.data && e.data.size) liveChunks.push(e.data); };
    liveRec.start();
  } catch (e) { liveRec = null; cleanupLiveStream(); }
}
function pauseLiveRec() { try { if (liveRec && liveRec.state === "recording") liveRec.pause(); } catch (e) {} }   // 입력(고민) 동안 멈춤
function resumeLiveRec() { try { if (liveRec && liveRec.state === "paused") liveRec.resume(); } catch (e) {} }   // 채점 연출 재개
function finalizeLiveRec() {                 // 녹화 종료 → 영상 준비(공유 대기)
  if (!liveRec) return;
  const r = liveRec; liveRec = null;
  r.onstop = () => {
    try {
      const blob = new Blob(liveChunks, { type: liveChunks[0] ? liveChunks[0].type : (liveMime || "video/mp4") });
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      liveVideoFile = new File([blob], `kkamnol-grandprix.${ext}`, { type: blob.type || "video/mp4" });
    } catch (e) {}
    cleanupLiveStream();
  };
  try { r.stop(); } catch (e) { cleanupLiveStream(); }
}
function discardLiveRec() {                   // 공유 안 하고 정리(다시 도전 등)
  try { if (liveRec && liveRec.state !== "inactive") { liveRec.onstop = null; liveRec.stop(); } } catch (e) {}
  liveRec = null; liveChunks = []; liveVideoFile = null; cleanupLiveStream();
}

// 영상 공유 버튼
// opt-in: 공유/저장할 때 내 영상을 리더보드에 올림(클릭 재생용). 실백엔드+내 제출 있을 때만.
async function maybeUploadToLeaderboard(file) {
  if (!lbEnabled() || !myEntryId || !myOwnerToken || !file) return;
  if (maybeUploadToLeaderboard._done === myEntryId) return;  // 중복 방지
  maybeUploadToLeaderboard._done = myEntryId;
  const path = await uploadVideo(myEntryId, myOwnerToken, file);
  if (path) { const me = lbData.find((a) => a.id === myEntryId); if (me) { me.video = path; renderLb(); } toast(t("postedToLb")); }
}
async function onShareBtn() {
  if (recording) return;
  maybeUploadToLeaderboard(liveVideoFile || pendingShareFile);   // 공유 시 리더보드에도(opt-in)
  if (pendingShareFile) {                     // (폴백) 준비된 영상 이번 탭 제스처에 공유
    const file = pendingShareFile;
    try { await navigator.share(videoShareData(file)); resetShareBtn(); }
    catch (e) { if (e && e.name === "AbortError") return; saveBlob(file); toast(t("videoSavedHint")); resetShareBtn(); }
    return;
  }
  if (liveVideoFile) {                         // ★ 라이브 녹화본 즉시 공유 (진짜 1탭, 제스처 유효)
    if (navigator.canShare && navigator.canShare({ files: [liveVideoFile] })) {
      try { await navigator.share(videoShareData(liveVideoFile)); return; }
      catch (e) { if (e && e.name === "AbortError") return; saveBlob(liveVideoFile); toast(t("videoSavedHint")); return; }
    }
    saveBlob(liveVideoFile); toast(t("videoSavedHint")); return; // 데스크톱(파일 공유 미지원) → 저장
  }
  recordReplay();                              // 라이브 녹화 미지원 → 재연출 녹화(폴백)
}
async function recordReplay() {
  if (recording || busy) return;
  if (!window.MediaRecorder || !canvas.captureStream) { shareResult(); return; } // 미지원 → 이미지 폴백
  recording = true; pendingShareFile = null;
  const btn = $("#share"), prev = btn.textContent;
  btn.textContent = t("recording"); btn.disabled = true;
  $("#result").hidden = true; $("#bigboard").hidden = true;
  Sfx.resume();

  const stream = canvas.captureStream(30);
  try { const at = Sfx.recordTrack(); if (at) stream.addTrack(at); } catch (e) {}
  const mime = pickMime();
  const recOpts = mime ? { mimeType: mime, videoBitsPerSecond: 8_000_000 } : undefined;
  let rec; try { rec = new MediaRecorder(stream, recOpts); } catch (e) { rec = new MediaRecorder(stream); }
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

  const blob = new Blob(chunks, { type: chunks[0] ? chunks[0].type : (mime || "video/webm") });
  const ext = blob.type.includes("mp4") ? "mp4" : "webm";
  const file = new File([blob], `kkamnol-grandprix.${ext}`, { type: blob.type || "video/mp4" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share(videoShareData(file)); resetShareBtn(); return; } // 제스처 유효(데스크톱 등) → 바로 시트
    catch (e) {
      if (e && e.name === "AbortError") { resetShareBtn(); return; }               // 사용자가 취소
      // 모바일: 녹화(~12s)로 제스처 만료 → 영상 준비해두고 한 번 더 탭하면 즉시 공유
      pendingShareFile = file;
      btn.textContent = t("shareNow"); btn.classList.add("ready");
      toast(t("tapToShare"));
      return;
    }
  }
  saveBlob(file);                                            // 파일 공유 자체가 미지원(데스크톱) → 저장 + 안내
  toast(t("videoSavedHint"));
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
let lbUsingReal = false;
let myEntryId = null, myOwnerToken = null;
const likedSet = new Set((() => { try { return JSON.parse(localStorage.getItem("gp-liked") || "[]"); } catch (e) { return []; } })());
const saveLiked = () => { try { localStorage.setItem("gp-liked", JSON.stringify([...likedSet])); } catch (e) {} };

async function openLeaderboard(myCaption) {
  const id = (items[chosenIndex] && items[chosenIndex].id) || "x";
  lbFilter = "all";
  const rows = lbEnabled() ? await fetchLeaderboard(id) : null;
  if (rows) {                                   // 실데이터(Supabase)
    lbUsingReal = true;
    lbData = rows.map((r) => ({ flag: r.flag, nick: r.nick, text: r.caption, likes: r.likes, liked: likedSet.has(r.id), id: r.id, video: r.video_path, mine: r.id === myEntryId }));
  } else {                                       // 데모 시드 폴백
    lbUsingReal = false;
    lbData = seedFor(id);
  }
  if (!lbData.some((a) => a.mine))               // 내 답변 항상 표시
    lbData.push({ flag: player.flag, nick: player.nick, text: myCaption, likes: 0, liked: false, mine: true, id: myEntryId });
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
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => lbFilter === "all" || a.flag === lbFilter)
    .sort((x, y) => y.a.likes - x.a.likes);
  $("#lbList").innerHTML = rows.map(({ a, i }, r) => `
    <li class="lb-row ${a.mine ? "mine" : ""} ${a.video ? "has-video" : ""}" data-i="${i}">
      <span class="rank">${r + 1}</span>
      <div class="main"><div class="who">${a.flag} ${escapeHtml(a.nick)}${a.mine ? " · " + t("me") : ""}${a.video ? ' <span class="vbadge">▶</span>' : ""}</div><div class="txt">${escapeHtml(a.text)}</div></div>
      <button class="like" data-i="${i}">${a.liked ? "❤️" : "🤍"} ${a.likes}</button>
      ${!a.mine && a.id ? `<button class="report" data-i="${i}" title="${escapeHtml(t("report"))}">⚐</button>` : ""}
    </li>`).join("");
  $("#lbList").querySelectorAll(".like").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const a = lbData[+b.dataset.i], on = !a.liked;
      a.liked = on; a.likes += on ? 1 : -1;
      if (a.id && lbUsingReal) { on ? likedSet.add(a.id) : likedSet.delete(a.id); saveLiked(); likeEntry(a.id, on); }
      renderLb();
    }));
  $("#lbList").querySelectorAll(".report").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const a = lbData[+b.dataset.i];
      if (a.id && confirm(t("reportConfirm"))) { reportEntry(a.id); b.textContent = "✓"; b.disabled = true; toast(t("reported")); }
    }));
  $("#lbList").querySelectorAll(".lb-row.has-video").forEach((li) =>
    li.addEventListener("click", async () => {
      const a = lbData[+li.dataset.i]; if (!a.video) return;
      const url = await publicVideoUrl(a.video); if (url) openVideoModal(url, a);
    }));
}
// 영상 모달
function openVideoModal(url, a) {
  const m = $("#videoModal"); if (!m) return;
  $("#vmVideo").src = url;
  $("#vmWho").textContent = `${a.flag} ${a.nick}`;
  $("#vmCap").textContent = `“${a.text}”`;
  m.hidden = false;
  const v = $("#vmVideo"); v.currentTime = 0; v.play().catch(() => {});
}
function closeVideoModal() {
  const m = $("#videoModal"); if (!m) return;
  const v = $("#vmVideo"); v.pause(); v.removeAttribute("src"); v.load();
  m.hidden = true;
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

// 국적(국기) → UI 언어. 시작 메뉴에서 국적을 고르면 그 언어로 즉시 전환.
const FLAG2LANG = {
  "🇰🇷": "ko", "🇺🇸": "en", "🇯🇵": "ja", "🇨🇳": "zh", "🇹🇼": "zh-TW",
  "🇬🇧": "en", "🇫🇷": "fr", "🇩🇪": "de", "🇪🇸": "es", "🇮🇹": "it",
  "🇧🇷": "pt", "🇲🇽": "es", "🇮🇳": "hi", "🇮🇩": "id", "🇻🇳": "vi",
  "🇹🇭": "th", "🇵🇭": "fil", "🇨🇦": "en", "🇦🇺": "en", "🌍": "en",
};
// 선택한 국적의 언어로 전환 + 미리 구운 텍스트(빅보드·boom·라벨) 갱신
function switchLangByNat() {
  const [flag] = (natEl.value || "🇰🇷|한국").split("|");
  if (!setLang(FLAG2LANG[flag])) return;   // 같은 언어면 변경 없음
  $("#bigboard").textContent = t("kkamnol") + " 🎉";
  drawBoomCanvas();
  drawLabel(`${flag} ${nickEl.value.trim() || t("me")}`);
}
let defaultLocked = false; // 저장값 있거나 유저가 직접 고르면 자동 변경 중단
function setDefaultNat(cc) {
  if (defaultLocked) return;
  const v = CC2VAL[(cc || "").toUpperCase()];
  natEl.value = v && natHas(v) ? v : "🌍|기타";
}
try {
  const s = JSON.parse(localStorage.getItem("gp-player") || "{}");
  if (s.nick) { nickEl.value = s.nick; $("#startBtn").disabled = false; }
  if (s.nat && natHas(s.nat)) { natEl.value = s.nat; defaultLocked = true; switchLangByNat(); }
} catch (e) {}
if (!defaultLocked) {
  const reg = (navigator.language || (navigator.languages && navigator.languages[0]) || "").split("-")[1];
  if (reg) setDefaultNat(reg); // 1) 브라우저 로캘 즉시
  fetch("https://get.geojs.io/v1/ip/country.json", { cache: "no-store" }) // 2) 접속 IP 지역으로 보정
    .then((r) => r.json()).then((d) => { if (d && d.country) setDefaultNat(d.country); })
    .catch(() => {});
}
nickEl.addEventListener("input", () => { $("#startBtn").disabled = !nickEl.value.trim(); });
natEl.addEventListener("change", () => { defaultLocked = true; switchLangByNat(); });
function readPlayer() {
  player.nick = nickEl.value.trim() || t("me");
  const [flag, nation] = (natEl.value || "🇰🇷|한국").split("|");
  player.flag = flag; player.nation = nation;
  localStorage.setItem("gp-player", JSON.stringify({ nick: player.nick, nat: natEl.value }));
  drawLabel(`${player.flag} ${player.nick}`);
}

/* ---- 이벤트 ---- */
$("#startBtn").addEventListener("click", intro);
$("#form").addEventListener("submit", (e) => { e.preventDefault(); const v = $("#caption").value.trim(); if (!v) return; if (!cleanCaption(v)) { toast(t("badCaption")); return; } lastCaption = v; judgeReaction(v); });
$("#retry").addEventListener("click", retry);
$("#share").addEventListener("click", onShareBtn);
$("#shareLink").addEventListener("click", shareLink);
$("#vmClose").addEventListener("click", closeVideoModal);
$("#videoModal").addEventListener("click", (e) => { if (e.target.id === "videoModal") closeVideoModal(); });
$("#mute").addEventListener("click", (e) => { e.currentTarget.textContent = Sfx.toggle() ? "🔇" : "🔊"; });
