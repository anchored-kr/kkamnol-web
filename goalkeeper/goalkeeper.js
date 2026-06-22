/* ===========================================================================
   월드컵 골키퍼 — 카메라로 몸·팔·손을 추적해 날아오는 공을 막는 AR 골키퍼 (PoC)
   전신 추적 + 사람만 분리(MediaPipe PoseLandmarker, segmentation mask) → 배경 제거하고
   절차적 축구장(원근 잔디·라인·스타디움) 위에 키퍼만 합성. (외부 이미지 X → 녹화/공유 안전)
   페널티 슛아웃 10개 · 선방 판정 · 결과 카드 · 검은 Kkamnol 아웃트로(2초, 효과음)
   · 영상 녹화→저장/링크 공유 · 다국어(세계 16개국) · 마우스/터치 폴백
   =========================================================================== */

import {
  FilesetResolver,
  PoseLandmarker,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

const TOTAL_SHOTS = 10;

// ---------- i18n (UI + 등급) ----------
// 지원: ko en ja zh es pt fr de it ru tr id vi th ar hi
const I18N = {
  ko: { nat:"한국어", langTitle:"언어를 선택하세요", title:"월드컵 골키퍼", tagline:"온몸으로 막아라!", how:"팔·손·몸으로 날아오는 공 10개를 막으세요", startCam:"카메라 켜고 시작", startMouse:"마우스/터치로 플레이", privacy:"영상은 기기 안에서만 처리돼요", modePose:"🧤 몸 추적 중", modeMouse:"🖱 마우스/터치", modeShow:"🧤 몸 전체가 보이게 서세요", ready:"준비!", save:"막았다!", goal:"실점…", savesWord:"선방", resultQ:"당신의 골키퍼 등급은?", tiers:["월드클래스 🧤","국가대표 키퍼","믿음직한 수문장","성장하는 유망주","오늘은 연습 더…"], outroCta:"이 게임을 하고 싶다면?", shareTitle:"끝! 영상으로 공유하세요", shareSave:"영상 저장", shareLink:"링크 공유", again:"다시 하기", linkCopied:"링크를 복사했어요!", shareText:"월드컵 골키퍼 도전! kkamnol.xyz/goalkeeper" },
  en: { nat:"English", langTitle:"Choose your language", title:"World Cup Goalkeeper", tagline:"Block it with your body!", how:"Stop 10 incoming shots with your arms, hands & body", startCam:"Start with Camera", startMouse:"Play with Mouse/Touch", privacy:"Your video never leaves this device", modePose:"🧤 Body tracking", modeMouse:"🖱 Mouse/Touch", modeShow:"🧤 Step back so your body shows", ready:"Ready!", save:"SAVE!", goal:"GOAL…", savesWord:"SAVES", resultQ:"Your keeper rating?", tiers:["World Class 🧤","National Keeper","Safe Hands","Rising Rookie","Butterfingers"], outroCta:"Want to try this game?", shareTitle:"Done! Share your clip", shareSave:"Save video", shareLink:"Share link", again:"Play again", linkCopied:"Link copied!", shareText:"World Cup Goalkeeper challenge! kkamnol.xyz/goalkeeper" },
  ja: { nat:"日本語", langTitle:"言語を選んでください", title:"ワールドカップGK", tagline:"全身で止めろ！", how:"腕・手・体で飛んでくる10本のシュートを止めよう", startCam:"カメラを使って開始", startMouse:"マウス/タッチでプレイ", privacy:"映像は端末内だけで処理されます", modePose:"🧤 体を認識中", modeMouse:"🖱 マウス/タッチ", modeShow:"🧤 全身が映るように立って", ready:"準備！", save:"セーブ！", goal:"失点…", savesWord:"セーブ", resultQ:"あなたのGK評価は？", tiers:["ワールドクラス 🧤","代表級キーパー","頼れる守護神","成長株","今日は練習だ…"], outroCta:"このゲームをやってみたい？", shareTitle:"完成！シェアしよう", shareSave:"動画を保存", shareLink:"リンクを共有", again:"もう一度", linkCopied:"リンクをコピーしました！", shareText:"ワールドカップGKに挑戦！ kkamnol.xyz/goalkeeper" },
  zh: { nat:"中文", langTitle:"请选择语言", title:"世界杯门将", tagline:"用全身把球挡下！", how:"用手臂·手·身体挡下飞来的10球", startCam:"开启摄像头开始", startMouse:"用鼠标/触屏玩", privacy:"影像仅在本机处理", modePose:"🧤 身体追踪中", modeMouse:"🖱 鼠标/触屏", modeShow:"🧤 后退让全身入镜", ready:"准备！", save:"扑救！", goal:"丢球…", savesWord:"扑救", resultQ:"你的门将等级？", tiers:["世界级 🧤","国家队门将","可靠门神","潜力新秀","今天多练练…"], outroCta:"想玩这个游戏吗？", shareTitle:"完成！快来分享", shareSave:"保存视频", shareLink:"分享链接", again:"再玩一次", linkCopied:"链接已复制！", shareText:"挑战世界杯门将！ kkamnol.xyz/goalkeeper" },
  es: { nat:"Español", langTitle:"Elige tu idioma", title:"Portero del Mundial", tagline:"¡Detenlo con el cuerpo!", how:"Para 10 disparos con brazos, manos y cuerpo", startCam:"Empezar con cámara", startMouse:"Jugar con ratón/táctil", privacy:"Tu vídeo no sale de este dispositivo", modePose:"🧤 Rastreo corporal", modeMouse:"🖱 Ratón/táctil", modeShow:"🧤 Aléjate para que se vea tu cuerpo", ready:"¡Listo!", save:"¡PARADA!", goal:"GOL…", savesWord:"PARADAS", resultQ:"¿Tu nivel de portero?", tiers:["Clase mundial 🧤","Portero nacional","Manos seguras","Promesa","¡A entrenar más!"], outroCta:"¿Quieres probar este juego?", shareTitle:"¡Listo! Comparte tu clip", shareSave:"Guardar vídeo", shareLink:"Compartir enlace", again:"Jugar otra vez", linkCopied:"¡Enlace copiado!", shareText:"¡Reto Portero del Mundial! kkamnol.xyz/goalkeeper" },
  pt: { nat:"Português", langTitle:"Escolha seu idioma", title:"Goleiro da Copa", tagline:"Defenda com o corpo!", how:"Defenda 10 chutes com braços, mãos e corpo", startCam:"Começar com câmera", startMouse:"Jogar com mouse/toque", privacy:"Seu vídeo não sai deste aparelho", modePose:"🧤 Rastreando o corpo", modeMouse:"🖱 Mouse/toque", modeShow:"🧤 Afaste-se para mostrar o corpo", ready:"Pronto!", save:"DEFENDEU!", goal:"GOL…", savesWord:"DEFESAS", resultQ:"Seu nível de goleiro?", tiers:["Classe mundial 🧤","Goleiro da seleção","Mãos seguras","Promessa","Mãos de manteiga"], outroCta:"Quer jogar este jogo?", shareTitle:"Pronto! Compartilhe seu clipe", shareSave:"Salvar vídeo", shareLink:"Compartilhar link", again:"Jogar de novo", linkCopied:"Link copiado!", shareText:"Desafio Goleiro da Copa! kkamnol.xyz/goalkeeper" },
  fr: { nat:"Français", langTitle:"Choisis ta langue", title:"Gardien du Mondial", tagline:"Arrête-le avec le corps !", how:"Arrête 10 tirs avec tes bras, mains et corps", startCam:"Démarrer avec caméra", startMouse:"Jouer à la souris/tactile", privacy:"Ta vidéo reste sur cet appareil", modePose:"🧤 Suivi du corps", modeMouse:"🖱 Souris/tactile", modeShow:"🧤 Recule pour montrer ton corps", ready:"Prêt !", save:"ARRÊT !", goal:"BUT…", savesWord:"ARRÊTS", resultQ:"Ton niveau de gardien ?", tiers:["Classe mondiale 🧤","Gardien national","Mains sûres","Espoir","Entraîne-toi encore"], outroCta:"Envie d'essayer ce jeu ?", shareTitle:"Terminé ! Partage ton clip", shareSave:"Enregistrer la vidéo", shareLink:"Partager le lien", again:"Rejouer", linkCopied:"Lien copié !", shareText:"Défi Gardien du Mondial ! kkamnol.xyz/goalkeeper" },
  de: { nat:"Deutsch", langTitle:"Wähle deine Sprache", title:"WM-Torwart", tagline:"Halt ihn mit dem Körper!", how:"Halte 10 Schüsse mit Armen, Händen und Körper", startCam:"Mit Kamera starten", startMouse:"Mit Maus/Touch spielen", privacy:"Dein Video bleibt auf diesem Gerät", modePose:"🧤 Körper-Tracking", modeMouse:"🖱 Maus/Touch", modeShow:"🧤 Geh zurück, zeig deinen Körper", ready:"Bereit!", save:"GEHALTEN!", goal:"TOR…", savesWord:"PARADEN", resultQ:"Dein Torwart-Rang?", tiers:["Weltklasse 🧤","Nationalkeeper","Sichere Hände","Talent","Mehr üben!"], outroCta:"Willst du dieses Spiel spielen?", shareTitle:"Fertig! Teile deinen Clip", shareSave:"Video speichern", shareLink:"Link teilen", again:"Nochmal spielen", linkCopied:"Link kopiert!", shareText:"WM-Torwart-Challenge! kkamnol.xyz/goalkeeper" },
  it: { nat:"Italiano", langTitle:"Scegli la lingua", title:"Portiere del Mondiale", tagline:"Pàrala col corpo!", how:"Para 10 tiri con braccia, mani e corpo", startCam:"Inizia con la fotocamera", startMouse:"Gioca con mouse/touch", privacy:"Il tuo video resta sul dispositivo", modePose:"🧤 Tracciamento corpo", modeMouse:"🖱 Mouse/touch", modeShow:"🧤 Allontanati così si vede il corpo", ready:"Pronto!", save:"PARATA!", goal:"GOL…", savesWord:"PARATE", resultQ:"Il tuo livello da portiere?", tiers:["Classe mondiale 🧤","Portiere della nazionale","Mani sicure","Promessa","Mani di burro"], outroCta:"Vuoi provare questo gioco?", shareTitle:"Fatto! Condividi il clip", shareSave:"Salva video", shareLink:"Condividi link", again:"Gioca ancora", linkCopied:"Link copiato!", shareText:"Sfida Portiere del Mondiale! kkamnol.xyz/goalkeeper" },
  ru: { nat:"Русский", langTitle:"Выберите язык", title:"Вратарь ЧМ", tagline:"Отбей телом!", how:"Отрази 10 ударов руками, ладонями и телом", startCam:"Начать с камерой", startMouse:"Играть мышью/касанием", privacy:"Видео не покидает устройство", modePose:"🧤 Отслеживание тела", modeMouse:"🖱 Мышь/касание", modeShow:"🧤 Отойдите, чтобы было видно тело", ready:"Готов!", save:"СЕЙВ!", goal:"ГОЛ…", savesWord:"СЕЙВЫ", resultQ:"Ваш вратарский ранг?", tiers:["Мирового класса 🧤","Вратарь сборной","Надёжные руки","Подающий надежды","Надо тренироваться"], outroCta:"Хочешь сыграть в эту игру?", shareTitle:"Готово! Поделись клипом", shareSave:"Сохранить видео", shareLink:"Поделиться ссылкой", again:"Ещё раз", linkCopied:"Ссылка скопирована!", shareText:"Вызов: Вратарь ЧМ! kkamnol.xyz/goalkeeper" },
  tr: { nat:"Türkçe", langTitle:"Dilini seç", title:"Dünya Kupası Kalecisi", tagline:"Vücudunla kurtar!", how:"Kollarınla, ellerinle ve vücudunla 10 şutu kurtar", startCam:"Kamerayla başla", startMouse:"Fare/dokunmatikle oyna", privacy:"Videon bu cihazdan çıkmaz", modePose:"🧤 Vücut takibi", modeMouse:"🖱 Fare/dokunmatik", modeShow:"🧤 Geri çekil, vücudun görünsün", ready:"Hazır!", save:"KURTARDI!", goal:"GOL…", savesWord:"KURTARIŞ", resultQ:"Kaleci seviyen?", tiers:["Dünya klasması 🧤","Milli kaleci","Güvenli eller","Gelecek vadeden","Biraz daha çalış"], outroCta:"Bu oyunu denemek ister misin?", shareTitle:"Bitti! Klibini paylaş", shareSave:"Videoyu kaydet", shareLink:"Bağlantıyı paylaş", again:"Tekrar oyna", linkCopied:"Bağlantı kopyalandı!", shareText:"Dünya Kupası Kalecisi mücadelesi! kkamnol.xyz/goalkeeper" },
  id: { nat:"Bahasa Indonesia", langTitle:"Pilih bahasa", title:"Kiper Piala Dunia", tagline:"Tahan dengan seluruh badan!", how:"Tahan 10 tembakan dengan lengan, tangan & badan", startCam:"Mulai dengan kamera", startMouse:"Main pakai mouse/sentuh", privacy:"Videomu tetap di perangkat ini", modePose:"🧤 Melacak tubuh", modeMouse:"🖱 Mouse/sentuh", modeShow:"🧤 Mundur agar tubuh terlihat", ready:"Siap!", save:"SELAMAT!", goal:"GOL…", savesWord:"PENYELAMATAN", resultQ:"Level kipermu?", tiers:["Kelas dunia 🧤","Kiper timnas","Tangan aman","Calon bintang","Latihan lagi ya"], outroCta:"Mau coba game ini?", shareTitle:"Selesai! Bagikan klipmu", shareSave:"Simpan video", shareLink:"Bagikan tautan", again:"Main lagi", linkCopied:"Tautan disalin!", shareText:"Tantangan Kiper Piala Dunia! kkamnol.xyz/goalkeeper" },
  vi: { nat:"Tiếng Việt", langTitle:"Chọn ngôn ngữ", title:"Thủ môn World Cup", tagline:"Cản phá bằng cả người!", how:"Cản 10 cú sút bằng tay, bàn tay và cơ thể", startCam:"Bắt đầu với camera", startMouse:"Chơi bằng chuột/cảm ứng", privacy:"Video không rời thiết bị này", modePose:"🧤 Đang theo dõi cơ thể", modeMouse:"🖱 Chuột/cảm ứng", modeShow:"🧤 Lùi lại để thấy cả người", ready:"Sẵn sàng!", save:"CỨU THUA!", goal:"THỦNG LƯỚI…", savesWord:"CỨU THUA", resultQ:"Đẳng cấp thủ môn của bạn?", tiers:["Đẳng cấp thế giới 🧤","Thủ môn tuyển","Đôi tay vững","Tài năng trẻ","Cần luyện thêm"], outroCta:"Muốn chơi trò này không?", shareTitle:"Xong! Chia sẻ clip", shareSave:"Lưu video", shareLink:"Chia sẻ liên kết", again:"Chơi lại", linkCopied:"Đã sao chép liên kết!", shareText:"Thử thách Thủ môn World Cup! kkamnol.xyz/goalkeeper" },
  th: { nat:"ไทย", langTitle:"เลือกภาษา", title:"ผู้รักษาประตูบอลโลก", tagline:"ป้องด้วยทั้งตัว!", how:"ป้อง 10 ลูกยิงด้วยแขน มือ และลำตัว", startCam:"เริ่มด้วยกล้อง", startMouse:"เล่นด้วยเมาส์/สัมผัส", privacy:"วิดีโออยู่แค่ในเครื่องนี้", modePose:"🧤 กำลังจับลำตัว", modeMouse:"🖱 เมาส์/สัมผัส", modeShow:"🧤 ถอยหลังให้เห็นทั้งตัว", ready:"พร้อม!", save:"เซฟ!", goal:"เสียประตู…", savesWord:"เซฟ", resultQ:"ระดับผู้รักษาประตูของคุณ?", tiers:["ระดับโลก 🧤","ผู้รักษาประตูทีมชาติ","มือที่ไว้ใจได้","ดาวรุ่ง","ฝึกอีกหน่อยนะ"], outroCta:"อยากเล่นเกมนี้ไหม?", shareTitle:"เสร็จ! แชร์คลิปเลย", shareSave:"บันทึกวิดีโอ", shareLink:"แชร์ลิงก์", again:"เล่นอีกครั้ง", linkCopied:"คัดลอกลิงก์แล้ว!", shareText:"ท้าเป็นผู้รักษาประตูบอลโลก! kkamnol.xyz/goalkeeper" },
  ar: { nat:"العربية", langTitle:"اختر لغتك", title:"حارس كأس العالم", tagline:"تصدّى بجسدك كله!", how:"تصدَّ لـ10 تسديدات بذراعيك ويديك وجسدك", startCam:"ابدأ بالكاميرا", startMouse:"العب بالماوس/اللمس", privacy:"الفيديو لا يغادر جهازك", modePose:"🧤 تتبع الجسم", modeMouse:"🖱 ماوس/لمس", modeShow:"🧤 تراجع ليظهر جسمك كاملاً", ready:"استعد!", save:"تصدٍّ!", goal:"هدف…", savesWord:"تصدّيات", resultQ:"تقييمك كحارس مرمى؟", tiers:["مستوى عالمي 🧤","حارس المنتخب","أيادٍ آمنة","موهبة صاعدة","تدرّب أكثر"], outroCta:"هل تريد تجربة هذه اللعبة؟", shareTitle:"تم! شارك مقطعك", shareSave:"حفظ الفيديو", shareLink:"مشاركة الرابط", again:"العب مجددًا", linkCopied:"تم نسخ الرابط!", shareText:"تحدي حارس كأس العالم! kkamnol.xyz/goalkeeper" },
  hi: { nat:"हिन्दी", langTitle:"अपनी भाषा चुनें", title:"वर्ल्ड कप गोलकीपर", tagline:"पूरे शरीर से रोको!", how:"बाँहों, हाथों और शरीर से 10 शॉट रोको", startCam:"कैमरे से शुरू करें", startMouse:"माउस/टच से खेलें", privacy:"आपका वीडियो डिवाइस में ही रहता है", modePose:"🧤 शरीर ट्रैकिंग", modeMouse:"🖱 माउस/टच", modeShow:"🧤 पीछे हटें ताकि पूरा शरीर दिखे", ready:"तैयार!", save:"रोक लिया!", goal:"गोल…", savesWord:"बचाव", resultQ:"आपकी गोलकीपर रेटिंग?", tiers:["वर्ल्ड क्लास 🧤","नेशनल कीपर","भरोसेमंद हाथ","उभरता सितारा","और अभ्यास करो"], outroCta:"यह गेम खेलना चाहते हैं?", shareTitle:"हो गया! क्लिप शेयर करें", shareSave:"वीडियो सेव करें", shareLink:"लिंक शेयर करें", again:"फिर से खेलें", linkCopied:"लिंक कॉपी हो गया!", shareText:"वर्ल्ड कप गोलकीपर चुनौती! kkamnol.xyz/goalkeeper" },
};
let lang = "ko";
const T = () => I18N[lang];
function rateTier(score) {
  const t = T().tiers;
  if (score >= 9) return t[0];
  if (score >= 7) return t[1];
  if (score >= 5) return t[2];
  if (score >= 3) return t[3];
  return t[4];
}

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

let ball = null;            // 현재 슛
let shotsSpawned = 0, shotsResolved = 0, saves = 0;
let board = [];             // 'save' | 'goal' (페널티 스코어보드)
let nextShotAt = 0, finishing = false;
let flash = { t: -9999, color: "#fff" };
let bannerText = "", bannerT = -9999, bannerColor = "#fff";

let poseLandmarker = null, camOn = false, lastVideoTime = -1;
let poseLm = null, poseT = -9999;   // 마지막으로 매핑된 전신 랜드마크(스크린 좌표)

// 배경 제거(사람만) 합성용 오프스크린 캔버스
const maskCanvas = document.createElement("canvas");
const maskCtx = maskCanvas.getContext("2d");
const personCanvas = document.createElement("canvas");
const personCtx = personCanvas.getContext("2d");
let maskImg = null, personReady = false, personT = -9999;
let pointer = { x: 0, y: 0, t: -9999 };
let usingPoseT = -9999;
let blockers = { segs: [], pts: [] };

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

// ---------- 오디오 ----------
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
  o.type = type; o.frequency.value = freq; o.connect(g); g.connect(masterGain);
  const now = audioCtx.currentTime + t0;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(peak, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  o.start(now); o.stop(now + dur + 0.05);
}
const playWhistle = () => { ensureAudio(); tone(2100, 0, 0.08, "square", 0.22); tone(2100, 0.12, 0.13, "square", 0.22); };
const playSave    = () => { ensureAudio(); tone(523, 0, 0.09, "triangle", 0.3); tone(784, 0.06, 0.12, "triangle", 0.3); tone(1047, 0.14, 0.16, "triangle", 0.28); };
const playGoal    = () => { ensureAudio(); tone(330, 0, 0.2, "sawtooth", 0.22); tone(233, 0.16, 0.34, "sawtooth", 0.2); };
const playComplete= () => { ensureAudio(); [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.34, "triangle", 0.3)); };
const playOutro   = () => { ensureAudio(); tone(784, 0, 0.5, "sine", 0.32); tone(1175, 0.12, 0.62, "sine", 0.28); tone(1568, 0.24, 0.8, "sine", 0.24); };

// ---------- 녹화 ----------
let rec = null, recChunks = [], recMime = "";
let lastVideoUrl = null, lastExt = "webm";
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

// ---------- 카메라 + 전신 추적 ----------
async function initCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false,
  });
  video.srcObject = stream;
  await video.play();
  await new Promise((r) => { if (video.videoWidth) return r(); video.onloadedmetadata = () => r(); });
}
async function initPose() {
  const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO", numPoses: 1,
    outputSegmentationMasks: true, // 사람만 분리해 잔디 위에 합성
  });
}
function camTransform() {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) return null;
  const scale = Math.max(W / vw, H / vh), dw = vw * scale, dh = vh * scale;
  return { vw, vh, scale, dw, dh, ox: (W - dw) / 2, oy: (H - dh) / 2 };
}
// 정규화 랜드마크 → 미러된 스크린 좌표
function mapLm(lm, tr) {
  return { x: W - (tr.ox + lm.x * tr.vw * tr.scale), y: tr.oy + lm.y * tr.vh * tr.scale, v: lm.visibility ?? 1 };
}
function detectPose(now) {
  if (!poseLandmarker || !camOn || video.readyState < 2) return;
  if (video.currentTime === lastVideoTime) return;
  lastVideoTime = video.currentTime;
  let res;
  try { res = poseLandmarker.detectForVideo(video, now); } catch { return; }
  if (!res) return;
  // 사람 실루엣 마스크 → personCanvas 합성 (배경 제거)
  if (res.segmentationMasks && res.segmentationMasks.length) {
    try { processSegmentation(res.segmentationMasks[0], now); } catch {}
    try { res.segmentationMasks[0].close(); } catch {}
  }
  if (!res.landmarks || !res.landmarks.length) return;
  const tr = camTransform(); if (!tr) return;
  poseLm = res.landmarks[0].map((lm) => mapLm(lm, tr));
  poseT = now;
  usingPoseT = now;
}

// 세그멘테이션 마스크로 비디오에서 사람만 잘라 personCanvas에 그림
function processSegmentation(mask, now) {
  const mw = mask.width, mh = mask.height;
  const conf = mask.getAsFloat32Array();
  if (maskCanvas.width !== mw || maskCanvas.height !== mh) {
    maskCanvas.width = mw; maskCanvas.height = mh;
    maskImg = maskCtx.createImageData(mw, mh);
  }
  const d = maskImg.data;
  for (let i = 0; i < conf.length; i++) {
    const c = conf[i];
    // 가장자리 부드럽게(페더링)
    d[i * 4 + 3] = c > 0.62 ? 255 : c < 0.34 ? 0 : ((c - 0.34) / 0.28) * 255;
  }
  maskCtx.putImageData(maskImg, 0, 0);

  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) return;
  if (personCanvas.width !== vw || personCanvas.height !== vh) { personCanvas.width = vw; personCanvas.height = vh; }
  personCtx.globalCompositeOperation = "source-over";
  personCtx.clearRect(0, 0, vw, vh);
  personCtx.drawImage(video, 0, 0, vw, vh);
  personCtx.globalCompositeOperation = "destination-in";
  personCtx.imageSmoothingEnabled = true;
  personCtx.drawImage(maskCanvas, 0, 0, vw, vh); // 마스크를 비디오 해상도로 확대
  personCtx.globalCompositeOperation = "source-over";
  personReady = true; personT = now;
}

// 거리: 점 → 선분
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// 몸/팔/손 → 블로커 세그먼트 + 손 포인트
function buildBlockers(now) {
  const segs = [], pts = [];
  if (poseLm && now - poseT < 320) {
    const L = poseLm;
    const vis = (i) => L[i] && (L[i].v ?? 1) > 0.4;
    const armT = MIN * 0.03, shT = MIN * 0.034, torsoT = MIN * 0.042;
    const addSeg = (a, b, th) => { if (vis(a) && vis(b)) segs.push({ ax: L[a].x, ay: L[a].y, bx: L[b].x, by: L[b].y, th }); };
    addSeg(11, 13, armT); addSeg(13, 15, armT);   // 왼팔: 어깨-팔꿈치-손목
    addSeg(12, 14, armT); addSeg(14, 16, armT);   // 오른팔
    addSeg(11, 12, shT);                          // 어깨선
    addSeg(11, 23, torsoT); addSeg(12, 24, torsoT); addSeg(23, 24, torsoT); // 몸통
    const handR = MIN * 0.05;
    [15, 16, 17, 18, 19, 20].forEach((i) => { if (vis(i)) pts.push({ x: L[i].x, y: L[i].y, r: handR }); }); // 양손(손목+손가락)
  }
  // 마우스/터치 폴백 글러브
  if (now - pointer.t < 160) pts.push({ x: pointer.x, y: pointer.y, r: MIN * 0.085, mouse: true });
  return { segs, pts };
}
function isBlocked(b) {
  for (const s of blockers.segs) if (segDist(b.x, b.y, s.ax, s.ay, s.bx, s.by) < b.r + s.th) return true;
  for (const p of blockers.pts) if (Math.hypot(b.x - p.x, b.y - p.y) < b.r + p.r) return true;
  return false;
}

// ---------- 게임 흐름 ----------
async function startGame() {
  ensureAudio();
  if (audioCtx.state === "suspended") { try { await audioCtx.resume(); } catch {} }
  phase = "play"; phaseStart = performance.now();
  ball = null; shotsSpawned = 0; shotsResolved = 0; saves = 0; board = [];
  finishing = false; flash.t = -9999; bannerT = -9999;
  nextShotAt = performance.now() + 1300; // "준비!"
  startScreen.hidden = true; shareScreen.hidden = true;
  startRecording();
  playWhistle();
}
function spawnShot() {
  shotsSpawned++;
  const tx = W * (0.14 + Math.random() * 0.72);
  const ty = H * (0.28 + Math.random() * 0.52);
  const vpx = W * (0.4 + Math.random() * 0.2), vpy = H * 0.34;
  const dur = Math.max(0.95, 1.55 - (shotsSpawned - 1) * 0.055); // 점점 빨라짐
  ball = {
    tx, ty, vpx, vpy, t0: performance.now(), dur,
    rFull: MIN * 0.072, x: vpx, y: vpy, r: MIN * 0.012, spin: 0,
    state: "fly", resolveT: 0, vx: 0, vy: 0, trail: [],
  };
}
function resolveSave() {
  ball.state = "saved"; ball.resolveT = performance.now();
  saves++; board.push("save");
  ball.vx = (ball.x < W / 2 ? -1 : 1) * W * (0.5 + Math.random() * 0.4);
  ball.vy = -H * (0.4 + Math.random() * 0.3);
  flash = { t: performance.now(), color: "#34d27b" };
  banner(T().save, "#9bf6c4");
  playSave();
}
function resolveGoal() {
  ball.state = "goal"; ball.resolveT = performance.now();
  board.push("goal");
  ball.vx = (ball.tx - ball.vpx) * 0.4; ball.vy = H * 0.25;
  flash = { t: performance.now(), color: "#ff4d4d" };
  banner(T().goal, "#ff8a8a");
  playGoal();
}
function banner(text, color) { bannerText = text; bannerColor = color; bannerT = performance.now(); }

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function finishGame() {
  if (finishing) return;
  finishing = true;
  phase = "result"; phaseStart = performance.now();
  playComplete();
  await wait(3000);
  phase = "outro"; phaseStart = performance.now();
  playOutro();
  await wait(2000); // 아웃트로 2초
  const blob = await stopRecording();
  showShare(blob);
}

// ---------- 공유 ----------
function showShare(blob) {
  phase = "idle";
  shareScreen.hidden = false;
  const saveBtn = document.getElementById("saveBtn");
  if (blob && blob.size) {
    lastExt = recMime.includes("mp4") ? "mp4" : "webm";
    if (lastVideoUrl) URL.revokeObjectURL(lastVideoUrl);
    lastVideoUrl = URL.createObjectURL(blob);
    shareVid.src = lastVideoUrl; shareVid.hidden = false;
    saveBtn.onclick = () => downloadBlob(lastVideoUrl, `kkamnol-goalkeeper.${lastExt}`);
  } else {
    shareVid.hidden = true;
    saveBtn.onclick = () => shareResultImage();
  }
}
function downloadBlob(url, name) { const a = document.createElement("a"); a.href = url; a.download = name; a.click(); }
async function shareLink() {
  const url = "https://kkamnol.xyz/goalkeeper";
  try { if (navigator.share) { await navigator.share({ title: T().title, text: T().shareText, url }); return; } } catch { return; }
  try { await navigator.clipboard.writeText(url); toast(T().linkCopied); } catch { toast(url); }
}
async function shareResultImage() {
  canvas.toBlob(async (b) => {
    if (!b) return;
    const f = new File([b], "kkamnol-goalkeeper.png", { type: "image/png" });
    try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: "Kkamnol" }); return; } } catch {}
    downloadBlob(URL.createObjectURL(b), "kkamnol-goalkeeper.png");
  });
}

// ---------- 메인 루프 ----------
function frame(now) {
  const dt = Math.min(0.05, (now - (frame._p || now)) / 1000 || 0);
  frame._p = now;

  detectPose(now);
  blockers = buildBlockers(now);

  if (phase === "play") {
    // 다음 슛 스폰
    if (!ball && !finishing && shotsSpawned < TOTAL_SHOTS && now >= nextShotAt) spawnShot();

    if (ball) {
      if (ball.state === "fly") {
        let t = (now - ball.t0) / (ball.dur * 1000);
        if (t > 1) t = 1;
        const e = t * t; // 가까워질수록 가속
        ball.x = ball.vpx + (ball.tx - ball.vpx) * t;
        ball.y = ball.vpy + (ball.ty - ball.vpy) * t - Math.sin(Math.PI * t) * H * 0.1;
        ball.r = ball.rFull * (0.16 + 0.84 * e);
        ball.spin += dt * 9;
        ball.trail.push({ x: ball.x, y: ball.y, r: ball.r });
        if (ball.trail.length > 7) ball.trail.shift();
        if (t >= 0.78 && isBlocked(ball)) resolveSave();
        else if (t >= 1) resolveGoal();
      } else {
        // 처리 후 날아가는 연출
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        ball.vy += H * 1.6 * dt;
        if (ball.state === "goal") ball.r *= 1 + 0.5 * dt;
        ball.spin += dt * 14;
        if (now - ball.resolveT > 850) {
          ball = null;
          shotsResolved++;
          if (shotsResolved >= TOTAL_SHOTS) finishGame();
          else nextShotAt = now + 650;
        }
      }
    }
  }

  render(now);
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
function pentagon(cx, cy, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = rot + i * (Math.PI * 2 / 5) - Math.PI / 2;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}
// 축구공 (월드컵)
function drawBall(x, y, r, spin) {
  ctx.save();
  // 그림자
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.92, r * 0.85, r * 0.28, 0, 0, 6.2832);
  ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.fill();
  // 구체
  const grad = ctx.createRadialGradient(x - r * 0.32, y - r * 0.34, r * 0.1, x, y, r);
  grad.addColorStop(0, "#ffffff"); grad.addColorStop(1, "#c9cdd2");
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fillStyle = grad; ctx.fill();
  // 검은 패치 (원 안으로 클립)
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.clip();
  ctx.fillStyle = "#16181c";
  pentagon(x, y, r * 0.34, spin); ctx.fill();
  for (let i = 0; i < 5; i++) {
    const a = spin + i * (Math.PI * 2 / 5) - Math.PI / 2;
    const px = x + Math.cos(a) * r * 0.74, py = y + Math.sin(a) * r * 0.74;
    pentagon(px, py, r * 0.26, spin + a); ctx.fill();
  }
  ctx.restore();
  // 외곽선 + 하이라이트
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
  ctx.lineWidth = Math.max(1, r * 0.04); ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x - r * 0.34, y - r * 0.36, r * 0.26, r * 0.16, -0.5, 0, 6.2832);
  ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.fill();
  ctx.restore();
}

// 절차적 축구장 (원근 잔디 + 라인 + 스타디움) — 외부 이미지 없음(녹화/공유 안전)
function drawPitch() {
  const hy = H * 0.30, cxc = W / 2;

  // 스타디움 / 하늘
  const sky = ctx.createLinearGradient(0, 0, 0, hy);
  sky.addColorStop(0, "#0a0e14"); sky.addColorStop(1, "#13202a");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hy);
  // 관중석 밴드 + 점묘 관중
  ctx.fillStyle = "#1b2730"; ctx.fillRect(0, hy - MIN * 0.06, W, MIN * 0.06);
  ctx.save();
  for (let y = hy - MIN * 0.055; y < hy - MIN * 0.004; y += MIN * 0.012) {
    for (let x = (y * 7 % 13); x < W; x += MIN * 0.018) {
      ctx.globalAlpha = 0.12 + ((x + y) % 7) / 28;
      ctx.fillStyle = ["#cdd6dc", "#9fb0bb", "#e8d7b0"][(x + y | 0) % 3];
      ctx.fillRect(x, y, MIN * 0.008, MIN * 0.006);
    }
  }
  ctx.restore();
  // 플러드라이트 글로우
  const fl = ctx.createRadialGradient(cxc, hy - MIN * 0.02, 0, cxc, hy, W * 0.7);
  fl.addColorStop(0, "rgba(255,255,255,0.12)"); fl.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = fl; ctx.fillRect(0, 0, W, hy + MIN * 0.1);

  // 잔디
  const grass = ctx.createLinearGradient(0, hy, 0, H);
  grass.addColorStop(0, "#2a7d44"); grass.addColorStop(0.5, "#1f6e39"); grass.addColorStop(1, "#0e4d26");
  ctx.fillStyle = grass; ctx.fillRect(0, hy, W, H - hy);
  // 잔디 줄무늬(원근: 아래로 갈수록 두꺼워짐)
  let y = hy, bh = (H - hy) * 0.022, i = 0;
  while (y < H) {
    if (i % 2 === 0) { ctx.fillStyle = "rgba(255,255,255,0.045)"; ctx.fillRect(0, y, W, bh); }
    y += bh; bh *= 1.16; i++;
  }

  // 흰 라인 (원근)
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = Math.max(2, MIN * 0.0055);
  ctx.lineJoin = "round";
  // 페널티 박스(아래=넓고 가까움, 위=좁고 멈)
  const nearY = H * 0.99, farY = hy + (H - hy) * 0.34;
  const nearH = W * 0.52, farH = W * 0.15;
  ctx.beginPath();
  ctx.moveTo(cxc - nearH, nearY); ctx.lineTo(cxc - farH, farY);
  ctx.lineTo(cxc + farH, farY); ctx.lineTo(cxc + nearH, nearY); ctx.stroke();
  // 골에어리어(작은 박스)
  const nY2 = H * 0.99, fY2 = hy + (H - hy) * 0.13, nH2 = W * 0.27, fH2 = W * 0.075;
  ctx.beginPath();
  ctx.moveTo(cxc - nH2, nY2); ctx.lineTo(cxc - fH2, fY2);
  ctx.lineTo(cxc + fH2, fY2); ctx.lineTo(cxc + nH2, nY2); ctx.stroke();
  // 페널티 아크('D')
  ctx.beginPath(); ctx.ellipse(cxc, farY, farH * 0.72, (H - hy) * 0.05, 0, Math.PI, 0); ctx.stroke();
  // 페널티 스폿
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath(); ctx.ellipse(cxc, hy + (H - hy) * 0.6, MIN * 0.011, MIN * 0.004, 0, 0, 6.2832); ctx.fill();
  // 하프라인 + 센터서클(지평선 근처)
  ctx.beginPath(); ctx.moveTo(0, hy + (H - hy) * 0.045); ctx.lineTo(W, hy + (H - hy) * 0.045); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cxc, hy + (H - hy) * 0.045, W * 0.085, (H - hy) * 0.014, 0, 0, 6.2832); ctx.stroke();
  ctx.restore();

  // 가장자리 비네팅
  const vig = ctx.createRadialGradient(cxc, H * 0.62, MIN * 0.2, cxc, H * 0.62, MIN * 1.1);
  vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
}

// 골대 프레임(흰 포스트) — 골 입구 = 화면. 키퍼는 그 앞에 합성됨
function drawGoalFrame() {
  const m = W * 0.045, top = H * 0.075, post = MIN * 0.018;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.shadowBlur = MIN * 0.022; ctx.shadowColor = "rgba(255,255,255,0.55)";
  ctx.fillRect(m - post, top - post, W - 2 * m + 2 * post, post); // 크로스바
  ctx.fillRect(m - post, top, post, H - top);                    // 좌 포스트
  ctx.fillRect(W - m, top, post, H - top);                       // 우 포스트
  ctx.restore();
}

// 몸/팔/손 오버레이
function drawBody(now) {
  if (!poseLm || now - poseT > 320) return;
  const L = poseLm;
  const vis = (i) => L[i] && (L[i].v ?? 1) > 0.4;
  ctx.save();
  // 몸통 채움
  if (vis(11) && vis(12) && vis(24) && vis(23)) {
    ctx.beginPath();
    ctx.moveTo(L[11].x, L[11].y); ctx.lineTo(L[12].x, L[12].y);
    ctx.lineTo(L[24].x, L[24].y); ctx.lineTo(L[23].x, L[23].y); ctx.closePath();
    ctx.fillStyle = "rgba(52,210,123,0.16)"; ctx.fill();
  }
  // 팔/어깨 라인
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(132,226,191,0.92)";
  ctx.shadowBlur = MIN * 0.025; ctx.shadowColor = "rgba(52,210,123,0.9)";
  const line = (a, b, w) => { if (!vis(a) || !vis(b)) return; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(L[a].x, L[a].y); ctx.lineTo(L[b].x, L[b].y); ctx.stroke(); };
  line(11, 12, MIN * 0.02);
  line(11, 13, MIN * 0.026); line(13, 15, MIN * 0.026);
  line(12, 14, MIN * 0.026); line(14, 16, MIN * 0.026);
  ctx.shadowBlur = 0;
  // 글러브(양손)
  [15, 16].forEach((i) => {
    if (!vis(i)) return;
    ctx.beginPath(); ctx.arc(L[i].x, L[i].y, MIN * 0.045, 0, 6.2832);
    ctx.fillStyle = "rgba(255,210,63,0.92)"; ctx.fill();
    ctx.lineWidth = MIN * 0.006; ctx.strokeStyle = "#fff"; ctx.stroke();
  });
  ctx.restore();
}

// ---------- 렌더 ----------
function render(now) {
  ctx.fillStyle = "#08130c";
  ctx.fillRect(0, 0, W, H);

  if (phase === "outro") { renderOutro(now); return; }

  drawPitch();        // 절차적 축구장 배경
  drawGoalFrame();    // 골대 포스트(키퍼 뒤)

  // 카메라: 배경을 지우고 "사람만" 잔디 위에 합성
  const tr = camOn ? camTransform() : null;
  if (tr && personReady && now - personT < 400) {
    ctx.save();
    ctx.translate(W, 0); ctx.scale(-1, 1);                 // 비디오와 동일하게 미러
    ctx.shadowBlur = MIN * 0.02; ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.drawImage(personCanvas, tr.ox, tr.oy, tr.dw, tr.dh);
    ctx.restore();
  }

  if (phase === "play" || phase === "result") {
    if (phase === "play") drawBody(now);
    if (ball) {
      for (let i = 0; i < ball.trail.length; i++) {
        const tp = ball.trail[i];
        ctx.globalAlpha = (i / ball.trail.length) * 0.32;
        ctx.beginPath(); ctx.arc(tp.x, tp.y, tp.r * 0.92, 0, 6.2832);
        ctx.fillStyle = "#fff"; ctx.fill();
      }
      ctx.globalAlpha = 1;
      drawBall(ball.x, ball.y, ball.r, ball.spin);
    }
    renderHUD(now);
    renderBanner(now);
    renderFlash(now);
  }
  if (phase === "result") renderResult(now);
  updateModePill(now);
}

function renderFlash(now) {
  const el = now - flash.t;
  if (el < 0 || el > 320) return;
  ctx.globalAlpha = (1 - el / 320) * 0.35;
  ctx.fillStyle = flash.color; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
}

function renderBanner(now) {
  const el = (now - bannerT) / 1000;
  if (el < 0 || el > 0.9) {
    // 준비! (첫 슛 전)
    if (phase === "play" && shotsSpawned === 0 && now < nextShotAt) {
      ctx.fillStyle = "#ffd23f"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `900 ${MIN * 0.1}px "Inter","Noto Sans KR",sans-serif`;
      ctx.fillText(T().ready, W / 2, H * 0.5);
    }
    return;
  }
  const pop = el < 0.15 ? el / 0.15 : 1;
  const fade = el > 0.65 ? 1 - (el - 0.65) / 0.25 : 1;
  ctx.save();
  ctx.globalAlpha = fade; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.translate(W / 2, H * 0.42); ctx.scale(0.7 + 0.4 * pop, 0.7 + 0.4 * pop);
  ctx.fillStyle = bannerColor;
  ctx.shadowBlur = MIN * 0.03; ctx.shadowColor = bannerColor;
  ctx.font = `900 ${MIN * 0.13}px "Inter","Noto Sans KR",sans-serif`;
  ctx.fillText(bannerText, 0, 0);
  ctx.restore();
}

function renderHUD(now) {
  // 선방 카운트 (좌상단)
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffd23f"; ctx.textAlign = "left";
  ctx.font = `900 ${MIN * 0.05}px "Inter",sans-serif`;
  ctx.fillText(`🧤 ${saves}`, W * 0.055, H * 0.075 + MIN * 0.05);
  // 슛 카운트 (우상단)
  ctx.fillStyle = "#fff"; ctx.textAlign = "right";
  ctx.font = `800 ${MIN * 0.04}px "Inter",sans-serif`;
  ctx.fillText(`${Math.min(shotsResolved + (ball ? 1 : 0), TOTAL_SHOTS)} / ${TOTAL_SHOTS}`, W - W * 0.055, H * 0.075 + MIN * 0.05);
  // 스코어보드 점
  const r = MIN * 0.013, gap = MIN * 0.04;
  const total = (TOTAL_SHOTS - 1) * gap;
  let bx = W / 2 - total / 2;
  const by = H * 0.075 + MIN * 0.05;
  for (let i = 0; i < TOTAL_SHOTS; i++) {
    ctx.beginPath(); ctx.arc(bx, by, r, 0, 6.2832);
    ctx.fillStyle = board[i] === "save" ? "#34d27b" : board[i] === "goal" ? "#ff4d4d" : "rgba(255,255,255,0.25)";
    ctx.fill();
    bx += gap;
  }
}

function renderResult(now) {
  const t = Math.min(1, (now - phaseStart) / 350);
  const cw = Math.min(W * 0.88, MIN * 1.5), ch = Math.min(H * 0.62, MIN * 1.35);
  const cx = (W - cw) / 2, cy = (H - ch) / 2;
  ctx.globalAlpha = t;
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(0.94 + 0.06 * t, 0.94 + 0.06 * t); ctx.translate(-W / 2, -H / 2);

  roundRect(cx, cy, cw, ch, MIN * 0.06);
  ctx.fillStyle = "rgba(12,22,15,0.95)"; ctx.fill();
  ctx.strokeStyle = "rgba(52,210,123,0.55)"; ctx.lineWidth = 2; ctx.stroke();

  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = `800 ${MIN * 0.042}px "Noto Sans KR",system-ui,sans-serif`;
  ctx.fillText(T().resultQ, W / 2, cy + ch * 0.16);

  // 큰 점수
  ctx.fillStyle = "#ffd23f";
  ctx.font = `900 ${MIN * 0.16}px "Inter",sans-serif`;
  ctx.fillText(`${saves} / ${TOTAL_SHOTS}`, W / 2, cy + ch * 0.37);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = `800 ${MIN * 0.036}px "Inter","Noto Sans KR",sans-serif`;
  ctx.fillText(T().savesWord, W / 2, cy + ch * 0.5);

  // 등급
  ctx.fillStyle = "#84e2bf";
  ctx.font = `900 ${MIN * 0.066}px "Noto Sans KR",system-ui,sans-serif`;
  ctx.fillText(rateTier(saves), W / 2, cy + ch * 0.66);

  // 스코어보드 점
  const r = MIN * 0.016, gap = MIN * 0.045;
  let bx = W / 2 - (TOTAL_SHOTS - 1) * gap / 2;
  const by = cy + ch * 0.8;
  for (let i = 0; i < TOTAL_SHOTS; i++) {
    ctx.beginPath(); ctx.arc(bx, by, r, 0, 6.2832);
    ctx.fillStyle = board[i] === "save" ? "#34d27b" : board[i] === "goal" ? "#ff4d4d" : "rgba(255,255,255,0.25)";
    ctx.fill(); bx += gap;
  }

  ctx.fillStyle = "rgba(132,226,191,0.9)";
  ctx.font = `800 ${MIN * 0.03}px "Inter",sans-serif`;
  ctx.fillText("kkamnol.xyz", W / 2, cy + ch * 0.91);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function renderOutro(now) {
  const el = (now - phaseStart) / 1000;
  const fade = Math.min(1, el / 0.35) * Math.min(1, Math.max(0, (2.0 - el) / 0.35));
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = fade;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";

  ctx.fillStyle = "#84e2bf";
  ctx.font = `800 ${MIN * 0.045}px "Noto Sans KR",system-ui,sans-serif`;
  ctx.fillText(T().outroCta, W / 2, H / 2 - MIN * 0.2);

  ctx.font = `${MIN * 0.12}px "Noto Color Emoji","Apple Color Emoji",sans-serif`;
  ctx.fillText("😮", W / 2, H / 2 - MIN * 0.04);
  ctx.fillStyle = "#fff";
  ctx.font = `900 ${MIN * 0.1}px "Inter",sans-serif`;
  ctx.fillText("Kkamnol", W / 2, H / 2 + MIN * 0.08);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = `700 ${MIN * 0.034}px "Inter",sans-serif`;
  ctx.fillText("kkamnol.xyz", W / 2, H / 2 + MIN * 0.17);
  ctx.globalAlpha = 1;
}

function updateModePill(now) {
  if (!modeEl) return;
  modeEl.textContent = now - usingPoseT < 500 ? T().modePose
    : now - pointer.t < 200 ? T().modeMouse
    : camOn ? T().modeShow : "· · ·";
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
  document.title = t.title + " — Kkamnol";
  document.getElementById("startTitle").textContent = t.title;
  document.getElementById("startTagline").textContent = t.tagline;
  document.getElementById("startHow").textContent = t.how;
  document.getElementById("startBtn").textContent = t.startCam;
  document.getElementById("startNoCam").textContent = t.startMouse;
  document.getElementById("startPrivacy").textContent = t.privacy;
  document.getElementById("shareTitle").textContent = t.shareTitle;
  document.getElementById("saveBtn").textContent = t.shareSave;
  document.getElementById("linkBtn").textContent = t.shareLink;
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
    try { await initPose(); camOn = true; } catch { camOn = true; }
  } catch { toast(T().privacy); }
  btn.disabled = false;
  startGame();
});
document.getElementById("startNoCam").addEventListener("click", () => startGame());
document.getElementById("linkBtn").addEventListener("click", shareLink);
document.getElementById("againBtn").addEventListener("click", () => { shareScreen.hidden = true; startScreen.hidden = false; });

// 브라우저 언어 자동 선택(있으면)
(function autoLang() {
  const n = (navigator.language || "en").toLowerCase();
  const code = Object.keys(I18N).find((c) => n === c || n.startsWith(c + "-")) || (n.startsWith("zh") ? "zh" : null);
  if (code) lang = code;
})();

// ---------- 부트 ----------
buildLangGrid();
applyLang();
frame._p = performance.now();
requestAnimationFrame(frame);

// 헤드리스 프리뷰 검증용(?debug 일 때만 노출 — 실사용엔 비활성)
if (location.search.includes("debug")) {
  window.__gk = {
    frame, startGame, spawnShot, resolveSave, resolveGoal,
    setPointer: (x, y) => { pointer.x = x * DPR; pointer.y = y * DPR; pointer.t = performance.now(); },
    setPhase: (p) => { phase = p; phaseStart = performance.now(); },
    setSaves: (n, b) => { saves = n; board = b || []; },
    fakeBall: (x, y, r) => { ball = { tx: x, ty: y, vpx: x, vpy: y, t0: performance.now() - 9999, dur: 1, rFull: r, x, y, r, spin: 0.6, state: "fly", resolveT: 0, vx: 0, vy: 0, trail: [{ x, y, r }] }; },
    state: () => ({ phase, shotsSpawned, shotsResolved, saves, W, H, ball: ball && { x: ball.x, y: ball.y, r: ball.r, state: ball.state } }),
  };
}
