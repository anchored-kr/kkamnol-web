/* ============================================================
   제목학원 그랑프리 — 리더보드 백엔드 (Supabase)
   키 미설정 시 lbEnabled()=false → 게임은 데모 시드로 폴백.
   ============================================================ */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "/grandprix/supabase-config.js";

export const lbEnabled = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);

let _sb = null;
async function sb() {
  if (_sb || !lbEnabled()) return _sb;
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  _sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  return _sb;
}

// 사진별 상위 답변 가져오기 (likes desc) — 실패 시 null → 호출부가 시드로 폴백
export async function fetchLeaderboard(photoId, limit = 30) {
  try {
    const c = await sb(); if (!c) return null;
    const { data, error } = await c
      .from("leaderboard").select("*")
      .eq("photo_id", photoId)
      .order("likes", { ascending: false }).order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (e) { console.warn("[lb] fetch", e); return null; }
}

// 제출 → { id, owner_token } (영상 업로드 권한 토큰)
export async function submitEntry(e) {
  try {
    const c = await sb(); if (!c) return null;
    const { data, error } = await c.rpc("submit_entry", {
      p_photo_id: e.photoId, p_nick: e.nick, p_flag: e.flag,
      p_nation: e.nation, p_caption: e.caption, p_lang: e.lang,
    });
    if (error) throw error;
    return data && data[0]; // { id, owner_token }
  } catch (e2) { console.warn("[lb] submit", e2); return null; }
}

export async function likeEntry(id, on) {
  try { const c = await sb(); if (!c) return; await c.rpc(on ? "like_submission" : "unlike_submission", { sid: id }); }
  catch (e) { console.warn("[lb] like", e); }
}
export async function reportEntry(id) {
  try { const c = await sb(); if (!c) return; await c.rpc("report_submission", { sid: id }); }
  catch (e) { console.warn("[lb] report", e); }
}

// opt-in 영상 업로드 → 저장 경로(video_path) 반환
export async function uploadVideo(id, ownerToken, file) {
  try {
    const c = await sb(); if (!c || !file) return null;
    const ext = (file.type || "").includes("mp4") ? "mp4" : "webm";
    const path = `${id}.${ext}`;
    const { error } = await c.storage.from("videos").upload(path, file, { contentType: file.type || "video/mp4", upsert: true });
    if (error) throw error;
    await c.rpc("set_video", { sid: id, p_path: path, tok: ownerToken });
    return path;
  } catch (e) { console.warn("[lb] upload", e); return null; }
}

export async function publicVideoUrl(path) {
  try { const c = await sb(); if (!c || !path) return null; return c.storage.from("videos").getPublicUrl(path).data.publicUrl; }
  catch (e) { return null; }
}

/* ---- 캡션 욕설/스팸 필터 (가벼운 다국어 블록리스트) ---- */
const BAD = [
  // ko
  "씨발","시발","ㅅㅂ","병신","ㅂㅅ","좆","지랄","개새","애미","니애미","fuck","fuckyou","shit","bitch","asshole","cunt","nigger","faggot","retard",
  "포르노","porn","sex","섹스","야동","자지","보지","엠창",
];
export function cleanCaption(s) {
  const low = (s || "").toLowerCase().replace(/\s+/g, "");
  for (const w of BAD) if (low.includes(w)) return false; // 부적절 → 거부
  return true;
}
