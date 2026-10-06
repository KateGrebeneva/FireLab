# FireLab — установка и развёртывание

Тестирование и аттестация сотрудников по пожарной безопасности.

**Стек:** React 18 + TypeScript + Vite + React Router + Tailwind CSS · Supabase (PostgreSQL, Auth, RLS, Edge Function) · хостинг Vercel или Cloudflare Pages.
Всё работает на **бесплатных** тарифах. Отдельного сервера нет: логика проверки тестов выполняется в PostgreSQL (RPC-функции), права — через Row Level Security.

---

## Содержание

1. [Что внутри](#что-внутри)
2. [Требования](#требования)
3. [Установка](#1-установка)
4. [Переменные окружения](#2-переменные-окружения)
5. [Настройка Supabase](#3-настройка-supabase)
6. [Локальный запуск](#4-локальный-запуск)
7. [Production build](#5-production-build)
8. [Деплой: GitHub → Vercel](#6-деплой-github--vercel)
9. [Безопасность](#безопасность)
10. [Проверка после запуска](#проверка-после-запуска-чек-лист)
11. [Частые проблемы](#частые-проблемы)

---

## Что внутри

| Раздел | Путь | Кто видит |
|---|---|---|
| Лендинг | `/` | все |
| Вход | `/login` (логин **или** email + пароль) | все |
| Кабинет сотрудника | `/employee` | сотрудник |
| Тренировка (15 случайных вопросов) | `/employee/training` | сотрудник |
| Экзамен (25 вопросов, таймер, проходной %) | `/employee/exam` | сотрудник |
| Мои результаты + разбор ошибок | `/employee/history` | сотрудник (только свои) |
| Дашборд | `/admin` | администратор |
| Сотрудники (добавить / изменить / заблокировать / удалить / профиль) | `/admin/employees` | администратор |
| Банк вопросов | `/admin/questions` | администратор |
| Статистика | `/admin/stats` | администратор |
| Результаты всех попыток | `/admin/results` | администратор |
| Настройки | `/admin/settings` | администратор |
| Мой профиль (ФИО, смена пароля) | `/admin/account`, `/employee/account` | каждый — только свой |

Структура:

```
src/
  components/   UI-кит (ui/), графики (charts/), блоки лендинга (landing/)
  hooks/        useAsync, useSettings, useReveal, useTitle
  layouts/      AppShell — сайдбар + мобильное меню
  lib/          supabase-клиент, авторизация и защищённые маршруты
  pages/        landing, login, admin/*, employee/*, shared/*
  routes/       App.tsx — маршрутизация (кабинеты грузятся лениво)
  services/     все запросы к Supabase
  types/ utils/ styles/
supabase/
  migrations/   001…004 — схема, вопросы, RLS, RPC
  functions/admin-users/  Edge Function для управления сотрудниками
scripts/seed-admin.mjs    создание начального администратора
```

Вопросы из файла «Тесты по ОТ 2026» (287 шт.) уже лежат в миграции `002_questions.sql`. Импорта Word в интерфейсе нет — новые вопросы добавляются вручную на странице «Вопросы».

---

## Требования

- **Node.js 20.6+** (https://nodejs.org, версия LTS)
- Бесплатный аккаунт **Supabase** и созданный проект (https://supabase.com/dashboard → New project)
- Для деплоя — бесплатные аккаунты **GitHub** и **Vercel**

---

## 1. Установка

Откройте терминал в папке проекта (Windows: откройте папку в проводнике, в адресной строке введите `powershell` и нажмите Enter):

```bash
npm install
```

---

## 2. Переменные окружения

Создайте файл `.env.local` из шаблона:

```bash
# macOS / Linux
cp .env.example .env.local
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env.local
```

Заполните его:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>

# только для npm run seed — НЕ добавлять в Vercel и НЕ коммитить
SUPABASE_SERVICE_ROLE_KEY=<service_role key>

ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<пароль администратора>
ADMIN_FULL_NAME=<Фамилия Имя Отчество>   # необязательно
```

`<project-ref>` — идентификатор проекта (Project Settings → General → Project ID).

Где взять ключи: Supabase Dashboard → **Project Settings → API Keys**
(https://supabase.com/dashboard/project/<project-ref>/settings/api-keys)

- `VITE_SUPABASE_ANON_KEY` — ключ **anon / public** (или новый **Publishable key** `sb_publishable_…`). Его можно использовать во frontend: данные защищены RLS.
- `SUPABASE_SERVICE_ROLE_KEY` — ключ **service_role** (или **Secret key** `sb_secret_…`). Нужен **только** локально для `npm run seed`. Никогда не кладите его во frontend, Vercel или Git.

`.env.local` уже в `.gitignore`.

---

## 3. Настройка Supabase

### 3.1. Примените миграции (SQL)

Самый простой способ — через SQL Editor в браузере:

1. Откройте https://supabase.com/dashboard/project/<project-ref>/sql/new
2. По очереди вставьте содержимое файлов и нажмите **Run**:
   1. `supabase/migrations/001_init.sql` — таблицы, базовые политики
   2. `supabase/migrations/002_questions.sql` — 287 вопросов (файл большой — дождитесь выполнения)
   3. `supabase/migrations/003_categories.sql` — категории
   4. `supabase/migrations/004_premium.sql` — усиленный RLS, серверный таймер экзамена, RPC статистики, атомарное сохранение вопросов
   5. `supabase/migrations/005_account.sql` — личный профиль («Мой профиль»: ФИО, смена пароля)

Все миграции **идемпотентны**: если вы уже запускали 001–003 раньше, просто выполните `004_premium.sql` и `005_account.sql`. Повторный запуск ничего не сломает.

<details>
<summary>Альтернатива: через Supabase CLI</summary>

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```
</details>

### 3.2. Разверните Edge Function `admin-users`

Она нужна, чтобы администратор мог создавать, редактировать, блокировать и удалять сотрудников (для этого требуется service role, который нельзя держать в браузере).

**Вариант A — через CLI (рекомендуется):**

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase functions deploy admin-users --no-verify-jwt
```

(то же самое: `npm run supabase:login`, `npm run supabase:link` — CLI предложит выбрать проект, `npm run supabase:fn`)

**Вариант B — через браузер:** Dashboard → **Edge Functions → Deploy a new function → Via Editor**, имя `admin-users`, вставьте код из `supabase/functions/admin-users/index.ts`, нажмите Deploy. Затем в настройках функции **выключите «Enforce JWT verification»** (функция сама проверяет токен и роль администратора).

Секреты `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` Supabase подставляет в функцию автоматически — ничего добавлять не нужно.

### 3.3. Создайте администратора

```bash
npm run seed
```

Скрипт читает `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` из `.env.local`, создаёт пользователя в Supabase Auth (пароль хранится только там, в виде хэша) и профиль с ролью `admin`. Повторный запуск безопасен: если пользователь уже есть, пароль обновится, а роль станет `admin`.

### 3.4. Настройки Auth (важно)

Dashboard → **Authentication**:

1. **Sign In / Providers → Email**: выключите **«Allow new users to sign up»** — учётные записи создаёт только администратор.
2. **URL Configuration → Site URL**: после деплоя укажите адрес сайта, например `https://<ваш-проект>.vercel.app`.

---

## 4. Локальный запуск

```bash
npm run dev
```

Откройте http://localhost:5173 → **Войти в систему**:

- логин из `ADMIN_USERNAME` (или email из `ADMIN_EMAIL`) и пароль из `ADMIN_PASSWORD`;
- сотрудников создаёт администратор на странице «Сотрудники» — они входят по логину и паролю.

---

## 5. Production build

```bash
npm run typecheck   # проверка TypeScript
npm run build       # сборка в папку dist/
npm run preview     # локальный просмотр сборки: http://localhost:4173
```

`npm run check` = typecheck + build одной командой.

---

## 6. Деплой: GitHub → Vercel

### 6.1. GitHub

Создайте пустой репозиторий на https://github.com/new (без README), затем в папке проекта:

```bash
git init
git add .
git commit -m "FireLab"
git branch -M main
git remote add origin https://github.com/<ваш-логин>/<репозиторий>.git
git push -u origin main
```

Проверьте, что `.env.local` **не** попал в репозиторий (он в `.gitignore`).

### 6.2. Vercel

1. https://vercel.com → **Add New… → Project** → выберите репозиторий → **Import**.
2. Framework Preset: **Vite** (определится сам). Build Command: `npm run build`. Output Directory: `dist`.
3. **Environment Variables** — добавьте только две:
   - `VITE_SUPABASE_URL` = `https://<project-ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = ваш anon / publishable key
4. **Deploy**. Через 1–2 минуты сайт будет доступен по адресу `https://<проект>.vercel.app`.
5. Вернитесь в Supabase → Authentication → URL Configuration и укажите этот адрес в **Site URL**.

`vercel.json` уже настраивает SPA-маршруты (прямые ссылки вида `/admin/stats` работают) и заголовки безопасности.
Дальше каждый `git push` в `main` автоматически пересобирает сайт.

### Cloudflare Pages (альтернатива)

Workers & Pages → Create → Pages → Connect to Git → Build command `npm run build`, output `dist`, те же две переменные `VITE_*`. Файлы `public/_redirects` и `public/_headers` уже лежат в проекте.

---

## Безопасность

- **Supabase Auth** — пароли хранятся только в Auth в виде хэша; в коде и в Git паролей нет.
- **RLS включён на всех таблицах**:
  - сотрудник видит только свой профиль и свои попытки, не может читать банк вопросов и правильные ответы, не может ничего изменять напрямую;
  - разбор (`attempt_questions` с правильными ответами) доступен сотруднику **только после завершения** попытки;
  - вопросы, ответы, настройки, профили других — только администратор;
  - INSERT/UPDATE попыток напрямую запрещены всем — только через RPC.
- **Проверка ответов на сервере**: билет выдаёт `start_attempt` (без правильных ответов), результат считает `finish_attempt`. Подделать процент из браузера нельзя.
- **Таймер экзамена на сервере**: у попытки есть `deadline`; ответы, присланные позже (+60 с на задержки сети), не засчитываются.
- **Неизменяемая история**: каждая попытка хранит снимок текста вопроса, вариантов и пояснения. Редактирование/удаление вопроса не меняет старые результаты.
- **Блокировка** сотрудника отключает профиль и банит пользователя в Auth.
- Администратор не может заблокировать себя или снять с себя роль (триггер в БД).
- SQL-инъекции исключены: только параметризованные запросы supabase-js и PL/pgSQL. XSS: React экранирует весь вывод, `dangerouslySetInnerHTML` не используется.
- Service role key — только в Edge Function (окружение Supabase) и в локальном seed-скрипте.

---

## Проверка после запуска (чек-лист)

1. Вход администратором → открывается `/admin`.
2. «Вопросы» → добавить вопрос, отредактировать, удалить.
3. «Сотрудники» → «Добавить сотрудника» (логин латиницей, пароль от 6 символов).
4. Выйти → войти сотрудником → `/employee`. Попробуйте открыть `/admin` — вас вернёт в кабинет сотрудника.
5. Тренировка: 15 вопросов, каждый запуск — новый набор и порядок → «Завершить» → разбор ошибок с пояснениями.
6. Экзамен: 25 вопросов, таймер, итог «Сдан / Не сдан».
7. «Мои результаты» → история и подробный разбор.
8. Администратор: «Результаты», «Статистика», профиль сотрудника — попытки видны.
9. «Настройки» → измените проходной % или время экзамена → новое значение применяется к следующему экзамену.
10. Заблокируйте сотрудника → он не может войти.

---

## Частые проблемы

| Симптом | Решение |
|---|---|
| Экран «Требуется настройка» | Не заданы `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Локально — `.env.local` и перезапуск `npm run dev`; на Vercel — Environment Variables и **Redeploy**. |
| «Неверный логин или пароль» у администратора | Выполните `npm run seed` ещё раз (он обновит пароль). |
| «Учётная запись заблокирована или профиль не найден» | Пользователь есть в Auth, но нет строки в `profiles`. Для админа — `npm run seed`; сотрудников создавайте только через интерфейс. |
| «Серверная функция не найдена» при добавлении сотрудника | Не развернута Edge Function `admin-users` (п. 3.2). |
| Ошибка 401 от функции | В настройках функции выключите «Enforce JWT verification» или деплойте с `--no-verify-jwt`. |
| «Could not find the function … in the schema cache» | Не применена миграция `004_premium.sql`. |
| «Недостаточно вопросов в базе» | В банке меньше вопросов, чем задано в настройках (15 / 25). Добавьте вопросы или уменьшите число в настройках. |
| 404 при обновлении страницы на хостинге | Для Vercel нужен `vercel.json`, для Cloudflare — `public/_redirects` (оба уже есть). |
| `npm run seed` ругается на `--env-file` | Обновите Node.js до 20.6+. |
