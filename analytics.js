/* ============================================================
   Kkamnol — 게임 공용 애널리틱스 (Supabase)
   누적 플레이/공유 카운트. 키 미설정 시 조용히 no-op.
   설정: /grandprix/supabase-config.js 에 URL·anon key 입력 +
        /grandprix/db/supabase-setup.sql 실행(game_stats·bump_play·bump_share).
   ============================================================ */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "/grandprix/supabase-config.js";

const enabled = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);
let _sb = null;
async function sb() {
  if (_sb || !enabled()) return _sb;
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  _sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  return _sb;
}

export async function bumpPlay(gameId) {
  try { const c = await sb(); if (!c) return; await c.rpc("bump_play", { g: gameId }); }
  catch (e) { console.warn("[analytics] play", e); }
}
export async function bumpShare(gameId) {
  try { const c = await sb(); if (!c) return; await c.rpc("bump_share", { g: gameId }); }
  catch (e) { console.warn("[analytics] share", e); }
}
