import { LogoMark } from '../components/Logo'

/** Показывается, если не заданы VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY */
export default function ConfigMissing() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-5">
      <div className="card max-w-lg p-8">
        <LogoMark />
        <h1 className="mt-5 text-2xl font-extrabold">Требуется настройка</h1>
        <p className="mt-2 text-[15px] text-ink-3">
          Не заданы переменные окружения Supabase. Создайте файл <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[13px]">.env.local</code> (локально) или добавьте переменные в настройках
          Vercel и пересоберите проект:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-ink p-4 text-[13px] leading-relaxed text-white">
          {`VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon / publishable key>`}
        </pre>
        <p className="mt-4 text-[13px] text-ink-4">Подробности — в README.md, раздел «Переменные окружения».</p>
      </div>
    </div>
  )
}
