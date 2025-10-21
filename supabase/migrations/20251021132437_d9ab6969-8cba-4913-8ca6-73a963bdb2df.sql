-- Add missing columns to existing profiles table
alter table public.profiles 
add column if not exists full_name text,
add column if not exists avatar_url text;

-- Update existing handle_new_user function
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id, 
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$;

-- Create role enum if not exists
do $$ begin
  create type public.app_role as enum ('admin', 'member', 'guest');
exception
  when duplicate_object then null;
end $$;

-- Create user_roles table
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamp with time zone default now(),
  unique (user_id, role)
);

-- Enable RLS
alter table public.user_roles enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view their own roles" on public.user_roles;
drop policy if exists "Admins can manage all roles" on public.user_roles;

-- Security definer function to check roles
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- RLS Policies
create policy "Users can view their own roles"
  on public.user_roles for select
  using (auth.uid() = user_id);

create policy "Admins can manage all roles"
  on public.user_roles for all
  using (public.has_role(auth.uid(), 'admin'));

-- Add owner_id to existing kanban_cards table
alter table public.kanban_cards 
add column if not exists owner_id uuid references auth.users(id) on delete cascade;

-- Create board_members table for sharing
create table if not exists public.board_members (
  id uuid primary key default gen_random_uuid(),
  board_name text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text check (role in ('owner', 'editor', 'viewer')) not null,
  created_at timestamp with time zone default now(),
  unique (board_name, user_id)
);

-- Enable RLS
alter table public.board_members enable row level security;

-- Drop existing policies
drop policy if exists "Users can view boards they're members of" on public.board_members;
drop policy if exists "Board owners can manage members" on public.board_members;

-- RLS Policies for board_members
create policy "Users can view boards they're members of"
  on public.board_members for select
  using (auth.uid() = user_id);

create policy "Board owners can manage members"
  on public.board_members for all
  using (
    exists (
      select 1 from public.board_members bm
      where bm.board_name = board_members.board_name
        and bm.user_id = auth.uid()
        and bm.role = 'owner'
    )
  );

-- Update kanban_cards RLS policies
drop policy if exists "Public can read kanban cards" on public.kanban_cards;
drop policy if exists "Anyone can create kanban cards" on public.kanban_cards;
drop policy if exists "Anyone can update kanban cards" on public.kanban_cards;
drop policy if exists "Anyone can delete kanban cards" on public.kanban_cards;

create policy "Users can view cards in their boards"
  on public.kanban_cards for select
  using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.board_members
      where board_members.board_name = kanban_cards.project_name
        and board_members.user_id = auth.uid()
    )
  );

create policy "Users can insert cards in their boards"
  on public.kanban_cards for insert
  with check (auth.uid() = owner_id);

create policy "Users can update cards they own or have editor access"
  on public.kanban_cards for update
  using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.board_members
      where board_members.board_name = kanban_cards.project_name
        and board_members.user_id = auth.uid()
        and board_members.role in ('owner', 'editor')
    )
  );

create policy "Users can delete cards they own"
  on public.kanban_cards for delete
  using (auth.uid() = owner_id);

-- Create chat_messages table
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  board_name text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  message_type text check (message_type in ('text', 'audio', 'video', 'file')) not null default 'text',
  content text,
  file_url text,
  file_name text,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.chat_messages enable row level security;

-- Enable realtime
alter publication supabase_realtime add table chat_messages;
alter table chat_messages replica identity full;

-- Drop existing policies
drop policy if exists "Users can view messages in their boards" on public.chat_messages;
drop policy if exists "Users can insert messages in their boards" on public.chat_messages;

-- RLS Policies
create policy "Users can view messages in their boards"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.board_members
      where board_members.board_name = chat_messages.board_name
        and board_members.user_id = auth.uid()
    )
    or exists (
      select 1 from public.kanban_cards
      where kanban_cards.project_name = chat_messages.board_name
        and kanban_cards.owner_id = auth.uid()
    )
  );

create policy "Users can insert messages in their boards"
  on public.chat_messages for insert
  with check (
    auth.uid() = user_id
    and (
      exists (
        select 1 from public.board_members
        where board_members.board_name = chat_messages.board_name
          and board_members.user_id = auth.uid()
      )
      or exists (
        select 1 from public.kanban_cards
        where kanban_cards.project_name = chat_messages.board_name
          and kanban_cards.owner_id = auth.uid()
      )
    )
  );

-- Create board_files table
create table if not exists public.board_files (
  id uuid primary key default gen_random_uuid(),
  board_name text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  file_name text not null,
  file_url text not null,
  file_type text,
  file_size bigint,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.board_files enable row level security;

-- Drop existing policies
drop policy if exists "Users can view files in their boards" on public.board_files;
drop policy if exists "Users can insert files in their boards" on public.board_files;
drop policy if exists "Users can delete their own files" on public.board_files;

-- RLS Policies
create policy "Users can view files in their boards"
  on public.board_files for select
  using (
    exists (
      select 1 from public.board_members
      where board_members.board_name = board_files.board_name
        and board_members.user_id = auth.uid()
    )
    or exists (
      select 1 from public.kanban_cards
      where kanban_cards.project_name = board_files.board_name
        and kanban_cards.owner_id = auth.uid()
    )
  );

create policy "Users can insert files in their boards"
  on public.board_files for insert
  with check (
    auth.uid() = user_id
    and (
      exists (
        select 1 from public.board_members
        where board_members.board_name = board_files.board_name
          and board_members.user_id = auth.uid()
      )
      or exists (
        select 1 from public.kanban_cards
        where kanban_cards.project_name = board_files.board_name
          and kanban_cards.owner_id = auth.uid()
      )
    )
  );

create policy "Users can delete their own files"
  on public.board_files for delete
  using (auth.uid() = user_id);

-- Create storage bucket for board files
insert into storage.buckets (id, name, public)
values ('board-files', 'board-files', false)
on conflict (id) do nothing;

-- Storage RLS policies
drop policy if exists "Users can view files in their boards" on storage.objects;
drop policy if exists "Users can upload files" on storage.objects;
drop policy if exists "Users can delete their own files" on storage.objects;

create policy "Users can view files in their boards"
  on storage.objects for select
  using (
    bucket_id = 'board-files'
    and (auth.uid() = owner
      or exists (
        select 1 from public.board_files bf
        join public.board_members bm on bf.board_name = bm.board_name
        where bf.file_url = storage.objects.name
          and bm.user_id = auth.uid()
      )
    )
  );

create policy "Users can upload files"
  on storage.objects for insert
  with check (
    bucket_id = 'board-files'
    and auth.uid() = owner
  );

create policy "Users can delete their own files"
  on storage.objects for delete
  using (
    bucket_id = 'board-files'
    and auth.uid() = owner
  );

-- Create call_history table
create table if not exists public.call_history (
  id uuid primary key default gen_random_uuid(),
  board_name text not null,
  call_type text check (call_type in ('audio', 'video')) not null,
  initiated_by uuid references auth.users(id) on delete cascade not null,
  participants text[] not null,
  duration_seconds integer,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.call_history enable row level security;

-- Drop existing policies
drop policy if exists "Users can view calls in their boards" on public.call_history;
drop policy if exists "Users can insert calls in their boards" on public.call_history;

-- RLS Policies
create policy "Users can view calls in their boards"
  on public.call_history for select
  using (
    exists (
      select 1 from public.board_members
      where board_members.board_name = call_history.board_name
        and board_members.user_id = auth.uid()
    )
    or exists (
      select 1 from public.kanban_cards
      where kanban_cards.project_name = call_history.board_name
        and kanban_cards.owner_id = auth.uid()
    )
  );

create policy "Users can insert calls in their boards"
  on public.call_history for insert
  with check (
    auth.uid() = initiated_by
    and (
      exists (
        select 1 from public.board_members
        where board_members.board_name = call_history.board_name
          and board_members.user_id = auth.uid()
      )
      or exists (
        select 1 from public.kanban_cards
        where kanban_cards.project_name = call_history.board_name
          and kanban_cards.owner_id = auth.uid()
      )
    )
  );