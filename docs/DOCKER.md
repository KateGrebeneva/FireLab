# FireLab в Docker — свой сервер

Весь FireLab работает на одном компьютере: сайт, база данных, авторизация и API. Облачный Supabase и Vercel не нужны. Сотрудники открывают сайт с телефонов и ПК в той же сети по адресу этого компьютера.

```
 Браузеры сотрудников ──▶ http://192.168.x.x:8080
                              │
                     ┌────────┴─────────────────── docker compose ─────────────┐
                     │ web (nginx)  — сайт + шлюз /supabase/*                  │
                     │   ├─ /supabase/auth/v1/      → auth (Supabase Auth)     │
                     │   ├─ /supabase/rest/v1/      → rest (PostgREST)         │
                     │   └─ /supabase/functions/v1/ → api  (функция admin-users)│
                     │ db (PostgreSQL 17, схема Supabase, RLS)                 │
                     │ migrate — применяет supabase/migrations при каждом запуске│
                     │ setup   — создаёт администратора из .env                │
                     └─────────────────────────────────────────────────────────┘
```

Снаружи открыт только порт сайта (8080). База и сервисы доступны лишь внутри сети Docker. Права сотрудника и администратора те же, что в облачной версии (RLS, серверная проверка ответов, журнал действий).

---

## Что понадобится

- Компьютер с Windows 10/11 (или Linux/macOS), от 4 ГБ ОЗУ, около 5 ГБ на диске.
- **Docker Desktop**: https://www.docker.com/products/docker-desktop. При установке оставьте галочку **WSL 2**, после установки перезагрузите компьютер.
- **Git** (https://git-scm.com) — чтобы скачать проект. Можно и без него: скопируйте папку проекта, кроме `node_modules` и `dist`.
- Node.js **не обязателен**.
- Интернет нужен только для первой сборки (Docker скачает образы, примерно 1,5–2 ГБ). Дальше всё работает в локальной сети без интернета.

---

## Установка (один раз)

Все команды выполняются в **PowerShell** в папке проекта.

### 1. Запустите Docker Desktop

Дождитесь зелёного статуса **Engine running** внизу окна.

### 2. Скачайте проект

```powershell
cd D:\
git clone https://github.com/KateGrebeneva/FireLab.git firelab
cd D:\firelab
```

### 3. Создайте `.env` с секретами

```powershell
docker run --rm -v "${PWD}:/app" -w /app node:22-alpine node docker/keys.mjs
```

Если на компьютере установлен Node.js, можно короче: `node docker/keys.mjs`.

Скрипт создаст файл `.env` и сгенерирует пароль базы, `JWT_SECRET`, `ANON_KEY` и `SERVICE_ROLE_KEY`. Повторный запуск ничего не перезапишет.

### 4. Впишите администратора

```powershell
notepad .env
```

Заполните поля:

```ini
ADMIN_USERNAME=ваш_логин
ADMIN_EMAIL=ваша@почта.ru
ADMIN_PASSWORD=пароль_от_6_символов
ADMIN_FULL_NAME=Фамилия Имя Отчество
SITE_URL=http://192.168.1.25:8080
```

В `SITE_URL` укажите адрес этого компьютера в сети (шаг 7). Строки с секретами внизу файла не трогайте.

### 5. Запустите

```powershell
docker compose up -d --build
```

Первый запуск занимает 5–15 минут: скачиваются образы, собирается сайт, создаётся база, применяются миграции с 352 вопросами.

### 6. Проверьте

```powershell
docker compose ps -a
```

| Сервис | Нормальное состояние |
|---|---|
| `db`, `auth`, `rest`, `api` | `Up … (healthy)` |
| `web` | `Up` |
| `migrate`, `setup` | `Exited (0)` — отработали и завершились, так и должно быть |

Логи настройки:

```powershell
docker compose logs migrate setup
```

В конце должно быть `✔ Миграции применены` и `✔ Администратор готов`.

Откройте **http://localhost:8080** и войдите под логином администратора. Пароль хранится в базе в виде хэша, поэтому после первого входа строку `ADMIN_PASSWORD` в `.env` можно очистить.

### 7. Доступ с других устройств

Узнайте IP компьютера:

```powershell
ipconfig
```

Нужна строка «IPv4-адрес» сетевого адаптера Wi-Fi или Ethernet, например `192.168.1.25`. Сотрудники открывают `http://192.168.1.25:8080`.

Разрешите входящие подключения на порт 8080 (PowerShell **от имени администратора**, один раз):

```powershell
New-NetFirewallRule -DisplayName "FireLab 8080" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow -Profile Private,Domain
```

Сеть в Windows должна быть «Частной»: Параметры → Сеть и Интернет → свойства подключения. Чтобы адрес не менялся, закрепите IP за компьютером в настройках роутера (DHCP-резервирование).

### 8. Автозапуск

Docker Desktop → **Settings → General** → включите **Start Docker Desktop when you sign in**. Контейнеры запущены с `restart: unless-stopped`, поэтому после перезагрузки компьютера FireLab поднимется сам.

---

## Повседневная работа

| Задача | Команда |
|---|---|
| Состояние сервисов | `docker compose ps -a` |
| Логи (выход — Ctrl+C) | `docker compose logs -f --tail=100` |
| Остановить (данные сохраняются) | `docker compose down` |
| Запустить снова | `docker compose up -d` |
| Перезапустить один сервис | `docker compose restart auth` |

### Обновление FireLab

```powershell
cd D:\firelab
git pull
docker compose up -d --build
```

Новые файлы миграций применятся автоматически. Уже применённые не запускаются повторно, их список хранится в таблице `firelab_migrations`.

### Забыли пароль администратора

1. В `.env` укажите новый `ADMIN_PASSWORD` и `ADMIN_RESET=true`.
2. Выполните `docker compose up setup`.
3. Верните `ADMIN_RESET=false`.

Пароли сотрудников администратор меняет в приложении: «Сотрудники» → меню строки → «Изменить».

---

## Резервные копии

Данные лежат в томах Docker `firelab_db-data` (база) и `firelab_db-config` (служебные ключи PostgreSQL).

**Сделать копию.** Сайт будет недоступен около минуты.

```powershell
docker compose stop
docker run --rm -v firelab_db-data:/fl/data -v firelab_db-config:/fl/config -v "${PWD}:/backup" alpine tar czf /backup/firelab-backup.tgz -C /fl data config
docker compose start
```

Файл `firelab-backup.tgz` появится в папке проекта. Храните его вместе с файлом `.env`: без тех же паролей восстановленная база не запустится.

**Восстановить** (на этом или другом компьютере, с тем же `.env`; ошибку «no such volume» при удалении можно игнорировать):

```powershell
docker compose down
docker volume rm firelab_db-data firelab_db-config
docker volume create firelab_db-data
docker volume create firelab_db-config
docker run --rm -v firelab_db-data:/fl/data -v firelab_db-config:/fl/config -v "${PWD}:/backup" alpine tar xzf /backup/firelab-backup.tgz -C /fl
docker compose up -d
```

> [!CAUTION]
> `docker compose down -v` удаляет тома, то есть **всю базу**. Используйте его, только если хотите начать с нуля.

---

## Перенос на другой компьютер

1. На старом компьютере сделайте резервную копию (см. выше).
2. На новом выполните шаги 1–2 установки.
3. Скопируйте в папку проекта `.env` и `firelab-backup.tgz` со старого компьютера.
4. Выполните команды «Восстановить» из раздела про резервные копии.

---

## Частые проблемы

| Симптом | Что делать |
|---|---|
| `docker: command not found` / `error during connect` | Docker Desktop не запущен — откройте его и дождитесь *Engine running*. |
| `required variable POSTGRES_PASSWORD is missing` | Нет `.env` или пустые секреты — выполните шаг 3. |
| `migrate` в состоянии `Exited (1)` | `docker compose logs migrate` покажет, на каком файле ошибка. Исправьте и выполните `docker compose up -d`. |
| `setup`: `ADMIN_PASSWORD: от 6 до 72 символов` | Впишите пароль в `.env` и выполните `docker compose up setup`. |
| «Неверный логин или пароль» у администратора | Проверьте `docker compose logs setup`; при необходимости сбросьте пароль (см. выше). |
| «Требуется настройка» на сайте | Сайт собран без `ANON_KEY`: выполните шаг 3, затем `docker compose up -d --build`. |
| После смены `JWT_SECRET` никто не может войти | Секрет менять нельзя — верните прежний `.env`, затем `docker compose up -d --build`. |
| С телефона сайт не открывается | Телефон в той же сети? Правило брандмауэра из шага 7 добавлено? Сеть Windows «Частная»? |
| Порт 8080 занят | В `.env` укажите `HTTP_PORT=8081` (и поправьте `SITE_URL`), затем `docker compose up -d`. |
| `Error 429` при входе | Сработала защита от подбора пароля (много попыток с одного адреса). Подождите минуту. |

---

## Безопасность

- `.env` содержит пароль базы и ключ `SERVICE_ROLE_KEY`. Не публикуйте его и не отправляйте в Git (он уже в `.gitignore`).
- `ANON_KEY` — публичный ключ, он встроен в сайт, как и в облачной версии. Все права проверяются в базе (RLS).
- Наружу открыт только порт сайта. Чтобы подключиться к базе с самого сервера (DBeaver, pgAdmin), раскомментируйте блок `ports` у сервиса `db` в `docker-compose.yml`: база будет доступна только с `127.0.0.1`.
- В nginx настроены CSP и защитные заголовки, а также ограничение частоты запросов ко входу и функциям.
- **HTTPS.** В локальной сети достаточно HTTP. Если сервер доступен из интернета, поставьте перед ним HTTPS-прокси (например, Caddy или nginx с сертификатом Let's Encrypt). В `SITE_URL` укажите `https://…` и включите строку `Strict-Transport-Security` в `docker/nginx/security-headers.conf`.

---

## Из чего состоит

| Файл | Назначение |
|---|---|
| `docker-compose.yml` | Все сервисы стека |
| `Dockerfile` | Сборка сайта (Vite) и образа nginx |
| `docker/nginx/` | Раздача сайта, шлюз `/supabase/*`, заголовки безопасности |
| `docker/db/migrate.sh` | Применение `supabase/migrations/*.sql` по порядку, один раз каждую |
| `docker/db/roles.sql`, `jwt.sql` | Начальная настройка ролей Supabase |
| `docker/functions/server.mjs` | Запуск `supabase/functions/admin-users` на Node.js — тот же код, что в облаке |
| `docker/seed.mjs` | Создание администратора |
| `docker/keys.mjs` | Генерация `.env` и ключей |

Образы: `supabase/postgres:17.6.1.136`, `supabase/gotrue:v2.189.0`, `postgrest/postgrest:v14.12` (те же версии, что в официальной self-hosted сборке Supabase), `node:22-alpine`, `nginx:1.27-alpine`.
