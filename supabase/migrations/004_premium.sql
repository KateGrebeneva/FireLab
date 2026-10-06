-- 004: усиление безопасности, таймер экзамена на сервере, RPC статистики.
-- Миграция идемпотентна: её можно запускать повторно.

-- ---------------------------------------------------------------
-- Схема
-- ---------------------------------------------------------------
alter table attempt_questions add column if not exists question_id uuid references questions on delete set null;
alter table attempts add column if not exists deadline timestamptz;
alter table profiles add column if not exists updated_at timestamptz default now();

create index if not exists attempts_user_idx on attempts(user_id, completed_at desc);
create index if not exists attempts_completed_idx on attempts(completed_at desc);
create index if not exists aq_attempt_idx on attempt_questions(attempt_id, position);
create index if not exists aq_question_idx on attempt_questions(question_id);
create index if not exists answers_q_idx on answers(question_id);
create unique index if not exists profiles_username_lower_idx on profiles (lower(username));

-- Валидация на уровне БД (защита от мусорных данных даже при обходе UI)
do $$ begin
  alter table questions add constraint questions_category_len check (length(category) between 1 and 200);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table answers add constraint answers_text_len check (length(trim(answer_text)) between 1 and 2000);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table profiles add constraint profiles_username_fmt check (username ~ '^[A-Za-z0-9._-]{3,40}$');
exception when duplicate_object or check_violation then null; end $$;

insert into settings(key, value) values ('show_explanations', 'true') on conflict (key) do nothing;

-- ---------------------------------------------------------------
-- Защита профилей: админ не может снять с себя роль или заблокировать себя
-- ---------------------------------------------------------------
create or replace function protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.id = auth.uid() and (new.role <> old.role or new.is_active = false) then
    raise exception 'Нельзя изменить собственную роль или заблокировать себя';
  end if;
  if new.id <> old.id then
    raise exception 'Идентификатор профиля менять нельзя';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_protect_profile on profiles;
create trigger trg_protect_profile before update on profiles for each row execute function protect_profile();

-- updated_at для вопросов
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists trg_questions_touch on questions;
create trigger trg_questions_touch before update on questions for each row execute function touch_updated_at();

-- ---------------------------------------------------------------
-- RLS: явные политики (повторно, на случай старой версии 001)
-- ---------------------------------------------------------------
alter table profiles enable row level security;
alter table questions enable row level security;
alter table answers enable row level security;
alter table attempts enable row level security;
alter table attempt_questions enable row level security;
alter table settings enable row level security;

drop policy if exists p_sel on profiles;
drop policy if exists p_upd on profiles;
drop policy if exists p_del on profiles;
create policy p_sel on profiles for select to authenticated using (id = auth.uid() or is_admin());
create policy p_upd on profiles for update to authenticated using (is_admin()) with check (is_admin());
create policy p_del on profiles for delete to authenticated using (is_admin() and id <> auth.uid());
-- INSERT в profiles политики нет: создаются только через service role (seed / Edge Function).

drop policy if exists q_all on questions;
drop policy if exists a_all on answers;
create policy q_all on questions for all to authenticated using (is_admin()) with check (is_admin());
create policy a_all on answers for all to authenticated using (is_admin()) with check (is_admin());
-- Сотрудник НЕ читает банк вопросов напрямую: билет выдаёт start_attempt без правильных ответов.

drop policy if exists s_sel on settings;
drop policy if exists s_w on settings;
create policy s_sel on settings for select to authenticated using (true);
create policy s_w on settings for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists at_sel on attempts;
drop policy if exists at_del on attempts;
create policy at_sel on attempts for select to authenticated using (user_id = auth.uid() or is_admin());
create policy at_del on attempts for delete to authenticated using (is_admin());
-- INSERT/UPDATE попыток — только через RPC start_attempt / finish_attempt (security definer).
-- Завершённая попытка неизменяема: UPDATE-политики нет ни для кого.

drop policy if exists aq_sel on attempt_questions;
create policy aq_sel on attempt_questions for select to authenticated using (
  is_admin() or exists (
    select 1 from attempts a where a.id = attempt_id and a.user_id = auth.uid() and a.completed_at is not null
  )
);

revoke all on function email_for_login(text) from public;
grant execute on function email_for_login(text) to anon, authenticated;

create or replace function email_for_login(p_login text) returns text
language sql security definer stable set search_path = public, auth as
$$ select u.email from profiles p join auth.users u on u.id = p.id
   where lower(p.username) = lower(trim(p_login)) and p.is_active limit 1 $$;

-- ---------------------------------------------------------------
-- Старт попытки
-- ---------------------------------------------------------------
create or replace function start_attempt(p_type text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int; aid uuid; mins int; res jsonb; avail int;
begin
  if p_type not in ('training', 'exam') then raise exception 'Неизвестный тип теста'; end if;
  if not exists(select 1 from profiles where id = auth.uid() and is_active) then
    raise exception 'Доступ заблокирован';
  end if;

  select coalesce(value::int, case when p_type = 'exam' then 25 else 15 end) into n
    from settings where key = case when p_type = 'exam' then 'exam_count' else 'training_count' end;
  n := coalesce(n, case when p_type = 'exam' then 25 else 15 end);
  select coalesce(value::int, 0) into mins from settings where key = 'exam_minutes';
  mins := coalesce(mins, 0);

  select count(*) into avail from questions q
   where (select count(*) from answers a where a.question_id = q.id and a.is_correct) = 1
     and (select count(*) from answers a where a.question_id = q.id) >= 2;
  if avail < n then
    raise exception 'Недостаточно вопросов в базе: для режима нужно минимум %, сейчас доступно %', n, avail;
  end if;

  -- брошенные незавершённые попытки этого сотрудника не нужны
  delete from attempts where user_id = auth.uid() and completed_at is null;

  insert into attempts(user_id, type, total_questions, deadline)
  values (auth.uid(), p_type, n,
          case when p_type = 'exam' and mins > 0 then now() + make_interval(mins => mins) end)
  returning id into aid;

  insert into attempt_questions(attempt_id, position, question_id, question_text, category, explanation, options)
  select aid, row_number() over (order by random()), q.id, q.question_text, q.category, q.explanation,
    (select jsonb_agg(jsonb_build_object('id', x.rn, 'text', x.answer_text, 'is_correct', x.is_correct) order by x.rn)
       from (select a.answer_text, a.is_correct, row_number() over (order by random()) rn
               from answers a where a.question_id = q.id) x)
  from (
    select * from questions q
     where (select count(*) from answers a where a.question_id = q.id and a.is_correct) = 1
       and (select count(*) from answers a where a.question_id = q.id) >= 2
     order by random()
     limit n
  ) q;

  select jsonb_build_object(
    'attempt_id', aid,
    'type', p_type,
    'minutes', case when p_type = 'exam' then mins else 0 end,
    'deadline', (select deadline from attempts where id = aid),
    'questions', jsonb_agg(jsonb_build_object(
      'id', aq.id,
      'category', aq.category,
      'text', aq.question_text,
      'options', (select jsonb_agg(jsonb_build_object('id', o->'id', 'text', o->'text') order by (o->>'id')::int)
                    from jsonb_array_elements(aq.options) o)
    ) order by aq.position)
  ) into res
  from attempt_questions aq where aq.attempt_id = aid;
  return res;
end $$;

-- ---------------------------------------------------------------
-- Завершение попытки (проверка только на сервере)
-- ---------------------------------------------------------------
drop function if exists finish_attempt(uuid, jsonb) cascade;
-- (пересоздаём из-за смены типа результата void -> jsonb)
create or replace function finish_attempt(p_attempt uuid, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a attempts; c int; pp int; late boolean;
begin
  select * into a from attempts where id = p_attempt and user_id = auth.uid() and completed_at is null for update;
  if not found then raise exception 'Попытка недоступна или уже завершена'; end if;
  if jsonb_typeof(coalesce(p_answers, '{}'::jsonb)) <> 'object' then raise exception 'Неверный формат ответов'; end if;

  late := a.deadline is not null and now() > a.deadline + interval '60 seconds';

  if not late then
    update attempt_questions aq
       set selected = case when (p_answers->>aq.id::text) ~ '^\d{1,3}$' then (p_answers->>aq.id::text)::int end
     where aq.attempt_id = p_attempt;
  end if;

  select count(*) into c from attempt_questions aq
   where aq.attempt_id = p_attempt and exists (
     select 1 from jsonb_array_elements(aq.options) o
      where (o->>'id')::int = aq.selected and (o->>'is_correct')::boolean);

  select coalesce(value::int, 80) into pp from settings where key = 'pass_percent';
  pp := coalesce(pp, 80);

  update attempts set
    correct_answers = c,
    incorrect_answers = total_questions - c,
    percentage = round(c * 100.0 / total_questions),
    passed = case when type = 'exam' then round(c * 100.0 / total_questions) >= pp end,
    completed_at = now()
  where id = p_attempt;

  return jsonb_build_object('attempt_id', p_attempt, 'late', late);
end $$;

-- Сколько вопросов доступно (для экрана старта, без раскрытия содержимого банка)
create or replace function available_questions() returns int
language sql security definer stable set search_path = public as $$
  select count(*)::int from questions q
   where (select count(*) from answers a where a.question_id = q.id and a.is_correct) = 1
     and (select count(*) from answers a where a.question_id = q.id) >= 2
$$;

-- ---------------------------------------------------------------
-- Статистика
-- ---------------------------------------------------------------
-- Сводка по сотрудникам (только админ)
create or replace function admin_employee_stats()
returns table(user_id uuid, attempts int, exams int, passed int, avg_pct int, best_pct int, last_at timestamptz, last_exam_pct int, last_exam_passed boolean)
language plpgsql security definer stable set search_path = public as $$
begin
  if not is_admin() then raise exception 'Нет доступа'; end if;
  return query
  select p.id,
         count(a.id)::int,
         count(a.id) filter (where a.type = 'exam')::int,
         count(a.id) filter (where a.type = 'exam' and a.passed)::int,
         coalesce(round(avg(a.percentage)), 0)::int,
         coalesce(max(a.percentage), 0)::int,
         max(a.completed_at),
         (select a2.percentage from attempts a2 where a2.user_id = p.id and a2.type = 'exam' and a2.completed_at is not null order by a2.completed_at desc limit 1),
         (select a2.passed from attempts a2 where a2.user_id = p.id and a2.type = 'exam' and a2.completed_at is not null order by a2.completed_at desc limit 1)
    from profiles p
    left join attempts a on a.user_id = p.id and a.completed_at is not null
   where p.role = 'employee'
   group by p.id;
end $$;

-- Динамика по дням (админ — все; сотрудник — только свои)
create or replace function daily_stats(p_days int default 30, p_user uuid default null)
returns table(day date, attempts int, avg_pct int, exams int, passed int)
language plpgsql security definer stable set search_path = public as $$
declare uid uuid := p_user;
begin
  if not is_admin() then uid := auth.uid(); end if;
  return query
  select d::date,
         count(a.id)::int,
         coalesce(round(avg(a.percentage)), 0)::int,
         count(a.id) filter (where a.type = 'exam')::int,
         count(a.id) filter (where a.type = 'exam' and a.passed)::int
    from generate_series(current_date - (least(greatest(p_days, 1), 365) - 1), current_date, interval '1 day') d
    left join attempts a on a.completed_at is not null
         and a.completed_at::date = d::date
         and (uid is null or a.user_id = uid)
   group by d order by d;
end $$;

-- Ошибки по категориям (админ — все или конкретный сотрудник; сотрудник — только свои)
create or replace function category_stats(p_user uuid default null)
returns table(category text, total int, wrong int)
language plpgsql security definer stable set search_path = public as $$
declare uid uuid := p_user;
begin
  if not is_admin() then uid := auth.uid(); end if;
  return query
  select coalesce(aq.category, 'Без категории'),
         count(*)::int,
         count(*) filter (where not exists (
           select 1 from jsonb_array_elements(aq.options) o
            where (o->>'id')::int = aq.selected and (o->>'is_correct')::boolean))::int
    from attempt_questions aq
    join attempts a on a.id = aq.attempt_id and a.completed_at is not null
   where uid is null or a.user_id = uid
   group by 1
   order by 3 desc;
end $$;

-- Самые сложные вопросы (только админ)
create or replace function hardest_questions(p_limit int default 10, p_min int default 2)
returns table(question_id uuid, question_text text, category text, total int, wrong int)
language plpgsql security definer stable set search_path = public as $$
begin
  if not is_admin() then raise exception 'Нет доступа'; end if;
  return query
  select max(aq.question_id::text)::uuid,
         aq.question_text,
         max(aq.category),
         count(*)::int,
         count(*) filter (where not exists (
           select 1 from jsonb_array_elements(aq.options) o
            where (o->>'id')::int = aq.selected and (o->>'is_correct')::boolean))::int as w
    from attempt_questions aq
    join attempts a on a.id = aq.attempt_id and a.completed_at is not null
   group by aq.question_text
  having count(*) >= p_min
   order by (count(*) filter (where not exists (
           select 1 from jsonb_array_elements(aq.options) o
            where (o->>'id')::int = aq.selected and (o->>'is_correct')::boolean)))::float / count(*) desc, count(*) desc
   limit least(greatest(p_limit, 1), 50);
end $$;

-- Сводные показатели (админ)
create or replace function admin_overview(p_days int default 30)
returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare r jsonb;
begin
  if not is_admin() then raise exception 'Нет доступа'; end if;
  select jsonb_build_object(
    'employees', (select count(*) from profiles where role = 'employee'),
    'active_employees', (select count(*) from profiles where role = 'employee' and is_active),
    'questions', (select count(*) from questions),
    'attempts', (select count(*) from attempts where completed_at is not null),
    'attempts_period', (select count(*) from attempts where completed_at > now() - make_interval(days => p_days)),
    'avg_pct', (select coalesce(round(avg(percentage)), 0) from attempts where completed_at is not null),
    'exams', (select count(*) from attempts where type = 'exam' and completed_at is not null),
    'exams_passed', (select count(*) from attempts where type = 'exam' and passed),
    'pass_rate', (select coalesce(round(100.0 * count(*) filter (where passed) / nullif(count(*), 0)), 0)
                    from attempts where type = 'exam' and completed_at is not null)
  ) into r;
  return r;
end $$;

revoke all on function start_attempt(text), finish_attempt(uuid, jsonb), available_questions(),
  admin_employee_stats(), daily_stats(int, uuid), category_stats(uuid), hardest_questions(int, int), admin_overview(int)
  from public, anon;
grant execute on function start_attempt(text), finish_attempt(uuid, jsonb), available_questions(),
  admin_employee_stats(), daily_stats(int, uuid), category_stats(uuid), hardest_questions(int, int), admin_overview(int)
  to authenticated;

-- Таблицы не должны быть доступны анонимам вовсе
revoke all on profiles, questions, answers, attempts, attempt_questions, settings from anon;

-- ---------------------------------------------------------------
-- Атомарное сохранение вопроса вместе с вариантами (только админ)
-- p_answers: [{"text": "...", "is_correct": true}, ...]
-- ---------------------------------------------------------------
create or replace function save_question(p_id uuid, p_category text, p_text text, p_explanation text, p_answers jsonb)
returns uuid
language plpgsql security definer set search_path = public as $$
declare qid uuid := p_id; n int; ok int;
begin
  if not is_admin() then raise exception 'Нет доступа'; end if;
  if coalesce(length(trim(p_text)), 0) < 5 then raise exception 'Текст вопроса слишком короткий'; end if;
  if coalesce(length(trim(p_category)), 0) = 0 then raise exception 'Укажите категорию'; end if;
  if jsonb_typeof(p_answers) <> 'array' then raise exception 'Неверный формат вариантов'; end if;

  select count(*), count(*) filter (where (x->>'is_correct')::boolean)
    into n, ok
    from jsonb_array_elements(p_answers) x
   where length(trim(coalesce(x->>'text', ''))) > 0;
  if n < 2 or n > 10 then raise exception 'Нужно от 2 до 10 вариантов ответа'; end if;
  if ok <> 1 then raise exception 'Отметьте ровно один правильный ответ'; end if;

  if qid is null then
    insert into questions(category, question_text, explanation)
    values (trim(p_category), trim(p_text), nullif(trim(coalesce(p_explanation, '')), ''))
    returning id into qid;
  else
    update questions set category = trim(p_category), question_text = trim(p_text),
           explanation = nullif(trim(coalesce(p_explanation, '')), '')
     where id = qid;
    if not found then raise exception 'Вопрос не найден'; end if;
    delete from answers where question_id = qid;
  end if;

  insert into answers(question_id, answer_text, is_correct)
  select qid, trim(x->>'text'), coalesce((x->>'is_correct')::boolean, false)
    from jsonb_array_elements(p_answers) with ordinality t(x, i)
   where length(trim(coalesce(x->>'text', ''))) > 0
   order by i;

  return qid;
end $$;

revoke all on function save_question(uuid, text, text, text, jsonb) from public, anon;
grant execute on function save_question(uuid, text, text, text, jsonb) to authenticated;
