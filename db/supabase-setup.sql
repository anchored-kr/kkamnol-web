-- ============================================================
-- Kkamnol — 게임 누적 플레이/공유 카운트 (Supabase)
-- 사용법: Supabase 대시보드 → SQL Editor → 전체 붙여넣고 Run.
-- 그 후 /supabase-config.js 에 Project URL·anon key 입력.
-- ============================================================

-- 게임별 통계 (랜딩페이지 카드 표시용)
create table if not exists public.game_stats (
  game_id text primary key,
  plays   bigint not null default 0,
  shares  bigint not null default 0
);
-- 기존 테이블이 이미 있으면 shares 컬럼 추가
alter table public.game_stats add column if not exists shares bigint not null default 0;

-- 플레이 +1 (없으면 생성) → 새 값 반환
create or replace function public.bump_play(g text) returns bigint
language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  insert into public.game_stats(game_id, plays) values (left(g,40), 1)
  on conflict (game_id) do update set plays = game_stats.plays + 1
  returning plays into v;
  return v;
end; $$;
grant execute on function public.bump_play(text) to anon, authenticated;

-- 공유 +1 (없으면 생성) → 새 값 반환
create or replace function public.bump_share(g text) returns bigint
language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  insert into public.game_stats(game_id, shares) values (left(g,40), 1)
  on conflict (game_id) do update set shares = game_stats.shares + 1
  returning shares into v;
  return v;
end; $$;
grant execute on function public.bump_share(text) to anon, authenticated;

-- 공개 읽기 뷰 (플레이 + 공유)
create or replace view public.game_play_counts as
  select game_id, plays, shares from public.game_stats;
grant select on public.game_play_counts to anon, authenticated;
