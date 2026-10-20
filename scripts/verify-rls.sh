#!/usr/bin/env bash
# Local proof for the RLS migration. Creates throwaway databases only.
# Refuses a hosted Supabase URL. Does not connect to production.
set -euo pipefail

if [[ "${DATABASE_URL:-}" == *supabase.co* || "${DATABASE_URL:-}" == *pooler.supabase.com* ]]; then
  echo "refusing to run: DATABASE_URL points at hosted Supabase" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

APP_URL="postgresql://siege_app:siege_app_local@127.0.0.1:5432/siege_rls_check"
PLAIN_URL="postgresql://postgres:postgres_local@127.0.0.1:5432/siege_rls_plain"
SHADOW_URL="postgresql://postgres:postgres_local@127.0.0.1:5432/siege_rls_shadow"

sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQL'
ALTER USER postgres WITH PASSWORD 'postgres_local';
SELECT pg_reload_conf();

DROP DATABASE IF EXISTS siege_rls_check;
DROP DATABASE IF EXISTS siege_rls_plain;
DROP DATABASE IF EXISTS siege_rls_shadow;
DROP ROLE IF EXISTS siege_app;
DROP ROLE IF EXISTS anon;
DROP ROLE IF EXISTS authenticated;

-- Hosted Supabase postgres is NOSUPERUSER BYPASSRLS and a member of the
-- client roles. siege_app is that shape. anon and authenticated are not.
CREATE ROLE anon NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE ROLE siege_app LOGIN PASSWORD 'siege_app_local' NOSUPERUSER BYPASSRLS;
GRANT anon TO siege_app;
GRANT authenticated TO siege_app;

CREATE DATABASE siege_rls_check OWNER siege_app;
CREATE DATABASE siege_rls_plain OWNER postgres;
CREATE DATABASE siege_rls_shadow OWNER postgres;
SQL

# Simulate an older Supabase project that grants client roles every new table.
sudo -u postgres psql -d siege_rls_check -v ON_ERROR_STOP=1 <<'SQL'
ALTER DEFAULT PRIVILEGES FOR ROLE siege_app IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated, siege_app;
SQL

echo "== migrate as non-superuser BYPASSRLS role (hosted postgres shape) =="
DATABASE_URL="$APP_URL" npx prisma migrate deploy

echo "== migrate as local superuser with no anon role (docker-compose shape) =="
DATABASE_URL="$PLAIN_URL" npx prisma migrate deploy

echo "== migration history replays, aside from pre-existing Character.name drift =="
diff_output="$(npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --shadow-database-url "$SHADOW_URL" \
  2>/tmp/prisma-diff.err || true)"
printf '%s\n' "$diff_output"
# Character.@@unique([name]) has been in schema.prisma since the table was
# added, and the original migration never created that index. Leave it.
# Fail if the diff reports anything else.
if ! printf '%s\n' "$diff_output" | grep -q "No difference detected"; then
  unexpected="$(printf '%s\n' "$diff_output" | grep -v -e '^$' -e 'Character' -e 'unique index on columns (name)' -e '^\[[*+-]\]' -e '^[[:space:]]*\[[*+-]\]' || true)"
  if [[ -n "$unexpected" ]]; then
    echo "unexpected schema drift:" >&2
    printf '%s\n' "$unexpected" >&2
    cat /tmp/prisma-diff.err >&2 || true
    exit 1
  fi
fi

echo "== anon denied, bypass role allowed =="
sudo -u postgres psql -d siege_rls_check -v ON_ERROR_STOP=1 -f scripts/rls-checks.sql

echo "== plain postgres (no anon role) still has RLS on =="
sudo -u postgres psql -d siege_rls_plain -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE
  off_count integer;
BEGIN
  SELECT count(*) INTO off_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('LogEntry', 'Character', '_prisma_migrations')
    AND NOT c.relrowsecurity;
  IF off_count <> 0 THEN
    RAISE EXCEPTION 'plain database left % tables without RLS', off_count;
  END IF;
END
$$;
SQL

echo "== API routes through Prisma as siege_app =="
export DATABASE_URL="$APP_URL"
npx prisma generate >/tmp/prisma-generate.log

PGPASSWORD=siege_app_local psql -h 127.0.0.1 -U siege_app -d siege_rls_check -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO "Character" (id, "serverName", "guildName", name, class)
VALUES ('api-knight', 'Lawolf', 'Alpha', 'KnightOne', 'Blade');
SQL

python3 - <<'PY'
from pathlib import Path
Path("/tmp/siege-sample.log").write_text(
    "[00:00:01] [Alpha] KnightOne (Blade) → Attack [Beta] DefenderTwo\n"
    "+5 +3\n",
    encoding="utf-8",
)
PY

npx next dev -p 3456 >/tmp/siege-next.log 2>&1 &
NEXT_PID=$!
cleanup() {
  if [[ -n "${NEXT_PID:-}" ]]; then
    pkill -P "$NEXT_PID" >/dev/null 2>&1 || true
    kill "$NEXT_PID" >/dev/null 2>&1 || true
    wait "$NEXT_PID" 2>/dev/null || true
  fi
  pkill -f "next dev -p 3456" >/dev/null 2>&1 || true
}
trap cleanup EXIT

ready=0
for _ in $(seq 1 90); do
  if curl -sf -o /dev/null http://127.0.0.1:3456/api/logs; then
    ready=1
    break
  fi
  sleep 1
done
if [[ "$ready" != 1 ]]; then
  echo "next did not become ready" >&2
  cat /tmp/siege-next.log >&2
  exit 1
fi

# An empty POST has no multipart body, and this route throws before its
# missing-file check. Send a form with no file, which is the 400 path.
code="$(curl -s -o /tmp/upload-missing.json -w "%{http_code}" -F "unused=1" http://127.0.0.1:3456/api/upload)"
if [[ "$code" != 400 ]]; then
  echo "upload missing file returned $code" >&2
  cat /tmp/upload-missing.json >&2
  exit 1
fi

code="$(curl -s -o /tmp/upload.json -w "%{http_code}" -F "file=@/tmp/siege-sample.log" http://127.0.0.1:3456/api/upload)"
if [[ "$code" != 200 ]]; then
  echo "upload returned $code" >&2
  cat /tmp/upload.json >&2
  exit 1
fi

code="$(curl -s -o /tmp/save.json -w "%{http_code}" \
  -F "file=@/tmp/siege-sample.log" \
  -F "logDate=2026-10-17" \
  -F "serverName=Lawolf" \
  http://127.0.0.1:3456/api/logs)"
if [[ "$code" != 200 ]]; then
  echo "save log returned $code" >&2
  cat /tmp/save.json >&2
  exit 1
fi

node <<'NODE'
const fs = require("fs");
const save = JSON.parse(fs.readFileSync("/tmp/save.json", "utf8"));
const upload = JSON.parse(fs.readFileSync("/tmp/upload.json", "utf8"));
if (!save.id) throw new Error("save missing id: " + fs.readFileSync("/tmp/save.json", "utf8"));
const knight = save.parsedData.playerResults.find((player) => player.name === "KnightOne");
if (!knight || knight.class !== "Blade") {
  throw new Error("Character read did not attach Blade: " + JSON.stringify(knight));
}
if (!upload.playerResults.some((player) => player.name === "KnightOne")) {
  throw new Error("upload did not parse KnightOne");
}
fs.writeFileSync("/tmp/saved-id.txt", save.id);
console.log("saved", save.id, "class", knight.class);
NODE

ID="$(cat /tmp/saved-id.txt)"
export ID

code="$(curl -s -o /tmp/list.json -w "%{http_code}" http://127.0.0.1:3456/api/logs)"
if [[ "$code" != 200 ]]; then
  echo "list returned $code" >&2
  cat /tmp/list.json >&2
  exit 1
fi

code="$(curl -s -o /tmp/list-server.json -w "%{http_code}" "http://127.0.0.1:3456/api/logs?serverName=Lawolf")"
if [[ "$code" != 200 ]]; then
  echo "list server returned $code" >&2
  cat /tmp/list-server.json >&2
  exit 1
fi

code="$(curl -s -o /tmp/get.json -w "%{http_code}" "http://127.0.0.1:3456/api/logs/${ID}")"
if [[ "$code" != 200 ]]; then
  echo "get log returned $code" >&2
  cat /tmp/get.json >&2
  exit 1
fi

node <<'NODE'
const fs = require("fs");
const list = JSON.parse(fs.readFileSync("/tmp/list.json", "utf8"));
const serverList = JSON.parse(fs.readFileSync("/tmp/list-server.json", "utf8"));
const got = JSON.parse(fs.readFileSync("/tmp/get.json", "utf8"));
const id = process.env.ID;
if (!list.servers.some((server) => server.name === "Lawolf" && server.count >= 1)) {
  throw new Error("list servers: " + JSON.stringify(list));
}
if (!serverList.some((row) => row.id === id)) {
  throw new Error("server list missing id: " + JSON.stringify(serverList));
}
if (got.id !== id || got.serverName !== "Lawolf" || got.logDate !== "2026-10-17") {
  throw new Error("get log mismatch: " + JSON.stringify({ id: got.id, serverName: got.serverName, logDate: got.logDate }));
}
const knight = got.parsedData.playerResults.find((player) => player.name === "KnightOne");
if (!knight || knight.class !== "Blade") {
  throw new Error("stored class missing: " + JSON.stringify(knight));
}
console.log("list/get ok", got.id, got.logDate);
NODE

echo "RLS checks passed"
