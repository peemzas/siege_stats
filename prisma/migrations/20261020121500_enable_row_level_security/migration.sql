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
-- `_prisma_migrations` gets the same treatment and no client policy.
-- `postgres` bypasses RLS, so Prisma can still record migrations.
--
-- Local Postgres from docker-compose.yaml has no `anon` or
-- `authenticated` role. Skip the revoke there so `prisma migrate` can
-- replay this file. ENABLE ROW LEVEL SECURITY still runs.

ALTER TABLE public."LogEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Character" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public."LogEntry" FROM anon;
    REVOKE ALL ON TABLE public."Character" FROM anon;
    REVOKE ALL ON TABLE public."_prisma_migrations" FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public."LogEntry" FROM authenticated;
    REVOKE ALL ON TABLE public."Character" FROM authenticated;
    REVOKE ALL ON TABLE public."_prisma_migrations" FROM authenticated;
  END IF;
END
$$;
