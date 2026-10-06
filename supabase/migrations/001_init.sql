create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('admin', 'employee')) default 'employee',
  username text unique not null,
  full_name text not null,
  department text,
  position text,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  question_text text not null check (length(question_text) > 3),
  explanation text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions on delete cascade,
  answer_text text not null,
  is_correct boolean not null default false
);

create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  type text not null check (type in ('training', 'exam')),
  total_questions int not null,
  correct_answers int,
  incorrect_answers int,
  percentage int,
  passed boolean,
  started_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists attempt_questions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references attempts on delete cascade,
  position int,
  question_text text not null,
  category text,
  explanation text,
  options jsonb not null,
  selected int
);

create table if not exists settings (
  key text primary key,
  value text not null
);

insert into settings(key, value) values
  ('org_name', 'Пожарная часть'),
  ('pass_percent', '80'),
  ('training_count', '15'),
  ('exam_count', '25'),
  ('exam_minutes', '30'),
  ('categories', 'Пожарная безопасность|Первичные средства пожаротушения|Действия при пожаре|Эвакуация|Пожарная профилактика|Нормативные требования')
on conflict (key) do nothing;

create or replace function is_admin() returns boolean
language sql security definer stable set search_path = public as
$$ select exists(select 1 from profiles where id = auth.uid() and role = 'admin' and is_active) $$;

alter table profiles enable row level security;
alter table questions enable row level security;
alter table answers enable row level security;
alter table attempts enable row level security;
alter table attempt_questions enable row level security;
alter table settings enable row level security;

drop policy if exists p_sel on profiles;
drop policy if exists p_upd on profiles;
drop policy if exists p_del on profiles;
drop policy if exists q_all on questions;
drop policy if exists a_all on answers;
drop policy if exists s_sel on settings;
drop policy if exists s_w on settings;
drop policy if exists at_sel on attempts;
drop policy if exists aq_sel on attempt_questions;

create policy p_sel on profiles for select using (id = auth.uid() or is_admin());
create policy p_upd on profiles for update using (is_admin());
create policy p_del on profiles for delete using (is_admin());
create policy q_all on questions for all using (is_admin()) with check (is_admin());
create policy a_all on answers for all using (is_admin()) with check (is_admin());
create policy s_sel on settings for select to authenticated using (true);
create policy s_w on settings for all using (is_admin()) with check (is_admin());
create policy at_sel on attempts for select using (user_id = auth.uid() or is_admin());
create policy aq_sel on attempt_questions for select using (
  is_admin() or exists (
    select 1 from attempts a where a.id = attempt_id and a.user_id = auth.uid() and a.completed_at is not null
  )
);

create or replace function email_for_login(p_login text) returns text
language sql security definer set search_path = public, auth as
$$ select u.email from profiles p join auth.users u on u.id = p.id where lower(p.username) = lower(p_login) $$;

grant execute on function email_for_login(text) to anon, authenticated;

create or replace function start_attempt(p_type text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int; aid uuid; mins int; res jsonb;
begin
  if not exists(select 1 from profiles where id = auth.uid() and is_active) then
    raise exception 'Доступ заблокирован';
  end if;
  select value::int into n from settings where key = case when p_type = 'exam' then 'exam_count' else 'training_count' end;
  select value::int into mins from settings where key = 'exam_minutes';
  if (select count(*) from questions q where (select count(*) from answers a where a.question_id = q.id and a.is_correct) = 1) < n then
    raise exception 'Недостаточно вопросов в базе: нужно минимум %', n;
  end if;
  insert into attempts(user_id, type, total_questions) values (auth.uid(), p_type, n) returning id into aid;
  insert into attempt_questions(attempt_id, position, question_text, category, explanation, options)
  select aid, row_number() over(), q.question_text, q.category, q.explanation,
    (select jsonb_agg(jsonb_build_object('id', x.rn, 'text', x.answer_text, 'is_correct', x.is_correct) order by x.rn)
     from (select a.answer_text, a.is_correct, row_number() over (order by random()) rn from answers a where a.question_id = q.id) x)
  from (
    select * from questions q
    where (select count(*) from answers a where a.question_id = q.id and a.is_correct) = 1
    order by random()
    limit n
  ) q;
  select jsonb_build_object(
    'attempt_id', aid,
    'minutes', case when p_type = 'exam' then mins else 0 end,
    'questions', jsonb_agg(jsonb_build_object(
      'id', aq.id,
      'text', aq.question_text,
      'options', (select jsonb_agg(jsonb_build_object('id', o->'id', 'text', o->'text')) from jsonb_array_elements(aq.options) o)
    ) order by aq.position)
  ) into res
  from attempt_questions aq where aq.attempt_id = aid;
  return res;
end $$;

create or replace function finish_attempt(p_attempt uuid, p_answers jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare a attempts; c int; pp int;
begin
  select * into a from attempts where id = p_attempt and user_id = auth.uid() and completed_at is null;
  if not found then raise exception 'Попытка недоступна'; end if;
  update attempt_questions set selected = (p_answers->>id::text)::int where attempt_id = p_attempt;
  select count(*) into c from attempt_questions aq
  where attempt_id = p_attempt and exists (
    select 1 from jsonb_array_elements(aq.options) o
    where (o->>'id')::int = aq.selected and (o->>'is_correct')::boolean
  );
  select value::int into pp from settings where key = 'pass_percent';
  update attempts set
    correct_answers = c,
    incorrect_answers = total_questions - c,
    percentage = round(c * 100.0 / total_questions),
    passed = case when type = 'exam' then round(c * 100.0 / total_questions) >= pp end,
    completed_at = now()
  where id = p_attempt;
end $$;

grant execute on function start_attempt(text), finish_attempt(uuid, jsonb) to authenticated;
