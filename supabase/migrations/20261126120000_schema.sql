-- CAS Ready schema. Run this in the Supabase SQL editor before the seed migration.

create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('student', 'university', 'agent', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.org_kind as enum ('university', 'agency');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.session_mode as enum ('trial', 'practice', 'mock');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.session_status as enum ('ready', 'in_progress', 'completed', 'abandoned', 'technical_failure');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.readiness_band as enum ('green', 'amber', 'red');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.subscription_status as enum ('incomplete', 'trialing', 'active', 'past_due', 'canceled', 'unpaid');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role public.user_role not null default 'student',
  home_country text,
  recording_consent_at timestamptz,
  terms_accepted_at timestamptz,
  trial_consumed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.universities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  city text not null,
  country text not null default 'United Kingdom',
  campus text,
  about text,
  facilities jsonb not null default '[]'::jsonb,
  official_url text,
  last_verified_on date,
  needs_verification boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  kind public.org_kind not null,
  name text not null,
  university_id uuid references public.universities (id),
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities (id) on delete cascade,
  slug text not null,
  name text not null,
  level text not null,
  duration_text text,
  tuition_fee_gbp numeric,
  tuition_note text,
  modules jsonb not null default '[]'::jsonb,
  teaching_summary text,
  entry_requirements text,
  official_url text,
  last_verified_on date,
  needs_verification boolean not null default true,
  unique (university_id, slug)
);

create table if not exists public.reference_facts (
  id uuid primary key default gen_random_uuid(),
  fact_key text not null,
  label text not null,
  value_text text,
  value_numeric numeric,
  unit text,
  region text not null default 'any',
  effective_from date,
  effective_to date,
  source_url text,
  last_verified_on date,
  needs_verification boolean not null default true,
  active boolean not null default true,
  notes text,
  unique (fact_key, region, effective_from)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  category text not null,
  prompt_template text not null,
  hints text[] not null default '{}',
  concepts text[] not null default '{}',
  fact_keys text[] not null default '{}',
  sort_order int not null default 0,
  active boolean not null default true,
  editorial boolean not null default true,
  constraint questions_category_chk check (
    category in ('course', 'university', 'uk_choice', 'finance', 'career', 'academic', 'research', 'immigration', 'accommodation')
  )
);

create table if not exists public.student_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  university_id uuid references public.universities (id),
  course_id uuid references public.courses (id),
  previous_qualification text,
  english_test text,
  accommodation_plan text,
  accommodation_cost_gbp numeric,
  accommodation_distance text,
  career_goal text,
  updated_at timestamptz not null default now()
);

create table if not exists public.student_finance_private (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  tuition_fee_gbp numeric,
  deposit_paid_gbp numeric,
  sponsor_name text,
  sponsor_occupation text,
  sponsor_income text,
  updated_at timestamptz not null default now()
);

create table if not exists public.organisation_members (
  org_id uuid references public.organisations (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  member_role text not null default 'member',
  primary key (org_id, user_id)
);

create table if not exists public.student_org_links (
  org_id uuid references public.organisations (id) on delete cascade,
  student_id uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (org_id, student_id)
);

create table if not exists public.plans (
  code text primary key,
  name text not null,
  description text not null,
  amount_pence int not null,
  currency text not null default 'gbp',
  interval text not null default 'month',
  mock_quota int,
  practice_unlimited boolean not null default true,
  stripe_price_env text not null,
  active boolean not null default true
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null,
  provider_customer_id text,
  provider_subscription_id text unique,
  plan_code text references public.plans (code),
  status public.subscription_status not null default 'incomplete',
  current_period_end timestamptz,
  mock_quota int,
  mocks_remaining int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subscriptions_one_open
  on public.subscriptions (user_id)
  where status in ('active', 'trialing');

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now(),
  unique (provider, event_id)
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mode public.session_mode not null,
  status public.session_status not null default 'ready',
  university_id uuid references public.universities (id),
  course_id uuid references public.courses (id),
  answer_seconds int not null,
  prep_seconds int not null default 15,
  question_count int not null,
  partial boolean not null default false,
  overall_score numeric,
  band public.readiness_band,
  band_withheld boolean not null default false,
  category_scores jsonb,
  summary text,
  credit_consumed boolean not null default false,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.session_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  question_id uuid not null references public.questions (id),
  position int not null,
  prompt text not null,
  unique (session_id, position),
  unique (session_id, question_id)
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  session_question_id uuid not null references public.session_questions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  transcript text,
  typed_notes text,
  duration_ms int,
  speech_delay_ms int,
  longest_silence_ms int,
  speaking_ratio numeric,
  delivery_score numeric,
  content_score numeric,
  answer_score numeric,
  concepts_hit text[],
  concepts_missed text[],
  flags jsonb not null default '[]'::jsonb,
  ai_feedback jsonb,
  video_path text,
  audio_sent_to_ai boolean not null default false,
  left_screen_count int not null default 0,
  retain_until timestamptz not null default (now() + interval '90 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_question_id)
);

create table if not exists public.consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  accepted boolean not null,
  created_at timestamptz not null default now()
);

create table if not exists public.rate_limits (
  bucket text primary key,
  count int not null,
  window_start timestamptz not null
);

create table if not exists public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists sessions_user_created_idx on public.sessions (user_id, created_at desc);
create index if not exists answers_session_idx on public.answers (session_id);
create index if not exists answers_retain_idx on public.answers (retain_until);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated on public.profiles;
create trigger profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists student_profiles_updated on public.student_profiles;
create trigger student_profiles_updated before update on public.student_profiles
for each row execute function public.set_updated_at();

drop trigger if exists finance_updated on public.student_finance_private;
create trigger finance_updated before update on public.student_finance_private
for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_updated on public.subscriptions;
create trigger subscriptions_updated before update on public.subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists answers_updated on public.answers;
create trigger answers_updated before update on public.answers
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.guard_profile()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is not distinct from old.role
     and new.trial_consumed is not distinct from old.trial_consumed then
    return new;
  end if;

  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if new.role is not distinct from old.role
     and current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if new.role is distinct from old.role and public.is_admin() then
    return new;
  end if;

  raise exception 'This profile field cannot be changed';
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
for each row execute function public.guard_profile();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.consume_mock_credit(p_user_id uuid)
returns table (subscription_id uuid, mocks_remaining integer, unlimited boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.subscriptions%rowtype;
begin
  select * into rec
  from public.subscriptions s
  where s.user_id = p_user_id
    and s.status in ('active', 'trialing')
    and (s.current_period_end is null or s.current_period_end > now())
  order by s.updated_at desc
  limit 1
  for update;

  if not found then
    return;
  end if;

  if rec.mock_quota is null then
    subscription_id := rec.id;
    mocks_remaining := null;
    unlimited := true;
    return next;
    return;
  end if;

  if coalesce(rec.mocks_remaining, 0) <= 0 then
    return;
  end if;

  update public.subscriptions
     set mocks_remaining = rec.mocks_remaining - 1
   where id = rec.id;

  subscription_id := rec.id;
  mocks_remaining := rec.mocks_remaining - 1;
  unlimited := false;
  return next;
end;
$$;

create or replace function public.refund_mock_credit(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.subscriptions
     set mocks_remaining = case
           when mock_quota is null then null
           else least(mock_quota, coalesce(mocks_remaining, 0) + 1)
         end
   where user_id = p_user_id
     and status in ('active', 'trialing');
end;
$$;

create or replace function public.mark_trial_used(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_rows int;
begin
  update public.profiles
     set trial_consumed = true
   where id = p_user_id
     and trial_consumed = false;
  get diagnostics updated_rows = row_count;
  return updated_rows > 0;
end;
$$;

create or replace function public.org_student_summaries()
returns table (
  student_id uuid,
  full_name text,
  email text,
  home_country text,
  sessions_completed bigint,
  latest_band text,
  latest_score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    p.email,
    p.home_country,
    (select count(*) from public.sessions s where s.user_id = p.id and s.status = 'completed'),
    (
      select s.band::text from public.sessions s
      where s.user_id = p.id and s.status = 'completed'
      order by s.completed_at desc nulls last
      limit 1
    ),
    (
      select s.overall_score from public.sessions s
      where s.user_id = p.id and s.status = 'completed'
      order by s.completed_at desc nulls last
      limit 1
    )
  from public.profiles p
  join public.student_org_links l on l.student_id = p.id
  join public.organisation_members m on m.org_id = l.org_id
  where m.user_id = auth.uid();
$$;

revoke all on function public.consume_mock_credit(uuid) from public, anon, authenticated;
revoke all on function public.refund_mock_credit(uuid) from public, anon, authenticated;
revoke all on function public.mark_trial_used(uuid) from public, anon, authenticated;
grant execute on function public.consume_mock_credit(uuid) to service_role;
grant execute on function public.refund_mock_credit(uuid) to service_role;
grant execute on function public.mark_trial_used(uuid) to service_role;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.org_student_summaries() to authenticated;

alter table public.profiles enable row level security;
alter table public.universities enable row level security;
alter table public.organisations enable row level security;
alter table public.courses enable row level security;
alter table public.reference_facts enable row level security;
alter table public.questions enable row level security;
alter table public.student_profiles enable row level security;
alter table public.student_finance_private enable row level security;
alter table public.organisation_members enable row level security;
alter table public.student_org_links enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;
alter table public.sessions enable row level security;
alter table public.session_questions enable row level security;
alter table public.answers enable row level security;
alter table public.consent_events enable row level security;
alter table public.rate_limits enable row level security;
alter table public.deletion_requests enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
for update to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists universities_select on public.universities;
create policy universities_select on public.universities
for select to authenticated
using (true);

drop policy if exists universities_admin_update on public.universities;
create policy universities_admin_update on public.universities
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists courses_select on public.courses;
create policy courses_select on public.courses
for select to authenticated
using (true);

drop policy if exists courses_admin_update on public.courses;
create policy courses_admin_update on public.courses
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists facts_select on public.reference_facts;
create policy facts_select on public.reference_facts
for select to authenticated
using (true);

drop policy if exists facts_admin_update on public.reference_facts;
create policy facts_admin_update on public.reference_facts
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists questions_select on public.questions;
create policy questions_select on public.questions
for select to authenticated
using (active or public.is_admin());

drop policy if exists plans_select on public.plans;
create policy plans_select on public.plans
for select to anon, authenticated
using (active or public.is_admin());

drop policy if exists student_profiles_all on public.student_profiles;
create policy student_profiles_all on public.student_profiles
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists finance_owner on public.student_finance_private;
create policy finance_owner on public.student_finance_private
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists org_select on public.organisations;
create policy org_select on public.organisations
for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.organisation_members m
    where m.org_id = organisations.id and m.user_id = auth.uid()
  )
);

drop policy if exists org_admin_write on public.organisations;
create policy org_admin_write on public.organisations
for insert to authenticated
with check (public.is_admin());

drop policy if exists org_members_select on public.organisation_members;
create policy org_members_select on public.organisation_members
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists org_members_admin_write on public.organisation_members;
create policy org_members_admin_write on public.organisation_members
for insert to authenticated
with check (public.is_admin());

drop policy if exists links_admin_select on public.student_org_links;
create policy links_admin_select on public.student_org_links
for select to authenticated
using (public.is_admin());

drop policy if exists links_admin_write on public.student_org_links;
create policy links_admin_write on public.student_org_links
for insert to authenticated
with check (public.is_admin());

drop policy if exists subscriptions_select on public.subscriptions;
create policy subscriptions_select on public.subscriptions
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists session_questions_select on public.session_questions;
create policy session_questions_select on public.session_questions
for select to authenticated
using (
  exists (
    select 1 from public.sessions s
    where s.id = session_questions.session_id
      and (s.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists answers_select on public.answers;
create policy answers_select on public.answers
for select to authenticated
using (user_id = auth.uid());

drop policy if exists consent_select on public.consent_events;
create policy consent_select on public.consent_events
for select to authenticated
using (user_id = auth.uid());

drop policy if exists consent_insert on public.consent_events;
create policy consent_insert on public.consent_events
for insert to authenticated
with check (user_id = auth.uid());

-- billing_events, rate_limits and deletion_requests have no policies.
-- The service role bypasses row level security. Signed-in users cannot read them.

grant usage on schema public to anon, authenticated, service_role;
grant select on public.plans to anon, authenticated;
grant select on public.universities, public.courses, public.questions, public.reference_facts to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.student_profiles to authenticated;
grant select, insert, update, delete on public.student_finance_private to authenticated;
grant select, insert on public.consent_events to authenticated;
grant select on public.sessions, public.session_questions, public.answers, public.subscriptions to authenticated;
grant select on public.organisations, public.organisation_members, public.student_org_links to authenticated;
grant insert on public.organisations, public.organisation_members, public.student_org_links to authenticated;
grant update on public.universities, public.courses, public.reference_facts to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('recordings', 'recordings', false)
    on conflict (id) do nothing;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage' and tablename = 'objects' and policyname = 'recordings_insert'
    ) then
      execute $policy$
        create policy recordings_insert on storage.objects
        for insert to authenticated
        with check (
          bucket_id = 'recordings'
          and (storage.foldername(name))[1] = auth.uid()::text
        )
      $policy$;
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage' and tablename = 'objects' and policyname = 'recordings_select'
    ) then
      execute $policy$
        create policy recordings_select on storage.objects
        for select to authenticated
        using (
          bucket_id = 'recordings'
          and (storage.foldername(name))[1] = auth.uid()::text
        )
      $policy$;
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage' and tablename = 'objects' and policyname = 'recordings_update'
    ) then
      execute $policy$
        create policy recordings_update on storage.objects
        for update to authenticated
        using (
          bucket_id = 'recordings'
          and (storage.foldername(name))[1] = auth.uid()::text
        )
      $policy$;
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage' and tablename = 'objects' and policyname = 'recordings_delete'
    ) then
      execute $policy$
        create policy recordings_delete on storage.objects
        for delete to authenticated
        using (
          bucket_id = 'recordings'
          and (storage.foldername(name))[1] = auth.uid()::text
        )
      $policy$;
    end if;
  end if;
end $$;
