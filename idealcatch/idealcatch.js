/* ===========================================================================
   이상형 캐치캐치 — 손으로 이상형 조건을 잡아 배우자 완성 (PoC)
   손 추적(MediaPipe) · 조건 5개 캐치 · 결과 카드 · 검은 Kkamnol 아웃트로(효과음)
   영상 녹화→저장/링크 공유 · 다국어(세계 16개국) · 마우스/터치 폴백
   =========================================================================== */

import {
  FilesetResolver,
  HandLandmarker,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

// ---------- 조건(트레잇): 색상 + 16개국 번역 ----------
const TRAITS = {
  looks:       { color: "#ff5a8a", ko:"미모", en:"Looks", ja:"美貌", zh:"颜值", es:"Belleza", pt:"Beleza", fr:"Beauté", de:"Aussehen", it:"Bellezza", ru:"Красота", tr:"Güzellik", id:"Penampilan", vi:"Ngoại hình", th:"หน้าตา", ar:"الجمال", hi:"सुंदरता" },
  personality: { color: "#a78bfa", ko:"성격", en:"Personality", ja:"性格", zh:"性格", es:"Carácter", pt:"Personalidade", fr:"Caractère", de:"Charakter", it:"Carattere", ru:"Характер", tr:"Karakter", id:"Kepribadian", vi:"Tính cách", th:"นิสัย", ar:"الشخصية", hi:"व्यक्तित्व" },
  stability:   { color: "#4f9dff", ko:"안정감", en:"Stability", ja:"安定感", zh:"安全感", es:"Estabilidad", pt:"Estabilidade", fr:"Stabilité", de:"Stabilität", it:"Stabilità", ru:"Стабильность", tr:"İstikrar", id:"Kestabilan", vi:"Sự ổn định", th:"ความมั่นคง", ar:"الاستقرار", hi:"स्थिरता" },
  humor:       { color: "#ffb13d", ko:"유머", en:"Humor", ja:"ユーモア", zh:"幽默", es:"Humor", pt:"Humor", fr:"Humour", de:"Humor", it:"Umorismo", ru:"Юмор", tr:"Mizah", id:"Humor", vi:"Hài hước", th:"อารมณ์ขัน", ar:"الفكاهة", hi:"हास्य" },
  wealth:      { color: "#f4c430", ko:"재력", en:"Wealth", ja:"財力", zh:"财力", es:"Riqueza", pt:"Riqueza", fr:"Richesse", de:"Reichtum", it:"Ricchezza", ru:"Богатство", tr:"Zenginlik", id:"Kekayaan", vi:"Tài chính", th:"ฐานะ", ar:"الثروة", hi:"दौलत" },
  warmth:      { color: "#ff8a5c", ko:"다정함", en:"Warmth", ja:"優しさ", zh:"体贴", es:"Ternura", pt:"Carinho", fr:"Tendresse", de:"Wärme", it:"Affetto", ru:"Теплота", tr:"Sıcaklık", id:"Kehangatan", vi:"Ấm áp", th:"ความอบอุ่น", ar:"الحنان", hi:"गर्मजोशी" },
  height:      { color: "#2dd4bf", ko:"키", en:"Height", ja:"身長", zh:"身高", es:"Estatura", pt:"Altura", fr:"Taille", de:"Größe", it:"Altezza", ru:"Рост", tr:"Boy", id:"Tinggi", vi:"Chiều cao", th:"ส่วนสูง", ar:"الطول", hi:"कद" },
  intellect:   { color: "#818cf8", ko:"지성", en:"Intellect", ja:"知性", zh:"智慧", es:"Inteligencia", pt:"Inteligência", fr:"Intelligence", de:"Intelligenz", it:"Intelletto", ru:"Интеллект", tr:"Zekâ", id:"Kecerdasan", vi:"Trí tuệ", th:"สติปัญญา", ar:"الذكاء", hi:"बुद्धि" },
  manners:     { color: "#38bdf8", ko:"매너", en:"Manners", ja:"マナー", zh:"礼貌", es:"Modales", pt:"Modos", fr:"Manières", de:"Manieren", it:"Buone maniere", ru:"Манеры", tr:"Nezaket", id:"Sopan santun", vi:"Lịch sự", th:"มารยาท", ar:"الأخلاق", hi:"शिष्टाचार" },
  style:       { color: "#ec4899", ko:"패션센스", en:"Style", ja:"ファッション", zh:"时尚", es:"Estilo", pt:"Estilo", fr:"Style", de:"Stil", it:"Stile", ru:"Стиль", tr:"Tarz", id:"Gaya", vi:"Phong cách", th:"สไตล์", ar:"الأناقة", hi:"स्टाइल" },
  voice:       { color: "#22d3ee", ko:"목소리", en:"Voice", ja:"声", zh:"声音", es:"Voz", pt:"Voz", fr:"Voix", de:"Stimme", it:"Voce", ru:"Голос", tr:"Ses", id:"Suara", vi:"Giọng nói", th:"น้ำเสียง", ar:"الصوت", hi:"आवाज़" },
  cooking:     { color: "#ff6b4a", ko:"요리실력", en:"Cooking", ja:"料理上手", zh:"厨艺", es:"Cocina", pt:"Culinária", fr:"Cuisine", de:"Kochkunst", it:"Cucina", ru:"Кулинария", tr:"Yemek", id:"Masakan", vi:"Nấu ăn", th:"ทำอาหาร", ar:"الطبخ", hi:"खाना बनाना" },
  health:      { color: "#4ade80", ko:"건강", en:"Health", ja:"健康", zh:"健康", es:"Salud", pt:"Saúde", fr:"Santé", de:"Gesundheit", it:"Salute", ru:"Здоровье", tr:"Sağlık", id:"Kesehatan", vi:"Sức khỏe", th:"สุขภาพ", ar:"الصحة", hi:"सेहत" },
  competence:  { color: "#fbbf24", ko:"능력", en:"Competence", ja:"能力", zh:"能力", es:"Capacidad", pt:"Competência", fr:"Compétence", de:"Kompetenz", it:"Competenza", ru:"Способности", tr:"Yetenek", id:"Kemampuan", vi:"Năng lực", th:"ความสามารถ", ar:"الكفاءة", hi:"योग्यता" },

  // ── 추가 낱말(밈/재미): ko·en·ja·zh 우선, 그 외 언어는 en 폴백 ──
  // 신체
  shoulders:   { color:"#5b9bd5", ko:"넓은 어깨", en:"Broad shoulders", ja:"広い肩幅", zh:"宽肩" },
  sline:       { color:"#ff7eb6", ko:"S라인", en:"S-line figure", ja:"Sライン", zh:"S曲线" },
  sixpack:     { color:"#e8924a", ko:"식스팩", en:"Six-pack", ja:"シックスパック", zh:"六块腹肌" },
  longlegs:    { color:"#34d399", ko:"롱다리", en:"Long legs", ja:"美脚", zh:"大长腿" },
  tall180:     { color:"#6ea8fe", ko:"키 180+", en:"180cm+", ja:"身長180+", zh:"身高180+" },
  eyesmile:    { color:"#f9a8d4", ko:"눈웃음", en:"Eye-smile", ja:"目が笑う", zh:"笑眼" },
  honeyskin:   { color:"#fcd34d", ko:"꿀피부", en:"Glowing skin", ja:"美肌", zh:"好皮肤" },
  // 세속/재력
  income50:    { color:"#f4c430", ko:"연봉 5천+", en:"Solid income", ja:"年収高め", zh:"高薪" },
  income100:   { color:"#eab308", ko:"연봉 1억+", en:"6-figure income", ja:"年収1千万+", zh:"年薪百万+" },
  building:    { color:"#c9a227", ko:"건물주", en:"Owns a building", ja:"ビルのオーナー", zh:"包租公婆" },
  ownhouse:    { color:"#86c34a", ko:"자가 보유", en:"Owns a home", ja:"持ち家", zh:"有房" },
  nodebt:      { color:"#4ade80", ko:"빚 없음", en:"Debt-free", ja:"借金なし", zh:"无负债" },
  foreigncar:  { color:"#b0bec5", ko:"외제차", en:"Imported car", ja:"外車持ち", zh:"进口车" },
  stablejob:   { color:"#38bdf8", ko:"안정적 직장", en:"Stable job", ja:"安定職", zh:"稳定工作" },
  cryptohit:   { color:"#f7931a", ko:"코인 떡상", en:"Crypto gains", ja:"仮想通貨成功", zh:"币圈赢家" },
  // 가족/밈
  youngestson: { color:"#a78bfa", ko:"종갓집 막내", en:"No family duties", ja:"本家の末っ子", zh:"无家族负担" },
  richparents: { color:"#ffd23f", ko:"노후 든든 부모님", en:"Wealthy parents", ja:"裕福な両親", zh:"父母无忧老后" },
  onlychild:   { color:"#fb923c", ko:"외동", en:"Only child", ja:"一人っ子", zh:"独生子女" },
  noinlaw:     { color:"#5eead4", ko:"시월드 없음", en:"No in-law drama", ja:"義実家トラブル無し", zh:"没婆媳问题" },
  inlawfar:    { color:"#93c5fd", ko:"시댁 멀리", en:"In-laws far away", ja:"義実家が遠い", zh:"公婆住得远" },
  // 라이프/밈
  nogames:     { color:"#ef4444", ko:"게임 안 함", en:"Doesn't game", ja:"ゲームしない", zh:"不打游戏" },
  nodrink:     { color:"#22d3ee", ko:"술 안 함", en:"Doesn't drink", ja:"お酒飲まない", zh:"不喝酒" },
  notmamaboy:  { color:"#fb7185", ko:"마마보이 아님", en:"Not a mama's boy", ja:"マザコンじゃない", zh:"非妈宝" },
  homebody:    { color:"#c084fc", ko:"집순이집돌이", en:"Homebody", ja:"インドア派", zh:"宅家" },
  goodmbti:    { color:"#2dd4bf", ko:"잘 맞는 MBTI", en:"Matching MBTI", ja:"相性のMBTI", zh:"MBTI合拍" },
  greenflag:   { color:"#4ade80", ko:"효자효녀", en:"Green flag", ja:"親孝行", zh:"孝顺" },
  gooddriver:  { color:"#9ca3af", ko:"운전 잘함", en:"Good driver", ja:"運転上手", zh:"车技好" },
  petlover:    { color:"#a3e635", ko:"동물 잘 챙김", en:"Loves pets", ja:"動物好き", zh:"爱宠物" },
};
const TRAIT_KEYS = Object.keys(TRAITS);

// ---------- i18n (UI) ----------
const I18N = {
  ko: { nat:"한국어", langTitle:"언어를 선택하세요", title:"이상형 캐치캐치", tagline:"손으로 잡아 이상형을 완성!", how:"위로 떠오르는 조건을 5개 캐치하세요", startCam:"카메라 켜고 시작", startMouse:"마우스/터치로 플레이", privacy:"영상은 기기 안에서만 처리돼요", modeHand:"✋ 손 추적 중", modeMouse:"🖱 마우스/터치", modeShow:"✋ 손을 보여주세요", resultQ:"내 이상형은?", resultTmpl:(x)=>`${x}의 배우자!`, resultAll:"이 모든 걸 갖춘 사람 💘", outroCta:"이 게임을 하고 싶다면?", shareTitle:"완성! 영상으로 공유하세요", shareSave:"영상 저장", shareLink:"링크 공유", again:"다시 하기", linkCopied:"링크를 복사했어요!" },
  en: { nat:"English", langTitle:"Choose your language", title:"Catch Your Type", tagline:"Grab traits to build your dream partner!", how:"Catch 5 traits floating up", startCam:"Start with Camera", startMouse:"Play with Mouse/Touch", privacy:"Your video never leaves this device", modeHand:"✋ Hand tracking", modeMouse:"🖱 Mouse/Touch", modeShow:"✋ Show your hand", resultQ:"Your future spouse?", resultTmpl:(x)=>`${x}, above all!`, resultAll:"Someone with all of this 💘", outroCta:"Want to try this game?", shareTitle:"Done! Share your clip", shareSave:"Save video", shareLink:"Share link", again:"Play again", linkCopied:"Link copied!" },
  ja: { nat:"日本語", langTitle:"言語を選んでください", title:"理想のタイプをキャッチ", tagline:"手で掴んで理想の相手を完成！", how:"浮かび上がる条件を5つキャッチ", startCam:"カメラを使って開始", startMouse:"マウス/タッチでプレイ", privacy:"映像は端末内だけで処理されます", modeHand:"✋ 手を認識中", modeMouse:"🖱 マウス/タッチ", modeShow:"✋ 手を見せて", resultQ:"あなたの伴侶は？", resultTmpl:(x)=>`${x}の伴侶！`, resultAll:"全部揃った人 💘", outroCta:"このゲームをやってみたい？", shareTitle:"完成！シェアしよう", shareSave:"動画を保存", shareLink:"リンクを共有", again:"もう一度", linkCopied:"リンクをコピーしました！" },
  zh: { nat:"中文", langTitle:"请选择语言", title:"理想型大作战", tagline:"用手抓取，拼出你的理想型！", how:"抓住飘上来的5个条件", startCam:"开启摄像头开始", startMouse:"用鼠标/触屏玩", privacy:"影像仅在本机处理", modeHand:"✋ 手部追踪中", modeMouse:"🖱 鼠标/触屏", modeShow:"✋ 请露出手", resultQ:"你的另一半？", resultTmpl:(x)=>`${x}的另一半！`, resultAll:"拥有这一切的人 💘", outroCta:"想玩这个游戏吗？", shareTitle:"完成！快来分享", shareSave:"保存视频", shareLink:"分享链接", again:"再玩一次", linkCopied:"链接已复制！" },
  es: { nat:"Español", langTitle:"Elige tu idioma", title:"Atrapa tu tipo ideal", tagline:"¡Atrapa rasgos y crea tu pareja ideal!", how:"Atrapa 5 cualidades que suben", startCam:"Empezar con cámara", startMouse:"Jugar con ratón/táctil", privacy:"Tu vídeo no sale de este dispositivo", modeHand:"✋ Rastreo de mano", modeMouse:"🖱 Ratón/táctil", modeShow:"✋ Muestra tu mano", resultQ:"¿Tu futura pareja?", resultTmpl:(x)=>`¡Sobre todo, ${x}!`, resultAll:"Alguien con todo esto 💘", outroCta:"¿Quieres probar este juego?", shareTitle:"¡Listo! Comparte tu clip", shareSave:"Guardar vídeo", shareLink:"Compartir enlace", again:"Jugar otra vez", linkCopied:"¡Enlace copiado!" },
  pt: { nat:"Português", langTitle:"Escolha seu idioma", title:"Pegue seu tipo ideal", tagline:"Pegue qualidades e monte seu par ideal!", how:"Pegue 5 qualidades que sobem", startCam:"Começar com câmera", startMouse:"Jogar com mouse/toque", privacy:"Seu vídeo não sai deste aparelho", modeHand:"✋ Rastreando mão", modeMouse:"🖱 Mouse/toque", modeShow:"✋ Mostre sua mão", resultQ:"Sua futura cara-metade?", resultTmpl:(x)=>`Acima de tudo, ${x}!`, resultAll:"Alguém com tudo isso 💘", outroCta:"Quer jogar este jogo?", shareTitle:"Pronto! Compartilhe seu clipe", shareSave:"Salvar vídeo", shareLink:"Compartilhar link", again:"Jogar de novo", linkCopied:"Link copiado!" },
  fr: { nat:"Français", langTitle:"Choisis ta langue", title:"Attrape ton idéal", tagline:"Attrape les qualités et crée ton idéal !", how:"Attrape 5 qualités qui montent", startCam:"Démarrer avec caméra", startMouse:"Jouer à la souris/tactile", privacy:"Ta vidéo reste sur cet appareil", modeHand:"✋ Suivi de main", modeMouse:"🖱 Souris/tactile", modeShow:"✋ Montre ta main", resultQ:"Ton futur partenaire ?", resultTmpl:(x)=>`Surtout, ${x} !`, resultAll:"Quelqu'un avec tout ça 💘", outroCta:"Envie d'essayer ce jeu ?", shareTitle:"Terminé ! Partage ton clip", shareSave:"Enregistrer la vidéo", shareLink:"Partager le lien", again:"Rejouer", linkCopied:"Lien copié !" },
  de: { nat:"Deutsch", langTitle:"Wähle deine Sprache", title:"Fang deinen Typ", tagline:"Schnapp dir Eigenschaften für deinen Traumpartner!", how:"Fang 5 aufsteigende Eigenschaften", startCam:"Mit Kamera starten", startMouse:"Mit Maus/Touch spielen", privacy:"Dein Video bleibt auf diesem Gerät", modeHand:"✋ Handtracking", modeMouse:"🖱 Maus/Touch", modeShow:"✋ Zeig deine Hand", resultQ:"Dein:e Traumpartner:in?", resultTmpl:(x)=>`Vor allem ${x}!`, resultAll:"Jemand mit all dem 💘", outroCta:"Willst du dieses Spiel spielen?", shareTitle:"Fertig! Teile deinen Clip", shareSave:"Video speichern", shareLink:"Link teilen", again:"Nochmal spielen", linkCopied:"Link kopiert!" },
  it: { nat:"Italiano", langTitle:"Scegli la lingua", title:"Acchiappa il tuo tipo", tagline:"Afferra le qualità e crea il partner ideale!", how:"Acchiappa 5 qualità che salgono", startCam:"Inizia con la fotocamera", startMouse:"Gioca con mouse/touch", privacy:"Il tuo video resta sul dispositivo", modeHand:"✋ Tracciamento mano", modeMouse:"🖱 Mouse/touch", modeShow:"✋ Mostra la mano", resultQ:"La tua dolce metà?", resultTmpl:(x)=>`Soprattutto ${x}!`, resultAll:"Qualcuno con tutto questo 💘", outroCta:"Vuoi provare questo gioco?", shareTitle:"Fatto! Condividi il clip", shareSave:"Salva video", shareLink:"Condividi link", again:"Gioca ancora", linkCopied:"Link copiato!" },
  ru: { nat:"Русский", langTitle:"Выберите язык", title:"Поймай свой идеал", tagline:"Хватай качества и собери идеал!", how:"Поймай 5 поднимающихся качеств", startCam:"Начать с камерой", startMouse:"Играть мышью/касанием", privacy:"Видео не покидает устройство", modeHand:"✋ Отслеживание руки", modeMouse:"🖱 Мышь/касание", modeShow:"✋ Покажите руку", resultQ:"Твоя вторая половинка?", resultTmpl:(x)=>`Главное — ${x}!`, resultAll:"Тот, у кого всё это есть 💘", outroCta:"Хочешь сыграть в эту игру?", shareTitle:"Готово! Поделись клипом", shareSave:"Сохранить видео", shareLink:"Поделиться ссылкой", again:"Ещё раз", linkCopied:"Ссылка скопирована!" },
  tr: { nat:"Türkçe", langTitle:"Dilini seç", title:"İdealini Yakala", tagline:"Özellikleri yakala, ideal partnerini yarat!", how:"Yükselen 5 özelliği yakala", startCam:"Kamerayla başla", startMouse:"Fare/dokunmatikle oyna", privacy:"Videon bu cihazdan çıkmaz", modeHand:"✋ El takibi", modeMouse:"🖱 Fare/dokunmatik", modeShow:"✋ Elini göster", resultQ:"Müstakbel eşin?", resultTmpl:(x)=>`Her şeyden önce ${x}!`, resultAll:"Tüm bunlara sahip biri 💘", outroCta:"Bu oyunu denemek ister misin?", shareTitle:"Bitti! Klibini paylaş", shareSave:"Videoyu kaydet", shareLink:"Bağlantıyı paylaş", again:"Tekrar oyna", linkCopied:"Bağlantı kopyalandı!" },
  id: { nat:"Bahasa Indonesia", langTitle:"Pilih bahasa", title:"Tangkap Tipe Idealmu", tagline:"Tangkap sifat, ciptakan pasangan idealmu!", how:"Tangkap 5 sifat yang naik", startCam:"Mulai dengan kamera", startMouse:"Main pakai mouse/sentuh", privacy:"Videomu tetap di perangkat ini", modeHand:"✋ Melacak tangan", modeMouse:"🖱 Mouse/sentuh", modeShow:"✋ Tunjukkan tangan", resultQ:"Pasangan masa depanmu?", resultTmpl:(x)=>`Yang utama, ${x}!`, resultAll:"Seseorang dengan semua ini 💘", outroCta:"Mau coba game ini?", shareTitle:"Selesai! Bagikan klipmu", shareSave:"Simpan video", shareLink:"Bagikan tautan", again:"Main lagi", linkCopied:"Tautan disalin!" },
  vi: { nat:"Tiếng Việt", langTitle:"Chọn ngôn ngữ", title:"Bắt Lấy Hình Mẫu", tagline:"Bắt lấy phẩm chất, tạo nên hình mẫu!", how:"Bắt 5 phẩm chất đang bay lên", startCam:"Bắt đầu với camera", startMouse:"Chơi bằng chuột/cảm ứng", privacy:"Video không rời thiết bị này", modeHand:"✋ Đang theo dõi tay", modeMouse:"🖱 Chuột/cảm ứng", modeShow:"✋ Hãy đưa tay ra", resultQ:"Một nửa tương lai của bạn?", resultTmpl:(x)=>`Trên hết là ${x}!`, resultAll:"Người có tất cả điều này 💘", outroCta:"Muốn chơi trò này không?", shareTitle:"Xong! Chia sẻ clip", shareSave:"Lưu video", shareLink:"Chia sẻ liên kết", again:"Chơi lại", linkCopied:"Đã sao chép liên kết!" },
  th: { nat:"ไทย", langTitle:"เลือกภาษา", title:"คว้าสเปคในฝัน", tagline:"คว้าคุณสมบัติ สร้างคู่ในฝัน!", how:"คว้าคุณสมบัติที่ลอยขึ้น 5 อย่าง", startCam:"เริ่มด้วยกล้อง", startMouse:"เล่นด้วยเมาส์/สัมผัส", privacy:"วิดีโออยู่แค่ในเครื่องนี้", modeHand:"✋ กำลังจับมือ", modeMouse:"🖱 เมาส์/สัมผัส", modeShow:"✋ โชว์มือหน่อย", resultQ:"คู่ในอนาคตของคุณ?", resultTmpl:(x)=>`เหนือสิ่งอื่นใด ${x}!`, resultAll:"คนที่มีครบทุกอย่าง 💘", outroCta:"อยากเล่นเกมนี้ไหม?", shareTitle:"เสร็จ! แชร์คลิปเลย", shareSave:"บันทึกวิดีโอ", shareLink:"แชร์ลิงก์", again:"เล่นอีกครั้ง", linkCopied:"คัดลอกลิงก์แล้ว!" },
  ar: { nat:"العربية", langTitle:"اختر لغتك", title:"أمسك بمواصفاتك", tagline:"أمسك الصفات وكوّن شريك أحلامك!", how:"أمسك 5 صفات تطفو لأعلى", startCam:"ابدأ بالكاميرا", startMouse:"العب بالماوس/اللمس", privacy:"الفيديو لا يغادر جهازك", modeHand:"✋ تتبع اليد", modeMouse:"🖱 ماوس/لمس", modeShow:"✋ أظهر يدك", resultQ:"شريك حياتك؟", resultTmpl:(x)=>`${x} قبل كل شيء!`, resultAll:"شخص يملك كل هذا 💘", outroCta:"هل تريد تجربة هذه اللعبة؟", shareTitle:"تم! شارك مقطعك", shareSave:"حفظ الفيديو", shareLink:"مشاركة الرابط", again:"العب مجددًا", linkCopied:"تم نسخ الرابط!" },
  hi: { nat:"हिन्दी", langTitle:"अपनी भाषा चुनें", title:"अपना आदर्श पकड़ो", tagline:"गुण पकड़ो, सपनों का साथी बनाओ!", how:"ऊपर आती 5 खूबियाँ पकड़ो", startCam:"कैमरे से शुरू करें", startMouse:"माउस/टच से खेलें", privacy:"आपका वीडियो डिवाइस में ही रहता है", modeHand:"✋ हाथ ट्रैकिंग", modeMouse:"🖱 माउस/टच", modeShow:"✋ अपना हाथ दिखाएँ", resultQ:"आपका जीवनसाथी?", resultTmpl:(x)=>`सबसे बढ़कर ${x}!`, resultAll:"यह सब रखने वाला कोई 💘", outroCta:"यह गेम खेलना चाहते हैं?", shareTitle:"हो गया! क्लिप शेयर करें", shareSave:"वीडियो सेव करें", shareLink:"लिंक शेयर करें", again:"फिर से खेलें", linkCopied:"लिंक कॉपी हो गया!" },
};
let lang = "ko";
const T = () => I18N[lang];
const traitLabel = (key) => TRAITS[key][lang] ?? TRAITS[key].en ?? TRAITS[key].ko;
const traitColor = (key) => TRAITS[key].color;

// 준비/카운트다운 문구 (ko·en·ja·zh, 그 외 en 폴백)
const READY = {
  grabNet: { ko: "✋ 뜰채를 손으로 잡으세요!", en: "✋ Grab the net with your hand!", ja: "✋ 網を手で掴んで！", zh: "✋ 用手抓住网！" },
  go: { ko: "시작!", en: "GO!", ja: "スタート!", zh: "开始!" },
};
const tx = (k) => READY[k][lang] ?? READY[k].en;

// 색 대비: 밝은 색이면 어두운 글자
function inkFor(hex) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? "#1a0e16" : "#fff";
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
let words = [], collected = [], effects = [];
let resultPrimary = null, finishing = false, lastSpawn = 0;
let grabUntil = 0, grabColor = "#fff";
let countdownStart = 0, lastTick = -1, goFlashUntil = 0;

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
const playCatch = () => { ensureAudio(); tone(523, 0, 0.1, "sine", 0.3); tone(784, 0.05, 0.13, "sine", 0.28); }; // 잡는 "팝"
const playComplete = () => { ensureAudio(); [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.32, "triangle", 0.3)); };
const playOutro = () => { ensureAudio(); tone(784, 0, 0.55, "sine", 0.35); tone(1175, 0.13, 0.7, "sine", 0.3); tone(1568, 0.26, 0.95, "sine", 0.25); };

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
  // 손바닥 중심 = 손목(0)과 중지 시작(9)의 평균 → "손으로 잡는" 느낌
  const lm0 = res.landmarks[0][0], lm9 = res.landmarks[0][9];
  const cx = (lm0.x + lm9.x) / 2, cy = (lm0.y + lm9.y) / 2;
  const tr = camTransform();
  if (!tr) return null;
  return { x: W - (tr.ox + cx * tr.vw * tr.scale), y: tr.oy + cy * tr.vh * tr.scale };
}

// ---------- 게임 흐름 ----------
async function startGame() {
  ensureAudio();
  if (audioCtx.state === "suspended") { try { await audioCtx.resume(); } catch {} }
  phase = "ready"; phaseStart = performance.now();
  countdownStart = 0; lastTick = -1; goFlashUntil = 0;
  words = []; collected = []; effects = []; resultPrimary = null; finishing = false; lastSpawn = 0;
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
  const fs = MIN * 0.05;
  ctx.font = `800 ${fs}px "Noto Sans KR", system-ui, sans-serif`;
  const w = ctx.measureText(traitLabel(key)).width + fs * 1.7;
  const h = fs * 2.0;
  // 물고기처럼 팔딱 — 아래에서 위로 포물선으로 튀어오름
  const g = 1.5 * H, f = 0.42 + Math.random() * 0.3;
  words.push({
    key, x: W * (0.18 + Math.random() * 0.64), y: H + h * 0.5,
    vx: (Math.random() - 0.5) * 0.22 * H, vy: -Math.sqrt(2 * g * f * H), g,
    w, h, fs, hitR: Math.max(w, h) * 0.5, wob: Math.random() * 6.28, vwob: 7 + Math.random() * 5,
  });
}

// 캐치 타깃(상단 중앙 트레이) 좌표
function trayTarget() { return { x: W / 2, y: MIN * 0.11 }; }

function tryCatch(tip) {
  if (!tip) return;
  const netR = MIN * 0.085; // 뜰채 입구 반경
  for (let i = words.length - 1; i >= 0; i--) {
    const wd = words[i];
    if (Math.hypot(tip.x - wd.x, tip.y - wd.y) < netR + wd.hitR * 0.55) {
      const col = traitColor(wd.key);
      collected.push(wd.key);
      grabUntil = performance.now() + 220; grabColor = col;
      // 잡은 단어가 트레이로 빨려 들어가는 연출
      const tt = trayTarget();
      effects.push({ type: "fly", key: wd.key, x: wd.x, y: wd.y, sx: wd.x, sy: wd.y, tx: tt.x, ty: tt.y, fs: wd.fs, life: 0.45, dur: 0.45, color: col });
      sparkle(wd.x, wd.y, col);
      playCatch();
      words.splice(i, 1);
      if (collected.length >= 5 && !finishing) finishGame();
      return;
    }
  }
}
function sparkle(x, y, color) {
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * 6.28, s = MIN * (0.2 + Math.random() * 0.55);
    effects.push({ type: "spark", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: MIN * (0.005 + Math.random() * 0.01), life: 0.45 + Math.random() * 0.3, color });
  }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function finishGame() {
  finishing = true;
  words = []; effects = [];
  resultPrimary = collected[(Math.random() * collected.length) | 0];
  phase = "result"; phaseStart = performance.now();
  playComplete();
  await wait(4600);
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
    lastExt = recMime.includes("mp4") ? "mp4" : "webm";
    if (lastVideoUrl) URL.revokeObjectURL(lastVideoUrl);
    lastVideoUrl = URL.createObjectURL(blob);
    shareVid.src = lastVideoUrl; shareVid.hidden = false;
    saveBtn.onclick = () => downloadBlob(lastVideoUrl, `kkamnol-idealtype.${lastExt}`);
  } else {
    shareVid.hidden = true;
    saveBtn.onclick = () => shareResultImage();
  }
}
function downloadBlob(url, name) { const a = document.createElement("a"); a.href = url; a.download = name; a.click(); }
async function shareLink() {
  const url = "https://kkamnol.xyz/idealcatch";
  try { if (navigator.share) { await navigator.share({ title: T().title, text: T().tagline, url }); return; } } catch { return; }
  try { await navigator.clipboard.writeText(url); toast(T().linkCopied); } catch { toast(url); }
}
async function shareResultImage() {
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

  let tip = handTip(now);
  let src = "idle";
  if (tip) { src = "hand"; usingHandT = now; }
  else if (now - pointer.t < 120) { tip = { x: pointer.x, y: pointer.y }; src = "pointer"; }
  if (tip) bladePts.push({ x: tip.x, y: tip.y, t: now });
  while (bladePts.length && now - bladePts[0].t > 120) bladePts.shift();
  if (bladePts.length > 8) bladePts.shift();

  if (phase === "ready") {
    const needHand = camOn; // 카메라면 손을 보여줘야 시작
    if (!countdownStart) {
      if (needHand) { if (src === "hand") countdownStart = now; else if (now - phaseStart > 6000) countdownStart = now; }
      else countdownStart = now;
    }
    if (countdownStart) {
      const sec = (now - countdownStart) / 1000;
      const cur = Math.ceil(3 - sec); // 3 → 2 → 1
      if (cur !== lastTick && cur >= 1 && cur <= 3) { lastTick = cur; tone(620 + (3 - cur) * 140, 0, 0.13, "square", 0.3); }
      if (sec >= 3) { tone(1320, 0, 0.2, "square", 0.32); goFlashUntil = now + 700; phase = "play"; phaseStart = now; lastSpawn = now; }
    }
  }

  if (phase === "play") {
    if (now - lastSpawn > 950) { lastSpawn = now; spawnWord(); if (Math.random() < 0.3) spawnWord(); }
    for (let i = words.length - 1; i >= 0; i--) {
      const wd = words[i];
      wd.wob += dt * wd.vwob;
      wd.vy += wd.g * dt;
      wd.x += wd.vx * dt;
      wd.y += wd.vy * dt;
      if (wd.y > H + wd.h && wd.vy > 0) words.splice(i, 1); // 못 받으면 떨어져 사라짐
    }
    tryCatch(tip);
  }

  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    e.life -= dt;
    if (e.life <= 0) { effects.splice(i, 1); continue; }
    if (e.type === "spark") { e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 1.2 * H * dt; }
    else if (e.type === "fly") {
      const k = 1 - e.life / e.dur; // 0→1
      const ease = k * k * (3 - 2 * k);
      e.x = e.sx + (e.tx - e.sx) * ease;
      e.y = e.sy + (e.ty - e.sy) * ease;
    }
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
function pill(cx, cy, label, fs, color, scale = 1, rot = 0) {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(scale, scale);
  ctx.font = `800 ${fs}px "Noto Sans KR", system-ui, sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const w = ctx.measureText(label).width + fs * 1.5, h = fs * 1.9;
  roundRect(-w / 2, -h / 2, w, h, h / 2);
  ctx.fillStyle = color;
  ctx.shadowBlur = MIN * 0.03; ctx.shadowColor = color; ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = inkFor(color);
  ctx.fillText(label, 0, 0);
  ctx.restore();
  return w;
}
function fitFont(text, base, maxW, weight, fam) {
  ctx.font = `${weight} ${base}px ${fam}`;
  const w = ctx.measureText(text).width;
  return w > maxW ? base * maxW / w : base;
}

// ---------- 렌더 ----------
function render(now, src) {
  ctx.fillStyle = "#0a0d0a";
  ctx.fillRect(0, 0, W, H);

  if (phase === "outro") { renderOutro(now); return; }

  const tr = camOn ? camTransform() : null;
  if (tr) {
    ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, tr.ox, tr.oy, tr.dw, tr.dh);
    ctx.restore();
    ctx.fillStyle = phase === "result" ? "rgba(10,13,10,0.28)" : "rgba(10,13,10,0.5)"; // 결과 땐 얼굴 더 밝게
    ctx.fillRect(0, 0, W, H);
  }

  if (phase === "ready") { renderNet(now, src); renderReady(now); updateModePill(now, src); return; }

  if (phase === "play" || phase === "result") {
    for (const wd of words) pill(wd.x, wd.y, traitLabel(wd.key), wd.fs, traitColor(wd.key), 1, Math.sin(wd.wob) * 0.2);
    renderEffects();
    renderTray();
  }
  if (phase === "result") renderResult(now);
  if (phase === "play") renderNet(now, src);
  if (now < goFlashUntil) {
    ctx.save(); ctx.globalAlpha = Math.min(1, (goFlashUntil - now) / 350);
    ctx.fillStyle = "#84e2bf"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowBlur = MIN * 0.05; ctx.shadowColor = "rgba(132,226,191,0.9)";
    ctx.font = `900 ${MIN * 0.13}px "Inter", sans-serif`;
    ctx.fillText(tx("go"), W / 2, H * 0.4);
    ctx.restore();
  }
  updateModePill(now, src);
}

function renderEffects() {
  for (const e of effects) {
    if (e.type === "spark") {
      ctx.globalAlpha = Math.max(0, e.life);
      ctx.fillStyle = e.color;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 6.2832); ctx.fill();
    } else if (e.type === "fly") {
      const k = 1 - e.life / e.dur;
      pill(e.x, e.y, traitLabel(e.key), e.fs, e.color, 1 - 0.45 * k);
    }
  }
  ctx.globalAlpha = 1;
}

// 상단 중앙 정렬 트레이
function renderTray() {
  const fs = MIN * 0.032, bh = fs * 1.85, gap = MIN * 0.018;
  ctx.font = `800 ${fs}px "Noto Sans KR", system-ui, sans-serif`;
  const widths = collected.map((k) => ctx.measureText(traitLabel(k)).width + fs * 1.5);
  const total = widths.reduce((a, b) => a + b + gap, -gap);

  // 카운트 (중앙)
  ctx.font = `900 ${MIN * 0.04}px "Inter", sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText(`${collected.length} / 5`, W / 2, MIN * 0.055);

  // 배지 행 (중앙 정렬, 넘치면 줄바꿈)
  const maxRow = W - MIN * 0.1;
  let rows = [[]], rowW = [0];
  collected.forEach((k, i) => {
    const need = widths[i] + (rows[rows.length - 1].length ? gap : 0);
    if (rowW[rowW.length - 1] + need > maxRow) { rows.push([]); rowW.push(0); }
    rows[rows.length - 1].push(i);
    rowW[rowW.length - 1] += need;
  });
  let y = MIN * 0.11;
  rows.forEach((row, ri) => {
    let x = W / 2 - rowW[ri] / 2;
    row.forEach((i) => {
      const k = collected[i], bw = widths[i];
      pill(x + bw / 2, y, traitLabel(k), fs, traitColor(k));
      x += bw + gap;
    });
    y += bh + gap;
  });
}

function renderResult(now) {
  const t = Math.min(1, (now - phaseStart) / 350);
  const cw = Math.min(W * 0.88, MIN * 1.5), ch = Math.min(H * 0.64, MIN * 1.4);
  const cx = (W - cw) / 2, cy = (H - ch) / 2;
  ctx.globalAlpha = t;
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(0.94 + 0.06 * t, 0.94 + 0.06 * t); ctx.translate(-W / 2, -H / 2);

  const fam = '"Noto Sans KR", system-ui, sans-serif';
  ctx.textAlign = "center"; ctx.textBaseline = "middle";

  // 배경 투명 — 얼굴이 비치도록 핑크 글로우 테두리만
  roundRect(cx, cy, cw, ch, MIN * 0.06);
  ctx.save();
  ctx.strokeStyle = "rgba(255,150,200,0.92)"; ctx.lineWidth = MIN * 0.006;
  ctx.shadowBlur = MIN * 0.03; ctx.shadowColor = "rgba(255,90,160,0.7)";
  ctx.stroke();
  ctx.restore();

  // 글자 가독성용 그림자(투명 배경 위에서도 또렷하게)
  ctx.shadowColor = "rgba(0,0,0,0.92)"; ctx.shadowBlur = MIN * 0.022;
  ctx.fillStyle = "#fff";
  ctx.font = `800 ${MIN * 0.044}px ${fam}`;
  ctx.fillText(T().resultQ, W / 2, cy + ch * 0.15);

  const headline = T().resultTmpl(traitLabel(resultPrimary));
  const hSize = fitFont(headline, MIN * 0.082, cw * 0.86, 900, fam);
  ctx.fillStyle = traitColor(resultPrimary);
  ctx.font = `900 ${hSize}px ${fam}`;
  ctx.fillText(headline, W / 2, cy + ch * 0.31);

  // 배지(색상, 대표는 크게) — 길면 한 줄에 맞게 축소
  ctx.shadowBlur = 0; // pill은 자체 배경/그림자가 있으니 텍스트 그림자 끔
  const fs = MIN * 0.034, gap = MIN * 0.016;
  ctx.font = `800 ${fs}px ${fam}`;
  const widths = collected.map((k) => (ctx.measureText(traitLabel(k)).width + fs * 1.5) * (k === resultPrimary ? 1.12 : 1));
  const rawTotal = widths.reduce((a, b) => a + b + gap, -gap);
  const rs = Math.min(1, (cw * 0.9) / rawTotal);
  let bx = W / 2 - (rawTotal * rs) / 2;
  const by = cy + ch * 0.51;
  collected.forEach((k, i) => {
    const bw = widths[i] * rs;
    pill(bx + bw / 2, by, traitLabel(k), fs, traitColor(k), (k === resultPrimary ? 1.12 : 1) * rs);
    bx += bw + gap * rs;
  });

  ctx.shadowColor = "rgba(0,0,0,0.92)"; ctx.shadowBlur = MIN * 0.022;
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${MIN * 0.04}px ${fam}`;
  ctx.fillText(T().resultAll, W / 2, cy + ch * 0.71);

  ctx.fillStyle = "#9af0d0";
  ctx.font = `800 ${MIN * 0.032}px "Inter", sans-serif`;
  ctx.fillText("kkamnol.xyz", W / 2, cy + ch * 0.86);
  ctx.shadowBlur = 0;
  ctx.restore();
  ctx.globalAlpha = 1;
}

function renderOutro(now) {
  const el = (now - phaseStart) / 1000;
  const fade = Math.min(1, el / 0.4) * Math.min(1, Math.max(0, (2.3 - el) / 0.4));
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = fade;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";

  // CTA (언어별)
  ctx.fillStyle = "#84e2bf";
  ctx.font = `800 ${MIN * 0.045}px "Noto Sans KR", system-ui, sans-serif`;
  ctx.fillText(T().outroCta, W / 2, H / 2 - MIN * 0.2);

  ctx.font = `${MIN * 0.12}px "Noto Color Emoji", "Apple Color Emoji", sans-serif`;
  ctx.fillText("😮", W / 2, H / 2 - MIN * 0.04);
  ctx.fillStyle = "#fff";
  ctx.font = `900 ${MIN * 0.1}px "Inter", sans-serif`;
  ctx.fillText("Kkamnol", W / 2, H / 2 + MIN * 0.08);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = `700 ${MIN * 0.034}px "Inter", sans-serif`;
  ctx.fillText("kkamnol.xyz", W / 2, H / 2 + MIN * 0.17);
  ctx.globalAlpha = 1;
}

// 준비 화면 — "뜰채를 잡으세요" 프롬프트 → 3·2·1 카운트다운
function renderReady(now) {
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (!countdownStart) {
    const fam = '"Noto Sans KR", system-ui, sans-serif';
    ctx.fillStyle = "#fff";
    ctx.shadowBlur = MIN * 0.025; ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.font = `800 ${fitFont(tx("grabNet"), MIN * 0.052, W * 0.88, 800, fam)}px ${fam}`;
    ctx.fillText(tx("grabNet"), W / 2, H * 0.42);
    ctx.shadowBlur = 0;
  } else {
    const sec = (now - countdownStart) / 1000;
    const cur = Math.ceil(3 - sec);
    if (sec < 3 && cur >= 1) {
      const within = (3 - sec) - (cur - 1); // 1→0 (현재 숫자 진행도)
      ctx.save();
      ctx.globalAlpha = Math.min(1, within * 2.4);
      ctx.fillStyle = "#fff";
      ctx.shadowBlur = MIN * 0.06; ctx.shadowColor = "rgba(255,122,184,0.9)";
      ctx.font = `900 ${MIN * 0.26 * (1.35 - within * 0.35)}px "Inter", sans-serif`;
      ctx.fillText(String(cur), W / 2, H / 2);
      ctx.restore();
    }
  }
}

// 뜰채(landing net) 캐쳐 — 팔딱 튀는 낱말을 떠서 받는 느낌
function renderNet(now, src) {
  if (bladePts.length < 1) return;
  const tip = bladePts[bladePts.length - 1];
  const R = MIN * 0.088;
  const scooping = now < grabUntil;
  const glow = src === "hand" ? "rgba(132,226,191,0.95)" : "rgba(160,200,255,0.95)";
  // 잡는 순간 입구가 번쩍
  if (scooping) {
    const k = 1 - (grabUntil - now) / 220;
    ctx.save(); ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = grabColor; ctx.lineWidth = MIN * 0.012;
    ctx.beginPath(); ctx.ellipse(tip.x, tip.y, R * (1 + 0.4 * k), R * 0.45 * (1 + 0.4 * k), 0, 0, 6.2832); ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(tip.x, tip.y);
  // 손잡이
  ctx.strokeStyle = "rgba(205,170,130,0.95)"; ctx.lineWidth = MIN * 0.014; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(R * 0.55, -R * 0.4); ctx.lineTo(R * 2.0, -R * 1.6); ctx.stroke();
  // 그물 (앞쪽 림 → 바닥 한 점으로 모이는 망)
  const bag = R * 1.9;
  ctx.strokeStyle = "rgba(232,240,248,0.42)"; ctx.lineWidth = Math.max(1, MIN * 0.0016);
  for (let k = 0; k <= 7; k++) {
    const a = Math.PI * (k / 7);
    const rx = -Math.cos(a) * R, ry = Math.sin(a) * R * 0.42;
    ctx.beginPath(); ctx.moveTo(rx, ry); ctx.quadraticCurveTo(rx * 0.35, bag * 0.7, 0, bag); ctx.stroke();
  }
  for (let yy = 0.42; yy < 1.0; yy += 0.27) {
    ctx.beginPath(); ctx.ellipse(0, bag * yy, R * (1 - yy * 0.6), R * 0.32 * (1 - yy * 0.4), 0, 0.15, Math.PI - 0.15); ctx.stroke();
  }
  // 림(테)
  ctx.lineWidth = MIN * (scooping ? 0.017 : 0.012);
  ctx.strokeStyle = scooping ? "#fff" : "#eef3f8";
  ctx.shadowBlur = MIN * (scooping ? 0.05 : 0.03); ctx.shadowColor = glow;
  ctx.beginPath(); ctx.ellipse(0, 0, R, R * 0.42, 0, 0, 6.2832); ctx.stroke();
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
  document.getElementById("saveBtn").textContent = t.shareSave;
  document.getElementById("linkBtn").textContent = t.shareLink;
  document.getElementById("againBtn").textContent = t.again;
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

document.getElementById("startBtn").addEventListener("click", async () => {
  const btn = document.getElementById("startBtn");
  btn.disabled = true;
  try {
    await initCamera();
    try { await initHand(); camOn = true; } catch { camOn = true; }
  } catch { toast(T().privacy); }
  btn.disabled = false;
  startGame();
});
document.getElementById("startNoCam").addEventListener("click", () => startGame());
document.getElementById("linkBtn").addEventListener("click", shareLink);
document.getElementById("againBtn").addEventListener("click", () => { shareScreen.hidden = true; startScreen.hidden = false; });

// ---------- 부트 ----------
buildLangGrid();
applyLang();
frame._p = performance.now();
requestAnimationFrame(frame);
