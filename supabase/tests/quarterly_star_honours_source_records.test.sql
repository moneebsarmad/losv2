begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(3);

insert into auth.users (id, aud, role, email, created_at, updated_at)
values ('50000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'source-test@test.local', now(), now());

insert into public.profiles (id, school_id, role, email)
values ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'teacher', 'source-test@test.local');

insert into public.students (id, school_id, student_id, student_name, grade, section, house)
values ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'SOURCE-TEST', 'Source Test Student', 8, 'A', 'House of Umar');

insert into public.recognition_logs (
  id, school_id, student_id, staff_user_id, staff_name_snapshot, student_name_snapshot,
  grade_snapshot, section_snapshot, house_snapshot, r_value_id, domain_id, point_value,
  behaviour_note, visibility, admin_review_status, source, recognition_date, record_status,
  deleted_at, deduplication_key
)
select
  row_id,
  '00000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000002',
  '50000000-0000-0000-0000-000000000001',
  'Source Staff',
  'Source Test Student',
  8,
  'A',
  'House of Umar',
  (select id from public.r_values where key = 'respect'),
  (select id from public.domains where key = 'classrooms'),
  10,
  note,
  'staff_only',
  review_status,
  source_value,
  '2026-02-02',
  record_status,
  deleted_at,
  dedupe
from (values
  ('51000000-0000-0000-0000-000000000001'::uuid, 'valid', 'approved', 'manual', 'active', null::timestamptz, 'valid-key'),
  ('51000000-0000-0000-0000-000000000002'::uuid, 'voided', 'approved', 'manual', 'voided', null::timestamptz, 'voided-key'),
  ('51000000-0000-0000-0000-000000000003'::uuid, 'reversed', 'approved', 'manual', 'reversed', null::timestamptz, 'reversed-key'),
  ('51000000-0000-0000-0000-000000000004'::uuid, 'draft', 'approved', 'manual', 'draft', null::timestamptz, 'draft-key'),
  ('51000000-0000-0000-0000-000000000005'::uuid, 'test source', 'approved', 'test', 'active', null::timestamptz, 'test-key'),
  ('51000000-0000-0000-0000-000000000006'::uuid, 'duplicate source', 'approved', 'duplicate', 'active', null::timestamptz, 'duplicate-key'),
  ('51000000-0000-0000-0000-000000000007'::uuid, 'deleted', 'approved', 'manual', 'active', now(), 'deleted-key'),
  ('51000000-0000-0000-0000-000000000008'::uuid, 'pending review', 'pending', 'manual', 'active', null::timestamptz, 'pending-key')
) rows(row_id, note, review_status, source_value, record_status, deleted_at, dedupe);

select extensions.is((select count(*) from public.v_award_eligible_recognitions where student_id = '50000000-0000-0000-0000-000000000002'), 1::bigint, 'only one valid positive recognition is eligible');
select extensions.is((select behaviour_note from public.v_award_eligible_recognitions where student_id = '50000000-0000-0000-0000-000000000002'), 'valid'::text, 'the eligible record is the active approved source record');
select extensions.is((select point_value from public.v_award_eligible_recognitions where student_id = '50000000-0000-0000-0000-000000000002'), 10, 'positive point value is preserved');

select extensions.finish();
rollback;
