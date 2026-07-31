-- First-party, privacy-conscious product analytics for Unwrapt.
-- Browsers may insert sanitized events but can never read the event stream.

create table if not exists public.product_analytics_events (
  id bigint generated always as identity primary key,
  event_id text not null unique check (length(event_id) between 8 and 80),
  received_at timestamptz not null default now(),
  client_created_at timestamptz not null,
  event_name text not null check (
    length(event_name) between 1 and 80
    and event_name ~ '^[a-z0-9_]+$'
  ),
  anonymous_id text not null check (length(anonymous_id) between 8 and 80),
  session_id text not null check (length(session_id) between 8 and 80),
  user_id uuid references auth.users(id) on delete set null,
  page_path text not null check (
    length(page_path) between 1 and 500
    and page_path like '/%'
    and position('?' in page_path) = 0
    and position('#' in page_path) = 0
  ),
  referrer_host text check (
    referrer_host is null
    or (
      length(referrer_host) between 1 and 253
      and referrer_host !~ '[/@]'
    )
  ),
  experiment_key text check (
    experiment_key is null or length(experiment_key) between 1 and 80
  ),
  variant text check (variant is null or length(variant) between 1 and 80),
  properties jsonb not null default '{}'::jsonb check (
    jsonb_typeof(properties) = 'object'
    and pg_column_size(properties) <= 8192
  ),
  check (
    (experiment_key is null and variant is null)
    or (experiment_key is not null and variant is not null)
  )
);

create index if not exists product_analytics_events_received_at_idx
  on public.product_analytics_events (received_at desc);
create index if not exists product_analytics_events_user_id_idx
  on public.product_analytics_events (user_id)
  where user_id is not null;
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
    or user_id = (select auth.uid())
  );

revoke all on public.product_analytics_events from public, anon, authenticated;
grant insert on public.product_analytics_events to anon, authenticated;
grant usage, select on sequence public.product_analytics_events_id_seq
  to anon, authenticated;

create or replace function public.get_product_analytics_summary(
  p_start timestamptz,
  p_end timestamptz
)
returns jsonb
language sql
security definer
set search_path = ''
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
      count(distinct anonymous_id) filter (
        where event_name = 'landing_cta_clicked'
      ) as landing_cta_visitors,
      count(distinct anonymous_id) filter (
        where event_name = 'auth_started'
      ) as auth_start_visitors,
      count(distinct anonymous_id) filter (
        where event_name = 'onboarding_completed'
      ) as onboarding_completion_visitors,
      max(received_at) as last_event_received_at,
      round(avg(greatest(0, extract(epoch from received_at - client_created_at)))::numeric, 3)
        as average_delivery_lag_seconds
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
        jsonb_build_object(
          'path', page_path,
          'views', page_views,
          'visitors', visitors
        )
        order by page_views desc
      ),
      '[]'::jsonb
    ) as value
    from (
      select
        page_path,
        count(*) as page_views,
        count(distinct anonymous_id) as visitors
      from scoped
      where event_name = 'page_viewed'
      group by page_path
      order by page_views desc
      limit 20
    ) pages
  ),
  referrer_counts as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object('host', referrer_host, 'visitors', visitors)
        order by visitors desc
      ),
      '[]'::jsonb
    ) as value
    from (
      select referrer_host, count(distinct anonymous_id) as visitors
      from scoped
      where referrer_host is not null
      group by referrer_host
      order by visitors desc
      limit 20
    ) referrers
  ),
  onboarding_steps as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object('step', step, 'visitors', visitors)
        order by visitors desc, step
      ),
      '[]'::jsonb
    ) as value
    from (
      select
        properties ->> 'step' as step,
        count(distinct anonymous_id) as visitors
      from scoped
      where event_name = 'onboarding_step_viewed'
        and properties ? 'step'
      group by properties ->> 'step'
    ) steps
  ),
  daily_series as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'date', day,
          'visitors', visitors,
          'sessions', sessions,
          'page_views', page_views,
          'cta_visitors', cta_visitors,
          'auth_start_visitors', auth_start_visitors,
          'onboarding_completion_visitors', onboarding_completion_visitors
        )
        order by day
      ),
      '[]'::jsonb
    ) as value
    from (
      select
        (received_at at time zone 'America/Chicago')::date as day,
        count(distinct anonymous_id) as visitors,
        count(distinct session_id) as sessions,
        count(*) filter (where event_name = 'page_viewed') as page_views,
        count(distinct anonymous_id) filter (
          where event_name = 'landing_cta_clicked'
        ) as cta_visitors,
        count(distinct anonymous_id) filter (
          where event_name = 'auth_started'
        ) as auth_start_visitors,
        count(distinct anonymous_id) filter (
          where event_name = 'onboarding_completed'
        ) as onboarding_completion_visitors
      from scoped
      group by (received_at at time zone 'America/Chicago')::date
    ) days
  ),
  experiments as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'experiment_key', experiment_key,
          'variant', variant,
          'exposed_visitors', exposed_visitors,
          'cta_visitors', cta_visitors,
          'auth_start_visitors', auth_start_visitors,
          'onboarding_completion_visitors', onboarding_completion_visitors,
          'auth_start_rate', round(
            auth_start_visitors::numeric / nullif(exposed_visitors, 0),
            4
          ),
          'onboarding_completion_rate', round(
            onboarding_completion_visitors::numeric / nullif(exposed_visitors, 0),
            4
          )
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
        ) as exposed_visitors,
        count(distinct anonymous_id) filter (
          where event_name = 'landing_cta_clicked'
        ) as cta_visitors,
        count(distinct anonymous_id) filter (
          where event_name = 'auth_started'
        ) as auth_start_visitors,
        count(distinct anonymous_id) filter (
          where event_name = 'onboarding_completed'
        ) as onboarding_completion_visitors
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
    'landing_cta_visitors', totals.landing_cta_visitors,
    'auth_start_visitors', totals.auth_start_visitors,
    'onboarding_completion_visitors', totals.onboarding_completion_visitors,
    'cta_rate', round(
      totals.landing_cta_visitors::numeric / nullif(totals.unique_visitors, 0),
      4
    ),
    'auth_start_rate', round(
      totals.auth_start_visitors::numeric / nullif(totals.landing_cta_visitors, 0),
      4
    ),
    'onboarding_completion_rate', round(
      totals.onboarding_completion_visitors::numeric / nullif(totals.auth_start_visitors, 0),
      4
    ),
    'last_event_received_at', totals.last_event_received_at,
    'average_delivery_lag_seconds', totals.average_delivery_lag_seconds,
    'events', event_counts.value,
    'top_pages', page_counts.value,
    'top_referrers', referrer_counts.value,
    'onboarding_steps', onboarding_steps.value,
    'daily', daily_series.value,
    'experiments', experiments.value
  )
  from totals, event_counts, page_counts, referrer_counts,
    onboarding_steps, daily_series, experiments;
$$;

revoke all on function public.get_product_analytics_summary(timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.get_product_analytics_summary(timestamptz, timestamptz)
  to service_role;

comment on table public.product_analytics_events is
  'First-party behavioral events. Never store names, emails, addresses, gift details, OAuth values, or other PII.';
comment on function public.get_product_analytics_summary(timestamptz, timestamptz) is
  'Service-role-only aggregate product analytics. Returns no raw visitor or user identifiers.';
