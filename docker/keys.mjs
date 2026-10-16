// Готовит файл .env для Docker: копирует .env.docker.example и генерирует секреты.
// Запуск из папки проекта:  node docker/keys.mjs
// Без Node.js:              docker run --rm -v "${PWD}:/app" -w /app node:22-alpine node docker/keys.mjs
// Повторный запуск безопасен: уже заполненные значения не меняются.
import { createHmac, randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const ENV = '.env'
const EXAMPLE = '.env.docker.example'
if (!existsSync(ENV)) {
  if (!existsSync(EXAMPLE)) {
    console.error(`✖ Не найден ${EXAMPLE}. Запускайте из корня проекта.`)
    process.exit(1)
  }
  writeFileSync(ENV, readFileSync(EXAMPLE, 'utf8'))
  console.log(`• Создан ${ENV} из ${EXAMPLE}`)
}

let text = readFileSync(ENV, 'utf8')
const get = (k) => (text.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1] ?? '').trim()
const set = (k, v) => {
  if (new RegExp(`^${k}=`, 'm').test(text)) text = text.replace(new RegExp(`^${k}=.*$`, 'm'), `${k}=${v}`)
  else text += `${text.endsWith('\n') ? '' : '\n'}${k}=${v}\n`
}

const b64url = (buf) => Buffer.from(buf).toString('base64url')
const jwt = (role, secret) => {
  const iat = Math.floor(Date.now() / 1000)
  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64url(JSON.stringify({ role, iss: 'supabase', iat, exp: iat + 10 * 365 * 24 * 3600 }))
  const sig = b64url(createHmac('sha256', secret).update(`${head}.${body}`).digest())
  return `${head}.${body}.${sig}`
}

const made = []
if (!get('POSTGRES_PASSWORD')) { set('POSTGRES_PASSWORD', randomBytes(24).toString('hex')); made.push('POSTGRES_PASSWORD') }
let secret = get('JWT_SECRET')
if (!secret) { secret = randomBytes(32).toString('hex'); set('JWT_SECRET', secret); made.push('JWT_SECRET') }
// ключи подписываются JWT_SECRET: если секрет новый — ключи тоже перевыпускаются
if (!get('ANON_KEY') || made.includes('JWT_SECRET')) { set('ANON_KEY', jwt('anon', secret)); made.push('ANON_KEY') }
if (!get('SERVICE_ROLE_KEY') || made.includes('JWT_SECRET')) { set('SERVICE_ROLE_KEY', jwt('service_role', secret)); made.push('SERVICE_ROLE_KEY') }

writeFileSync(ENV, text)
console.log(made.length ? `✔ Сгенерировано: ${made.join(', ')}` : '✔ Все ключи уже заданы — ничего не изменено')
if (!get('ADMIN_PASSWORD')) console.log(`! Впишите в ${ENV} пароль администратора ADMIN_PASSWORD (и при желании ADMIN_USERNAME, ADMIN_EMAIL)`)
