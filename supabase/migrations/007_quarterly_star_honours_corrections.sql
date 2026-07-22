-- Make reopened and multi-slot decisions safely replaceable without deleting history.

alter table public.quarterly_award_recipients
  drop constraint if exists quarterly_award_recipient_student_required;

alter table public.quarterly_award_recipients
  add constraint quarterly_award_recipient_student_required check (
    (student_id is null) = (candidate_score_id is null)
    and (
      (status = 'not_issued' and student_id is null)
      or (status in ('selected', 'finalised') and student_id is not null)
      or status = 'revoked'
    )
  );

create or replace function public.replace_quarterly_award_slot_before_insert()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  existing_row public.quarterly_award_recipients;
  revoked_row public.quarterly_award_recipients;
begin
  if new.status not in ('selected', 'not_issued') then return new; end if;

  select * into existing_row
  from public.quarterly_award_recipients qr
  where qr.award_period_id = new.award_period_id
    and qr.award_definition_id = new.award_definition_id
    and qr.scope_type = new.scope_type
    and qr.scope_key = new.scope_key
    and qr.recipient_slot = new.recipient_slot
    and qr.status in ('selected', 'not_issued')
  order by qr.created_at desc
  limit 1
  for update;

  if existing_row.id is null then return new; end if;

  update public.quarterly_award_recipients
  set status = 'revoked',
      revoked_at = now(),
      revoked_by = actor_id,
      revocation_reason = case
        when new.status = 'selected' then 'Replaced by a recipient after review'
        else 'Replaced by a no-recipient decision after review'
      end,
      updated_at = now()
  where id = existing_row.id
  returning * into revoked_row;

  if existing_row.candidate_score_id is not null then
    update public.quarterly_award_candidate_reviews
    set review_status = 'unreviewed',
        reviewed_by = actor_id,
        reviewed_at = now(),
        updated_at = now()
    where candidate_score_id = existing_row.candidate_score_id;
  end if;

  perform public.write_honours_audit(
    new.school_id,
    case
      when new.status = 'selected' then 'quarterly_honours.no_recipient_replaced'
      else 'quarterly_honours.selection_replaced_by_no_recipient'
    end,
    'quarterly_award_recipients',
    revoked_row.id::text,
    to_jsonb(existing_row),
    to_jsonb(revoked_row) || jsonb_build_object(
      'replacement_status', new.status,
      'recipient_slot', new.recipient_slot
    )
  );
  return new;
end;
$$;

drop trigger if exists quarterly_award_recipient_replace_slot on public.quarterly_award_recipients;
create trigger quarterly_award_recipient_replace_slot
before insert on public.quarterly_award_recipients
for each row execute function public.replace_quarterly_award_slot_before_insert();

create or replace function public.revoke_quarterly_award_recipient(
  p_recipient_id uuid,
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
  old_row public.quarterly_award_recipients;
  recipient_row public.quarterly_award_recipients;
  old_period public.quarterly_award_periods;
  reopened_period public.quarterly_award_periods;
begin
  if actor_id is null or not public.current_user_has_permission('honours.revoke') then
    raise exception 'Forbidden.' using errcode = '42501';
  end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'A revocation reason is required.';
  end if;
  actor_school := public.current_user_school_id();
  select * into old_row from public.quarterly_award_recipients
  where id = p_recipient_id
    and school_id = actor_school
    and status in ('selected', 'finalised', 'not_issued');
  if not found then raise exception 'Active award outcome not found.'; end if;

  select * into old_period
  from public.quarterly_award_periods
  where id = old_row.award_period_id and school_id = actor_school;

  if old_period.status = 'finalised' then
    update public.quarterly_award_periods
    set status = 'review_open',
        reopened_at = now(),
        reopened_by = actor_id,
        finalised_at = null,
        finalised_by = null,
        updated_at = now()
    where id = old_period.id
    returning * into reopened_period;

    perform public.write_honours_audit(
      actor_school,
      'quarterly_honours.period_reopened',
      'quarterly_award_periods',
      reopened_period.id::text,
      to_jsonb(old_period),
      to_jsonb(reopened_period) || jsonb_build_object(
        'reason', 'Reopened by award revocation: ' || trim(p_reason)
      )
    );
  end if;

  update public.quarterly_award_recipients
  set status = 'revoked',
      revoked_at = now(),
      revoked_by = actor_id,
      revocation_reason = trim(p_reason),
      updated_at = now()
  where id = old_row.id returning * into recipient_row;

  if old_row.candidate_score_id is not null then
    update public.quarterly_award_candidate_reviews
    set review_status = 'unreviewed', reviewed_by = actor_id, reviewed_at = now(), updated_at = now()
    where candidate_score_id = old_row.candidate_score_id;
  end if;

  perform public.write_honours_audit(
    actor_school,
    'quarterly_honours.recipient_revoked',
    'quarterly_award_recipients',
    recipient_row.id::text,
    to_jsonb(old_row),
    to_jsonb(recipient_row)
  );
  return to_jsonb(recipient_row);
end;
$$;

revoke all on function public.revoke_quarterly_award_recipient(uuid, text) from public;
grant execute on function public.revoke_quarterly_award_recipient(uuid, text) to authenticated;
