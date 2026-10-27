-- GCSE OnTrack: anonymous usage analytics + user feedback
-- Run once in Supabase Dashboard > SQL Editor.
-- Public clients can INSERT only; they cannot read collected events/feedback.
-- Analytics is opt-in in the website UI. No email, IP field, revision notes or resource URLs are sent.

create table if not exists public.site_events (
  id bigint generated always as identity primary key,
  event_name text not null check (event_name in (
    'page_view', 'session_start', 'engaged_5m', 'return_visit',
    'feedback_submitted', 'signup_success', 'login_success', 'free_mistake_saved'
  )),
  visitor_id text not null check (char_length(visitor_id) between 8 and 80),
  session_id text not null check (char_length(session_id) between 8 and 80),
  page_path text not null check (char_length(page_path) between 1 and 100),
  metadata jsonb not null default '{}'::jsonb check (pg_column_size(metadata) <= 2048),
  created_at timestamptz not null default now()
);

alter table public.site_events enable row level security;
revoke all on public.site_events from anon, authenticated;
grant insert on public.site_events to anon, authenticated;
drop policy if exists "Allow client event inserts" on public.site_events;
create policy "Allow client event inserts"
  on public.site_events for insert to anon, authenticated
  with check (
    event_name in ('page_view', 'session_start', 'engaged_5m', 'return_visit', 'feedback_submitted', 'signup_success', 'login_success', 'free_mistake_saved')
    and char_length(visitor_id) between 8 and 80
    and char_length(session_id) between 8 and 80
    and char_length(page_path) between 1 and 100
    and pg_column_size(metadata) <= 2048
  );
create index if not exists site_events_created_at_idx on public.site_events (created_at desc);
create index if not exists site_events_event_created_idx on public.site_events (event_name, created_at desc);

create table if not exists public.site_feedback (
  id bigint generated always as identity primary key,
  category text not null check (category in ('suggestion', 'problem', 'confusing', 'praise', 'other')),
  rating smallint null check (rating between 1 and 5),
  message text not null check (char_length(trim(message)) between 4 and 1000),
  page_path text not null check (char_length(page_path) between 1 and 100),
  created_at timestamptz not null default now()
);

alter table public.site_feedback enable row level security;
revoke all on public.site_feedback from anon, authenticated;
grant insert on public.site_feedback to anon, authenticated;
drop policy if exists "Allow feedback submissions" on public.site_feedback;
create policy "Allow feedback submissions"
  on public.site_feedback for insert to anon, authenticated
  with check (
    category in ('suggestion', 'problem', 'confusing', 'praise', 'other')
    and (rating is null or rating between 1 and 5)
    and char_length(trim(message)) between 4 and 1000
    and char_length(page_path) between 1 and 100
  );
create index if not exists site_feedback_created_at_idx on public.site_feedback (created_at desc);

-- Check data in the Supabase Dashboard Table Editor as the project owner.
-- Ordinary site visitors have no SELECT policy and cannot read other users' submissions.
