// Создание (или восстановление) начального администратора.
// Запуск: npm run seed  (читает .env.local)
// Повторный запуск безопасен: если пользователь уже есть, пароль обновится, профиль станет admin.
import { createClient } from '@supabase/supabase-js'

const {
  VITE_SUPABASE_URL: url,
  SUPABASE_SERVICE_ROLE_KEY: key,
  ADMIN_USERNAME: username,
  ADMIN_EMAIL: email,
  ADMIN_PASSWORD: password,
} = process.env

const missing = Object.entries({
  VITE_SUPABASE_URL: url,
  SUPABASE_SERVICE_ROLE_KEY: key,
  ADMIN_USERNAME: username,
  ADMIN_EMAIL: email,
  ADMIN_PASSWORD: password,
})
  .filter(([, v]) => !v)
  .map(([k]) => k)

if (missing.length) {
  console.error('✖ Заполните в .env.local:', missing.join(', '))
  process.exit(1)
}

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

async function findUserByEmail(target) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const hit = data.users.find((u) => u.email?.toLowerCase() === target.toLowerCase())
    if (hit) return hit
    if (data.users.length < 200) return null
  }
  return null
}

let userId
const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true })

if (error && (error.status === 401 || /invalid api key/i.test(error.message))) {
  console.error('✖ Неверный SUPABASE_SERVICE_ROLE_KEY: нужен ключ service_role (eyJ…) или Secret key (sb_secret_…) этого проекта.')
  process.exit(1)
}

if (error) {
  const existing = await findUserByEmail(email)
  if (!existing) {
    console.error('✖', error.message)
    process.exit(1)
  }
  userId = existing.id
  const { error: upd } = await sb.auth.admin.updateUserById(userId, { password, ban_duration: 'none', email_confirm: true })
  if (upd) {
    console.error('✖', upd.message)
    process.exit(1)
  }
  console.log('• Пользователь уже существовал — пароль обновлён')
} else {
  userId = data.user.id
  console.log('• Пользователь Auth создан')
}

// ФИО: из ADMIN_FULL_NAME, иначе оставляем уже сохранённое, иначе — логин (ФИО можно указать в «Мой профиль»)
const { data: prof } = await sb.from('profiles').select('full_name').eq('id', userId).maybeSingle()
const fullName = process.env.ADMIN_FULL_NAME?.trim() || prof?.full_name || username

const { error: e2 } = await sb
  .from('profiles')
  .upsert({ id: userId, role: 'admin', username, full_name: fullName, is_active: true }, { onConflict: 'id' })

if (e2) {
  console.error('✖ Профиль:', e2.message)
  console.error('  Проверьте, что миграции 001–004 применены.')
  process.exit(1)
}

console.log(`✔ Администратор готов: логин «${username}» или ${email}`)
