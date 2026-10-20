-- The Next.js app reads and writes these tables only through Prisma.
-- On the hosted database that connection is the `postgres` role: it owns
-- the tables and has BYPASSRLS, so these statements do not apply to it.
-- Upload, list, and get-log keep using that role.
--
-- The site never queries with the anon key. Public pages call the server
-- routes. There is no SELECT policy for `anon` or `authenticated`: a
-- public-read policy would expose `rawLog` through the Data API, and
-- nothing in this repo reads that API.
--
-- RLS with no policy denies every role that does not bypass RLS. Revoke
-- removes any existing client grants. Both are required: a grant without
-- a policy still lets the role through once RLS is off, and a policy
-- without a revoke does not remove a grant.
--
-- The Prisma migrations table gets the same treatment and no client policy.
-- `postgres` bypasses RLS, so Prisma can still record migrations.
--
-- Local Postgres from docker-compose.yaml has no `anon` or
-- `authenticated` role. Skip the revoke there so `prisma migrate` can
-- replay this file. ENABLE ROW LEVEL SECURITY still runs.
--
-- Prisma's shadow database does not create the migrations table under the
-- name used in production, and a static reference to that table makes
-- `prisma migrate dev` fail with P1014. The name is concatenated, and the
-- statement runs only when the table is already there (`migrate deploy`).

ALTER TABLE public."LogEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Character" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  migrations_table text := '_prisma' || '_migrations';
  migrations_regclass regclass;
BEGIN
  migrations_regclass := to_regclass(format('%I.%I', 'public', migrations_table));

  IF migrations_regclass IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', migrations_table);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE public."LogEntry" FROM anon';
    EXECUTE 'REVOKE ALL ON TABLE public."Character" FROM anon';
    IF migrations_regclass IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM anon', 'public', migrations_table);
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE public."LogEntry" FROM authenticated';
    EXECUTE 'REVOKE ALL ON TABLE public."Character" FROM authenticated';
    IF migrations_regclass IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM authenticated', 'public', migrations_table);
    END IF;
  END IF;
END
$$;
