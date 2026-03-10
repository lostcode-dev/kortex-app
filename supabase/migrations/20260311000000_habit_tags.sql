-- Habit tags table
create table if not exists habit_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text default 'gray',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name)
);

-- Habit-tag link table
create table if not exists habit_tag_links (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits(id) on delete cascade,
  tag_id uuid not null references habit_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(habit_id, tag_id)
);

-- RLS policies
alter table habit_tags enable row level security;
alter table habit_tag_links enable row level security;

create policy "habit_tags_select" on habit_tags for select using (user_id = auth.uid());
create policy "habit_tags_insert" on habit_tags for insert with check (user_id = auth.uid());
create policy "habit_tags_update" on habit_tags for update using (user_id = auth.uid());
create policy "habit_tags_delete" on habit_tags for delete using (user_id = auth.uid());

create policy "habit_tag_links_select" on habit_tag_links for select using (
  exists (select 1 from habits where habits.id = habit_tag_links.habit_id and habits.user_id = auth.uid())
);
create policy "habit_tag_links_insert" on habit_tag_links for insert with check (
  exists (select 1 from habits where habits.id = habit_tag_links.habit_id and habits.user_id = auth.uid())
);
create policy "habit_tag_links_delete" on habit_tag_links for delete using (
  exists (select 1 from habits where habits.id = habit_tag_links.habit_id and habits.user_id = auth.uid())
);

-- Indexes
create index if not exists idx_habit_tags_user_id on habit_tags(user_id);
create index if not exists idx_habit_tag_links_habit_id on habit_tag_links(habit_id);
create index if not exists idx_habit_tag_links_tag_id on habit_tag_links(tag_id);
