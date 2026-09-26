-- DUTYLOG AI / Supabase schema
create extension if not exists pgcrypto;

do $$ begin create type public.app_role as enum ('admin','joint_director','staff'); exception when duplicate_object then null; end $$;
do $$ begin create type public.report_status as enum ('working','holiday','leave'); exception when duplicate_object then null; end $$;

create table if not exists public.departments (id uuid primary key default gen_random_uuid(), name text not null unique, description text, created_at timestamptz not null default now());
create table if not exists public.positions (id uuid primary key default gen_random_uuid(), title text not null unique, level_no int not null default 1, created_at timestamptz not null default now());
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default 'Staff', email text, role public.app_role not null default 'staff',
 department_id uuid references public.departments(id) on delete set null,
 position_id uuid references public.positions(id) on delete set null,
 manager_id uuid references public.profiles(id) on delete set null,
 avatar_url text, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.reports (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 report_date date not null, status public.report_status not null default 'working', holiday_name text, leave_type text, leave_reason text,
 notes text, generated_report text, activities text[] default '{}', remarks text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 verified_at timestamptz, verified_by uuid references public.profiles(id) on delete set null, verification_scope text,
 unique(user_id, report_date)
);
create table if not exists public.period_verifications (
 id uuid primary key default gen_random_uuid(), verifier_id uuid not null references public.profiles(id) on delete restrict,
 scope text not null check(scope in ('daily','weekly','monthly')), start_date date not null, end_date date not null, verified_at timestamptz not null default now(), notes text
);

create index if not exists reports_user_date_idx on public.reports(user_id,report_date desc);
create index if not exists reports_verified_idx on public.reports(verified_at);

create or replace function public.is_role(r public.app_role) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role=r and active=true); $$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select public.is_role('admin'); $$;
create or replace function public.is_director() returns boolean language sql stable security definer set search_path=public as $$ select public.is_role('joint_director') or public.is_role('admin'); $$;

alter table public.departments enable row level security;
alter table public.positions enable row level security;
alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.period_verifications enable row level security;

drop policy if exists dep_read on public.departments; create policy dep_read on public.departments for select to authenticated using (true);
drop policy if exists dep_manage on public.departments; create policy dep_manage on public.departments for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists pos_read on public.positions; create policy pos_read on public.positions for select to authenticated using (true);
drop policy if exists pos_manage on public.positions; create policy pos_manage on public.positions for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists profile_self on public.profiles; create policy profile_self on public.profiles for select to authenticated using (id=auth.uid() or public.is_director());
drop policy if exists profile_admin_manage on public.profiles; create policy profile_admin_manage on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists reports_staff_select on public.reports; create policy reports_staff_select on public.reports for select to authenticated using (user_id=auth.uid() or public.is_director());
drop policy if exists reports_staff_insert on public.reports; create policy reports_staff_insert on public.reports for insert to authenticated with check (user_id=auth.uid() and not public.is_director());
drop policy if exists reports_staff_update on public.reports; create policy reports_staff_update on public.reports for update to authenticated using (user_id=auth.uid() and verified_at is null) with check (user_id=auth.uid() and verified_at is null);
drop policy if exists reports_admin_manage on public.reports; create policy reports_admin_manage on public.reports for all to authenticated using (public.is_admin() and verified_at is null) with check (public.is_admin());
drop policy if exists pv_read on public.period_verifications; create policy pv_read on public.period_verifications for select to authenticated using (public.is_director());
drop policy if exists pv_insert on public.period_verifications; create policy pv_insert on public.period_verifications for insert to authenticated with check (public.is_director() and verifier_id=auth.uid());

create or replace function public.lock_verified_reports() returns trigger language plpgsql security definer set search_path=public as $$ begin if old.verified_at is not null and (to_jsonb(new) - 'updated_at') <> (to_jsonb(old) - 'updated_at') then raise exception 'This report is verified and locked.'; end if; return new; end $$;
drop trigger if exists trg_lock_verified on public.reports; create trigger trg_lock_verified before update on public.reports for each row execute function public.lock_verified_reports();
drop trigger if exists trg_no_delete_verified on public.reports; create trigger trg_no_delete_verified before delete on public.reports for each row when (old.verified_at is not null) execute function public.lock_verified_reports();

create or replace function public.verify_report_period(p_scope text,p_start date,p_end date,p_notes text default null) returns integer language plpgsql security definer set search_path=public as $$ declare n integer; begin if not public.is_director() then raise exception 'Not authorized'; end if; insert into public.period_verifications(verifier_id,scope,start_date,end_date,notes) values(auth.uid(),p_scope,p_start,p_end,p_notes); update public.reports set verified_at=now(),verified_by=auth.uid(),verification_scope=p_scope,updated_at=now() where report_date between p_start and p_end and verified_at is null; get diagnostics n = row_count; return n; end $$;
revoke all on function public.verify_report_period(text,date,date,text) from public; grant execute on function public.verify_report_period(text,date,date,text) to authenticated;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id,full_name,email,avatar_url) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',new.email),new.email,new.raw_user_meta_data->>'avatar_url') on conflict(id) do nothing; return new; end $$;
drop trigger if exists on_auth_user_created on auth.users; create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Bootstrap the first administrator after your first Google login:
-- update public.profiles set role='admin', full_name='Muhammad Basith Adany' where email='YOUR_ADMIN_GOOGLE_EMAIL';
