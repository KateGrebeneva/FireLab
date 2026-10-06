import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  GraduationCap,
  History,
  ListChecks,
  Lightbulb,
  LogIn,
  Smartphone,
  Zap,
  Menu,
  ShieldCheck,
  Shuffle,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react'
import Logo from '../components/Logo'
import { ButtonLink } from '../components/ui/Button'
import AppMockup from '../components/landing/AppMockup'
import { AlarmButton, ExitSign, Extinguisher, FireTruck, FirstAidKit, Flame, Helmet, Hydrant } from '../components/landing/Illustrations'
import AreaChart from '../components/charts/AreaChart'
import HBarList from '../components/charts/HBarList'
import Ring from '../components/charts/Ring'
import { useReveal } from '../hooks/useReveal'
import { useTitle } from '../hooks/useTitle'
import { useAuth, homeFor } from '../lib/auth'
import { cn } from '../lib/cn'

const NAV = [
  ['#topics', 'Темы'],
  ['#features', 'Возможности'],
  ['#how', 'Как это работает'],
  ['#modes', 'Режимы'],
  ['#analytics', 'Аналитика'],
]

function Header() {
  const { profile } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  const cabinet = profile ? homeFor(profile.role) : '/login'
  return (
    <header className={cn('fixed inset-x-0 top-0 z-50 transition-all duration-300', scrolled || open ? 'border-b border-line/70 bg-white/80 shadow-[0_1px_0_rgba(0,0,0,.02)] backdrop-blur-xl' : 'bg-transparent')}>
      <div className="container flex h-[72px] items-center justify-between gap-6">
        <Logo />
        <nav className="hidden items-center gap-8 lg:flex">
          {NAV.map(([href, t]) => (
            <a key={href} href={href} className="relative text-[14px] font-medium text-ink-2 transition hover:text-brand-700 after:absolute after:-bottom-1.5 after:left-0 after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:rounded after:bg-brand-600 after:transition-transform hover:after:scale-x-100">
              {t}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          {profile ? (
            <ButtonLink to={cabinet} iconRight={<ArrowRight size={16} />}>
              Открыть кабинет
            </ButtonLink>
          ) : (
            <>
              <ButtonLink to="/login" variant="secondary" size="md">
                Войти
              </ButtonLink>
              <ButtonLink to="/login" size="md" iconRight={<ArrowRight size={16} />}>
                Начать
              </ButtonLink>
            </>
          )}
        </div>
        <button className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-white sm:hidden" onClick={() => setOpen(!open)} aria-label="Меню" aria-expanded={open}>
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {open && (
        <div className="container animate-fade-in pb-5 sm:hidden">
          <nav className="flex flex-col gap-1">
            {NAV.map(([href, t]) => (
              <a key={href} href={href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-[15px] font-medium text-ink-2 hover:bg-brand-50">
                {t}
              </a>
            ))}
          </nav>
          <ButtonLink to={cabinet} className="mt-3 w-full" icon={<LogIn size={16} />}>
            {profile ? 'Открыть кабинет' : 'Войти в систему'}
          </ButtonLink>
        </div>
      )}
    </header>
  )
}

function SectionTitle({ eyebrow, title, text, className }: { eyebrow: string; title: ReactNode; text?: ReactNode; className?: string }) {
  return (
    <div className={cn('reveal', className)}>
      <div className="eyebrow">{eyebrow}</div>
      <h2 className="mt-3 text-[30px] font-extrabold leading-[1.1] text-ink sm:text-[38px]">{title}</h2>
      {text && <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-ink-3">{text}</p>}
    </div>
  )
}

const FEATURES = [
  { icon: Shuffle, title: 'Случайная генерация тестов', text: 'Каждая попытка — новый билет: вопросы выбираются из общей базы и перемешиваются вместе с вариантами ответов.' },
  { icon: BookOpen, title: 'Обучение', text: 'Тренировочный режим без давления: 15 вопросов, мгновенный разбор ошибок и пояснения к правильным ответам.' },
  { icon: ClipboardCheck, title: 'Экзамен', text: 'Итоговая аттестация: 25 вопросов, проходной балл и опциональное ограничение по времени.' },
  { icon: BarChart3, title: 'Статистика', text: 'Средний балл, процент сдачи, динамика по дням и самые сложные вопросы — в наглядных графиках.' },
  { icon: Target, title: 'Контроль знаний', text: 'Руководитель сразу видит, кому из сотрудников требуется дополнительная подготовка.' },
  { icon: History, title: 'История результатов', text: 'Каждая попытка сохраняется неизменной — с вопросами и ответами на момент прохождения.' },
]

const STEPS = [
  { icon: LogIn, title: 'Вход в систему', text: 'Сотрудник входит под своим логином' },
  { icon: Shuffle, title: 'Случайный билет', text: 'Система формирует новый набор вопросов' },
  { icon: ListChecks, title: 'Ответы', text: 'Сотрудник отвечает в удобном интерфейсе' },
  { icon: CheckCircle2, title: 'Результат', text: 'Мгновенная проверка и разбор ошибок' },
  { icon: BarChart3, title: 'Статистика', text: 'Руководитель видит прогресс команды' },
]

const STRIP = [
  [Shuffle, 'Случайные билеты'],
  [Zap, 'Мгновенная проверка'],
  [Lightbulb, 'Разбор ошибок с пояснениями'],
  [BarChart3, 'Отчёты для руководителя'],
  [Smartphone, 'Работает на телефоне'],
]

const TOPICS = [
  { title: 'Первичные средства пожаротушения', text: 'Огнетушители, внутренние краны, правила применения.', art: <Extinguisher className="w-10" /> },
  { title: 'Действия при пожаре', text: 'Оповещение, вызов пожарной охраны, первые действия.', art: <Flame className="w-12" /> },
  { title: 'Эвакуация', text: 'Пути эвакуации, планы, порядок вывода людей.', art: <ExitSign className="w-[72px]" /> },
  { title: 'Пожарная профилактика', text: 'Системы оповещения, извещатели, противопожарный режим.', art: <AlarmButton className="w-14" /> },
  { title: 'Пожарная безопасность', text: 'Общие требования, ответственность, инструктажи.', art: <Helmet className="w-[72px]" /> },
  { title: 'Первая помощь и охрана труда', text: 'Оказание первой помощи пострадавшим, безопасные методы работ.', art: <FirstAidKit className="w-16" /> },
]

const demoDays = [62, 68, 66, 71, 74, 72, 78, 81, 79, 84, 86, 88]
const demoBars = [6, 9, 7, 12, 10, 14, 11, 16, 13, 18, 15, 19, 17, 21, 14, 20, 22, 18, 24, 21]

export default function Landing() {
  useTitle()
  useReveal()
  const year = new Date().getFullYear()

  return (
    <div className="overflow-x-clip bg-white">
      <Header />

      {/* ---------------- HERO ---------------- */}
      <section className="relative pt-[72px]">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#FBF7F7] via-white to-white" />
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_70%_30%,#000_30%,transparent_75%)]" />
        <div className="pointer-events-none absolute -right-40 -top-40 h-[620px] w-[620px] rounded-full bg-brand-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -left-40 top-60 h-[420px] w-[420px] rounded-full bg-rose-50 blur-3xl" />

        <div className="container relative grid items-center gap-14 pb-20 pt-12 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pb-28 lg:pt-20">
          <div>
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white/80 px-3 py-1.5 text-[12px] font-semibold text-brand-700 shadow-card backdrop-blur">
                <ShieldCheck size={14} /> Профессиональная подготовка и аттестация
              </span>
            </div>
            <h1 className="mt-6 animate-fade-up font-display text-[44px] font-extrabold leading-[0.98] tracking-[-0.03em] text-ink [animation-delay:80ms] sm:text-[64px] lg:text-[76px]">
              Fire<span className="text-grad">Lab</span>
            </h1>
            <p className="mt-5 max-w-xl animate-fade-up text-[22px] font-bold leading-snug text-ink-2 [animation-delay:140ms] sm:text-[26px]">
              Подготовка к аттестации <span className="text-brand-700">по пожарной безопасности</span>
            </p>
            <p className="mt-4 max-w-lg animate-fade-up text-[16px] leading-relaxed text-ink-3 [animation-delay:200ms] sm:text-[17px]">
              Цифровая система обучения, проверки знаний и итоговой аттестации сотрудников. Случайные билеты, мгновенная проверка и прозрачная аналитика для руководителя.
            </p>
            <div className="mt-8 flex animate-fade-up flex-col gap-3 [animation-delay:260ms] sm:flex-row">
              <ButtonLink to="/login" size="lg" iconRight={<ArrowRight size={18} />}>
                Войти в систему
              </ButtonLink>
              <a
                href="#features"
                className="inline-flex h-[52px] items-center justify-center rounded-xl border border-line bg-white px-7 text-[15px] font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,.04)] transition hover:border-brand-200 hover:text-brand-700"
              >
                Узнать больше
              </a>
            </div>
            <dl className="mt-10 grid max-w-xl animate-fade-up grid-cols-3 gap-3 [animation-delay:320ms] sm:gap-4">
              {[
                [BookOpen, '15 вопросов', 'в тренировке'],
                [FileText, '25 вопросов', 'на экзамене'],
                [Shuffle, 'Случайный', 'порядок и выборка'],
              ].map(([Icon, a, b]) => {
                const I = Icon as typeof BookOpen
                return (
                  <div key={a as string} className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:gap-2.5">
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-brand-600 shadow-card ring-1 ring-line/70">
                      <I size={17} />
                    </span>
                    <div>
                      <dt className="text-[13.5px] font-bold text-ink">{a as string}</dt>
                      <dd className="text-[12px] text-ink-3">{b as string}</dd>
                    </div>
                  </div>
                )
              })}
            </dl>
          </div>
          <div className="relative animate-fade-up [animation-delay:200ms] lg:pl-6">
            <Helmet className="pointer-events-none absolute -left-8 -top-20 z-10 hidden w-32 -rotate-12 drop-shadow-xl sm:block lg:-left-20 lg:w-36" />
            <AppMockup />
            <Extinguisher className="pointer-events-none absolute -bottom-24 -right-4 z-10 hidden w-20 animate-float drop-shadow-xl [animation-delay:.8s] sm:block lg:-right-16 lg:w-24" />
          </div>
        </div>
      </section>

      {/* ---------------- ICON STRIP ---------------- */}
      <section className="border-y border-line/70 bg-white">
        <div className="container grid grid-cols-2 gap-x-6 gap-y-5 py-7 sm:grid-cols-3 lg:grid-cols-5">
          {STRIP.map(([Icon, t], i) => {
            const I = Icon as typeof Zap
            return (
              <div key={t as string} className="reveal flex items-center gap-3" style={{ ['--d' as string]: `${i * 60}ms` }}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                  <I size={19} />
                </span>
                <span className="text-[13.5px] font-semibold leading-tight text-ink-2">{t as string}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* ---------------- TOPICS ---------------- */}
      <section id="topics" className="relative scroll-mt-20 overflow-hidden py-20 sm:py-24">
        <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-brand-50 blur-3xl" />
        <div className="container relative">
          <SectionTitle eyebrow="Темы подготовки" title="Что проверяет система" text="Вопросы сгруппированы по темам — руководитель видит, где у команды пробелы." className="max-w-2xl" />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOPICS.map((t, i) => (
              <div key={t.title} className="reveal card card-hover group flex items-center gap-5 p-5" style={{ ['--d' as string]: `${i * 70}ms` }}>
                <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#FBF3F4] to-[#F6E9EB] ring-1 ring-brand-100/70 transition duration-300 group-hover:scale-105">
                  {t.art}
                </div>
                <div>
                  <h3 className="text-[16px] font-bold leading-snug text-ink">{t.title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-3">{t.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- FEATURES ---------------- */}
      <section id="features" className="relative scroll-mt-20 py-20 sm:py-28">
        <div className="container grid gap-12 lg:grid-cols-[320px_1fr] lg:gap-16">
          <SectionTitle
            eyebrow="Возможности"
            title={
              <>
                Всё необходимое
                <br />в одной системе
              </>
            }
            text="От первой тренировки до итоговой аттестации — без бумажных бланков, ручной проверки и таблиц Excel."
            className="lg:sticky lg:top-28 lg:self-start"
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="reveal card card-hover group p-6" style={{ ['--d' as string]: `${i * 70}ms` }}>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 ring-1 ring-brand-100 transition duration-300 group-hover:from-brand-500 group-hover:to-brand-700 group-hover:text-white group-hover:shadow-brand">
                  <f.icon size={22} />
                </span>
                <h3 className="mt-5 text-[17px] font-bold text-ink">{f.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-3">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- HOW ---------------- */}
      <section id="how" className="relative scroll-mt-20 overflow-hidden bg-gradient-to-r from-[#FCEFF1] via-[#FDF5F6] to-[#FBEFF1] py-20 sm:py-24">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom,transparent,#000_30%,#000_70%,transparent)]" />
        <div className="container relative grid gap-12 lg:grid-cols-[340px_1fr] lg:items-center">
          <SectionTitle
            eyebrow="Как это работает"
            title={
              <>
                Каждая попытка&nbsp;—
                <br />
                новый билет
              </>
            }
            text="Не нужно заучивать последовательность вопросов. Система всё делает автоматически."
          />
          <ol className="grid gap-6 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="reveal relative flex flex-col items-center text-center" style={{ ['--d' as string]: `${i * 90}ms` }}>
                {i < STEPS.length - 1 && (
                  <span className="absolute left-[calc(50%+40px)] top-8 hidden w-[calc(100%-80px)] items-center lg:flex">
                    <span className="h-px flex-1 bg-gradient-to-r from-brand-300 to-brand-200" />
                    <ArrowRight size={14} className="-ml-1 text-brand-400" />
                  </span>
                )}
                <span className="relative grid h-16 w-16 place-items-center rounded-full bg-white text-brand-600 shadow-card ring-1 ring-brand-100 transition duration-300 hover:-translate-y-1 hover:shadow-lift">
                  <s.icon size={24} />
                  <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white shadow-brand">{i + 1}</span>
                </span>
                <h3 className="mt-4 text-[15px] font-bold text-ink">{s.title}</h3>
                <p className="mt-1 max-w-[170px] text-[13px] leading-snug text-ink-3">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------- MODES ---------------- */}
      <section id="modes" className="scroll-mt-20 py-20 sm:py-28">
        <div className="container">
          <SectionTitle eyebrow="Режимы" title="Тренировка и экзамен" text="Два режима для разных задач: спокойная подготовка и итоговая проверка знаний." className="max-w-2xl" />
          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            <ModeCard
              tone="light"
              title="Обучение"
              count="15 вопросов"
              lead="Подготовьтесь к экзамену без давления."
              points={['Случайная выборка вопросов', 'Новый порядок при каждой попытке', 'Результат сразу после прохождения', 'Просмотр допущенных ошибок', 'Пояснения к правильным ответам']}
              cta="Перейти к тренировке"
              icon={<GraduationCap size={26} />}
              art={<Helmet className="w-48 drop-shadow-xl" />}
            />
            <ModeCard
              tone="dark"
              title="Экзамен"
              count="25 вопросов"
              lead="Финальная проверка знаний."
              points={['Экзаменационный билет', 'Случайный порядок вопросов и ответов', 'Ограничение времени (опционально)', 'Проходной балл — 80% по умолчанию', 'Итог «сдан / не сдан» и разбор ошибок']}
              cta="Начать экзамен"
              icon={<ClipboardCheck size={26} />}
              art={<Extinguisher className="w-24 drop-shadow-2xl" />}
            />
          </div>
        </div>
      </section>

      {/* ---------------- ANALYTICS ---------------- */}
      <section id="analytics" className="scroll-mt-20 bg-gradient-to-b from-white via-[#FAF8F8] to-white pb-20 sm:pb-28">
        <div className="container">
          <SectionTitle
            eyebrow="Аналитика"
            title={
              <>
                Полный контроль
                <br className="hidden sm:block" /> и прозрачная аналитика
              </>
            }
            text="Не нужно собирать результаты вручную — система считает всё сама и подсвечивает слабые места."
            className="max-w-2xl"
          />

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            <div className="reveal card card-pad">
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-bold">Результат тестирования</h3>
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-100">25 вопросов</span>
              </div>
              <div className="mt-5 flex items-center gap-5">
                <Ring value={88} size={124} stroke={11} sub="пройдено" />
                <ul className="flex-1 space-y-2.5 text-[13.5px]">
                  <li className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
                    <CheckCircle2 size={16} className="text-emerald-600" /> Верно <b className="ml-auto">22</b>
                  </li>
                  <li className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
                    <XCircle size={16} className="text-brand-600" /> Ошибки <b className="ml-auto">3</b>
                  </li>
                  <li className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
                    <Clock size={16} className="text-ink-3" /> Время <b className="ml-auto">14:32</b>
                  </li>
                </ul>
              </div>
            </div>
            <div className="reveal card card-pad" style={{ ['--d' as string]: '80ms' }}>
              <h3 className="mb-5 text-[16px] font-bold">Темы, где чаще ошибаются</h3>
              <HBarList
                max={30}
                items={[
                  { label: 'Пожарная безопасность', value: 28 },
                  { label: 'Средства пожаротушения', value: 18 },
                  { label: 'Эвакуация людей', value: 16 },
                  { label: 'Нормативные документы', value: 12 },
                  { label: 'Действия при пожаре', value: 10 },
                ]}
              />
            </div>
            <div className="reveal card card-pad" style={{ ['--d' as string]: '160ms' }}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[16px] font-bold">Динамика результатов</h3>
                <span className="flex items-center gap-1 text-[12px] font-semibold text-emerald-600">
                  <TrendingUp size={14} /> +26%
                </span>
              </div>
              <AreaChart data={demoDays.map((v, i) => ({ label: `${i * 3 + 1} апр`, value: v }))} height={210} />
            </div>
          </div>

          <div className="reveal mt-5 overflow-hidden rounded-3xl border border-line/70 bg-white shadow-card">
            <div className="grid lg:grid-cols-[300px_1fr_300px]">
              <div className="border-b border-line/70 p-6 lg:border-b-0 lg:border-r">
                <div className="eyebrow">Для руководителя</div>
                <h3 className="mt-3 text-[20px] font-extrabold leading-tight">Кабинет начальника части</h3>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {[
                    [Users, '128', 'сотрудников'],
                    [Target, '91%', 'средний балл'],
                    [ClipboardCheck, '114', 'прошли'],
                    [TrendingUp, '89%', 'успешность'],
                  ].map(([Icon, v, l]) => {
                    const I = Icon as typeof Users
                    return (
                      <div key={l as string} className="rounded-2xl bg-gray-50 p-3">
                        <I size={16} className="text-brand-600" />
                        <div className="mt-2 font-display text-xl font-extrabold">{v as string}</div>
                        <div className="text-[11.5px] text-ink-3">{l as string}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="border-b border-line/70 p-6 lg:border-b-0 lg:border-r">
                <div className="mb-4 text-[14px] font-semibold text-ink-2">Прохождения за последние 30 дней</div>
                <BarsPreview />
              </div>
              <div className="p-6">
                <div className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-ink-2">
                  <UserCheck size={16} className="text-brand-600" /> Требуют подготовки
                </div>
                <ul className="space-y-3">
                  {[
                    ['Сотрудник А.', 64],
                    ['Сотрудник Б.', 68],
                    ['Сотрудник В.', 72],
                    ['Сотрудник Г.', 76],
                  ].map(([n, p]) => (
                    <li key={n as string} className="flex items-center gap-3">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-gray-200 to-gray-300 text-[11px] font-bold text-ink-2">{(n as string).slice(-2, -1)}</span>
                      <span className="flex-1 text-[13.5px] text-ink-2">{n as string}</span>
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[12px] font-semibold text-brand-700">{p as number}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="container pb-16 sm:pb-24">
        <div className="reveal relative overflow-hidden rounded-[28px] bg-brand-grad px-6 py-14 text-white shadow-brand sm:px-14 sm:py-16">
          <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-black/20 blur-3xl" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[.08]"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }}
          />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="text-[30px] font-extrabold leading-tight sm:text-[40px]">Готовы начать подготовку?</h2>
              <p className="mt-3 max-w-xl text-[16px] text-white/80">Современные инструменты для обучения и аттестации сотрудников по пожарной безопасности.</p>
              <ButtonLink to="/login" variant="white" size="lg" iconRight={<ArrowRight size={18} />} className="mt-8">
                Войти в систему
              </ButtonLink>
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute inset-x-6 bottom-0 top-8 rounded-full bg-white/15 blur-2xl" />
              <Hydrant className="absolute -left-16 bottom-2 z-10 w-16 drop-shadow-xl" />
              <FireTruck className="relative w-[420px] drop-shadow-2xl" />
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-line/70 bg-white">
        <div className="container flex flex-col items-start justify-between gap-4 py-8 text-[13px] text-ink-3 sm:flex-row sm:items-center">
          <Logo />
          <span>Тестирование и аттестация сотрудников по пожарной безопасности</span>
          <span>© {year} FireLab</span>
        </div>
      </footer>
    </div>
  )
}

function ModeCard({
  tone,
  title,
  count,
  lead,
  points,
  cta,
  icon,
  art,
}: {
  tone: 'light' | 'dark'
  title: string
  count: string
  lead: string
  points: string[]
  cta: string
  icon: ReactNode
  art: ReactNode
}) {
  const dark = tone === 'dark'
  return (
    <div
      className={cn(
        'reveal group relative overflow-hidden rounded-[28px] border p-7 transition duration-500 hover:-translate-y-1 sm:p-10',
        dark ? 'border-transparent bg-[#1E1F23] text-white shadow-lift' : 'border-line/70 bg-white shadow-card hover:shadow-lift',
      )}
    >
      <div className={cn('pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl transition-opacity duration-500', dark ? 'bg-brand-600/40' : 'bg-brand-100/70')} />
      <div className="pointer-events-none absolute bottom-6 right-6 hidden transition-transform duration-500 group-hover:-rotate-3 group-hover:scale-105 sm:block">{art}</div>
      <div className="relative">
        <div className="flex items-center gap-3">
          <span className={cn('grid h-14 w-14 place-items-center rounded-2xl', dark ? 'bg-brand-grad text-white shadow-brand' : 'bg-brand-50 text-brand-600 ring-1 ring-brand-100')}>{icon}</span>
          <div>
            <h3 className={cn('font-display text-[26px] font-extrabold uppercase tracking-tight', dark ? 'text-white' : 'text-brand-700')}>{title}</h3>
            <span className={cn('text-[13px] font-semibold', dark ? 'text-brand-200' : 'text-ink-3')}>{count}</span>
          </div>
        </div>
        <p className={cn('mt-5 text-[16px]', dark ? 'text-white/75' : 'text-ink-2')}>{lead}</p>
        <ul className="mt-5 space-y-2.5 sm:max-w-[62%]">
          {points.map((p) => (
            <li key={p} className={cn('flex items-start gap-2.5 text-[14.5px]', dark ? 'text-white/85' : 'text-ink-2')}>
              <CheckCircle2 size={18} className={cn('mt-0.5 shrink-0', dark ? 'text-brand-300' : 'text-brand-600')} />
              {p}
            </li>
          ))}
        </ul>
        <Link
          to="/login"
          className={cn(
            'mt-8 inline-flex h-12 items-center gap-2 rounded-xl px-6 text-[14px] font-semibold transition-all duration-200 hover:-translate-y-0.5',
            dark ? 'bg-white text-ink hover:bg-brand-50' : 'bg-gradient-to-b from-brand-500 to-brand-700 text-white shadow-brand',
          )}
        >
          {cta} <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  )
}

function BarsPreview() {
  return (
    <div className="flex h-44 items-end gap-[5px]">
      {demoBars.map((v, i) => (
        <div key={i} className="group relative flex h-full flex-1 items-end">
          <div
            className="w-full origin-bottom animate-grow rounded-t-md bg-gradient-to-t from-brand-700 to-brand-400 opacity-80 transition group-hover:opacity-100"
            style={{ height: `${(v / 24) * 100}%`, animationDelay: `${i * 30}ms` }}
          />
        </div>
      ))}
    </div>
  )
}
