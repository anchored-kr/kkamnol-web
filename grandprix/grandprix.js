import * as THREE from "three";

/* ---------- 렌더러 ---------- */
const canvas = document.getElementById("stage");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0d0a);
scene.fog = new THREE.Fog(0x0a0d0a, 16, 34);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2.7, 9);

/* ---------- 바닥 / 벽 ---------- */
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

/* ---------- 전광판(스크린) ---------- */
function makeScreenTexture(item) {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 600;
  const x = c.getContext("2d");
  x.fillStyle = item.bg || "#ffd93b";
  x.fillRect(0, 0, 1024, 600);
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.font = '360px "Apple Color Emoji","Noto Color Emoji",sans-serif';
  x.fillText(item.emoji || "🐵", 512, 300);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let item = { emoji: "🐵", bg: "#ffd93b", legends: ["월요일의 나", "출근 싫다", "김대리.exe"] };
const screenMat = new THREE.MeshBasicMaterial({ map: makeScreenTexture(item) });
const screen = new THREE.Mesh(new THREE.PlaneGeometry(9, 5.2), screenMat);
screen.position.set(0, 4.4, -8);
scene.add(screen);

/* ---------- 골드 8각 프레임 ---------- */
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

/* ---------- 심사위원 5인 ---------- */
const judges = [];
function makeJudge(x) {
  const g = new THREE.Group();
  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(1.95, 1.15, 0.75),
    new THREE.MeshStandardMaterial({ color: 0x10140f, roughness: 0.8, metalness: 0.2 })
  );
  desk.position.set(0, 0.575, 0);
  g.add(desk);

  const barMat = new THREE.MeshStandardMaterial({ color: 0xffd000, emissive: 0xffae00, emissiveIntensity: 0.8 });
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.55, 0.07), barMat);
    b.position.set(-0.62 + i * 0.205, 0.6, 0.39);
    g.add(b);
  }

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.66, 0.9, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x191e22, roughness: 0.7 })
  );
  body.position.set(0, 1.55, -0.05);
  g.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 22, 22),
    new THREE.MeshStandardMaterial({ color: 0xe7b699, roughness: 0.85 })
  );
  head.position.set(0, 2.12, -0.05);
  g.add(head);

  g.position.set(x, 0, -3.7);
  g.userData.barMat = barMat;
  judges.push(g);
  return g;
}
[-4.7, -2.35, 0, 2.35, 4.7].forEach((x) => scene.add(makeJudge(x)));

/* ---------- 조명 ---------- */
scene.add(new THREE.HemisphereLight(0x6f8fb0, 0x0a0a0a, 0.55));
scene.add(new THREE.AmbientLight(0x223322, 0.55));
const key = new THREE.SpotLight(0xfff2cc, 70, 32, 0.62, 0.45, 1.2);
key.position.set(0, 11, 7);
key.target.position.set(0, 1, -2);
scene.add(key, key.target);
const rim = new THREE.PointLight(0x66ccff, 12, 24, 2);
rim.position.set(-7, 5, 2);
scene.add(rim);

/* ---------- 루프 ---------- */
let t = 0;
function animate() {
  requestAnimationFrame(animate);
  t += 0.016;
  camera.position.x = Math.sin(t * 0.25) * 0.55;
  camera.position.y = 2.7 + Math.sin(t * 0.4) * 0.07;
  camera.lookAt(0, 4.1, -8);
  frameMat.emissiveIntensity = 0.8 + Math.sin(t * 2.2) * 0.18;
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ---------- 데일리 콘텐츠 ---------- */
fetch("/jaemok/daily.json", { cache: "no-store" })
  .then((r) => r.json())
  .then((data) => {
    item = data[Math.floor(Date.now() / 86400000) % data.length];
    screenMat.map = makeScreenTexture(item);
    screenMat.needsUpdate = true;
  })
  .catch(() => {});

/* ---------- 게임 플로우 ---------- */
const $ = (s) => document.querySelector(s);
$("#form").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = $("#caption").value.trim();
  if (!v) return;
  // 심사위원 레버 점등 (순차)
  judges.forEach((j, i) => setTimeout(() => { j.userData.barMat.emissiveIntensity = 2.4; }, i * 110));
  $("#play").hidden = true;
  $("#myCaption").textContent = `“${v}”`;
  $("#legendList").innerHTML = (item.legends || []).map((l) => `<li>${l}</li>`).join("");
  $("#result").hidden = false;
});
$("#retry").addEventListener("click", () => {
  $("#result").hidden = true;
  $("#play").hidden = false;
  $("#caption").value = "";
  judges.forEach((j) => { j.userData.barMat.emissiveIntensity = 0.8; });
});
