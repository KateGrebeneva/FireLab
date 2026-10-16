// Сервер функций для Docker-версии: запускает те же файлы supabase/functions/*/index.ts,
// что и Supabase Edge Functions в облаке. Код функций написан без внешних зависимостей,
// поэтому достаточно Node.js 22 (типы TypeScript отбрасываются флагом --experimental-strip-types)
// и небольшой прослойки, повторяющей Deno.serve и Deno.env.
import http from 'node:http'
import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = process.env.FUNCTIONS_DIR || '/functions'
const PORT = Number(process.env.PORT || 9000)
const handlers = new Map()
let loading = null

globalThis.Deno = {
  env: { get: (k) => process.env[k], toObject: () => ({ ...process.env }) },
  serve: (a, b) => {
    const fn = typeof a === 'function' ? a : b ?? a?.handler
    if (loading && typeof fn === 'function') handlers.set(loading, fn)
    return { finished: new Promise(() => {}), shutdown: async () => {} }
  },
}

for (const name of readdirSync(ROOT)) {
  const file = join(ROOT, name, 'index.ts')
  if (!existsSync(file)) continue
  loading = name
  await import(pathToFileURL(file).href)
  loading = null
  console.log(`• функция ${name}`)
}

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > 1_000_000) { reject(new Error('too large')); req.destroy() } else chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })

http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
      const name = url.pathname.split('/').filter(Boolean)[0] ?? ''
      if (name === 'health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok') }
      const fn = handlers.get(name)
      if (!fn) { res.writeHead(404, { 'Content-Type': 'application/json' }); return res.end('{"error":"Функция не найдена"}') }

      const headers = new Headers()
      for (const [k, v] of Object.entries(req.headers)) if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(', ') : v)
      const hasBody = !['GET', 'HEAD'].includes(req.method || 'GET')
      const request = new Request(url, { method: req.method, headers, body: hasBody ? await readBody(req) : undefined })

      const response = await fn(request)
      const out = Buffer.from(await response.arrayBuffer())
      res.writeHead(response.status, Object.fromEntries(response.headers))
      res.end(out)
    } catch (e) {
      console.error(e)
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end('{"error":"Внутренняя ошибка функции"}')
    }
  })
  .listen(PORT, '0.0.0.0', () => console.log(`✔ Функции слушают порт ${PORT}`))
