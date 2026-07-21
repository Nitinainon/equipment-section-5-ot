create extension if not exists pgcrypto;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  employee_no integer not null unique,
  employee_code text not null default '',
  name text not null,
  nickname text not null default '',
  chinese_name text not null default '',
  sick_leave_remaining numeric(5,2) not null default 30,
  personal_leave_remaining numeric(5,2) not null default 3,
  vacation_leave_remaining numeric(5,2) not null default 0,
  color text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.members
  add column if not exists updated_at timestamptz not null default now();

alter table public.members
  add column if not exists employee_code text not null default '';

alter table public.members
  add column if not exists nickname text not null default '';

alter table public.members
  add column if not exists chinese_name text not null default '';

alter table public.members
  add column if not exists sick_leave_remaining numeric(5,2) not null default 30;

alter table public.members
  add column if not exists personal_leave_remaining numeric(5,2) not null default 3;

alter table public.members
  add column if not exists vacation_leave_remaining numeric(5,2) not null default 0;

alter table public.members
  alter column sick_leave_remaining set default 30;

alter table public.members
  alter column personal_leave_remaining set default 3;

alter table public.members
  alter column vacation_leave_remaining set default 0;

update public.members
set
  sick_leave_remaining = 30,
  personal_leave_remaining = 3,
  vacation_leave_remaining = 0;

create unique index if not exists members_employee_code_unique
  on public.members (employee_code)
  where employee_code <> '';

create table if not exists public.app_settings (
  id text primary key default 'main',
  show_employee_code boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = 'main')
);

insert into public.app_settings (id, show_employee_code)
values ('main', true)
on conflict (id) do nothing;

create table if not exists public.overtime_entries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  ot_date date not null,
  entry_type text not null default 'ot',
  absence_type text,
  day_type text not null default 'regular',
  start_time time,
  end_time time,
  total_minutes integer not null,
  ot_1x_minutes integer not null default 0,
  ot_1_5x_minutes integer not null default 0,
  ot_3x_minutes integer not null default 0,
  weighted_minutes numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint overtime_entry_type_valid check (entry_type in ('ot', 'absent')),
  constraint overtime_absence_type_valid check (
    (entry_type = 'ot' and absence_type is null)
    or (
      entry_type = 'absent'
      and absence_type in ('sixth_day_off', 'personal_leave', 'sick_leave', 'vacation_leave')
    )
  ),
  constraint overtime_day_type_valid check (day_type in ('regular', 'holiday')),
  constraint overtime_valid_time check (
    (entry_type = 'ot' and start_time is not null and end_time is not null and end_time > start_time)
    or (entry_type = 'absent' and start_time is null and end_time is null)
  ),
  constraint overtime_rate_minutes_valid check (
    ot_1x_minutes >= 0
    and ot_1_5x_minutes >= 0
    and ot_3x_minutes >= 0
    and weighted_minutes >= 0
  ),
  constraint overtime_positive_minutes check (
    (entry_type = 'ot' and total_minutes > 0)
    or (entry_type = 'absent' and total_minutes = 0)
  )
);

alter table public.overtime_entries
  add column if not exists entry_type text not null default 'ot';

alter table public.overtime_entries
  add column if not exists absence_type text;

alter table public.overtime_entries
  add column if not exists day_type text not null default 'regular';

alter table public.overtime_entries
  add column if not exists ot_1x_minutes integer not null default 0;

alter table public.overtime_entries
  add column if not exists ot_1_5x_minutes integer not null default 0;

alter table public.overtime_entries
  add column if not exists ot_3x_minutes integer not null default 0;

alter table public.overtime_entries
  add column if not exists weighted_minutes numeric(10,2) not null default 0;

alter table public.overtime_entries
  alter column start_time drop not null;

alter table public.overtime_entries
  alter column end_time drop not null;

alter table public.overtime_entries
  drop constraint if exists overtime_entry_type_valid;

alter table public.overtime_entries
  drop constraint if exists overtime_absence_type_valid;

alter table public.overtime_entries
  drop constraint if exists overtime_day_type_valid;

alter table public.overtime_entries
  drop constraint if exists overtime_valid_time;

alter table public.overtime_entries
  drop constraint if exists overtime_rate_minutes_valid;

alter table public.overtime_entries
  drop constraint if exists overtime_positive_minutes;

update public.overtime_entries
set absence_type = 'sixth_day_off'
where entry_type = 'absent'
  and absence_type is null;

update public.overtime_entries
set absence_type = null
where entry_type = 'ot';

alter table public.overtime_entries
  add constraint overtime_entry_type_valid check (entry_type in ('ot', 'absent'));

alter table public.overtime_entries
  add constraint overtime_absence_type_valid check (
    (entry_type = 'ot' and absence_type is null)
    or (
      entry_type = 'absent'
      and absence_type in ('sixth_day_off', 'personal_leave', 'sick_leave', 'vacation_leave')
    )
  );

alter table public.overtime_entries
  add constraint overtime_day_type_valid check (day_type in ('regular', 'holiday'));

alter table public.overtime_entries
  add constraint overtime_valid_time check (
    (entry_type = 'ot' and start_time is not null and end_time is not null and end_time > start_time)
    or (entry_type = 'absent' and start_time is null and end_time is null)
  );

alter table public.overtime_entries
  add constraint overtime_rate_minutes_valid check (
    ot_1x_minutes >= 0
    and ot_1_5x_minutes >= 0
    and ot_3x_minutes >= 0
    and weighted_minutes >= 0
  );

alter table public.overtime_entries
  add constraint overtime_positive_minutes check (
    (entry_type = 'ot' and total_minutes > 0)
    or (entry_type = 'absent' and total_minutes = 0)
  );

create index if not exists overtime_entries_month_idx
  on public.overtime_entries (ot_date, start_time);

create index if not exists overtime_entries_member_date_idx
  on public.overtime_entries (member_id, ot_date);

create table if not exists public.weekly_holidays (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  weekday integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_holiday_weekday_valid check (weekday between 0 and 6),
  constraint weekly_holiday_unique unique (member_id, weekday)
);

create index if not exists weekly_holidays_weekday_idx
  on public.weekly_holidays (weekday);

create or replace function public.set_members_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.set_weekly_holidays_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.set_app_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.set_overtime_metadata()
returns trigger
language plpgsql
as $$
begin
  if new.entry_type = 'absent' then
    new.absence_type := coalesce(new.absence_type, 'sixth_day_off');
    new.day_type := 'regular';
    new.start_time := null;
    new.end_time := null;
    new.total_minutes := 0;
    new.ot_1x_minutes := 0;
    new.ot_1_5x_minutes := 0;
    new.ot_3x_minutes := 0;
    new.weighted_minutes := 0;
  else
    new.absence_type := null;
    if new.day_type = 'holiday' then
      new.day_type := 'holiday';
      new.ot_1x_minutes :=
        greatest(
          0,
          extract(epoch from (least(new.end_time, time '12:00') - greatest(new.start_time, time '08:00')))::integer / 60
        )
        +
        greatest(
          0,
          extract(epoch from (least(new.end_time, time '17:00') - greatest(new.start_time, time '13:00')))::integer / 60
        );
      new.ot_1_5x_minutes := 0;
      new.ot_3x_minutes :=
        greatest(
          0,
          extract(epoch from (new.end_time - greatest(new.start_time, time '18:00')))::integer / 60
        );
    else
      new.day_type := 'regular';
      new.ot_1x_minutes := 0;
      new.ot_1_5x_minutes :=
        greatest(
          0,
          extract(epoch from (new.end_time - greatest(new.start_time, time '18:00')))::integer / 60
        );
      new.ot_3x_minutes := 0;
    end if;

    new.total_minutes := new.ot_1x_minutes + new.ot_1_5x_minutes + new.ot_3x_minutes;
    new.weighted_minutes := new.ot_1x_minutes + (new.ot_1_5x_minutes * 1.5) + (new.ot_3x_minutes * 3);
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;

  return new;
end;
$$;

create or replace function public.prevent_overtime_overlap()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.overtime_entries existing
    where existing.member_id = new.member_id
      and existing.ot_date = new.ot_date
      and existing.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and (
        existing.entry_type = 'absent'
        or new.entry_type = 'absent'
        or (existing.start_time < new.end_time and existing.end_time > new.start_time)
      )
  ) then
    raise exception 'overlap: member already has OT in this time range';
  end if;

  return new;
end;
$$;

drop trigger if exists overtime_set_metadata on public.overtime_entries;
create trigger overtime_set_metadata
before insert or update on public.overtime_entries
for each row execute function public.set_overtime_metadata();

drop trigger if exists overtime_prevent_overlap on public.overtime_entries;
create trigger overtime_prevent_overlap
before insert or update on public.overtime_entries
for each row execute function public.prevent_overtime_overlap();

drop trigger if exists members_set_updated_at on public.members;
create trigger members_set_updated_at
before update on public.members
for each row execute function public.set_members_updated_at();

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
before update on public.app_settings
for each row execute function public.set_app_settings_updated_at();

drop trigger if exists weekly_holidays_set_updated_at on public.weekly_holidays;
create trigger weekly_holidays_set_updated_at
before update on public.weekly_holidays
for each row execute function public.set_weekly_holidays_updated_at();

alter table public.members enable row level security;
alter table public.app_settings enable row level security;
alter table public.overtime_entries enable row level security;
alter table public.weekly_holidays enable row level security;
