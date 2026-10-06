-- 005: личный профиль. Пользователь может изменить только своё ФИО.
-- Логин, роль, подразделение и должность меняет администратор.
create or replace function update_my_profile(p_full_name text) returns void
language plpgsql security definer set search_path = public as $$
declare v text := trim(regexp_replace(coalesce(p_full_name, ''), '\s+', ' ', 'g'));
begin
  if auth.uid() is null then raise exception 'Не авторизован'; end if;
  if length(v) < 2 or length(v) > 160 then raise exception 'Укажите ФИО (от 2 до 160 символов)'; end if;
  if v ~ '[<>{}]' then raise exception 'ФИО содержит недопустимые символы'; end if;
  update profiles set full_name = v where id = auth.uid() and is_active;
  if not found then raise exception 'Профиль не найден или заблокирован'; end if;
end $$;

revoke all on function update_my_profile(text) from public, anon;
grant execute on function update_my_profile(text) to authenticated;
