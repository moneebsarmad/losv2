-- BHA League of Stars Recognition Framework v2
-- Canonical domains, universal behaviours, Graduate Values, ledger snapshots,
-- exceptional nominations, and reporting views.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Canonical five domains
-- ---------------------------------------------------------------------------

do $$
declare
  mapping record;
  legacy_row public.domains%rowtype;
  canonical_row public.domains%rowtype;
begin
  for mapping in
    select *
    from (
      values
        ('prayer_space', 'prayer_space', 'Prayer Space (Muṣallā)', 'Worship, readiness, focus, and care for the sacred space', 1),
        ('hallways_transition', 'hallways_transitions', 'Hallways & Transitions', 'Safe, purposeful, and respectful movement between settings', 2),
        ('classrooms', 'classroom_learning', 'Classroom & Learning', 'Learning, effort, honesty, participation, and care for the classroom', 3),
        ('lunch_recess', 'lunch_recess', 'Lunch / Recess', 'Inclusion, play, conflict repair, and care for shared spaces', 4),
        ('washrooms', 'bathrooms', 'Bathrooms', 'Privacy, cleanliness, safety, and care for bathroom spaces', 5)
    ) as domains(old_key, new_key, display_name, description, sort_order)
  loop
    select * into legacy_row from public.domains where key = mapping.old_key;
    select * into canonical_row from public.domains where key = mapping.new_key;

    if canonical_row.id is not null and legacy_row.id is not null and canonical_row.id <> legacy_row.id then
      update public.recognition_logs set domain_id = canonical_row.id where domain_id = legacy_row.id;
      delete from public.domains where id = legacy_row.id;
    elsif canonical_row.id is null and legacy_row.id is not null then
      update public.domains
      set key = mapping.new_key,
          name = mapping.display_name,
          description = mapping.description,
          locked = true,
          is_active = true,
          sort_order = mapping.sort_order
      where id = legacy_row.id;
    elsif canonical_row.id is not null then
      update public.domains
      set name = mapping.display_name,
          description = mapping.description,
          locked = true,
          is_active = true,
          sort_order = mapping.sort_order
      where id = canonical_row.id;
    else
      insert into public.domains (key, name, description, locked, is_active, sort_order)
      values (
        mapping.new_key,
        mapping.display_name,
        mapping.description,
        true,
        true,
        mapping.sort_order
      );
    end if;

    legacy_row := null;
    canonical_row := null;
  end loop;
end;
$$;

update public.r_values
set description = case key
  when 'righteousness' then 'Doing what is right across all areas of life: in worship, conduct, speech, private, and public.'
  when 'responsibility' then 'Taking ownership of what has been entrusted to you: your body, time, attention, learning, abilities, actions, relationships, community, and environment.'
  when 'respect' then 'Honouring the dignity, knowledge, rights, and proper place of Allah, yourself, other people, and the environment.'
  else description
end
where key in ('righteousness', 'responsibility', 'respect');

-- ---------------------------------------------------------------------------
-- Six Graduate Values and the universal behaviour library
-- ---------------------------------------------------------------------------

create table if not exists public.graduate_values (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  code text not null,
  display_label text not null,
  islamic_term text not null,
  parent_r_value_id uuid not null references public.r_values(id) on delete restrict,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint graduate_values_official_code_check
    check (code in ('ihsan', 'sidq', 'sabr', 'khilafah', 'tawadu', 'adl')),
  constraint graduate_values_school_code_unique unique (school_id, code),
  constraint graduate_values_school_id_id_unique unique (school_id, id)
);

create table if not exists public.recognition_definitions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  code text not null,
  r_value_id uuid not null references public.r_values(id) on delete restrict,
  label text not null,
  description text not null,
  fixed_points integer not null references public.point_values(value) on delete restrict,
  award_mode text not null,
  requires_note boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null,
  framework_version text not null default 'recognition_v2',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recognition_definitions_school_code_unique unique (school_id, code),
  constraint recognition_definitions_school_id_id_unique unique (school_id, id),
  constraint recognition_definitions_points_check check (fixed_points in (5, 10, 20, 50)),
  constraint recognition_definitions_mode_check check (award_mode in ('direct', 'nomination')),
  constraint recognition_definitions_fifty_nomination_check
    check ((fixed_points = 50 and award_mode = 'nomination') or (fixed_points <> 50 and award_mode = 'direct')),
  constraint recognition_definitions_twenty_note_check
    check (fixed_points <> 20 or requires_note)
);

create table if not exists public.recognition_definition_graduate_values (
  school_id uuid not null references public.schools(id) on delete cascade,
  recognition_definition_id uuid not null references public.recognition_definitions(id) on delete cascade,
  graduate_value_id uuid not null references public.graduate_values(id) on delete restrict,
  relationship text not null,
  created_at timestamptz not null default now(),
  primary key (recognition_definition_id, graduate_value_id),
  constraint recognition_definition_value_relationship_check check (relationship in ('primary', 'secondary')),
  constraint recognition_definition_value_role_unique unique (recognition_definition_id, relationship)
);

create index if not exists idx_graduate_values_school_r
  on public.graduate_values(school_id, parent_r_value_id, sort_order);
create index if not exists idx_recognition_definitions_school_r_active
  on public.recognition_definitions(school_id, r_value_id, is_active, sort_order);
create index if not exists idx_recognition_definition_values_school
  on public.recognition_definition_graduate_values(school_id, recognition_definition_id);

drop trigger if exists graduate_values_set_updated_at on public.graduate_values;
create trigger graduate_values_set_updated_at
before update on public.graduate_values
for each row execute function public.set_updated_at();

drop trigger if exists recognition_definitions_set_updated_at on public.recognition_definitions;
create trigger recognition_definitions_set_updated_at
before update on public.recognition_definitions
for each row execute function public.set_updated_at();

insert into public.graduate_values (
  school_id, code, display_label, islamic_term, parent_r_value_id, sort_order
)
select
  s.id,
  seed.code,
  seed.display_label,
  seed.islamic_term,
  rv.id,
  seed.sort_order
from public.schools s
cross join (
  values
    ('ihsan', 'Conscious Excellence', 'Iḥsān', 'righteousness', 1),
    ('sidq', 'Courageous Honesty', 'Ṣidq', 'righteousness', 2),
    ('sabr', 'Beautiful Patience', 'Ṣabr', 'responsibility', 3),
    ('khilafah', 'Faithful Stewardship', 'Khilāfah', 'responsibility', 4),
    ('tawadu', 'Grounded Humility', 'Tawāḍuʿ', 'respect', 5),
    ('adl', 'Unwavering Justice', 'ʿAdl', 'respect', 6)
) as seed(code, display_label, islamic_term, r_key, sort_order)
join public.r_values rv on rv.key = seed.r_key
on conflict (school_id, code) do update set
  display_label = excluded.display_label,
  islamic_term = excluded.islamic_term,
  parent_r_value_id = excluded.parent_r_value_id,
  sort_order = excluded.sort_order;

insert into public.recognition_definitions (
  school_id,
  code,
  r_value_id,
  label,
  description,
  fixed_points,
  award_mode,
  requires_note,
  is_active,
  sort_order,
  framework_version
)
select
  s.id,
  seed.code,
  rv.id,
  seed.label,
  seed.description,
  seed.fixed_points,
  seed.award_mode,
  seed.requires_note,
  true,
  seed.sort_order,
  'recognition_v2'
from public.schools s
cross join (
  values
    ('righteousness_prepared_for_worship', 'righteousness', 'Prepared for Worship', 'Entered the muṣallā or another worship setting quietly, settled promptly, and was ready before worship began.', 5, 'direct', false, 101),
    ('righteousness_did_own_work', 'righteousness', 'Did Their Own Work', 'Completed their own work honestly, gave proper credit, or asked for help instead of copying.', 5, 'direct', false, 102),
    ('righteousness_focus_in_worship', 'righteousness', 'Showed Focus in Worship', 'Maintained attentive and proper conduct during ṣalāh, Qurʾān, duʿāʾ, or another worship activity without needing reminders.', 10, 'direct', false, 103),
    ('righteousness_careful_work', 'righteousness', 'Did Careful Work', 'Produced work that showed clear effort, attention to detail, and more than minimum completion.', 10, 'direct', false, 104),
    ('righteousness_improved_work', 'righteousness', 'Improved Their Work', 'Reviewed, corrected, revised, or strengthened their work without being told to do so.', 10, 'direct', false, 105),
    ('righteousness_admitted_mistake', 'righteousness', 'Admitted a Mistake', 'Honestly owned a mistake or poor choice instead of hiding it, denying it, or blaming someone else.', 10, 'direct', false, 106),
    ('righteousness_corrected_false_impression', 'righteousness', 'Corrected a False Impression', 'Spoke up to correct inaccurate information, gave someone else proper credit, or made sure others understood what really happened.', 10, 'direct', false, 107),
    ('righteousness_truth_under_pressure', 'righteousness', 'Told the Truth Under Pressure', 'Told the truth when doing so could bring a consequence, embarrassment, disappointment, or peer disapproval.', 20, 'direct', true, 108),
    ('righteousness_refused_peer_pressure', 'righteousness', 'Said No to Peer Pressure', 'Refused cheating, harmful talk, inappropriate conduct, or another wrong action despite direct pressure from others.', 20, 'direct', true, 109),
    ('righteousness_reported_serious_wrongdoing', 'righteousness', 'Reported Serious Wrongdoing Despite Personal Risk', 'Reported serious cheating, bullying, a safety concern, or other significant misconduct when doing so exposed them to meaningful social backlash or personal cost.', 50, 'nomination', true, 110),

    ('responsibility_came_prepared', 'responsibility', 'Came Prepared', 'Arrived on time with the required materials and was ready to begin.', 5, 'direct', false, 201),
    ('responsibility_used_time_well', 'responsibility', 'Used Time Well', 'Started promptly, stayed on task, completed a transition efficiently, or used extra time purposefully.', 5, 'direct', false, 202),
    ('responsibility_cared_for_property_space', 'responsibility', 'Took Care of Property and Space', 'Used personal, school, or shared property carefully and left the area in proper condition.', 5, 'direct', false, 203),
    ('responsibility_asked_for_help', 'responsibility', 'Asked for Help Before Giving Up', 'Asked for help, clarification, or an approved support before abandoning, avoiding, or disrupting the task.', 10, 'direct', false, 204),
    ('responsibility_kept_trying', 'responsibility', 'Kept Trying', 'Continued through a difficult, frustrating, repetitive, or unfamiliar task instead of shutting down or quitting.', 10, 'direct', false, 205),
    ('responsibility_used_self_control', 'responsibility', 'Used Self-Control', 'Paused, used a taught strategy, and made a better choice when frustrated, distracted, angry, or upset.', 10, 'direct', false, 206),
    ('responsibility_owned_learning', 'responsibility', 'Took Ownership of Learning', 'Began, organised, checked, or completed learning without waiting for repeated reminders or rescue from an adult.', 10, 'direct', false, 207),
    ('responsibility_helped_without_prompt', 'responsibility', 'Helped Without Being Asked', 'Noticed a real need and took useful action without waiting for an adult to direct them.', 10, 'direct', false, 208),
    ('responsibility_completed_hard_responsibility', 'responsibility', 'Completed a Hard Responsibility', 'Completed a substantial responsibility despite repeated difficulty, inconvenience, or setbacks.', 20, 'direct', true, 209),
    ('responsibility_repaired_damage_loss', 'responsibility', 'Repaired Damage or Loss', 'Took concrete action to repair damage, replace something lost, restore a shared space, or fulfil an agreed material repair.', 20, 'direct', true, 210),

    ('respect_words_tone', 'respect', 'Used Respectful Words and Tone', 'Spoke to staff or students using appropriate words, volume, and tone, especially during disagreement or frustration.', 5, 'direct', false, 301),
    ('respect_listened_without_interrupting', 'respect', 'Listened Without Interrupting', 'Allowed another person to finish speaking and showed that they were listening before responding.', 5, 'direct', false, 302),
    ('respect_accepted_correction', 'respect', 'Accepted Correction', 'Listened to feedback or redirection and responded without arguing, blaming, mocking, or becoming disrespectful.', 10, 'direct', false, 303),
    ('respect_admitted_wrong_unknown', 'respect', 'Admitted They Were Wrong or Did Not Know', 'Openly acknowledged an error, lack of knowledge, or need to learn instead of pretending, guessing, or becoming defensive.', 10, 'direct', false, 304),
    ('respect_included_someone', 'respect', 'Included Someone', 'Invited, welcomed, or made space for a student who was being left out, overlooked, or isolated.', 10, 'direct', false, 305),
    ('respect_considered_both_sides', 'respect', 'Considered Both Sides', 'Listened to more than one perspective before forming an opinion, assigning blame, or taking a side.', 10, 'direct', false, 306),
    ('respect_treated_others_fairly', 'respect', 'Treated Others Fairly', 'Applied the same standard to friends and non-friends, shared turns or opportunities fairly, or acknowledged when their own side was wrong.', 10, 'direct', false, 307),
    ('respect_walked_away_conflict', 'respect', 'Walked Away From Escalating Conflict', 'Recognised that a conflict was escalating, disengaged safely, and used an appropriate next step instead of arguing, threatening, or fighting.', 20, 'direct', true, 308),
    ('respect_repaired_relationship', 'respect', 'Repaired a Relationship', 'Took concrete steps after causing relational harm, such as listening, giving a sincere apology, completing an agreed repair, or restoring trust.', 20, 'direct', true, 309),
    ('respect_stood_up_for_someone', 'respect', 'Stood Up for Someone', 'Safely intervened or got appropriate help when another student was being mocked, excluded, bullied, threatened, or treated unfairly.', 20, 'direct', true, 310),
    ('respect_defended_someone_personal_risk', 'respect', 'Defended Someone Despite Personal Risk', 'Defended or protected a person being seriously targeted when doing so created meaningful social risk, loss of status, or likely retaliation.', 50, 'nomination', true, 311)
) as seed(code, r_key, label, description, fixed_points, award_mode, requires_note, sort_order)
join public.r_values rv on rv.key = seed.r_key
on conflict (school_id, code) do update set
  r_value_id = excluded.r_value_id,
  label = excluded.label,
  description = excluded.description,
  award_mode = excluded.award_mode,
  requires_note = excluded.requires_note,
  is_active = true,
  sort_order = excluded.sort_order;

insert into public.recognition_definition_graduate_values (
  school_id, recognition_definition_id, graduate_value_id, relationship
)
select
  rd.school_id,
  rd.id,
  gv.id,
  seed.relationship
from (
  values
    ('righteousness_prepared_for_worship', 'ihsan', 'primary'),
    ('righteousness_did_own_work', 'sidq', 'primary'),
    ('righteousness_focus_in_worship', 'ihsan', 'primary'),
    ('righteousness_careful_work', 'ihsan', 'primary'),
    ('righteousness_improved_work', 'ihsan', 'primary'),
    ('righteousness_admitted_mistake', 'sidq', 'primary'),
    ('righteousness_corrected_false_impression', 'sidq', 'primary'),
    ('righteousness_truth_under_pressure', 'sidq', 'primary'),
    ('righteousness_refused_peer_pressure', 'sidq', 'primary'),
    ('righteousness_reported_serious_wrongdoing', 'sidq', 'primary'),

    ('responsibility_came_prepared', 'khilafah', 'primary'),
    ('responsibility_used_time_well', 'khilafah', 'primary'),
    ('responsibility_cared_for_property_space', 'khilafah', 'primary'),
    ('responsibility_asked_for_help', 'sabr', 'primary'),
    ('responsibility_kept_trying', 'sabr', 'primary'),
    ('responsibility_used_self_control', 'sabr', 'primary'),
    ('responsibility_owned_learning', 'khilafah', 'primary'),
    ('responsibility_helped_without_prompt', 'khilafah', 'primary'),
    ('responsibility_completed_hard_responsibility', 'sabr', 'primary'),
    ('responsibility_completed_hard_responsibility', 'khilafah', 'secondary'),
    ('responsibility_repaired_damage_loss', 'khilafah', 'primary'),

    ('respect_words_tone', 'tawadu', 'primary'),
    ('respect_listened_without_interrupting', 'tawadu', 'primary'),
    ('respect_accepted_correction', 'tawadu', 'primary'),
    ('respect_admitted_wrong_unknown', 'tawadu', 'primary'),
    ('respect_included_someone', 'adl', 'primary'),
    ('respect_considered_both_sides', 'adl', 'primary'),
    ('respect_treated_others_fairly', 'adl', 'primary'),
    ('respect_walked_away_conflict', 'tawadu', 'primary'),
    ('respect_walked_away_conflict', 'adl', 'secondary'),
    ('respect_repaired_relationship', 'adl', 'primary'),
    ('respect_stood_up_for_someone', 'adl', 'primary'),
    ('respect_defended_someone_personal_risk', 'adl', 'primary')
) as seed(definition_code, graduate_value_code, relationship)
join public.recognition_definitions rd on rd.code = seed.definition_code
join public.graduate_values gv
  on gv.school_id = rd.school_id
 and gv.code = seed.graduate_value_code
on conflict (recognition_definition_id, graduate_value_id) do update set
  school_id = excluded.school_id,
  relationship = excluded.relationship;

-- ---------------------------------------------------------------------------
-- Legacy-safe canonical ledger extensions
-- ---------------------------------------------------------------------------

alter table public.recognition_logs
  add column if not exists recognition_definition_id uuid references public.recognition_definitions(id) on delete restrict,
  add column if not exists framework_version text not null default 'legacy',
  add column if not exists points_snapshot integer,
  add column if not exists r_value_snapshot text,
  add column if not exists behaviour_label_snapshot text,
  add column if not exists behaviour_description_snapshot text,
  add column if not exists graduate_values_snapshot jsonb not null default '[]'::jsonb,
  add column if not exists award_mode_snapshot text,
  add column if not exists observed_at timestamptz,
  add column if not exists submission_idempotency_key text,
  add column if not exists award_status text not null default 'approved',
  add column if not exists reversed_by_profile_id uuid references auth.users(id) on delete set null,
  add column if not exists reversed_at timestamptz,
  add column if not exists reversal_reason text;

update public.recognition_logs rl
set points_snapshot = coalesce(rl.points_snapshot, rl.point_value),
    r_value_snapshot = coalesce(rl.r_value_snapshot, rv.name),
    behaviour_label_snapshot = coalesce(
      rl.behaviour_label_snapshot,
      nullif(btrim(rl.behaviour_note), ''),
      'Legacy recognition'
    ),
    observed_at = coalesce(rl.observed_at, rl.created_at),
    framework_version = coalesce(nullif(rl.framework_version, ''), 'legacy'),
    award_status = case
      when rl.record_status in ('reversed', 'voided') then 'reversed'
      else coalesce(nullif(rl.award_status, ''), 'approved')
    end
from public.r_values rv
where rv.id = rl.r_value_id
  and (
    rl.points_snapshot is null
    or rl.r_value_snapshot is null
    or rl.behaviour_label_snapshot is null
    or rl.observed_at is null
  );

alter table public.recognition_logs alter column points_snapshot set not null;
alter table public.recognition_logs alter column observed_at set not null;

alter table public.recognition_logs drop constraint if exists recognition_logs_points_snapshot_check;
alter table public.recognition_logs add constraint recognition_logs_points_snapshot_check
  check (points_snapshot in (5, 10, 20, 50));
alter table public.recognition_logs drop constraint if exists recognition_logs_award_status_check;
alter table public.recognition_logs add constraint recognition_logs_award_status_check
  check (award_status in ('approved', 'reversed'));
alter table public.recognition_logs drop constraint if exists recognition_logs_v2_definition_check;
alter table public.recognition_logs add constraint recognition_logs_v2_definition_check
  check (framework_version <> 'recognition_v2' or recognition_definition_id is not null);
alter table public.recognition_logs drop constraint if exists recognition_logs_v2_snapshot_check;
alter table public.recognition_logs add constraint recognition_logs_v2_snapshot_check
  check (
    framework_version <> 'recognition_v2'
    or (
      r_value_snapshot is not null
      and behaviour_label_snapshot is not null
      and behaviour_description_snapshot is not null
      and award_mode_snapshot in ('direct', 'nomination')
    )
  );

create unique index if not exists idx_recognition_submission_student_unique
  on public.recognition_logs(school_id, submission_idempotency_key, student_id)
  where submission_idempotency_key is not null;
create index if not exists idx_recognition_definition_reporting
  on public.recognition_logs(school_id, recognition_definition_id, recognition_date);
create index if not exists idx_recognition_framework_reporting
  on public.recognition_logs(school_id, framework_version, recognition_date);

-- ---------------------------------------------------------------------------
-- Exceptional recognition nominations
-- ---------------------------------------------------------------------------

create table if not exists public.recognition_nominations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  recognition_definition_id uuid not null references public.recognition_definitions(id) on delete restrict,
  domain_id uuid not null references public.domains(id) on delete restrict,
  nominated_by_profile_id uuid not null references auth.users(id) on delete restrict,
  explanation text not null,
  witness_information text,
  observed_at timestamptz not null default now(),
  status text not null default 'pending',
  reviewed_by_profile_id uuid references auth.users(id) on delete set null,
  review_note text,
  reviewed_at timestamptz,
  approved_award_id uuid unique references public.recognition_logs(id) on delete restrict,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recognition_nominations_status_check check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  constraint recognition_nominations_explanation_check check (char_length(btrim(explanation)) between 20 and 500),
  constraint recognition_nominations_witness_check check (witness_information is null or char_length(witness_information) <= 500),
  constraint recognition_nominations_school_key_unique unique (school_id, idempotency_key),
  constraint recognition_nominations_school_id_id_unique unique (school_id, id)
);

alter table public.recognition_logs
  add column if not exists recognition_nomination_id uuid unique references public.recognition_nominations(id) on delete restrict;

create index if not exists idx_recognition_nominations_school_status_created
  on public.recognition_nominations(school_id, status, created_at desc);
create index if not exists idx_recognition_nominations_student_created
  on public.recognition_nominations(school_id, student_id, created_at desc);
create index if not exists idx_recognition_nominations_staff_created
  on public.recognition_nominations(school_id, nominated_by_profile_id, created_at desc);

drop trigger if exists recognition_nominations_set_updated_at on public.recognition_nominations;
create trigger recognition_nominations_set_updated_at
before update on public.recognition_nominations
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Canonical reporting views
-- ---------------------------------------------------------------------------

create or replace view public.v_active_recognition_awards
with (security_invoker = true)
as
select rl.*
from public.recognition_logs rl
where rl.record_status = 'active'
  and rl.deleted_at is null
  and rl.award_status = 'approved'
  and rl.admin_review_status in ('approved', 'not_required');

create or replace view public.v_recognition_reporting
with (security_invoker = true)
as
select
  rl.id,
  rl.school_id,
  rl.student_id,
  rl.staff_user_id,
  rl.staff_name_snapshot,
  rl.student_name_snapshot,
  rl.grade_snapshot,
  rl.section_snapshot,
  rl.house_snapshot,
  rl.r_value_id,
  coalesce(rl.r_value_snapshot, rv.name) as r_value_name,
  rv.key as r_value_code,
  rl.domain_id,
  d.key as domain_code,
  d.name as domain_name,
  rl.recognition_definition_id,
  rd.code as behaviour_code,
  coalesce(rl.behaviour_label_snapshot, rd.label, 'Legacy recognition') as behaviour_label,
  coalesce(rl.behaviour_description_snapshot, rd.description, rl.behaviour_note) as behaviour_description,
  coalesce(rl.points_snapshot, rl.point_value) as points,
  rl.behaviour_note as note,
  rl.framework_version,
  coalesce(rl.award_mode_snapshot, rd.award_mode, 'direct') as recognition_mode,
  rl.visibility,
  rl.student_visible,
  rl.parent_visible,
  rl.recognition_date,
  rl.observed_at,
  rl.created_at,
  rl.recognition_nomination_id,
  rl.graduate_values_snapshot,
  (
    select string_agg(gv.display_label, ', ' order by case rdgv.relationship when 'primary' then 1 else 2 end)
    from public.recognition_definition_graduate_values rdgv
    join public.graduate_values gv on gv.id = rdgv.graduate_value_id
    where rdgv.recognition_definition_id = rl.recognition_definition_id
  ) as graduate_value_labels,
  (
    select array_agg(gv.code order by case rdgv.relationship when 'primary' then 1 else 2 end)
    from public.recognition_definition_graduate_values rdgv
    join public.graduate_values gv on gv.id = rdgv.graduate_value_id
    where rdgv.recognition_definition_id = rl.recognition_definition_id
  ) as graduate_value_codes
from public.v_active_recognition_awards rl
join public.r_values rv on rv.id = rl.r_value_id
join public.domains d on d.id = rl.domain_id
left join public.recognition_definitions rd on rd.id = rl.recognition_definition_id;

create or replace view public.v_recognition_possible_duplicates
with (security_invoker = true)
as
select *
from (
  select
    rr.*,
    lag(rr.created_at) over (
      partition by rr.school_id, rr.student_id, rr.staff_user_id, rr.recognition_definition_id, rr.domain_id
      order by rr.created_at
    ) as previous_matching_award_at
  from public.v_recognition_reporting rr
) candidate
where candidate.previous_matching_award_at is not null
  and candidate.created_at - candidate.previous_matching_award_at <= interval '5 minutes';

-- Preserve the Quarterly Star Honours source contract while explicitly
-- excluding pending/rejected/reversed recognition.
create or replace view public.v_award_eligible_recognitions
with (security_invoker = true)
as
select
  rl.id,
  rl.school_id,
  rl.student_id,
  rl.staff_user_id,
  rl.staff_name_snapshot,
  rl.r_value_id,
  rv.key as r_key,
  rv.name as r_name,
  rl.domain_id,
  d.key as domain_key,
  d.name as domain_name,
  coalesce(rl.points_snapshot, rl.point_value) as point_value,
  rl.behaviour_note,
  rl.recognition_date,
  rl.source,
  rl.created_at
from public.recognition_logs rl
join public.students s on s.id = rl.student_id and s.school_id = rl.school_id
join public.r_values rv on rv.id = rl.r_value_id
join public.domains d on d.id = rl.domain_id
where rl.record_status = 'active'
  and rl.deleted_at is null
  and rl.award_status = 'approved'
  and coalesce(rl.points_snapshot, rl.point_value) > 0
  and rl.admin_review_status in ('approved', 'not_required')
  and lower(coalesce(rl.source, '')) not in ('test', 'duplicate', 'draft', 'voided', 'reversed');

revoke all on public.v_active_recognition_awards from anon, authenticated;
revoke all on public.v_recognition_reporting from anon, authenticated;
revoke all on public.v_recognition_possible_duplicates from anon, authenticated;
revoke all on public.v_award_eligible_recognitions from anon, authenticated;
grant select on public.v_active_recognition_awards to service_role;
grant select on public.v_recognition_reporting to service_role;
grant select on public.v_recognition_possible_duplicates to service_role;
grant select on public.v_award_eligible_recognitions to service_role;
