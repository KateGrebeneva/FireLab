// Создаёт первого администратора в Docker-версии (запускается сервисом setup при `docker compose up`).
// Без внешних зависимостей: только fetch к Auth (GoTrue) и PostgREST внутри сети Docker.
const {
  SERVICE_ROLE_KEY: key,
  ADMIN_USERNAME: username = '',
  ADMIN_EMAIL: rawEmail = '',
  ADMIN_PASSWORD: password = '',
  ADMIN_FULL_NAME: fullNameEnv = '',
  ADMIN_RESET = 'false',
} = process.env
const AUTH = process.env.AUTH_URL || 'http://auth:9999'
const REST = process.env.REST_URL || 'http://rest:3000'
const email = rawEmail.trim().toLowerCase()
const reset = /^(1|true|yes)$/i.test(ADMIN_RESET)
const h = { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' }
const fail = (m) => { console.error('✖', m); process.exit(1) }

async function call(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { ...h, ...(init.headers || {}) } })
  const text = await res.text()
  let body = null
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  return { ok: res.ok, status: res.status, body }
}
const msg = (r) => (r.body && (r.body.msg || r.body.message || r.body.error_description || r.body.error)) || `HTTP ${r.status}`

if (!key) fail('Не задан SERVICE_ROLE_KEY — выполните node docker/keys.mjs')
if (!/^[A-Za-z0-9._-]{3,40}$/.test(username)) fail('ADMIN_USERNAME: 3–40 символов, латиница, цифры, точка, дефис, подчёркивание')
if (!/^[^@\s]+@[^@\s]+$/.test(email)) fail('Укажите корректный ADMIN_EMAIL в .env')

// ждём готовности сервисов
for (let i = 0; ; i++) {
  try {
    const a = await fetch(`${AUTH}/health`)
    const r = await fetch(`${REST}/settings?select=key&limit=1`, { headers: h })
    if (a.ok && r.ok) break
  } catch { /* ещё запускаются */ }
  if (i > 60) fail('Auth или REST API не отвечают')
  await new Promise((r) => setTimeout(r, 2000))
}

// ищем пользователя по email
let user = null
for (let page = 1; page < 50 && !user; page++) {
  const r = await call(`${AUTH}/admin/users?page=${page}&per_page=200`)
  if (!r.ok) fail(`Auth: ${msg(r)}`)
  const list = r.body?.users ?? []
  user = list.find((u) => (u.email ?? '').toLowerCase() === email) ?? null
  if (list.length < 200) break
}

if (!user) {
  if (password.length < 6 || password.length > 72) fail('ADMIN_PASSWORD: от 6 до 72 символов')
  const r = await call(`${AUTH}/admin/users`, { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) })
  if (!r.ok || !r.body?.id) fail(`Не удалось создать администратора: ${msg(r)}`)
  user = r.body
  console.log('• Учётная запись администратора создана')
} else if (reset) {
  if (password.length < 6 || password.length > 72) fail('ADMIN_PASSWORD: от 6 до 72 символов')
  const r = await call(`${AUTH}/admin/users/${user.id}`, { method: 'PUT', body: JSON.stringify({ password, ban_duration: 'none' }) })
  if (!r.ok) fail(`Не удалось обновить пароль: ${msg(r)}`)
  console.log('• Пароль администратора сброшен (ADMIN_RESET=true) — верните ADMIN_RESET=false')
} else {
  console.log('• Администратор уже существует — пароль не меняется')
}

const prof = await call(`${REST}/profiles?select=full_name&id=eq.${user.id}`)
const fullName = fullNameEnv.trim() || prof.body?.[0]?.full_name || username
const up = await call(`${REST}/profiles?on_conflict=id`, {
  method: 'POST',
  headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
  body: JSON.stringify({ id: user.id, role: 'admin', username, full_name: fullName, is_active: true }),
})
if (!up.ok) fail(`Профиль: ${msg(up)}`)
console.log(`✔ Администратор готов: логин «${username}» или ${email}`)
