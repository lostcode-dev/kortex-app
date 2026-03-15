alter table public.user_preferences
  add column if not exists timezone text not null default 'UTC';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notification_preferences'
      and column_name = 'channel_desktop'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notification_preferences'
      and column_name = 'channel_web_push'
  ) then
    alter table public.notification_preferences
      rename column channel_desktop to channel_web_push;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notification_preferences'
      and column_name = 'digest_weekly'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notification_preferences'
      and column_name = 'weekly_digest'
  ) then
    alter table public.notification_preferences
      rename column digest_weekly to weekly_digest;
  end if;
end $$;

alter table public.notification_preferences
  add column if not exists channel_in_app boolean not null default true,
  add column if not exists channel_mobile_push boolean not null default false,
  add column if not exists habit_reminders boolean not null default true,
  add column if not exists web_push_permission text not null default 'default',
  add column if not exists mobile_push_permission text not null default 'default';

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.conname = 'notification_preferences_web_push_permission_check'
      and n.nspname = 'public'
      and t.relname = 'notification_preferences'
  ) then
    alter table public.notification_preferences
      add constraint notification_preferences_web_push_permission_check
      check (web_push_permission in ('default', 'granted', 'denied', 'unsupported'));
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.conname = 'notification_preferences_mobile_push_permission_check'
      and n.nspname = 'public'
      and t.relname = 'notification_preferences'
  ) then
    alter table public.notification_preferences
      add constraint notification_preferences_mobile_push_permission_check
      check (mobile_push_permission in ('default', 'granted', 'denied', 'unsupported'));
  end if;
end $$;

update public.notification_preferences
set
  channel_in_app = coalesce(channel_in_app, true),
  habit_reminders = coalesce(habit_reminders, true),
  web_push_permission = coalesce(web_push_permission, 'default'),
  mobile_push_permission = coalesce(mobile_push_permission, 'default')
where channel_in_app is null
   or habit_reminders is null
   or web_push_permission is null
   or mobile_push_permission is null;

alter table public.notifications
  add column if not exists channels text[] not null default array['in_app']::text[],
  add column if not exists category text not null default 'general',
  add column if not exists source text not null default 'internal',
  add column if not exists external_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.conname = 'notifications_channels_check'
      and n.nspname = 'public'
      and t.relname = 'notifications'
  ) then
    alter table public.notifications
      add constraint notifications_channels_check
      check (
        cardinality(channels) > 0
        and channels <@ array['in_app', 'email', 'web_push', 'mobile_push']::text[]
      );
  end if;
end $$;

create unique index if not exists notifications_external_id_idx
  on public.notifications(external_id)
  where external_id is not null;

create table if not exists public.notification_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete cascade,
  provider text not null default 'onesignal',
  device_key text not null,
  channel text not null,
  platform text not null,
  app_context text not null,
  onesignal_subscription_id text null,
  onesignal_user_id text null,
  external_user_id text null,
  token text null,
  permission text not null default 'default',
  opted_in boolean not null default false,
  sdk_version text null,
  app_version text null,
  device_model text null,
  language text null,
  timezone text null,
  metadata jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.conname = 'notification_push_subscriptions_provider_check'
      and n.nspname = 'public'
      and t.relname = 'notification_push_subscriptions'
  ) then
    alter table public.notification_push_subscriptions
      add constraint notification_push_subscriptions_provider_check
      check (provider in ('onesignal'));
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.conname = 'notification_push_subscriptions_channel_check'
      and n.nspname = 'public'
      and t.relname = 'notification_push_subscriptions'
  ) then
    alter table public.notification_push_subscriptions
      add constraint notification_push_subscriptions_channel_check
      check (channel in ('web_push', 'mobile_push'));
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.conname = 'notification_push_subscriptions_platform_check'
      and n.nspname = 'public'
      and t.relname = 'notification_push_subscriptions'
  ) then
    alter table public.notification_push_subscriptions
      add constraint notification_push_subscriptions_platform_check
      check (platform in ('web', 'ios', 'android'));
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.conname = 'notification_push_subscriptions_app_context_check'
      and n.nspname = 'public'
      and t.relname = 'notification_push_subscriptions'
  ) then
    alter table public.notification_push_subscriptions
      add constraint notification_push_subscriptions_app_context_check
      check (app_context in ('browser', 'pwa', 'native'));
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.conname = 'notification_push_subscriptions_permission_check'
      and n.nspname = 'public'
      and t.relname = 'notification_push_subscriptions'
  ) then
    alter table public.notification_push_subscriptions
      add constraint notification_push_subscriptions_permission_check
      check (permission in ('default', 'granted', 'denied', 'unsupported'));
  end if;
end $$;

alter table public.notification_push_subscriptions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_push_subscriptions'
      and policyname = 'Users can view own push subscriptions'
  ) then
    create policy "Users can view own push subscriptions"
      on public.notification_push_subscriptions
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_push_subscriptions'
      and policyname = 'Users can insert own push subscriptions'
  ) then
    create policy "Users can insert own push subscriptions"
      on public.notification_push_subscriptions
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_push_subscriptions'
      and policyname = 'Users can update own push subscriptions'
  ) then
    create policy "Users can update own push subscriptions"
      on public.notification_push_subscriptions
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

drop trigger if exists set_notification_push_subscriptions_updated_at on public.notification_push_subscriptions;

create trigger set_notification_push_subscriptions_updated_at
  before update on public.notification_push_subscriptions
  for each row
  execute function public.set_updated_at();

create unique index if not exists notification_push_subscriptions_provider_device_key_idx
  on public.notification_push_subscriptions(provider, device_key);

create unique index if not exists notification_push_subscriptions_onesignal_subscription_id_idx
  on public.notification_push_subscriptions(onesignal_subscription_id)
  where onesignal_subscription_id is not null;

create index if not exists notification_push_subscriptions_user_id_last_seen_idx
  on public.notification_push_subscriptions(user_id, last_seen_at desc);
