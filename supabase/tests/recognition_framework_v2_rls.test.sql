begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(12);

select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.recognition_definitions'::regclass),
  'recognition definitions have RLS enabled'
);
select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.recognition_definition_graduate_values'::regclass),
  'Graduate Value mappings have RLS enabled'
);
select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.recognition_nominations'::regclass),
  'recognition nominations have RLS enabled'
);
select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.recognition_logs'::regclass),
  'the canonical ledger has RLS enabled'
);

select extensions.is(
  has_table_privilege('authenticated', 'public.recognition_logs', 'INSERT'),
  false,
  'authenticated clients cannot insert directly into the ledger'
);
select extensions.is(
  has_table_privilege('authenticated', 'public.recognition_logs', 'UPDATE'),
  false,
  'authenticated clients cannot update ledger rows directly'
);
select extensions.is(
  has_table_privilege('authenticated', 'public.recognition_logs', 'DELETE'),
  false,
  'authenticated clients cannot delete ledger rows directly'
);
select extensions.is(
  has_table_privilege('authenticated', 'public.recognition_nominations', 'INSERT'),
  false,
  'authenticated clients cannot insert nominations directly'
);
select extensions.is(
  has_table_privilege('authenticated', 'public.recognition_definitions', 'UPDATE'),
  false,
  'ordinary clients cannot rewrite definition points or wording'
);

select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.create_recognition_awards_v2(uuid[],text,text,text,text,timestamptz,text)',
    'EXECUTE'
  ),
  'authenticated clients can call the guarded direct-award operation'
);
select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.submit_recognition_nomination_v2(uuid,text,text,text,text,text,timestamptz)',
    'EXECUTE'
  ),
  'authenticated clients can call the guarded nomination operation'
);
select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.review_recognition_nomination_v2(uuid,text,text)',
    'EXECUTE'
  ),
  'the review function is callable but enforces its own approval permission'
);

select extensions.finish();
rollback;
