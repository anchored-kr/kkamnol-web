-- ============================================================
-- 제목학원 그랑프리 — Supabase 리더보드 세팅
-- 사용법: Supabase 대시보드 → SQL Editor → 전체 붙여넣고 Run.
-- 그다음 Storage에서 'videos' 버킷 생성(아래 5번 참고).
-- ============================================================

-- 1) 제출 테이블
create table if not exists public.submissions (
  id          uuid primary key default gen_random_uuid(),
  photo_id    text not null,
  nick        text not null default '익명',
  flag        text not null default '🌍',
  nation      text,
  caption     text not null,
  lang        text,
  video_path  text,                 -- Storage 경로 (opt-in 업로드 후 채워짐)
  likes       int  not null default 0,
  reports     int  not null default 0,
  hidden      boolean not null default false,
  owner_token uuid not null,        -- 영상 업로드 권한 토큰(클라가 보관, 공개 안 함)
  created_at  timestamptz not null default now()
);
create index if not exists submissions_photo_idx on public.submissions (photo_id, hidden, likes desc);

-- 2) RLS: 직접 접근 차단. 읽기는 '뷰', 쓰기는 'RPC'로만.
alter table public.submissions enable row level security;  -- 정책 없음 = anon 직접 접근 불가

-- 3) 공개 읽기 뷰 (owner_token·reports 숨김)
create or replace view public.leaderboard as
  select id, photo_id, nick, flag, nation, caption, lang, video_path, likes, created_at
  from public.submissions
  where hidden = false;
grant select on public.leaderboard to anon, authenticated;

-- 4) 쓰기 RPC (security definer = RLS 우회하되 검증된 동작만)
create or replace function public.submit_entry(
  p_photo_id text, p_nick text, p_flag text, p_nation text, p_caption text, p_lang text
) returns table(id uuid, owner_token uuid)
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_tok uuid := gen_random_uuid();
begin
  if p_caption is null or char_length(p_caption) < 1 or char_length(p_caption) > 60 then
    raise exception 'invalid caption';
  end if;
  insert into public.submissions(photo_id, nick, flag, nation, caption, lang, owner_token)
  values (left(p_photo_id,80), left(coalesce(nullif(p_nick,''),'익명'),16), coalesce(p_flag,'🌍'),
          p_nation, p_caption, p_lang, v_tok)
  returning submissions.id into v_id;
  return query select v_id, v_tok;
end; $$;

create or replace function public.like_submission(sid uuid) returns void
language sql security definer set search_path = public as $$
  update public.submissions set likes = likes + 1 where id = sid and hidden = false;
$$;

create or replace function public.unlike_submission(sid uuid) returns void
language sql security definer set search_path = public as $$
  update public.submissions set likes = greatest(0, likes - 1) where id = sid;
$$;

-- 신고 3회 누적 시 자동 숨김
create or replace function public.report_submission(sid uuid) returns void
language sql security definer set search_path = public as $$
  update public.submissions
    set reports = reports + 1, hidden = (reports + 1 >= 3)
    where id = sid;
$$;

-- 영상 경로 설정 (소유 토큰 일치 시에만)
create or replace function public.set_video(sid uuid, p_path text, tok uuid) returns void
language sql security definer set search_path = public as $$
  update public.submissions set video_path = p_path where id = sid and owner_token = tok;
$$;

grant execute on function public.submit_entry(text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.like_submission(uuid)    to anon, authenticated;
grant execute on function public.unlike_submission(uuid)  to anon, authenticated;
grant execute on function public.report_submission(uuid)  to anon, authenticated;
grant execute on function public.set_video(uuid,text,uuid) to anon, authenticated;

-- 5) Storage 버킷 'videos' 만들기
--    대시보드 Storage → New bucket → name: videos, Public: ON,
--    File size limit: 25MB, Allowed MIME types: video/mp4
--    그 후 아래 정책 실행(anon 업로드 + 공개 읽기):
do $$ begin
  -- 업로드(insert)
  begin
    create policy "anon upload videos" on storage.objects
      for insert to anon with check (bucket_id = 'videos');
  exception when duplicate_object then null; end;
  -- 공개 읽기(select)
  begin
    create policy "public read videos" on storage.objects
      for select to anon using (bucket_id = 'videos');
  exception when duplicate_object then null; end;
end $$;

-- ============================================================
-- 6) 게임별 플레이 카운트 (랜딩페이지 표시용)
-- ============================================================
create table if not exists public.game_stats (
  game_id text primary key,
  plays   bigint not null default 0,
  shares  bigint not null default 0
);
-- 기존 테이블이 이미 있으면 shares 컬럼 추가
alter table public.game_stats add column if not exists shares bigint not null default 0;

-- 카운트 +1 (없으면 생성) → 새 값 반환
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
