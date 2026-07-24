-- Dashboard clients use this publication only as an invalidation signal. Existing
-- recognition_logs RLS policies continue to determine which changes each user sees.
do $$
begin
  if exists (
    select 1
    from pg_catalog.pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'recognition_logs'
  ) then
    alter publication supabase_realtime add table public.recognition_logs;
  end if;
end
$$;
