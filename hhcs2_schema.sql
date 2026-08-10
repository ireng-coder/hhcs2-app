-- Run this in your existing Supabase project's SQL editor.
-- It only ADDS two new tables — it does not touch your participants
-- table or any other existing table/data.

-- IMPORTANT: check the data type of your existing participants.id column
-- (uuid or bigint/int8) and make sure "participant_id" below matches it
-- exactly, or the foreign key will fail to create.

create table if not exists progress_notes (
  id uuid primary key default gen_random_uuid(),
  participant_id bigint references participants(id) not null, -- change to uuid if your participants.id is uuid
  date date not null,
  time time not null default current_time,
  category text not null,
  note text not null,
  recorded_by text not null,
  created_at timestamptz default now()
);

create table if not exists incidents (
  id uuid primary key default gen_random_uuid(),
  participant_id bigint references participants(id) not null, -- change to uuid if your participants.id is uuid
  date date not null,
  time time not null,
  type text not null,
  severity text not null,
  description text not null,
  action_taken text,
  witnesses text,
  reported_to text,
  follow_up_required boolean default false,
  recorded_by text not null,
  created_at timestamptz default now()
);

alter table progress_notes enable row level security;
alter table incidents enable row level security;

-- Placeholder permissive policies so the app works immediately.
-- Replace these with the same RLS pattern you use on your other
-- HHCS tables (e.g. restrict by authenticated staff role) once
-- you've confirmed the app works end to end.
create policy "Allow all on progress_notes" on progress_notes
  for all using (true) with check (true);

create policy "Allow all on incidents" on incidents
  for all using (true) with check (true);
