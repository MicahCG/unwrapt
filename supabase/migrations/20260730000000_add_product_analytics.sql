-- First-party, privacy-conscious product analytics for Unwrapt.
-- The browser may insert events, but it can never read the event stream.

create table if not exists public.product_analytics_events (
  id bigint generated always as identity primary key,
  event_id text not null unique,
  received_at timestamptz not null default now(),
  event_name text not null check (
    length(event_name) between 1 and 80
    and event_name ~ '^[a-z0-9_]+$'
  ),
  anonymous_id text not null check (length(anonymous_id) between 8 and 80),
  session_id text not null check (length(session_id) between 8 and 80),
  user_id uuid references auth.users(id) on delete set null,
  page_path text,
  referrer_host text,
  experiment_key text,
  variant text,
  properties jsonb not null default '{}'::jsonb check (
    jsonb_typeof(properties) = 'object'
    and pg_column_size(properties) <= 8192
  )
);

create index if not exists product_analytics_events_received_at_idx
  on public.product_analytics_events (received_at desc);
create index if not exists product_analytics_events_event_name_idx
  on public.product_analytics_events (event_name, received_at desc);
create index if not exists product_analytics_events_experiment_idx
  on public.product_analytics_events (experiment_key, variant, received_at desc)
  where experiment_key is not null;

alter table public.product_analytics_events enable row level security;

drop policy if exists "Visitors can record product analytics" on public.product_analytics_events;
create policy "Visitors can record product analytics"
  on public.product_analytics_events
  for insert
  to anon, authenticated
  with check (
    user_id is null
    or user_id = auth.uid()
  );

revoke all on public.product_analytics_events from anon, authenticated;
grant insert on public.product_analytics_events to anon, authenticated;
grant usage, select on sequence public.product_analytics_events_id_seq to anon, authenticated;

create or replace function public.get_product_analytics_summary(
  p_start timestamptz,
  p_end timestamptz
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with scoped as (
    select *
    from public.product_analytics_events
    where received_at >= p_start
      and received_at < p_end
  ),
  totals as (
    select
      count(distinct anonymous_id) as unique_visitors,
      count(distinct session_id) as sessions,
      count(*) filter (where event_name = 'page_viewed') as page_views,
      count(*) filter (where event_name = 'landing_cta_clicked') as landing_cta_clicks,
      count(*) filter (where event_name = 'auth_started') as auth_starts,
      count(*) filter (where event_name = 'onboarding_completed') as onboarding_completions
    from scoped
  ),
  event_counts as (
    select coalesce(
      jsonb_object_agg(event_name, event_count order by event_name),
      '{}'::jsonb
    ) as value
    from (
      select event_name, count(*) as event_count
      from scoped
      group by event_name
    ) events
  ),
  page_counts as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object('path', page_path, 'views', page_views)
        order by page_views desc
      ),
      '[]'::jsonb
    ) as value
    from (
      select page_path, count(*) as page_views
      from scoped
      where event_name = 'page_viewed'
      group by page_path
      order by page_views desc
      limit 20
    ) pages
  ),
  experiments as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'experiment_key', experiment_key,
          'variant', variant,
          'visitors', visitors,
          'cta_clicks', cta_clicks,
          'auth_starts', auth_starts
        )
        order by experiment_key, variant
      ),
      '[]'::jsonb
    ) as value
    from (
      select
        experiment_key,
        variant,
        count(distinct anonymous_id) filter (
          where event_name = 'experiment_exposed'
        ) as visitors,
        count(*) filter (
          where event_name = 'landing_cta_clicked'
        ) as cta_clicks,
        count(*) filter (
          where event_name = 'auth_started'
        ) as auth_starts
      from scoped
      where experiment_key is not null
      group by experiment_key, variant
    ) experiment_rows
  )
  select jsonb_build_object(
    'start', p_start,
    'end', p_end,
    'unique_visitors', totals.unique_visitors,
    'sessions', totals.sessions,
    'page_views', totals.page_views,
    'landing_cta_clicks', totals.landing_cta_clicks,
    'auth_starts', totals.auth_starts,
    'onboarding_completions', totals.onboarding_completions,
    'events', event_counts.value,
    'top_pages', page_counts.value,
    'experiments', experiments.value
  )
  from totals, event_counts, page_counts, experiments;
$$;

revoke all on function public.get_product_analytics_summary(timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.get_product_analytics_summary(timestamptz, timestamptz)
  to service_role;

comment on table public.product_analytics_events is
  'First-party behavioral events. Do not store names, emails, addresses, gift details, or other PII.';
