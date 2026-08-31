-- ============================================================================
-- Celebrio - Supabase schema
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per authenticated user, extends auth.users
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  accent_color text not null default '#6366f1',
  notify_email boolean not null default true,
  notify_whatsapp boolean not null default true,
  notify_in_app boolean not null default true,
  whatsapp_number text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- contacts: the people whose birthdays are tracked
-- ---------------------------------------------------------------------------
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  relationship text, -- e.g. Friend, Mother, Colleague, Spouse, Sibling, Client...
  date_of_birth date, -- nullable: may be unknown until user fills it in
  anniversary_date date, -- optional: wedding/work/other anniversary for this contact
  email text,
  phone text, -- E.164 format recommended, e.g. +9715xxxxxxx
  notes text,
  photo_url text,
  source text not null default 'manual' check (source in ('manual', 'csv', 'xlsx')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contacts_user_id_idx on public.contacts(user_id);
create index if not exists contacts_dob_idx on public.contacts(date_of_birth);

-- ---------------------------------------------------------------------------
-- greeting_templates: reusable card designs (seeded with defaults below)
-- ---------------------------------------------------------------------------
create table if not exists public.greeting_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  palette jsonb not null, -- { "from": "#...", "to": "#...", "accent": "#...", "text": "#..." }
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- occasion_types: the catalog of non-birthday occasions the app knows about
-- (Valentine's Day, Diwali, Halloween, ...). Seeded below; users opt in/out
-- per occasion via user_occasion_subscriptions.
-- ---------------------------------------------------------------------------
create table if not exists public.occasion_types (
  id uuid primary key default gen_random_uuid(),
  key text not null unique, -- stable slug, e.g. 'diwali'
  name text not null, -- display name, e.g. "Diwali"
  emoji text not null default '🎉',
  category text not null default 'general', -- romantic | family | cultural | seasonal | general
  card_icon text not null default 'sparkleburst', -- which vector icon the card generator draws
  is_variable_date boolean not null default false, -- true for lunar/"Nth weekday" holidays
  default_enabled boolean not null default false, -- whether new users are subscribed by default
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- occasion_dates: the calendar date for a given occasion in a given year.
-- Fixed-date holidays (Valentine's Day, Halloween, Christmas, New Year) are
-- exact. Variable-date ones (Diwali, Holi, Eid, Mother's/Father's Day,
-- Thanksgiving) are best-effort estimates seeded below — double check and
-- update these yearly, especially the lunar-calendar ones, since this app
-- cannot calculate them automatically.
-- ---------------------------------------------------------------------------
create table if not exists public.occasion_dates (
  id uuid primary key default gen_random_uuid(),
  occasion_type_id uuid not null references public.occasion_types(id) on delete cascade,
  year int not null,
  date date not null,
  unique (occasion_type_id, year)
);

create index if not exists occasion_dates_date_idx on public.occasion_dates(date);

-- ---------------------------------------------------------------------------
-- user_occasion_subscriptions: which occasions a user wants reminders for
-- ---------------------------------------------------------------------------
create table if not exists public.user_occasion_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occasion_type_id uuid not null references public.occasion_types(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, occasion_type_id)
);

-- ---------------------------------------------------------------------------
-- occasion_prompts: "Diwali is in 2 days — send greetings?" — one per user
-- per occasion per year. Choosing contacts from this prompt bulk-creates
-- approvals (see app/api/occasions/prompts/[id]/generate).
-- ---------------------------------------------------------------------------
create table if not exists public.occasion_prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occasion_type_id uuid not null references public.occasion_types(id) on delete cascade,
  occasion_date date not null,
  status text not null default 'pending' check (status in ('pending', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (user_id, occasion_type_id, occasion_date)
);

create index if not exists occasion_prompts_user_id_idx on public.occasion_prompts(user_id);

-- ---------------------------------------------------------------------------
-- approvals: a draft greeting waiting for the user's review before sending
-- ---------------------------------------------------------------------------
create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  template_id uuid references public.greeting_templates(id),
  occasion_type text not null default 'birthday' check (occasion_type in ('birthday', 'anniversary', 'holiday')),
  occasion_type_id uuid references public.occasion_types(id), -- set when occasion_type = 'holiday'
  occasion_label text, -- display name, e.g. "Diwali" — null defaults to "Birthday"/"Anniversary" in the UI
  occasion_date date not null, -- the date this approval is for
  message text not null,
  channels text[] not null default '{}', -- subset of {'email','whatsapp','sms'}
  card_image_url text, -- generated PNG in Supabase storage
  status text not null default 'pending' check (status in ('pending', 'approved', 'edited', 'rejected', 'sent', 'failed')),
  send_at timestamptz not null, -- when the send job should fire (the occasion date, local morning)
  sent_at timestamptz,
  send_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists approvals_user_id_idx on public.approvals(user_id);
create index if not exists approvals_status_idx on public.approvals(status);
create index if not exists approvals_send_at_idx on public.approvals(send_at);

-- A contact can have at most one approval per (date, occasion type, holiday) —
-- e.g. one birthday approval and one Diwali approval can coexist even if
-- their dates happen to collide.
create unique index if not exists approvals_unique_occasion
  on public.approvals (contact_id, occasion_date, occasion_type, coalesce(occasion_type_id, '00000000-0000-0000-0000-000000000000'));

-- ---------------------------------------------------------------------------
-- sign_ins: login audit log powering Settings > Admin
-- ---------------------------------------------------------------------------
create table if not exists public.sign_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  signed_in_at timestamptz not null default now(),
  ip_address text,
  city text,
  region text,
  country text,
  user_agent text,
  device_type text -- 'mobile' | 'desktop' | 'tablet'
);

create index if not exists sign_ins_user_id_idx on public.sign_ins(user_id);
create index if not exists sign_ins_signed_in_at_idx on public.sign_ins(signed_in_at);

-- ---------------------------------------------------------------------------
-- usage_events: lightweight page/feature usage log powering "app usage %"
-- ---------------------------------------------------------------------------
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null, -- 'page_view' | 'contact_added' | 'approval_reviewed' | 'aria_message' ...
  path text,
  occurred_at timestamptz not null default now()
);

create index if not exists usage_events_user_id_idx on public.usage_events(user_id);
create index if not exists usage_events_occurred_at_idx on public.usage_events(occurred_at);

-- ---------------------------------------------------------------------------
-- aria_messages: chat history for the Aria assistant
-- ---------------------------------------------------------------------------
create table if not exists public.aria_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists aria_messages_user_id_idx on public.aria_messages(user_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.contacts;
create trigger set_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.approvals;
create trigger set_updated_at before update on public.approvals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- auto-create a profile row whenever a new auth user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security: every user only ever sees their own rows.
-- Admin visibility (sign_ins, usage_events across all users) is done via the
-- Supabase service-role key from server-only API routes, which bypasses RLS,
-- gated by profiles.is_admin — never exposed to the browser client.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.approvals enable row level security;
alter table public.sign_ins enable row level security;
alter table public.usage_events enable row level security;
alter table public.aria_messages enable row level security;
alter table public.greeting_templates enable row level security;
alter table public.occasion_types enable row level security;
alter table public.occasion_dates enable row level security;
alter table public.user_occasion_subscriptions enable row level security;
alter table public.occasion_prompts enable row level security;

create policy "profiles: read own" on public.profiles for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id);

create policy "contacts: crud own" on public.contacts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "approvals: crud own" on public.approvals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "sign_ins: read own" on public.sign_ins for select using (auth.uid() = user_id);
create policy "sign_ins: insert own" on public.sign_ins for insert with check (auth.uid() = user_id);

create policy "usage_events: read own" on public.usage_events for select using (auth.uid() = user_id);
create policy "usage_events: insert own" on public.usage_events for insert with check (auth.uid() = user_id);

create policy "aria_messages: crud own" on public.aria_messages for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "greeting_templates: read all" on public.greeting_templates for select using (true);

create policy "occasion_types: read all" on public.occasion_types for select using (true);
create policy "occasion_dates: read all" on public.occasion_dates for select using (true);

create policy "user_occasion_subscriptions: crud own" on public.user_occasion_subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "occasion_prompts: crud own" on public.occasion_prompts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage bucket for generated greeting card images
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('greeting-cards', 'greeting-cards', true)
on conflict (id) do nothing;

create policy "greeting-cards: public read"
  on storage.objects for select
  using (bucket_id = 'greeting-cards');

create policy "greeting-cards: service role write"
  on storage.objects for insert
  with check (bucket_id = 'greeting-cards');

-- ---------------------------------------------------------------------------
-- Seed a few default card templates
-- ---------------------------------------------------------------------------
insert into public.greeting_templates (name, description, palette, is_default)
values
  ('Sunset Confetti', 'Warm gradient with confetti dots', '{"from":"#FF6B6B","to":"#FFD93D","accent":"#ffffff","text":"#3b1f1f"}', true),
  ('Ocean Breeze', 'Cool blue-to-teal gradient', '{"from":"#4facfe","to":"#00f2fe","accent":"#ffffff","text":"#022c3a"}', false),
  ('Berry Bliss', 'Playful pink-to-purple gradient', '{"from":"#f857a6","to":"#ff5858","accent":"#ffffff","text":"#3a0a24"}', false),
  ('Midnight Gold', 'Elegant dark gradient with gold text', '{"from":"#0f2027","to":"#2c5364","accent":"#f4c95d","text":"#f4c95d"}', false)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Seed the occasion catalog (beyond birthdays/anniversaries, which are
-- per-contact fields rather than rows here).
-- ---------------------------------------------------------------------------
insert into public.occasion_types (key, name, emoji, category, card_icon, is_variable_date, default_enabled)
values
  ('valentines_day', 'Valentine''s Day', '💘', 'romantic', 'heart', false, false),
  ('mothers_day', 'Mother''s Day', '💐', 'family', 'heart', true, false),
  ('fathers_day', 'Father''s Day', '🎁', 'family', 'gift', true, false),
  ('friendship_day', 'Friendship Day', '🤝', 'general', 'heart', true, false),
  ('halloween', 'Halloween', '🎃', 'seasonal', 'pumpkin', false, false),
  ('diwali', 'Diwali', '🪔', 'cultural', 'diya', true, false),
  ('holi', 'Holi', '🎨', 'cultural', 'splash', true, false),
  ('eid_al_fitr', 'Eid al-Fitr', '🌙', 'cultural', 'moon', true, false),
  ('eid_al_adha', 'Eid al-Adha', '🕌', 'cultural', 'moon', true, false),
  ('thanksgiving', 'Thanksgiving', '🦃', 'cultural', 'gift', true, false),
  ('christmas', 'Christmas', '🎄', 'cultural', 'tree', false, false),
  ('new_year', 'New Year''s Day', '🎆', 'general', 'sparkleburst', false, false)
on conflict (key) do nothing;

-- Fixed-date occasions (exact, every year).
insert into public.occasion_dates (occasion_type_id, year, date)
select id, y.year, make_date(y.year, month, day) from (
  select 'valentines_day' as key, 2 as month, 14 as day
  union all select 'halloween', 10, 31
  union all select 'christmas', 12, 25
  union all select 'new_year', 1, 1
) f
join public.occasion_types ot on ot.key = f.key
cross join (values (2026), (2027)) as y(year)
on conflict (occasion_type_id, year) do nothing;

-- Variable-date occasions — BEST-EFFORT ESTIMATES for 2026 only.
-- Please verify against a reliable calendar and correct if needed, and add
-- 2027+ rows closer to the time — this app has no way to calculate these
-- automatically (lunar calendars, "Nth weekday of month" rules, etc.).
insert into public.occasion_dates (occasion_type_id, year, date)
select ot.id, 2026, v.date::date from (
  values
    ('mothers_day', '2026-05-10'),   -- 2nd Sunday of May
    ('fathers_day', '2026-06-21'),   -- 3rd Sunday of June
    ('friendship_day', '2026-08-02'), -- 1st Sunday of August
    ('thanksgiving', '2026-11-26'),  -- 4th Thursday of November (US)
    ('diwali', '2026-11-08'),        -- lunar — verify
    ('holi', '2026-03-04'),          -- lunar — verify
    ('eid_al_fitr', '2026-03-20'),   -- lunar — verify
    ('eid_al_adha', '2026-05-27')    -- lunar — verify
) as v(key, date)
join public.occasion_types ot on ot.key = v.key
on conflict (occasion_type_id, year) do nothing;
