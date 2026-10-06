// Edge Function «admin-users» — операции, которым нужен service role:
// вход по логину (без раскрытия email), создание, изменение (в т.ч. пароля),
// блокировка/разблокировка и удаление сотрудников. Все действия админа пишутся в журнал.
// Ключ service role живёт только в окружении Supabase и никогда не попадает во frontend.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const USERNAME = /^[A-Za-z0-9._-]{3,40}$/
const clean = (v: unknown, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const BAN_FOREVER = '876000h' // ~100 лет
// экранируем спецсимволы шаблона ILIKE (подчёркивание допустимо в логине)
const likeExact = (v: string) => v.replace(/[\\%_]/g, (m) => '\\' + m)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Метод не поддерживается' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) return json({ error: 'Функция не настроена' }, 500)

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  let b: Record<string, unknown>
  try {
    b = await req.json()
  } catch {
    return json({ error: 'Некорректный запрос' }, 400)
  }
  const action = clean(b.action, 20)

  // ---- Вход по логину: email ищется на сервере и не раскрывается посетителю ----
  if (action === 'login') {
    const login = clean(b.login, 120)
    const password = typeof b.password === 'string' ? b.password : ''
    const fail = (msg = 'Неверный логин или пароль') => json({ error: msg }, 401)
    if (!login || !password || password.length > 72) return fail()
    let email = login
    if (!login.includes('@')) {
      if (!USERNAME.test(login)) return fail()
      const { data: p } = await admin.from('profiles').select('id').ilike('username', likeExact(login)).maybeSingle()
      if (!p) return fail()
      const { data: au } = await admin.auth.admin.getUserById(p.id)
      email = au.user?.email ?? ''
      if (!email) return fail()
    }
    const authClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await authClient.auth.signInWithPassword({ email, password })
    if (error || !data.session) return fail(/banned/i.test(error?.message ?? '') ? 'Учётная запись заблокирована администратором' : undefined)
    return json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token })
  }

  // Проверяем JWT вызывающего вручную (работает и со старыми, и с новыми ключами подписи)
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Не авторизован' }, 401)
  const { data: u, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !u.user) return json({ error: 'Сессия недействительна' }, 401)

  const { data: me } = await admin.from('profiles').select('role,is_active,full_name').eq('id', u.user.id).single()
  if (me?.role !== 'admin' || !me.is_active) return json({ error: 'Нет доступа' }, 403)

  // журнал действий (таблица audit_log из миграции 006; если её нет — молча пропускаем)
  const actorId = u.user.id
  const actorName = String(me.full_name ?? '')
  const audit = async (act: string, details: string) => {
    await admin.from('audit_log').insert({ actor: actorId, actor_name: actorName, action: act, details: details.slice(0, 500) })
  }

  const id = clean(b.id, 64)

  if (action === 'create') {
    const username = clean(b.username, 40)
    const password = typeof b.password === 'string' ? b.password : ''
    const full_name = clean(b.full_name, 160)
    if (!USERNAME.test(username)) return json({ error: 'Логин: 3–40 символов, латиница, цифры, точка, дефис, подчёркивание' }, 400)
    if (password.length < 6 || password.length > 72) return json({ error: 'Пароль должен содержать от 6 до 72 символов' }, 400)
    if (full_name.length < 2) return json({ error: 'Укажите ФИО' }, 400)

    const { data: exists } = await admin.from('profiles').select('id').ilike('username', likeExact(username)).maybeSingle()
    if (exists) return json({ error: 'Такой логин уже занят' }, 409)

    const email = `${username.toLowerCase()}@firelab.local`
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error || !data.user) return json({ error: error?.message ?? 'Ошибка создания пользователя' }, 400)

    const { error: e2 } = await admin.from('profiles').insert({
      id: data.user.id,
      role: 'employee',
      username,
      full_name,
      department: clean(b.department) || null,
      position: clean(b.position) || null,
    })
    if (e2) {
      await admin.auth.admin.deleteUser(data.user.id)
      return json({ error: e2.message }, 400)
    }
    await audit('Добавлен сотрудник', `${full_name} (@${username})`)
    return json({ ok: true, id: data.user.id })
  }

  if (!id) return json({ error: 'Не указан сотрудник' }, 400)
  const { data: target } = await admin.from('profiles').select('id,role,full_name,username').eq('id', id).maybeSingle()
  if (!target) return json({ error: 'Сотрудник не найден' }, 404)
  if (target.role === 'admin' && action !== 'update') return json({ error: 'Действие недоступно для администратора' }, 400)

  if (action === 'update') {
    const patch: Record<string, string | null> = {}
    if (b.username !== undefined) {
      const username = clean(b.username, 40)
      if (!USERNAME.test(username)) return json({ error: 'Некорректный логин' }, 400)
      const { data: dup } = await admin.from('profiles').select('id').ilike('username', likeExact(username)).neq('id', id).maybeSingle()
      if (dup) return json({ error: 'Такой логин уже занят' }, 409)
      patch.username = username
    }
    if (b.full_name !== undefined) {
      const fn = clean(b.full_name, 160)
      if (fn.length < 2) return json({ error: 'Укажите ФИО' }, 400)
      patch.full_name = fn
    }
    if (b.department !== undefined) patch.department = clean(b.department) || null
    if (b.position !== undefined) patch.position = clean(b.position) || null
    if (Object.keys(patch).length) {
      const { error } = await admin.from('profiles').update(patch).eq('id', id)
      if (error) return json({ error: error.message }, 400)
    }
    if (typeof b.password === 'string' && b.password.length) {
      if (b.password.length < 6 || b.password.length > 72) return json({ error: 'Пароль: от 6 до 72 символов' }, 400)
      const { error } = await admin.auth.admin.updateUserById(id, { password: b.password })
      if (error) return json({ error: error.message }, 400)
    }
    await audit('Изменён сотрудник', `${patch.full_name ?? target.full_name} (@${patch.username ?? target.username})${typeof b.password === 'string' && b.password ? ' · новый пароль' : ''}`)
    return json({ ok: true })
  }

  if (action === 'block' || action === 'unblock') {
    const active = action === 'unblock'
    const { error } = await admin.from('profiles').update({ is_active: active }).eq('id', id)
    if (error) return json({ error: error.message }, 400)
    // бан в Auth обрывает возможность обновлять сессию — заблокированный не сможет работать дальше
    await admin.auth.admin.updateUserById(id, { ban_duration: active ? 'none' : BAN_FOREVER })
    await audit(active ? 'Разблокирован сотрудник' : 'Заблокирован сотрудник', `${target.full_name} (@${target.username})`)
    return json({ ok: true })
  }

  if (action === 'delete') {
    if (id === actorId) return json({ error: 'Нельзя удалить себя' }, 400)
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) return json({ error: error.message }, 400)
    await audit('Удалён сотрудник', `${target.full_name} (@${target.username})`)
    return json({ ok: true })
  }

  return json({ error: 'Неизвестное действие' }, 400)
})
