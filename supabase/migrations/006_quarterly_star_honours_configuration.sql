-- Super-admin configuration workflow with explicit algorithm versioning.

create or replace function public.set_quarterly_award_period_algorithm_version()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  configured_version text;
begin
  select ad.algorithm_version into configured_version
  from public.quarterly_award_definitions ad
  where ad.school_id = new.school_id
    and ad.active = true
  order by ad.updated_at desc
  limit 1;

  if configured_version is not null then
    new.scoring_algorithm_version := configured_version;
  end if;
  return new;
end;
$$;

drop trigger if exists quarterly_award_period_algorithm_version on public.quarterly_award_periods;
create trigger quarterly_award_period_algorithm_version
before insert on public.quarterly_award_periods
for each row execute function public.set_quarterly_award_period_algorithm_version();

create or replace function public.update_quarterly_award_definition(
  p_award_definition_id uuid,
  p_configuration jsonb,
  p_algorithm_version text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  actor_school uuid;
  source_row public.quarterly_award_definitions;
  old_row public.quarterly_award_definitions;
  target_row public.quarterly_award_definitions;
  weight_total numeric;
begin
  if actor_id is null or not public.current_user_has_permission('honours.configure') then
    raise exception 'Forbidden.' using errcode = '42501';
  end if;
  actor_school := public.current_user_school_id();
  if actor_school is null then raise exception 'School scope is required.'; end if;
  if p_configuration is null or jsonb_typeof(p_configuration) <> 'object'
    or jsonb_typeof(p_configuration -> 'weights') <> 'object'
    or jsonb_typeof(p_configuration -> 'minimums') <> 'object' then
    raise exception 'Configuration must contain weights and minimums objects.';
  end if;
  if nullif(trim(coalesce(p_algorithm_version, '')), '') is null
    or trim(p_algorithm_version) !~ '^quarterly-star-honours-v[0-9]+([.-][a-z0-9]+)*$' then
    raise exception 'A valid versioned algorithm code is required.';
  end if;

  select coalesce(sum(value::numeric), 0) into weight_total
  from jsonb_each_text(p_configuration -> 'weights');
  if abs(weight_total - 1) > 0.0001 then
    raise exception 'Component weights must total 1.0.';
  end if;

  select * into source_row
  from public.quarterly_award_definitions ad
  where ad.id = p_award_definition_id
    and (ad.school_id is null or ad.school_id = actor_school)
    and ad.active = true;
  if not found then raise exception 'Award definition not found.'; end if;

  if exists (
    select 1 from public.quarterly_award_periods p
    where p.school_id = actor_school
      and p.status in ('active', 'review_open')
  ) then
    raise exception 'Algorithm configuration cannot change during an active or review-open period.';
  end if;

  select * into old_row
  from public.quarterly_award_definitions ad
  where ad.school_id = actor_school and ad.code = source_row.code;

  if old_row.id is not null then
    if old_row.configuration is distinct from p_configuration
      and old_row.algorithm_version = trim(p_algorithm_version) then
      raise exception 'A configuration change requires a new algorithm version.';
    end if;
    update public.quarterly_award_definitions
    set configuration = p_configuration,
        algorithm_version = trim(p_algorithm_version),
        updated_at = now()
    where id = old_row.id
    returning * into target_row;
  else
    if source_row.configuration is distinct from p_configuration
      and source_row.algorithm_version = trim(p_algorithm_version) then
      raise exception 'A configuration change requires a new algorithm version.';
    end if;
    insert into public.quarterly_award_definitions (
      school_id, code, name, short_description, detailed_description,
      display_order, active, algorithm_version, configuration
    ) values (
      actor_school, source_row.code, source_row.name, source_row.short_description,
      source_row.detailed_description, source_row.display_order, true,
      trim(p_algorithm_version), p_configuration
    ) returning * into target_row;
  end if;

  update public.quarterly_award_periods
  set scoring_algorithm_version = target_row.algorithm_version,
      updated_at = now()
  where school_id = actor_school and status = 'upcoming';

  perform public.write_honours_audit(
    actor_school,
    'quarterly_honours.algorithm_configuration_changed',
    'quarterly_award_definitions',
    target_row.id::text,
    case when old_row.id is null then null else to_jsonb(old_row) end,
    to_jsonb(target_row)
  );
  return to_jsonb(target_row);
end;
$$;

create or replace function public.upsert_quarterly_award_signal_mapping(
  p_award_definition_id uuid,
  p_source_type text,
  p_source_key text,
  p_signal_type text,
  p_weight numeric default 1,
  p_qualifies_as_significant boolean default false,
  p_qualifies_as_peer_impact boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  actor_school uuid;
  old_row public.quarterly_award_signal_mappings;
  mapping_row public.quarterly_award_signal_mappings;
begin
  if actor_id is null or not public.current_user_has_permission('honours.configure') then
    raise exception 'Forbidden.' using errcode = '42501';
  end if;
  actor_school := public.current_user_school_id();
  if p_source_type not in ('tag', 'subcategory', 'reason_code', 'domain', 'r_value') then
    raise exception 'Invalid signal source type.';
  end if;
  if nullif(trim(coalesce(p_source_key, '')), '') is null
    or nullif(trim(coalesce(p_signal_type, '')), '') is null then
    raise exception 'Signal source and type are required.';
  end if;
  if p_weight <= 0 then raise exception 'Signal weight must be positive.'; end if;
  if not exists (
    select 1 from public.quarterly_award_definitions ad
    where ad.id = p_award_definition_id
      and ad.active = true
      and (ad.school_id is null or ad.school_id = actor_school)
  ) then raise exception 'Award definition not found.'; end if;

  select * into old_row
  from public.quarterly_award_signal_mappings sm
  where sm.school_id = actor_school
    and sm.award_definition_id = p_award_definition_id
    and sm.source_type = p_source_type
    and sm.source_key = trim(p_source_key)
    and sm.signal_type = trim(p_signal_type);

  insert into public.quarterly_award_signal_mappings (
    school_id, award_definition_id, source_type, source_key, signal_type,
    weight, qualifies_as_significant, qualifies_as_peer_impact, active, created_by
  ) values (
    actor_school, p_award_definition_id, p_source_type, trim(p_source_key), trim(p_signal_type),
    p_weight, p_qualifies_as_significant, p_qualifies_as_peer_impact, true, actor_id
  )
  on conflict (school_id, award_definition_id, source_type, source_key, signal_type)
  do update set
    weight = excluded.weight,
    qualifies_as_significant = excluded.qualifies_as_significant,
    qualifies_as_peer_impact = excluded.qualifies_as_peer_impact,
    active = true,
    updated_at = now()
  returning * into mapping_row;

  perform public.write_honours_audit(
    actor_school,
    'quarterly_honours.signal_mapping_changed',
    'quarterly_award_signal_mappings',
    mapping_row.id::text,
    case when old_row.id is null then null else to_jsonb(old_row) end,
    to_jsonb(mapping_row)
  );
  return to_jsonb(mapping_row);
end;
$$;

create or replace function public.deactivate_quarterly_award_signal_mapping(
  p_mapping_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  actor_school uuid;
  old_row public.quarterly_award_signal_mappings;
  mapping_row public.quarterly_award_signal_mappings;
begin
  if actor_id is null or not public.current_user_has_permission('honours.configure') then
    raise exception 'Forbidden.' using errcode = '42501';
  end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'A reason is required.';
  end if;
  actor_school := public.current_user_school_id();
  select * into old_row from public.quarterly_award_signal_mappings
  where id = p_mapping_id and school_id = actor_school and active = true;
  if not found then raise exception 'Active signal mapping not found.'; end if;

  update public.quarterly_award_signal_mappings
  set active = false, updated_at = now()
  where id = old_row.id
  returning * into mapping_row;

  perform public.write_honours_audit(
    actor_school,
    'quarterly_honours.signal_mapping_deactivated',
    'quarterly_award_signal_mappings',
    mapping_row.id::text,
    to_jsonb(old_row),
    to_jsonb(mapping_row) || jsonb_build_object('reason', trim(p_reason))
  );
  return to_jsonb(mapping_row);
end;
$$;

revoke all on function public.update_quarterly_award_definition(uuid, jsonb, text) from public;
revoke all on function public.upsert_quarterly_award_signal_mapping(uuid, text, text, text, numeric, boolean, boolean) from public;
revoke all on function public.deactivate_quarterly_award_signal_mapping(uuid, text) from public;
grant execute on function public.update_quarterly_award_definition(uuid, jsonb, text) to authenticated;
grant execute on function public.upsert_quarterly_award_signal_mapping(uuid, text, text, text, numeric, boolean, boolean) to authenticated;
grant execute on function public.deactivate_quarterly_award_signal_mapping(uuid, text) to authenticated;
