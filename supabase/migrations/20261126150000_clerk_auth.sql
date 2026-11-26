-- Clerk user ids are text (user_...). Row access uses the subject claim on the session token.

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

drop function if exists public.consume_mock_credit(uuid);
drop function if exists public.refund_mock_credit(uuid);
drop function if exists public.mark_trial_used(uuid);
drop function if exists public.org_student_summaries();

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update on public.profiles;
drop policy if exists student_profiles_all on public.student_profiles;
drop policy if exists finance_owner on public.student_finance_private;
drop policy if exists org_select on public.organisations;
drop policy if exists org_members_select on public.organisation_members;
drop policy if exists subscriptions_select on public.subscriptions;
drop policy if exists sessions_select on public.sessions;
drop policy if exists session_questions_select on public.session_questions;
drop policy if exists answers_select on public.answers;
drop policy if exists consent_select on public.consent_events;
drop policy if exists consent_insert on public.consent_events;

alter table public.answers drop constraint if exists answers_user_id_fkey;
alter table public.consent_events drop constraint if exists consent_events_user_id_fkey;
alter table public.sessions drop constraint if exists sessions_user_id_fkey;
alter table public.subscriptions drop constraint if exists subscriptions_user_id_fkey;
alter table public.organisation_members drop constraint if exists organisation_members_user_id_fkey;
alter table public.student_org_links drop constraint if exists student_org_links_student_id_fkey;
alter table public.student_profiles drop constraint if exists student_profiles_user_id_fkey;
alter table public.student_finance_private drop constraint if exists student_finance_private_user_id_fkey;
alter table public.profiles drop constraint if exists profiles_id_fkey;

alter table public.profiles alter column id type text using id::text;
alter table public.student_profiles alter column user_id type text using user_id::text;
alter table public.student_finance_private alter column user_id type text using user_id::text;
alter table public.organisation_members alter column user_id type text using user_id::text;
alter table public.student_org_links alter column student_id type text using student_id::text;
alter table public.subscriptions alter column user_id type text using user_id::text;
alter table public.sessions alter column user_id type text using user_id::text;
alter table public.answers alter column user_id type text using user_id::text;
alter table public.consent_events alter column user_id type text using user_id::text;
alter table public.deletion_requests alter column user_id type text using user_id::text;

alter table public.student_profiles
  add constraint student_profiles_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade;
alter table public.student_finance_private
  add constraint student_finance_private_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade;
alter table public.organisation_members
  add constraint organisation_members_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade;
alter table public.student_org_links
  add constraint student_org_links_student_id_fkey foreign key (student_id) references public.profiles (id) on delete cascade;
alter table public.subscriptions
  add constraint subscriptions_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade;
alter table public.sessions
  add constraint sessions_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade;
alter table public.answers
  add constraint answers_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade;
alter table public.consent_events
  add constraint consent_events_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade;

create or replace function public.current_user_id()
returns text
language sql
stable
as $$
  select nullif(auth.jwt()->>'sub', '');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = public.current_user_id() and role = 'admin'
  );
$$;

create or replace function public.consume_mock_credit(p_user_id text)
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

create or replace function public.refund_mock_credit(p_user_id text)
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

create or replace function public.mark_trial_used(p_user_id text)
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
  student_id text,
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
  where m.user_id = public.current_user_id();
$$;

revoke all on function public.consume_mock_credit(text) from public, anon, authenticated;
revoke all on function public.refund_mock_credit(text) from public, anon, authenticated;
revoke all on function public.mark_trial_used(text) from public, anon, authenticated;
grant execute on function public.consume_mock_credit(text) to service_role;
grant execute on function public.refund_mock_credit(text) to service_role;
grant execute on function public.mark_trial_used(text) to service_role;
grant execute on function public.current_user_id() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.org_student_summaries() to authenticated;

create policy profiles_select on public.profiles
for select to authenticated
using (id = public.current_user_id() or public.is_admin());

create policy profiles_update on public.profiles
for update to authenticated
using (id = public.current_user_id() or public.is_admin())
with check (id = public.current_user_id() or public.is_admin());

create policy student_profiles_all on public.student_profiles
for all to authenticated
using (user_id = public.current_user_id())
with check (user_id = public.current_user_id());

create policy finance_owner on public.student_finance_private
for all to authenticated
using (user_id = public.current_user_id())
with check (user_id = public.current_user_id());

create policy org_select on public.organisations
for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.organisation_members m
    where m.org_id = organisations.id and m.user_id = public.current_user_id()
  )
);

create policy org_members_select on public.organisation_members
for select to authenticated
using (user_id = public.current_user_id() or public.is_admin());

create policy subscriptions_select on public.subscriptions
for select to authenticated
using (user_id = public.current_user_id() or public.is_admin());

create policy sessions_select on public.sessions
for select to authenticated
using (user_id = public.current_user_id() or public.is_admin());

create policy session_questions_select on public.session_questions
for select to authenticated
using (
  exists (
    select 1 from public.sessions s
    where s.id = session_questions.session_id
      and (s.user_id = public.current_user_id() or public.is_admin())
  )
);

create policy answers_select on public.answers
for select to authenticated
using (user_id = public.current_user_id());

create policy consent_select on public.consent_events
for select to authenticated
using (user_id = public.current_user_id());

create policy consent_insert on public.consent_events
for insert to authenticated
with check (user_id = public.current_user_id());

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    execute 'drop policy if exists recordings_insert on storage.objects';
    execute 'drop policy if exists recordings_select on storage.objects';
    execute 'drop policy if exists recordings_update on storage.objects';
    execute 'drop policy if exists recordings_delete on storage.objects';

    execute $policy$
      create policy recordings_insert on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'recordings'
        and (storage.foldername(name))[1] = public.current_user_id()
      )
    $policy$;

    execute $policy$
      create policy recordings_select on storage.objects
      for select to authenticated
      using (
        bucket_id = 'recordings'
        and (storage.foldername(name))[1] = public.current_user_id()
      )
    $policy$;

    execute $policy$
      create policy recordings_update on storage.objects
      for update to authenticated
      using (
        bucket_id = 'recordings'
        and (storage.foldername(name))[1] = public.current_user_id()
      )
    $policy$;

    execute $policy$
      create policy recordings_delete on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'recordings'
        and (storage.foldername(name))[1] = public.current_user_id()
      )
    $policy$;
  end if;
end $$;
