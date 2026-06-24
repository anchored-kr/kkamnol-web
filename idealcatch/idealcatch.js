/* ===========================================================================
   이상형 캐치캐치 — 손으로 이상형 조건을 잡아 배우자 완성 (PoC)
   손 추적(MediaPipe) · 조건 5개 캐치 · 결과 카드 · 검은 Kkamnol 아웃트로(효과음)
   영상 녹화→저장/링크 공유 · 다국어(세계 16개국) · 마우스/터치 폴백
   =========================================================================== */

import {
  FilesetResolver,
  HandLandmarker,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
import { bumpPlay, bumpShare } from "/analytics.js";

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

  // ── 외모(남녀 모두) ──
  handsome:    { color:"#4f9dff", ko:"잘생김", en:"Handsome", ja:"イケメン", zh:"帅气" },
  pretty:      { color:"#ff6fae", ko:"예쁨", en:"Pretty", ja:"美人", zh:"漂亮" },
  cute:        { color:"#ffa6d2", ko:"귀여움", en:"Cuteness", ja:"可愛さ", zh:"可爱" },
  babyface:    { color:"#ffcf6b", ko:"동안", en:"Baby face", ja:"童顔", zh:"童颜" },
  features:    { color:"#c084fc", ko:"또렷한 이목구비", en:"Sharp features", ja:"整った顔立ち", zh:"五官立体" },
  smallface:   { color:"#5eead4", ko:"작은 얼굴", en:"Small face", ja:"小顔", zh:"小脸" },
  vline:       { color:"#7dd3fc", ko:"V라인", en:"V-line jaw", ja:"Vライン", zh:"V脸" },
  dimples:     { color:"#fb9ec0", ko:"보조개", en:"Dimples", ja:"えくぼ", zh:"酒窝" },
  muscular:    { color:"#ef6c4a", ko:"근육질", en:"Muscular", ja:"筋肉質", zh:"肌肉" },
  slimbody:    { color:"#67e8c9", ko:"슬림한 몸매", en:"Slim figure", ja:"スリム体型", zh:"苗条" },
  glamour:     { color:"#ff5a8a", ko:"글래머", en:"Curvy figure", ja:"グラマー", zh:"好身材" },
  proportions: { color:"#34d399", ko:"좋은 비율", en:"Great proportions", ja:"スタイル抜群", zh:"身材比例好" },
  fairskin:    { color:"#fde68a", ko:"백옥피부", en:"Fair skin", ja:"色白肌", zh:"白皙皮肤" },
  nicehair:    { color:"#c08552", ko:"좋은 머릿결", en:"Nice hair", ja:"美髪", zh:"好发质" },
  aura:        { color:"#a78bfa", ko:"좋은 분위기", en:"Great aura", ja:"雰囲気", zh:"气质好" },

  // ── 성격(남녀 모두) ──
  caring:      { color:"#ff8a5c", ko:"자상함", en:"Caring", ja:"思いやり", zh:"体贴入微" },
  considerate: { color:"#f0abdc", ko:"배려심", en:"Considerate", ja:"気配り上手", zh:"善解人意" },
  positive:    { color:"#fbbf24", ko:"긍정적", en:"Positive", ja:"ポジティブ", zh:"乐观" },
  honest:      { color:"#38bdf8", ko:"솔직함", en:"Honest", ja:"素直", zh:"坦诚" },
  confident:   { color:"#f43f5e", ko:"자신감", en:"Confident", ja:"自信家", zh:"自信" },
  responsible: { color:"#3b82f6", ko:"책임감", en:"Responsible", ja:"責任感", zh:"有责任感" },
  leadership:  { color:"#6366f1", ko:"리더십", en:"Leadership", ja:"リーダーシップ", zh:"领导力" },
  sincere:     { color:"#10b981", ko:"성실함", en:"Sincere", ja:"誠実", zh:"真诚" },
  calm:        { color:"#93c5fd", ko:"차분함", en:"Calm", ja:"落ち着き", zh:"沉稳" },
  aegyo:       { color:"#ff9ecb", ko:"애교", en:"Aegyo charm", ja:"愛嬌", zh:"撒娇" },
  easygoing:   { color:"#84cc16", ko:"털털함", en:"Easygoing", ja:"さばさば", zh:"大大咧咧" },
  empathy:     { color:"#2dd4bf", ko:"공감능력", en:"Empathy", ja:"共感力", zh:"共情力" },
  loyal:       { color:"#f59e0b", ko:"의리", en:"Loyalty", ja:"義理堅い", zh:"重情义" },
  witty:       { color:"#06b6d4", ko:"위트", en:"Witty", ja:"ウィット", zh:"风趣" },
  lively:      { color:"#fb7185", ko:"활발함", en:"Lively", ja:"活発", zh:"活泼" },
  reliable:    { color:"#2563eb", ko:"듬직함", en:"Reliable", ja:"頼れる", zh:"靠谱" },
  gentle:      { color:"#f9a8d4", ko:"부드러움", en:"Gentle", ja:"物腰柔らか", zh:"温柔" },
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

// 상단 훅 — "이상형 테스트인 줄 알았는데…" (게임 내내 표시, 녹화에도 박힘)
const HOOK = {
  ko:"이상형 테스트인 줄 알았는데…", en:"Thought it was an ideal-type test…", ja:"理想のタイプ診断かと思いきや…", zh:"还以为是理想型测试呢…",
  es:"Creías que era un test de tipo ideal…", pt:"Achou que era um teste de tipo ideal…", fr:"Tu croyais à un test de type idéal…", de:"Dachtest, es wäre ein Traumtyp-Test…",
  it:"Pensavi fosse un test sul tipo ideale…", ru:"Думали, это тест на идеал…", tr:"İdeal tip testi sandın ama…", id:"Kira tes tipe ideal, ternyata…",
  vi:"Tưởng là trắc nghiệm hình mẫu…", th:"นึกว่าเป็นแบบทดสอบสเปกในฝัน…", ar:"ظننتها اختبار شريك الأحلام…", hi:"समझे थे आदर्श-साथी टेस्ट है…",
};
const hook = () => HOOK[lang] ?? HOOK.en;

// 색 대비: 밝은 색이면 어두운 글자
function inkFor(hex) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? "#1a0e16" : "#fff";
}

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
let phase = "idle"; // idle | play | result | outro
let phaseStart = 0;
let words = [], collected = [], effects = [];
let resultPrimary = null, finishing = false, lastSpawn = 0;
let grabUntil = 0, grabColor = "#fff";
let countdownStart = 0, lastTick = -1, goFlashUntil = 0;
let flashUntil = 0, shakeUntil = 0; // ★ 깜놀 모먼트: 쇼크 핑크 플래시 + 스크린 셰이크

let handLandmarker = null, camOn = false, lastVideoTime = -1, lastDetectT = 0, lastHandTip = null;
let bladePts = [];
let pointer = { x: 0, y: 0, t: -9999 };
let usingHandT = -9999;

// ---------- 캔버스 ----------
let pendingResize = false;
function applyResize() {
  // 9:16 숏폼 프레임 — 뷰포트 안에 contain(중앙). 녹화도 9:16로 깔끔.
  let boxW = innerWidth, boxH = innerWidth * 16 / 9;
  if (boxH > innerHeight) { boxH = innerHeight; boxW = innerHeight * 9 / 16; }
  boxW = Math.floor(boxW); boxH = Math.floor(boxH);
  // 백킹 해상도 ~720p(높이 1280)로 제한 — 고DPR/큰 폰 과해상도 방지(렌더·인코딩 부하↓)
  DPR = Math.min(window.devicePixelRatio || 1, 2, 1280 / boxH);
  const w = Math.floor(boxW * DPR), h = Math.floor(boxH * DPR);
  if (w === canvas.width && h === canvas.height) return; // 변화 없으면 스킵
  canvas.style.width = boxW + "px"; canvas.style.height = boxH + "px";
  W = canvas.width = w; H = canvas.height = h; MIN = Math.min(W, H);
}
function resize() {
  // 녹화 중엔 캔버스 크기를 건드리지 않음 — 모바일 주소창 토글 등으로 캔버스를 리셋하면
  // captureStream 비디오 트랙이 얼어 녹화 영상이 중간에 멈춤. 녹화 끝나면 반영.
  if (rec && rec.state === "recording") { pendingResize = true; return; }
  applyResize();
}
addEventListener("resize", resize);
applyResize();

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
  // iOS 언락: 무음 버퍼 1회 재생(컨텍스트 워밍업)
  try {
    const b = audioCtx.createBuffer(1, 1, 22050);
    const s = audioCtx.createBufferSource();
    s.buffer = b; s.connect(audioCtx.destination); s.start(0);
  } catch {}
}
// 모바일 오디오 언락 — 첫 탭(언어 선택 등)부터 컨텍스트 생성·재개(반드시 제스처 안에서)
function unlockAudio() {
  ensureAudio();
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
}
addEventListener("pointerdown", unlockAudio, { passive: true });
addEventListener("touchend", unlockAudio, { passive: true });
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
// 🔑 깜놀 스팅어 — 모든 깜놀 게임 공통 오디오 로고(룩북): 상승 whoosh → 스냅 → 밝은 벨
function playKkamnolSting() {
  ensureAudio();
  const t0 = audioCtx.currentTime;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = "sawtooth"; o.connect(g); g.connect(masterGain);
  o.frequency.setValueAtTime(260, t0); o.frequency.exponentialRampToValueAtTime(1500, t0 + 0.17);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
  o.start(t0); o.stop(t0 + 0.24);
  tone(660, 0.16, 0.05, "square", 0.3);    // 스냅(팝)
  tone(1320, 0.19, 0.5, "triangle", 0.34); // 밝은 벨(반전 확정)
  tone(1976, 0.21, 0.45, "sine", 0.2);
}
// 엔드 스팅어 — 3노트 "깜-놀-!" 모티프(룩북). 모든 게임 영상 끝.
const playOutro = () => { ensureAudio(); tone(784, 0, 0.5, "triangle", 0.34); tone(1175, 0.12, 0.6, "triangle", 0.3); tone(1568, 0.26, 0.9, "sine", 0.26); };

// ---------- 녹화 ----------
let rec = null, recChunks = [], recMime = "", recStartT = 0;
let lastVideoUrl = null, lastExt = "webm";
function pickMime() {
  const cands = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  return cands.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || "";
}
function startRecording() {
  if (!canvas.captureStream || !window.MediaRecorder) return false;
  try {
    const v = canvas.captureStream(24); // iOS: 24fps 고정이 30보다 균일(인코더 부하↓)
    const tracks = [...v.getVideoTracks()];
    ensureAudio();
    audioDest = audioCtx.createMediaStreamDestination();
    masterGain.connect(audioDest);
    tracks.push(...audioDest.stream.getAudioTracks());
    recMime = pickMime();
    rec = new MediaRecorder(new MediaStream(tracks), recMime ? { mimeType: recMime, videoBitsPerSecond: 3_500_000 } : undefined);
    recChunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) recChunks.push(e.data); };
    rec.start(1000); // 1초마다 청크 플러시(중간 끊김에 강함)
    recStartT = performance.now();
    recEl.hidden = false;
    return true;
  } catch (e) { return false; }
}
// WebM은 MediaRecorder가 duration 메타데이터를 안 넣어 재생속도가 들쭉날쭉해짐 → 정확한 길이 주입(remux)
async function fixDuration(blob, durMs) {
  if (!blob || !/webm/.test(blob.type) || !(durMs > 0)) return blob;
  try {
    const mod = await import("https://esm.sh/fix-webm-duration@1.0.5");
    const fix = mod.default || mod.fixWebmDuration || mod.ysFixWebmDuration || mod;
    const out = await fix(blob, durMs);
    return out instanceof Blob ? out : blob;
  } catch (e) { console.warn("[rec] fixDuration", e); return blob; }
}
function stopRecording() {
  return new Promise((res) => {
    recEl.hidden = true;
    if (!rec || rec.state === "inactive") return res(null);
    rec.onstop = async () => {
      if (pendingResize) { pendingResize = false; applyResize(); } // 녹화 중 보류된 리사이즈 반영
      const type = (recMime || "video/webm").split(";")[0];
      let blob = new Blob(recChunks, { type });
      blob = await fixDuration(blob, recStartT ? performance.now() - recStartT : 0); // 재생속도 안정화
      res(blob);
    };
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
  if (!handLandmarker || !camOn || video.readyState < 2) return lastHandTip;
  // detect를 ~22fps로 제한(매 프레임 추론이 메인스레드 최대 부하 → 녹화 끊김).
  // 사이 프레임은 캐시된 위치 반환 → 뜰채는 디스플레이 fps로 매끄럽게.
  if (t - lastDetectT < 55 || video.currentTime === lastVideoTime) return lastHandTip; // ~18fps
  lastDetectT = t; lastVideoTime = video.currentTime;
  let res;
  try { res = handLandmarker.detectForVideo(video, t); } catch { return lastHandTip; }
  if (!res || !res.landmarks || !res.landmarks.length) { lastHandTip = null; return null; }
  const lm = res.landmarks[0][8]; // 검지 끝 — 뜰채 입구가 손가락 끝에
  const tr = camTransform();
  if (!tr) return lastHandTip;
  lastHandTip = { x: W - (tr.ox + lm.x * tr.vw * tr.scale), y: tr.oy + lm.y * tr.vh * tr.scale };
  return lastHandTip;
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
  bumpPlay("idealcatch"); // 누적 플레이 +1
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
  ctx.font = `800 ${fs}px "Pretendard", system-ui, sans-serif`;
  const w = ctx.measureText(traitLabel(key)).width + fs * 1.7;
  const h = fs * 2.0;
  // 물고기처럼 팔딱 — 아래에서 위로 포물선으로 튀어오름
  const g = 0.8 * H, f = 0.42 + Math.random() * 0.3; // 중력↓ → 더 천천히 뜨고 떨어짐(정점 높이는 유지)
  words.push({
    key, x: W * (0.18 + Math.random() * 0.64), y: H + h * 0.5,
    vx: (Math.random() - 0.5) * 0.16 * H, vy: -Math.sqrt(2 * g * f * H), g,
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
  // ★ 깜놀 모먼트 — 쇼크 핑크 플래시 + 스크린 셰이크 + 깜놀 스팅어 (룩북 3번 비트)
  const tnow = performance.now();
  flashUntil = tnow + 320; shakeUntil = tnow + 380;
  playKkamnolSting();
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
  try { if (navigator.share) { await navigator.share({ title: T().title, text: T().tagline, url }); bumpShare("idealcatch"); return; } } catch { return; } // 취소 시 카운트 안 함
  try { await navigator.clipboard.writeText(url); bumpShare("idealcatch"); toast(T().linkCopied); } catch { toast(url); }
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
    const minPose = now - phaseStart > 1300; // 최소 1.3초 포즈 가이드 노출
    if (!countdownStart) {
      if (needHand) { if (src === "hand" && minPose) countdownStart = now; else if (now - phaseStart > 6000) countdownStart = now; }
      else if (minPose) countdownStart = now;
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
  ctx.font = `800 ${fs}px "Pretendard", system-ui, sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const w = ctx.measureText(label).width + fs * 1.5, h = fs * 1.9;
  roundRect(-w / 2, -h / 2, w, h, h / 2);
  ctx.fillStyle = color;
  ctx.fill(); // shadowBlur 글로우 제거 — 매 낱말/배지마다 칠하면 녹화 프레임레이트가 떨어짐
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

// 깜놀 프레임 — 시그널 옐로 보더 + 코너 워드마크. 캔버스에 그려 녹화 클립도 한눈에 깜놀 식별(룩북 5장)
function drawKkamnolFrame(now) {
  const pad = Math.max(7, MIN * 0.013);
  ctx.save();
  // 노란 보더 제거 — 코너 워드마크만 유지(녹화 클립 브랜드 식별)
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.font = `900 ${MIN * 0.03}px ${FONT}`; ctx.fillStyle = SIGNAL;
  ctx.fillText("깜놀", pad * 2, H - pad * 2.1);
  ctx.restore();
}

// ---------- 렌더 ----------
function render(now, src) {
  ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H); // 흔들려도 가장자리 메움
  const sh = now < shakeUntil ? (shakeUntil - now) / 380 : 0;
  ctx.save();
  if (sh > 0) { const m = MIN * 0.018 * sh; ctx.translate((Math.random() * 2 - 1) * m, (Math.random() * 2 - 1) * m); }
  renderScene(now, src);
  ctx.restore();
  if (now < flashUntil) { // ★ 쇼크 핑크 플래시
    ctx.save(); ctx.globalAlpha = Math.min(1, (flashUntil - now) / 320) * 0.55;
    ctx.fillStyle = SHOCK; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  drawKkamnolFrame(now);
}

function renderScene(now, src) {
  if (phase === "outro") { renderOutro(now); drawHook(); return; }

  const tr = camOn ? camTransform() : null;
  if (tr) {
    ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, tr.ox, tr.oy, tr.dw, tr.dh);
    ctx.restore();
    ctx.fillStyle = (phase === "result" || phase === "ready") ? "rgba(17,17,20,0.3)" : "rgba(17,17,20,0.5)"; // 결과·준비 땐 얼굴 더 밝게
    ctx.fillRect(0, 0, W, H);
  }

  if (phase === "ready") { renderPoseGuide(now); renderNet(now, src); renderReady(now); drawHook(); updateModePill(now, src); return; }

  if (phase === "play" || phase === "result") {
    for (const wd of words) pill(wd.x, wd.y, traitLabel(wd.key), wd.fs, traitColor(wd.key), 1, Math.sin(wd.wob) * 0.2);
    renderEffects();
    if (phase === "play") renderTray(); // 결과 카드 가리지 않게 결과 단계엔 트레이 숨김
  }
  if (phase === "result") renderResult(now);
  if (phase === "play") renderNet(now, src);
  if (now < goFlashUntil) {
    ctx.save(); ctx.globalAlpha = Math.min(1, (goFlashUntil - now) / 350);
    ctx.fillStyle = SIGNAL; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowBlur = MIN * 0.05; ctx.shadowColor = "rgba(232,255,46,0.9)";
    ctx.font = `900 ${MIN * 0.13}px "Pretendard", system-ui, sans-serif`;
    ctx.fillText(tx("go"), W / 2, H * 0.4);
    ctx.restore();
  }
  if (phase === "play") drawHook(); // 결과 카드 가리지 않게 결과 단계엔 훅 자막 숨김
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
// 상단 훅 — 큼직한 숏폼 밈 자막(굵은 검정 외곽선 + 옐로/화이트, 단어단위 2줄). 모든 단계+녹화 포함.
let hookBottomY = 0;
function drawHook() {
  const fam = '"Pretendard", system-ui, sans-serif';
  const t = hook();
  const maxW = W * 0.94;
  let fs = MIN * 0.085;
  const wrapLines = (size) => {
    ctx.font = `900 ${size}px ${fam}`;
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
  ctx.font = `900 ${fs}px ${fam}`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.lineJoin = "round"; ctx.miterLimit = 2;
  ctx.lineWidth = fs * 0.26;
  ctx.strokeStyle = "#0a0d0a";
  const lh = fs * 1.14, y0 = H * 0.18; // 릴스/틱톡 상단 UI에 안 가리게 아래로
  hookBottomY = y0 + (lines.length - 1) * lh + fs * 0.75;
  lines.forEach((ln, i) => {
    const yy = y0 + i * lh;
    ctx.strokeText(ln, W / 2, yy);
    ctx.fillStyle = i % 2 === 0 ? "#ffe14d" : "#ffffff"; // 옐로/화이트 교차
    ctx.fillText(ln, W / 2, yy);
  });
}
function renderTray() {
  const fs = MIN * 0.044, bh = fs * 1.8, gap = MIN * 0.02;
  ctx.font = `800 ${fs}px "Pretendard", system-ui, sans-serif`;
  const widths = collected.map((k) => ctx.measureText(traitLabel(k)).width + fs * 1.5);
  const total = widths.reduce((a, b) => a + b + gap, -gap);

  // 카운트 (중앙)
  ctx.font = `900 ${MIN * 0.046}px "Pretendard", system-ui, sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  const hb = hookBottomY || MIN * 0.22; // 훅(자막) 아래로 트레이 배치
  ctx.fillText(`${collected.length} / 5`, W / 2, hb + MIN * 0.045);

  // 배지 행 (중앙 정렬, 넘치면 줄바꿈)
  const maxRow = W - MIN * 0.1;
  let rows = [[]], rowW = [0];
  collected.forEach((k, i) => {
    const need = widths[i] + (rows[rows.length - 1].length ? gap : 0);
    if (rowW[rowW.length - 1] + need > maxRow) { rows.push([]); rowW.push(0); }
    rows[rows.length - 1].push(i);
    rowW[rowW.length - 1] += need;
  });
  let y = hb + MIN * 0.11;
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

  const fam = '"Pretendard", system-ui, sans-serif';
  ctx.textAlign = "center"; ctx.textBaseline = "middle";

  // 배경 투명 — 얼굴이 비치도록 핑크 글로우 테두리만
  roundRect(cx, cy, cw, ch, MIN * 0.06);
  ctx.save();
  ctx.strokeStyle = "rgba(255,45,111,0.95)"; ctx.lineWidth = MIN * 0.007; // 쇼크 핑크 — 반전 전용
  ctx.shadowBlur = MIN * 0.04; ctx.shadowColor = "rgba(255,45,111,0.8)";
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

  // 배지(색상, 대표는 크게) — 크게 + 안 들어가면 여러 줄로(한 줄에 욱여넣어 작아지지 않게)
  ctx.shadowBlur = 0; // pill은 자체 배경/그림자가 있으니 텍스트 그림자 끔
  const fs = MIN * 0.047, gap = MIN * 0.018, rowGap = MIN * 0.022;
  const maxRow = cw * 0.88;
  ctx.font = `800 ${fs}px ${fam}`;
  const items = collected.map((k) => {
    const sc = k === resultPrimary ? 1.1 : 1;
    return { k, sc, w: (ctx.measureText(traitLabel(k)).width + fs * 1.5) * sc };
  });
  // greedy 줄바꿈
  const rows = [[]];
  let rw = 0;
  for (const it of items) {
    const need = it.w + (rows[rows.length - 1].length ? gap : 0);
    if (rw + need > maxRow && rows[rows.length - 1].length) { rows.push([]); rw = 0; }
    rows[rows.length - 1].push(it);
    rw += need;
  }
  const bh = fs * 1.9;
  const totalH = rows.length * bh + (rows.length - 1) * rowGap;
  let by = cy + ch * 0.52 - totalH / 2 + bh / 2; // 배지 블록 세로 중앙
  for (const row of rows) {
    const rowW = row.reduce((a, it) => a + it.w, 0) + gap * (row.length - 1);
    const rs = Math.min(1, maxRow / rowW); // 한 배지가 너무 길 때만 그 줄 살짝 축소
    let bx = W / 2 - (rowW * rs) / 2;
    for (const it of row) {
      const bw = it.w * rs;
      pill(bx + bw / 2, by, traitLabel(it.k), fs, traitColor(it.k), it.sc * rs);
      bx += bw + gap * rs;
    }
    by += bh + rowGap;
  }

  ctx.shadowColor = "rgba(0,0,0,0.92)"; ctx.shadowBlur = MIN * 0.022;
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${MIN * 0.04}px ${fam}`;
  ctx.fillText(T().resultAll, W / 2, cy + ch * 0.71);

  ctx.fillStyle = SIGNAL;
  ctx.font = `800 ${MIN * 0.032}px "Pretendard", system-ui, sans-serif`;
  ctx.fillText("kkamnol.xyz", W / 2, cy + ch * 0.86);
  ctx.shadowBlur = 0;
  ctx.restore();
  ctx.globalAlpha = 1;
}

function renderOutro(now) {
  const el = (now - phaseStart) / 1000;
  const fade = Math.min(1, el / 0.4) * Math.min(1, Math.max(0, (2.3 - el) / 0.4));
  ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = fade;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";

  // CTA (언어별)
  ctx.fillStyle = SIGNAL;
  ctx.font = `800 ${MIN * 0.045}px ${FONT}`;
  ctx.fillText(T().outroCta, W / 2, H / 2 - MIN * 0.22);

  // 워드마크 — 깜놀(시그널 옐로) + KKAMNOL(페이퍼)
  ctx.fillStyle = SIGNAL;
  ctx.font = `900 ${MIN * 0.16}px ${FONT}`;
  ctx.fillText("깜놀", W / 2, H / 2 + MIN * 0.01);
  ctx.fillStyle = PAPER;
  ctx.font = `900 ${MIN * 0.058}px ${FONT}`;
  ctx.fillText("KKAMNOL", W / 2, H / 2 + MIN * 0.11);
  ctx.fillStyle = "rgba(247,247,242,0.55)";
  ctx.font = `700 ${MIN * 0.034}px ${FONT}`;
  ctx.fillText("kkamnol.xyz", W / 2, H / 2 + MIN * 0.18);
  ctx.globalAlpha = 1;
}

// 포즈 가이드 — 머리 위로 손 든 사람 실루엣 + 손 위치 타깃 링 (카운트다운 시작 시 페이드)
function renderPoseGuide(now) {
  const fade = countdownStart ? Math.max(0, 1 - (now - countdownStart) / 450) : 1;
  if (fade <= 0) return;
  const cx = W / 2, u = MIN;
  const headR = u * 0.06;
  const hy = H * 0.56;                 // 머리 중심(자막과 안 겹치게 아래로)
  const shY = hy + headR * 1.5;        // 어깨
  const shW = u * 0.155;               // 어깨 너비
  const hipY = H * 0.85;
  const handX = cx + u * 0.02, handY = H * 0.32; // 머리 위로 든 손
  const pulse = 0.5 + 0.5 * Math.sin(now / 320);

  ctx.save();
  ctx.globalAlpha = fade * 0.5;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineCap = "round"; ctx.lineJoin = "round";

  // 몸통
  ctx.beginPath();
  ctx.moveTo(cx - shW, shY);
  ctx.quadraticCurveTo(cx - shW * 1.05, (shY + hipY) / 2, cx - shW * 0.72, hipY);
  ctx.lineTo(cx + shW * 0.72, hipY);
  ctx.quadraticCurveTo(cx + shW * 1.05, (shY + hipY) / 2, cx + shW, shY);
  ctx.quadraticCurveTo(cx, shY - headR * 0.6, cx - shW, shY);
  ctx.closePath(); ctx.fill();
  // 머리
  ctx.beginPath(); ctx.arc(cx, hy, headR, 0, 6.2832); ctx.fill();
  // 팔(굵은 캡슐)
  ctx.lineWidth = u * 0.05;
  // 내린 팔(왼쪽)
  ctx.beginPath();
  ctx.moveTo(cx - shW * 0.85, shY + u * 0.01);
  ctx.quadraticCurveTo(cx - shW * 1.25, (shY + hipY) / 2, cx - shW * 1.0, hipY - u * 0.02);
  ctx.stroke();
  // 든 팔(오른쪽 → 머리 위 손)
  ctx.beginPath();
  ctx.moveTo(cx + shW * 0.8, shY + u * 0.01);
  ctx.quadraticCurveTo(cx + shW * 1.2, hy - headR * 0.5, handX, handY + headR * 1.3);
  ctx.stroke();
  // 든 손
  ctx.beginPath(); ctx.arc(handX, handY, headR * 0.72, 0, 6.2832); ctx.fill();
  ctx.restore();

  // 손 위치 타깃 링 — "여기에 손을 들어 뜰채를 잡으세요"
  ctx.save();
  ctx.globalAlpha = fade * 0.9;
  ctx.strokeStyle = "rgba(232,255,46,0.95)";
  ctx.lineWidth = u * 0.013;
  ctx.setLineDash([u * 0.03, u * 0.022]);
  ctx.shadowBlur = u * 0.035; ctx.shadowColor = "rgba(232,255,46,0.9)";
  ctx.beginPath(); ctx.arc(handX, handY, headR * (1.45 + pulse * 0.3), 0, 6.2832); ctx.stroke();
  ctx.restore();
}

// 준비 화면 — "뜰채를 잡으세요" 프롬프트 → 3·2·1 카운트다운
function renderReady(now) {
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (!countdownStart) {
    const fam = '"Pretendard", system-ui, sans-serif';
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
      ctx.font = `900 ${MIN * 0.26 * (1.35 - within * 0.35)}px "Pretendard", system-ui, sans-serif`;
      ctx.fillText(String(cur), W / 2, H * 0.6);
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
  const glow = src === "hand" ? "rgba(232,255,46,0.95)" : "rgba(160,200,255,0.95)";
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
  for (let k = 0; k <= 4; k++) { // 그물 곡선 8→5 (프레임당 비용↓)
    const a = Math.PI * (k / 4);
    const rx = -Math.cos(a) * R, ry = Math.sin(a) * R * 0.42;
    ctx.beginPath(); ctx.moveTo(rx, ry); ctx.quadraticCurveTo(rx * 0.35, bag * 0.7, 0, bag); ctx.stroke();
  }
  for (let yy = 0.42; yy < 1.0; yy += 0.27) {
    ctx.beginPath(); ctx.ellipse(0, bag * yy, R * (1 - yy * 0.6), R * 0.32 * (1 - yy * 0.4), 0, 0.15, Math.PI - 0.15); ctx.stroke();
  }
  // 림(테) — shadowBlur 제거(프레임당 글로우 비용↓), 솔리드 스트로크
  ctx.lineWidth = MIN * (scooping ? 0.017 : 0.012);
  ctx.strokeStyle = scooping ? "#fff" : "#eef3f8";
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
  unlockAudio(); // 카메라 await 전에 제스처 안에서 오디오 먼저 언락(iOS 묵음 방지)
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
