-- 006: вопросы с несколькими правильными ответами, удаление результатов, журнал действий, усиление безопасности.
-- Миграция идемпотентна.

-- ---------------------------------------------------------------
-- 1. Несколько правильных ответов
-- ---------------------------------------------------------------
alter table attempt_questions add column if not exists selected_ids int[];

-- Ответ засчитывается, только если выбран ровно набор правильных вариантов
create or replace function aq_correct(p_options jsonb, p_selected int, p_selected_ids int[]) returns boolean
language sql immutable as $$
  with chosen as (
    select distinct x from unnest(coalesce(p_selected_ids, case when p_selected is null then '{}'::int[] else array[p_selected] end)) x
  ), right_ids as (
    select distinct (o->>'id')::int x from jsonb_array_elements(p_options) o where (o->>'is_correct')::boolean
  )
  select exists(select 1 from chosen)
     and not exists(select x from chosen except select x from right_ids)
     and not exists(select x from right_ids except select x from chosen)
$$;

create or replace function q_eligible(p_question uuid) returns boolean
language sql stable set search_path = public as $$
  select (select count(*) from answers a where a.question_id = p_question and a.is_correct) >= 1
     and (select count(*) from answers a where a.question_id = p_question) >= 2
$$;

create or replace function available_questions() returns int
language sql security definer stable set search_path = public as $$
  select count(*)::int from questions q where q_eligible(q.id)
$$;

create or replace function start_attempt(p_type text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int; aid uuid; mins int; res jsonb; avail int; recent int;
begin
  if p_type not in ('training', 'exam') then raise exception 'Неизвестный тип теста'; end if;
  if not exists(select 1 from profiles where id = auth.uid() and is_active) then
    raise exception 'Доступ заблокирован';
  end if;

  -- защита от массовой выгрузки банка вопросов: не более 40 запусков в час
  select count(*) into recent from attempts where user_id = auth.uid() and started_at > now() - interval '1 hour';
  if recent >= 40 then raise exception 'Слишком много попыток за час. Попробуйте позже.'; end if;

  select value::int into n from settings where key = case when p_type = 'exam' then 'exam_count' else 'training_count' end;
  n := coalesce(n, case when p_type = 'exam' then 25 else 15 end);
  select value::int into mins from settings where key = 'exam_minutes';
  mins := coalesce(mins, 0);

  select count(*) into avail from questions q where q_eligible(q.id);
  if avail < n then
    raise exception 'Недостаточно вопросов в базе: для режима нужно минимум %, сейчас доступно %', n, avail;
  end if;

  delete from attempts where user_id = auth.uid() and completed_at is null;

  insert into attempts(user_id, type, total_questions, deadline)
  values (auth.uid(), p_type, n, case when p_type = 'exam' and mins > 0 then now() + make_interval(mins => mins) end)
  returning id into aid;

  insert into attempt_questions(attempt_id, position, question_id, question_text, category, explanation, options)
  select aid, row_number() over (order by random()), q.id, q.question_text, q.category, q.explanation,
    (select jsonb_agg(jsonb_build_object('id', x.rn, 'text', x.answer_text, 'is_correct', x.is_correct) order by x.rn)
       from (select a.answer_text, a.is_correct, row_number() over (order by random()) rn from answers a where a.question_id = q.id) x)
  from (select * from questions q where q_eligible(q.id) order by random() limit n) q;

  select jsonb_build_object(
    'attempt_id', aid,
    'type', p_type,
    'minutes', case when p_type = 'exam' then mins else 0 end,
    'deadline', (select deadline from attempts where id = aid),
    'questions', jsonb_agg(jsonb_build_object(
      'id', aq.id,
      'category', aq.category,
      'text', aq.question_text,
      'multi', (select count(*) from jsonb_array_elements(aq.options) o where (o->>'is_correct')::boolean) > 1,
      'options', (select jsonb_agg(jsonb_build_object('id', o->'id', 'text', o->'text') order by (o->>'id')::int)
                    from jsonb_array_elements(aq.options) o)
    ) order by aq.position)
  ) into res
  from attempt_questions aq where aq.attempt_id = aid;
  return res;
end $$;

-- p_answers: { "<id вопроса билета>": 3 }  или  { "<id>": [1, 4] }
create or replace function finish_attempt(p_attempt uuid, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a attempts; c int; pp int; late boolean; r record; v jsonb; ids int[];
begin
  select * into a from attempts where id = p_attempt and user_id = auth.uid() and completed_at is null for update;
  if not found then raise exception 'Попытка недоступна или уже завершена'; end if;
  if jsonb_typeof(coalesce(p_answers, '{}'::jsonb)) <> 'object' then raise exception 'Неверный формат ответов'; end if;

  late := a.deadline is not null and now() > a.deadline + interval '60 seconds';

  if not late then
    for r in select aq.id, aq.options from attempt_questions aq where aq.attempt_id = p_attempt loop
      v := p_answers -> r.id::text;
      ids := null;
      if v is not null then
        -- берём только существующие варианты этого вопроса
        select array_agg(distinct x order by x) into ids
          from (
            select (e #>> '{}')::int x
              from jsonb_array_elements(case when jsonb_typeof(v) = 'array' then v else jsonb_build_array(v) end) e
             where (e #>> '{}') ~ '^\d{1,3}$'
          ) s
         where exists (select 1 from jsonb_array_elements(r.options) o where (o->>'id')::int = s.x);
      end if;
      update attempt_questions
         set selected_ids = ids,
             selected = case when coalesce(array_length(ids, 1), 0) >= 1 then ids[1] end
       where id = r.id;
    end loop;
  end if;

  select count(*) into c from attempt_questions aq
   where aq.attempt_id = p_attempt and aq_correct(aq.options, aq.selected, aq.selected_ids);

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

create or replace function category_stats(p_user uuid default null)
returns table(category text, total int, wrong int)
language plpgsql security definer stable set search_path = public as $$
declare uid uuid := p_user;
begin
  if not is_admin() then uid := auth.uid(); end if;
  return query
  select coalesce(aq.category, 'Без категории'),
         count(*)::int,
         count(*) filter (where not aq_correct(aq.options, aq.selected, aq.selected_ids))::int
    from attempt_questions aq
    join attempts a on a.id = aq.attempt_id and a.completed_at is not null
   where uid is null or a.user_id = uid
   group by 1
   order by 3 desc;
end $$;

create or replace function hardest_questions(p_limit int default 10, p_min int default 2)
returns table(question_id uuid, question_text text, category text, total int, wrong int)
language plpgsql security definer stable set search_path = public as $$
begin
  if not is_admin() then raise exception 'Нет доступа'; end if;
  return query
  select max(aq.question_id::text)::uuid, aq.question_text, max(aq.category),
         count(*)::int,
         count(*) filter (where not aq_correct(aq.options, aq.selected, aq.selected_ids))::int
    from attempt_questions aq
    join attempts a on a.id = aq.attempt_id and a.completed_at is not null
   group by aq.question_text
  having count(*) >= p_min
   order by (count(*) filter (where not aq_correct(aq.options, aq.selected, aq.selected_ids)))::float / count(*) desc, count(*) desc
   limit least(greatest(p_limit, 1), 50);
end $$;

create or replace function save_question(p_id uuid, p_category text, p_text text, p_explanation text, p_answers jsonb)
returns uuid
language plpgsql security definer set search_path = public as $$
declare qid uuid := p_id; n int; ok int;
begin
  if not is_admin() then raise exception 'Нет доступа'; end if;
  if coalesce(length(trim(p_text)), 0) < 5 then raise exception 'Текст вопроса слишком короткий'; end if;
  if length(p_text) > 2000 then raise exception 'Текст вопроса слишком длинный'; end if;
  if coalesce(length(trim(p_category)), 0) = 0 then raise exception 'Укажите категорию'; end if;
  if jsonb_typeof(p_answers) <> 'array' then raise exception 'Неверный формат вариантов'; end if;

  select count(*), count(*) filter (where (x->>'is_correct')::boolean)
    into n, ok
    from jsonb_array_elements(p_answers) x
   where length(trim(coalesce(x->>'text', ''))) > 0;
  if n < 2 or n > 10 then raise exception 'Нужно от 2 до 10 вариантов ответа'; end if;
  if ok < 1 then raise exception 'Отметьте хотя бы один правильный ответ'; end if;

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

-- ---------------------------------------------------------------
-- 2. Удаление результатов администратором (массово и по одному)
-- ---------------------------------------------------------------
create or replace function delete_attempts(p_ids uuid[]) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not is_admin() then raise exception 'Нет доступа'; end if;
  if coalesce(array_length(p_ids, 1), 0) = 0 then return 0; end if;
  if array_length(p_ids, 1) > 500 then raise exception 'Слишком много записей за один раз (максимум 500)'; end if;
  delete from attempts where id = any(p_ids);
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------
-- 3. Журнал действий администратора (только чтение для админа)
-- ---------------------------------------------------------------
create table if not exists audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  actor_name text,
  action text not null,
  details text
);
create index if not exists audit_log_at_idx on audit_log(at desc);
alter table audit_log enable row level security;
drop policy if exists al_sel on audit_log;
create policy al_sel on audit_log for select to authenticated using (is_admin());
-- INSERT/UPDATE/DELETE политик нет: записи создают только триггеры, изменить журнал нельзя.
revoke all on audit_log from anon;

create or replace function audit_write(p_action text, p_details text) returns void
language sql security definer set search_path = public as $$
  insert into audit_log(actor, actor_name, action, details)
  values (auth.uid(), (select full_name from profiles where id = auth.uid()), p_action, left(p_details, 500))
$$;
revoke all on function audit_write(text, text) from public, anon, authenticated;

create or replace function trg_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- журналируем действия пользователей; операции сервисных скриптов (миграции, Edge Function) пишут журнал сами
  if auth.uid() is null then return null; end if;
  if tg_table_name = 'attempts' then
    if tg_op = 'DELETE' and old.completed_at is not null then
      perform audit_write('Удалён результат',
        coalesce((select full_name from profiles where id = old.user_id), 'сотрудник') || ' · ' ||
        case when old.type = 'exam' then 'экзамен' else 'обучение' end || ' · ' || coalesce(old.percentage, 0) || '% · ' ||
        to_char(old.completed_at at time zone 'Europe/Moscow', 'DD.MM.YYYY HH24:MI'));
    end if;
  elsif tg_table_name = 'questions' then
    if tg_op = 'DELETE' then perform audit_write('Удалён вопрос', old.question_text);
    elsif tg_op = 'INSERT' then perform audit_write('Добавлен вопрос', new.question_text);
    else perform audit_write('Изменён вопрос', new.question_text);
    end if;
  elsif tg_table_name = 'settings' then
    if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.value is distinct from old.value) then
      perform audit_write('Изменена настройка', new.key || ' = ' || left(new.value, 120));
    end if;
  end if;
  return null;
end $$;

drop trigger if exists trg_audit_attempts on attempts;
create trigger trg_audit_attempts after delete on attempts for each row execute function trg_audit();
drop trigger if exists trg_audit_questions on questions;
create trigger trg_audit_questions after insert or update or delete on questions for each row execute function trg_audit();
drop trigger if exists trg_audit_profiles on profiles;
drop trigger if exists trg_audit_settings on settings;
create trigger trg_audit_settings after insert or update on settings for each row execute function trg_audit();

-- ---------------------------------------------------------------
-- 4. Безопасность входа: не раскрываем email по логину
-- ---------------------------------------------------------------
-- Раньше любой посетитель мог узнать email по логину. Теперь вход по логину
-- выполняется на сервере (Edge Function admin-users, action=login).
revoke all on function email_for_login(text) from public, anon, authenticated;

grant execute on function aq_correct(jsonb, int, int[]) to authenticated;
revoke all on function start_attempt(text), finish_attempt(uuid, jsonb), available_questions(), category_stats(uuid),
  hardest_questions(int, int), save_question(uuid, text, text, text, jsonb), delete_attempts(uuid[]) from public, anon;
grant execute on function start_attempt(text), finish_attempt(uuid, jsonb), available_questions(), category_stats(uuid),
  hardest_questions(int, int), save_question(uuid, text, text, text, jsonb), delete_attempts(uuid[]) to authenticated;
