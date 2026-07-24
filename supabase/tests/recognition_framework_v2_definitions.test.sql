begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(16);

select extensions.is(
  (select count(*) from public.recognition_definitions where framework_version = 'recognition_v2'),
  31::bigint,
  'all 31 canonical behaviour definitions are seeded'
);
select extensions.is(
  (select count(distinct code) from public.recognition_definitions where framework_version = 'recognition_v2'),
  31::bigint,
  'every canonical behaviour code is unique'
);
select extensions.is(
  (select count(*) from public.graduate_values),
  6::bigint,
  'the Graduate Profile remains exactly six values'
);
select extensions.is(
  (
    select array_agg(code order by sort_order)
    from public.graduate_values
  ),
  array['ihsan', 'sidq', 'sabr', 'khilafah', 'tawadu', 'adl']::text[],
  'the six official Graduate Value codes are unchanged'
);
select extensions.is(
  (
    select count(*)
    from public.recognition_definitions
    where fixed_points not in (5, 10, 20, 50)
  ),
  0::bigint,
  'definitions use only the four approved point tiers'
);
select extensions.is(
  (
    select count(*)
    from public.recognition_definitions
    where fixed_points = 15
  ),
  0::bigint,
  'there is no 15-point tier'
);
select extensions.is(
  (
    select count(*)
    from public.recognition_definitions
    where fixed_points = 50 and award_mode <> 'nomination'
  ),
  0::bigint,
  'every 50-point definition is nomination-only'
);
select extensions.is(
  (
    select count(*)
    from public.recognition_definitions
    where award_mode = 'direct' and fixed_points = 50
  ),
  0::bigint,
  'no direct definition is worth 50 points'
);
select extensions.is(
  (
    select count(*)
    from public.recognition_definitions
    where fixed_points = 20 and not requires_note
  ),
  0::bigint,
  'every 20-point definition requires a note'
);
select extensions.is(
  (
    select count(*)
    from public.recognition_definitions rd
    where not exists (
      select 1
      from public.r_values rv
      where rv.id = rd.r_value_id
        and rv.key in ('righteousness', 'responsibility', 'respect')
    )
  ),
  0::bigint,
  'every definition belongs to exactly one canonical 3R'
);
select extensions.is(
  (
    select count(*)
    from public.recognition_definitions rd
    where (
      select count(*)
      from public.recognition_definition_graduate_values rdgv
      where rdgv.recognition_definition_id = rd.id
    ) not between 1 and 2
  ),
  0::bigint,
  'every definition maps to one or two Graduate Values'
);
select extensions.is(
  (
    select array_agg(rd.code order by rd.code)
    from public.recognition_definition_graduate_values rdgv
    join public.recognition_definitions rd on rd.id = rdgv.recognition_definition_id
    where rdgv.relationship = 'secondary'
  ),
  array[
    'respect_walked_away_conflict',
    'responsibility_completed_hard_responsibility'
  ]::text[],
  'only the two approved bridge behaviours have secondary Graduate Values'
);
select extensions.is(
  (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'recognition_definitions'
      and column_name = 'domain_id'
  ),
  0::bigint,
  'definitions are not copied or attached to domains'
);
select extensions.is(
  to_regclass('public.recognition_definition_domains'),
  null::regclass,
  'no behaviour-to-domain mapping table exists'
);
select extensions.is(
  (
    select array_agg(key order by sort_order)
    from public.domains
    where is_active
  ),
  array[
    'prayer_space',
    'hallways_transitions',
    'classroom_learning',
    'lunch_recess',
    'bathrooms'
  ]::text[],
  'exactly the five canonical domains are active'
);
select extensions.is(
  (
    select count(*)
    from public.recognition_definitions
    where code = 'responsibility_completed_hard_responsibility'
       or code = 'respect_walked_away_conflict'
  ),
  2::bigint,
  'bridge behaviours remain single universal definitions'
);

select extensions.finish();
rollback;
