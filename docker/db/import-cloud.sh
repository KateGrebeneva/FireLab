#!/bin/sh
# Перенос данных из облачного Supabase в Docker-версию FireLab (один раз, при переезде).
#
#   docker compose run --rm import
#
# Копирует учётные записи (с паролями), профили сотрудников, вопросы с вариантами,
# все попытки с разбором, настройки и журнал действий. Данные Docker-версии ПОЛНОСТЬЮ
# заменяются облачными, всё выполняется в одной транзакции: при любой ошибке ничего не меняется.
# Облачная база только читается и не изменяется.
set -eu

[ -n "${CLOUD_DB_URL:-}" ] || { echo "✖ Впишите CLOUD_DB_URL в .env (Supabase → Connect → Session pooler)"; exit 1; }

CLOUD="$CLOUD_DB_URL"
case "$CLOUD" in
  *supabase.com*)
    case "$CLOUD" in
      *sslmode=*) ;;
      *\?*) CLOUD="$CLOUD&sslmode=require" ;;
      *) CLOUD="$CLOUD?sslmode=require" ;;
    esac ;;
esac
export PGCONNECT_TIMEOUT=20
LOCAL_DB="host=${LOCAL_HOST:-db} port=${LOCAL_PORT:-5432} dbname=${LOCAL_DBNAME:-postgres} user=${LOCAL_USER:-supabase_admin}"
WORK="${WORK_DIR:-/tmp/firelab-import}"

cq() { psql "$CLOUD" -X -q -v ON_ERROR_STOP=1 -tA "$@"; }
lq() { PGPASSWORD="$POSTGRES_PASSWORD" psql "$LOCAL_DB" -X -q -v ON_ERROR_STOP=1 -tA "$@"; }

echo "→ Подключение к облачной базе…"
if ! cq -c "select 1" >/dev/null; then
  echo "✖ Не удалось подключиться к облаку. Проверьте CLOUD_DB_URL (пароль базы, Session pooler) и интернет."
  exit 1
fi

if [ "$(lq -c "select count(*) from public.firelab_migrations where name = '007_question_bank.sql'")" != "1" ]; then
  echo "✖ Docker-версия ещё не готова: сначала выполните docker compose up -d"
  exit 1
fi

n_local=$(lq -c "select count(*) from public.attempts")
if [ "$n_local" != "0" ] && [ "${FORCE:-no}" != "yes" ]; then
  echo "✖ В Docker-версии уже есть результаты ($n_local). Импорт заменит их облачными данными."
  echo "  Если это нужно, запустите: docker compose run --rm -e FORCE=yes import"
  exit 1
fi

rm -rf "$WORK"
mkdir -p "$WORK"
LOAD="$WORK/load.sql"
cat > "$LOAD" <<'SQL'
\set ON_ERROR_STOP on
begin;
-- очищаем данные Docker-версии (каскадом удаляются профили, сессии, разборы попыток, варианты ответов)
delete from public.audit_log;
delete from public.attempts;
delete from public.questions;
delete from public.settings;
delete from auth.users;
SQL

echo "→ Чтение данных из облака:"
for t in auth.users auth.identities public.profiles public.settings public.questions public.answers \
         public.attempts public.attempt_questions public.audit_log; do
  s=${t%%.*}
  n=${t#*.}
  if [ "$(cq -c "select to_regclass('$t') is not null")" != "t" ]; then
    echo "  • $t — нет в облаке, пропущено"
    continue
  fi
  cloud_cols=",$(cq -c "select string_agg(column_name, ',') from information_schema.columns where table_schema = '$s' and table_name = '$n'"),"
  cols=""
  for c in $(lq -c "select column_name from information_schema.columns
                    where table_schema = '$s' and table_name = '$n'
                      and is_generated = 'NEVER' and coalesce(identity_generation, '') <> 'ALWAYS'
                    order by ordinal_position"); do
    case "$cloud_cols" in
      *",$c,"*) cols="$cols${cols:+,}\"$c\"" ;;
    esac
  done
  [ -n "$cols" ] || { echo "✖ $t: нет общих колонок"; exit 1; }
  order=""
  [ "$n" = "audit_log" ] && order="order by \"at\""
  file="$WORK/$s.$n.tsv"
  cq -c "\\copy (select $cols from $t $order) to '$file'"
  rows=$(wc -l < "$file" | tr -d ' ')
  echo "  • $t — $rows"
  printf '%s\n' "\\copy $t ($cols) from '$file'" >> "$LOAD"
done
echo "commit;" >> "$LOAD"

echo "→ Запись в Docker-версию…"
lq -f "$LOAD" >/dev/null
rm -rf "$WORK"

echo "✔ Перенос завершён:"
lq -c "select '  сотрудников и администраторов: ' || (select count(*) from public.profiles)
       || chr(10) || '  вопросов: ' || (select count(*) from public.questions)
       || chr(10) || '  попыток: ' || (select count(*) from public.attempts where completed_at is not null)"
echo "  Входите на новом сайте с теми же логинами и паролями, что и в облаке."
