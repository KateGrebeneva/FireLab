import { useState } from 'react'
import { ArrowLeft, ArrowRight, BarChart3, BookOpen, CheckCircle2, ClipboardCheck, Home, Maximize2, Trophy, XCircle } from 'lucide-react'
import { LogoMark } from '../Logo'
import { cn } from '../../lib/cn'

const options = ['Разрешается', 'Не разрешается', 'Разрешается, при условии его закрепления']

/** Интерактивный макет интерфейса для hero-блока */
export default function AppMockup() {
  const [sel, setSel] = useState(1)
  return (
    <div className="relative mx-auto w-full max-w-[600px]">
      {/* glow */}
      <div className="pointer-events-none absolute -inset-10 rounded-[48px] bg-gradient-to-tr from-brand-200/50 via-white/0 to-brand-100/60 blur-3xl" />

      <div className="relative overflow-hidden rounded-[22px] border border-white/70 bg-white/90 shadow-lift ring-1 ring-black/[.04] backdrop-blur">
        {/* window chrome */}
        <div className="flex items-center gap-1.5 border-b border-line/80 bg-gray-50/80 px-4 py-2.5">
          <i className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <i className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <i className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          <div className="mx-auto rounded-md bg-white px-10 py-0.5 text-[10px] text-ink-4 ring-1 ring-line">firelab.app/employee/training</div>
        </div>

        <div className="flex">
          {/* mini sidebar */}
          <div className="hidden w-[150px] shrink-0 border-r border-line/80 bg-gradient-to-b from-white to-gray-50/60 p-3 sm:block">
            <div className="mb-4 flex items-center gap-1.5">
              <LogoMark className="h-6 w-6" />
              <span className="text-[9.5px] font-extrabold tracking-tight">FireLab</span>
            </div>
            {[
              [Home, 'Главная'],
              [BookOpen, 'Тренировка'],
              [ClipboardCheck, 'Экзамен'],
              [BarChart3, 'Результаты'],
              [XCircle, 'Ошибки'],
              [Trophy, 'Достижения'],
            ].map(([Icon, t], i) => {
              const I = Icon as typeof Home
              return (
                <div
                  key={t as string}
                  className={cn(
                    'mb-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10.5px] font-medium',
                    i === 1 ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-brand' : 'text-ink-3',
                  )}
                >
                  <I size={12} />
                  {t as string}
                </div>
              )
            })}
          </div>

          {/* quiz */}
          <div className="min-w-0 flex-1 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-ink">Тренировочный билет</span>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[9.5px] font-semibold text-brand-700 ring-1 ring-brand-100">15 вопросов</span>
              </div>
              <Maximize2 size={12} className="text-ink-4" />
            </div>
            <div className="mt-3 flex justify-between text-[10.5px] text-ink-3">
              <span>Вопрос 7 из 15</span>
              <span className="font-semibold text-ink-2">47%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full w-[47%] origin-left animate-growx rounded-full bg-gradient-to-r from-brand-500 to-brand-700" />
            </div>
            <div className="mt-4 text-[13.5px] font-bold leading-snug text-ink">Разрешается ли оставлять пожарный ствол без надзора?</div>
            <div className="mt-3 space-y-1.5">
              {options.map((o, i) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setSel(i)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left text-[11px] transition-all duration-200',
                    sel === i ? 'border-brand-300 bg-brand-50 text-ink shadow-[0_0_0_3px_rgba(179,22,43,.08)]' : 'border-line text-ink-2 hover:border-brand-200',
                  )}
                >
                  <span className={cn('grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border', sel === i ? 'border-brand-600' : 'border-gray-300')}>
                    {sel === i && <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />}
                  </span>
                  {o}
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-between">
              <span className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[10.5px] font-semibold text-ink-2">
                <ArrowLeft size={11} /> Назад
              </span>
              <span className="flex items-center gap-1 rounded-lg bg-gradient-to-b from-brand-500 to-brand-700 px-3 py-1.5 text-[10.5px] font-semibold text-white shadow-brand">
                Далее <ArrowRight size={11} />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* floating chips */}
      <div className="absolute -right-3 -top-6 hidden animate-float rounded-2xl border border-white/80 bg-white/95 p-3 shadow-lift backdrop-blur sm:flex sm:items-center sm:gap-3">
        <div className="relative h-11 w-11">
          <svg viewBox="0 0 44 44" className="-rotate-90">
            <circle cx="22" cy="22" r="18" fill="none" stroke="#F3EEEF" strokeWidth="5" />
            <circle cx="22" cy="22" r="18" fill="none" stroke="#B3162B" strokeWidth="5" strokeLinecap="round" strokeDasharray="113" strokeDashoffset="14" />
          </svg>
        </div>
        <div>
          <div className="font-display text-lg font-extrabold leading-none text-ink">88%</div>
          <div className="text-[10.5px] text-ink-3">средний результат</div>
        </div>
      </div>

      <div className="absolute -bottom-6 -left-4 hidden animate-float items-center gap-2.5 rounded-2xl border border-white/80 bg-white/95 px-3.5 py-3 shadow-lift backdrop-blur [animation-delay:1.5s] sm:flex">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={18} />
        </span>
        <div>
          <div className="text-[12.5px] font-bold text-ink">Экзамен сдан</div>
          <div className="text-[10.5px] text-ink-3">23 из 25 · 92%</div>
        </div>
      </div>
    </div>
  )
}
