#!/bin/sh
# Применяет миграции supabase/migrations/*.sql по порядку. Каждая выполняется один раз,
# список применённых хранится в public.firelab_migrations. Запускается при каждом `docker compose up`.
set -eu
export PGPASSWORD="$POSTGRES_PASSWORD"
DB="host=db port=5432 dbname=postgres user=postgres"

i=0
until psql "$DB" -tAc "select 1 from auth.users limit 0" >/dev/null 2>&1; do
  i=$((i + 1))
  [ "$i" -gt 90 ] && { echo "✖ База или Auth не запустились за 3 минуты"; exit 1; }
  echo "… ожидание базы и Auth"
  sleep 2
done

psql "$DB" -v ON_ERROR_STOP=1 -q <<'SQL'
create table if not exists public.firelab_migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);
alter table public.firelab_migrations enable row level security;
revoke all on public.firelab_migrations from anon, authenticated;
SQL

for f in /migrations/*.sql; do
  name=$(basename "$f")
  done_=$(psql "$DB" -tAc "select 1 from public.firelab_migrations where name = '$name'")
  if [ "$done_" = "1" ]; then
    echo "• $name — уже применена"
    continue
  fi
  echo "→ $name"
  psql "$DB" -v ON_ERROR_STOP=1 -q -1 -f "$f" -c "insert into public.firelab_migrations(name) values ('$name')" >/dev/null
done

# PostgREST перечитывает схему (новые таблицы и функции)
psql "$DB" -qc "notify pgrst, 'reload schema'"
echo "✔ Миграции применены"
