-- Proves the RLS migration against a local database shaped like Supabase.
-- Run as a superuser after prisma migrate deploy. The whole script rolls
-- back, so the grants and rows it creates do not remain.
--
-- Required roles: siege_app (NOSUPERUSER, BYPASSRLS, table owner),
-- anon and authenticated (NOSUPERUSER, NOBYPASSRLS).

\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  is_super boolean;
  bypass boolean;
  rls_on boolean;
  forced boolean;
  policy_count integer;
  visible integer;
  changed integer;
  stored text;
BEGIN
  SELECT rolsuper, rolbypassrls INTO is_super, bypass FROM pg_roles WHERE rolname = 'siege_app';
  IF is_super IS DISTINCT FROM false OR bypass IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'siege_app must be NOSUPERUSER and BYPASSRLS, matching hosted postgres';
  END IF;
  IF NOT pg_has_role('siege_app', 'anon', 'MEMBER') THEN
    RAISE EXCEPTION 'siege_app should be a member of anon, matching hosted postgres';
  END IF;

  SELECT rolsuper, rolbypassrls INTO is_super, bypass FROM pg_roles WHERE rolname = 'anon';
  IF is_super IS DISTINCT FROM false OR bypass IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'anon must be NOSUPERUSER and not BYPASSRLS';
  END IF;

  SELECT rolsuper, rolbypassrls INTO is_super, bypass FROM pg_roles WHERE rolname = 'authenticated';
  IF is_super IS DISTINCT FROM false OR bypass IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'authenticated must be NOSUPERUSER and not BYPASSRLS';
  END IF;

  SELECT c.relrowsecurity, c.relforcerowsecurity
    INTO rls_on, forced
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'LogEntry';
  IF rls_on IS NOT TRUE OR forced IS TRUE THEN
    RAISE EXCEPTION 'LogEntry RLS flags are % / forced %', rls_on, forced;
  END IF;

  SELECT c.relrowsecurity INTO rls_on
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'Character';
  IF rls_on IS NOT TRUE THEN
    RAISE EXCEPTION 'Character RLS is off';
  END IF;

  SELECT c.relrowsecurity INTO rls_on
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = '_prisma_migrations';
  IF rls_on IS NOT TRUE THEN
    RAISE EXCEPTION '_prisma_migrations RLS is off';
  END IF;

  SELECT count(*) INTO policy_count FROM pg_policies WHERE schemaname = 'public';
  IF policy_count <> 0 THEN
    RAISE EXCEPTION 'expected no policies, found %', policy_count;
  END IF;

  IF has_table_privilege('anon', 'public."LogEntry"', 'SELECT,INSERT,UPDATE,DELETE')
     OR has_table_privilege('anon', 'public."Character"', 'SELECT,INSERT,UPDATE,DELETE')
     OR has_table_privilege('anon', 'public."_prisma_migrations"', 'SELECT,INSERT,UPDATE,DELETE')
     OR has_table_privilege('authenticated', 'public."LogEntry"', 'SELECT,INSERT,UPDATE,DELETE')
     OR has_table_privilege('authenticated', 'public."Character"', 'SELECT,INSERT,UPDATE,DELETE')
     OR has_table_privilege('authenticated', 'public."_prisma_migrations"', 'SELECT,INSERT,UPDATE,DELETE')
  THEN
    RAISE EXCEPTION 'client roles still hold table privileges after the migration';
  END IF;

  -- Re-grant inside this transaction. This is the advisor's threat: the
  -- anon key has table privileges. RLS must still hide and reject rows.
  GRANT USAGE ON SCHEMA public TO anon, authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    public."LogEntry", public."Character", public."_prisma_migrations"
    TO anon, authenticated;

  IF NOT has_table_privilege('anon', 'public."LogEntry"', 'INSERT') THEN
    RAISE EXCEPTION 'test setup failed to grant anon insert';
  END IF;

  EXECUTE 'SET LOCAL ROLE siege_app';
  INSERT INTO public."LogEntry" (id, "logDate", "rawLog", "parsedData", "serverName")
  VALUES ('rls-check-log', '2026-10-20', 'kept', '{"ok":true}', 'Lawolf');
  INSERT INTO public."Character" (id, "serverName", "guildName", name, class)
  VALUES ('rls-check-character', 'Lawolf', 'Alpha', 'KnightOne', 'Blade');

  SELECT count(*) INTO visible FROM public."LogEntry" WHERE id = 'rls-check-log';
  IF visible <> 1 THEN
    RAISE EXCEPTION 'bypass role could not read its log insert (%)', visible;
  END IF;

  UPDATE public."Character" SET class = 'Knight' WHERE id = 'rls-check-character';
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 1 THEN
    RAISE EXCEPTION 'bypass role could not update Character';
  END IF;

  EXECUTE 'SET LOCAL ROLE anon';
  SELECT count(*) INTO visible FROM public."LogEntry";
  IF visible <> 0 THEN
    RAISE EXCEPTION 'anon can see % LogEntry rows', visible;
  END IF;
  SELECT count(*) INTO visible FROM public."Character";
  IF visible <> 0 THEN
    RAISE EXCEPTION 'anon can see % Character rows', visible;
  END IF;
  SELECT count(*) INTO visible FROM public."_prisma_migrations";
  IF visible <> 0 THEN
    RAISE EXCEPTION 'anon can see % migration rows', visible;
  END IF;

  BEGIN
    INSERT INTO public."LogEntry" (id, "logDate", "rawLog", "parsedData", "serverName")
    VALUES ('rls-anon-log', '2026-10-20', 'nope', '{}', 'Lawolf');
    RAISE EXCEPTION 'anon insert into LogEntry succeeded';
  EXCEPTION
    WHEN insufficient_privilege THEN
      IF SQLERRM NOT LIKE '%row-level security%' THEN
        RAISE EXCEPTION 'anon LogEntry insert failed for the wrong reason: %', SQLERRM;
      END IF;
  END;

  BEGIN
    INSERT INTO public."Character" (id, "serverName", name, class)
    VALUES ('rls-anon-character', 'Lawolf', 'Anon', 'Blade');
    RAISE EXCEPTION 'anon insert into Character succeeded';
  EXCEPTION
    WHEN insufficient_privilege THEN
      IF SQLERRM NOT LIKE '%row-level security%' THEN
        RAISE EXCEPTION 'anon Character insert failed for the wrong reason: %', SQLERRM;
      END IF;
  END;

  BEGIN
    INSERT INTO public."_prisma_migrations" (id, checksum, migration_name, started_at)
    VALUES ('rls-anon-migration', 'x', 'anon_should_fail', CURRENT_TIMESTAMP);
    RAISE EXCEPTION 'anon insert into _prisma_migrations succeeded';
  EXCEPTION
    WHEN insufficient_privilege THEN
      IF SQLERRM NOT LIKE '%row-level security%' THEN
        RAISE EXCEPTION 'anon migration insert failed for the wrong reason: %', SQLERRM;
      END IF;
  END;

  UPDATE public."LogEntry" SET "rawLog" = 'hacked' WHERE id = 'rls-check-log';
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 0 THEN
    RAISE EXCEPTION 'anon updated % LogEntry rows', changed;
  END IF;

  DELETE FROM public."Character" WHERE id = 'rls-check-character';
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 0 THEN
    RAISE EXCEPTION 'anon deleted % Character rows', changed;
  END IF;

  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO visible FROM public."LogEntry";
  IF visible <> 0 THEN
    RAISE EXCEPTION 'authenticated can see % LogEntry rows', visible;
  END IF;
  BEGIN
    INSERT INTO public."LogEntry" (id, "logDate", "rawLog", "parsedData", "serverName")
    VALUES ('rls-auth-log', '2026-10-20', 'nope', '{}', 'Lawolf');
    RAISE EXCEPTION 'authenticated insert into LogEntry succeeded';
  EXCEPTION
    WHEN insufficient_privilege THEN
      IF SQLERRM NOT LIKE '%row-level security%' THEN
        RAISE EXCEPTION 'authenticated insert failed for the wrong reason: %', SQLERRM;
      END IF;
  END;

  EXECUTE 'SET LOCAL ROLE siege_app';
  SELECT "rawLog" INTO stored FROM public."LogEntry" WHERE id = 'rls-check-log';
  IF stored IS DISTINCT FROM 'kept' THEN
    RAISE EXCEPTION 'anon write changed LogEntry rawLog to %', stored;
  END IF;
  SELECT class INTO stored FROM public."Character" WHERE id = 'rls-check-character';
  IF stored IS DISTINCT FROM 'Knight' THEN
    RAISE EXCEPTION 'Character class changed to %', stored;
  END IF;

  DELETE FROM public."LogEntry" WHERE id = 'rls-check-log';
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 1 THEN
    RAISE EXCEPTION 'bypass role could not delete its log row';
  END IF;

  DELETE FROM public."Character" WHERE id = 'rls-check-character';
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 1 THEN
    RAISE EXCEPTION 'bypass role could not delete its character row';
  END IF;
END
$$;

ROLLBACK;
