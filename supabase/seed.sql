insert into public.members (
  employee_no,
  employee_code,
  name,
  nickname,
  chinese_name,
  sick_leave_remaining,
  personal_leave_remaining,
  vacation_leave_remaining,
  color,
  is_active
)
values
  (1, '', 'NITINAI YASUTORN', '', '', 30, 3, 0, '#2563eb', true),
  (2, '', 'SASITHORN YODLEE', '', '', 30, 3, 0, '#0f766e', true),
  (3, '', 'ATCHARATHORN DAENGHOT', '', '', 30, 3, 0, '#b45309', true),
  (4, '', 'THANAKORN OUNLAMAI', '', '', 30, 3, 0, '#7c3aed', true),
  (5, '', 'SARINYA THORANESUK', '', '', 30, 3, 0, '#be123c', true),
  (6, '', 'SAOWALAK SRISAWAN', '', '', 30, 3, 0, '#15803d', true),
  (7, '', 'PORAMIN PAKKRONG', '', '', 30, 3, 0, '#475569', true)
on conflict (employee_no) do update
set
  name = excluded.name,
  sick_leave_remaining = excluded.sick_leave_remaining,
  personal_leave_remaining = excluded.personal_leave_remaining,
  vacation_leave_remaining = excluded.vacation_leave_remaining,
  color = excluded.color,
  is_active = excluded.is_active;

insert into public.overtime_entries (member_id, ot_date, entry_type, start_time, end_time, total_minutes)
select id, date '2026-07-20', 'ot', time '17:00', time '20:00', 120
from public.members
where name = 'NITINAI YASUTORN'
  and not exists (
    select 1 from public.overtime_entries
    where member_id = public.members.id
      and ot_date = date '2026-07-20'
      and start_time = time '17:00'
      and end_time = time '20:00'
  );

insert into public.overtime_entries (member_id, ot_date, entry_type, start_time, end_time, total_minutes)
select id, date '2026-07-20', 'ot', time '17:30', time '20:30', 150
from public.members
where name = 'SASITHORN YODLEE'
  and not exists (
    select 1 from public.overtime_entries
    where member_id = public.members.id
      and ot_date = date '2026-07-20'
      and start_time = time '17:30'
      and end_time = time '20:30'
  );

insert into public.overtime_entries (member_id, ot_date, entry_type, start_time, end_time, total_minutes)
select id, date '2026-07-21', 'ot', time '18:00', time '21:00', 180
from public.members
where name = 'ATCHARATHORN DAENGHOT'
  and not exists (
    select 1 from public.overtime_entries
    where member_id = public.members.id
      and ot_date = date '2026-07-21'
      and start_time = time '18:00'
      and end_time = time '21:00'
  );
