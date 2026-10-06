create or replace function public.normalize_arabic_name(p_name text)
returns text
language sql
immutable
strict
as $$
  select translate(
    lower(regexp_replace(trim(normalize(p_name, NFKC)), '\s+', ' ', 'g')),
    'أإآٱءؤئة',
    'اااااويه'
  );
$$;

create table if not exists public.registrants (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 1 and 120),
  normalized_name text generated always as (public.normalize_arabic_name(full_name)) stored,
  phone text not null check (phone ~ '^[0-9]{5,20}$'),
  football boolean not null,
  volleyball boolean not null,
  leader boolean not null,
  created_at timestamptz not null default now(),
  constraint registrants_at_least_one_sport check (football or volleyball),
  constraint registrants_normalized_name_unique unique (normalized_name)
);

create table if not exists public.admin_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username = lower(username) and username ~ '^[a-z0-9_.-]{3,64}$'),
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.rate_limits (
  key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0)
);

alter table public.registrants enable row level security;
alter table public.admin_accounts enable row level security;
alter table public.rate_limits enable row level security;

revoke all on public.registrants, public.admin_accounts, public.rate_limits from anon, authenticated;
grant all on public.registrants, public.admin_accounts, public.rate_limits to service_role;

create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  attempts integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate limit parameters';
  end if;

  insert into public.rate_limits as current_limit (key, window_started_at, request_count)
  values (p_key, clock_timestamp(), 1)
  on conflict (key) do update
    set window_started_at = case
          when current_limit.window_started_at <= clock_timestamp() - make_interval(secs => p_window_seconds)
            then clock_timestamp()
          else current_limit.window_started_at
        end,
        request_count = case
          when current_limit.window_started_at <= clock_timestamp() - make_interval(secs => p_window_seconds)
            then 1
          else current_limit.request_count + 1
        end
  returning request_count into attempts;

  return attempts <= p_limit;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
