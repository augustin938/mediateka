# 🎬📚🎮 Медиатека

> Личная медиатека — каталогизируй свои фильмы, книги и игры в одном месте.

## Стек технологий

| Слой | Технология |
|------|-----------|
| Framework | Next.js 15 (App Router) |
| Язык | TypeScript (strict) |
| База данных | PostgreSQL (Neon / Vercel Postgres) |
| ORM | Drizzle ORM + Drizzle Kit |
| Auth | Better Auth (email + Google + GitHub) |
| Стили | Tailwind CSS + shadcn/ui |
| Уведомления | Sonner |
| Валидация | Zod |

## Возможности

- 🔍 **Умный поиск** с debounce (400ms) по kinopoisk, OpenLibrary и RAWG одновременно
- 📋 **Статусы**: Хочу / В процессе / Завершено / Брошено
- ⭐ **Оценки** от 1 до 10 + текстовый отзыв
- 🔄 **Оптимистичные обновления** статусов без задержки
- 📱 **Адаптивный дизайн** (4 → 2 → 1 колонка)
- 💀 **Skeleton screens** при загрузке
- 🔔 **Toast-уведомления** через Sonner
- 🔐 **OAuth**: Google + GitHub
- 👤 **Профиль** + закреплённые элементы, экспорт данных
- 📊 **Статистика**: распределение оценок, топ-жанры, активность по месяцам
- 🧩 **Квиз по коллекции** (вопросы по описанию/году/жанрам/оценке/создателю/постеру)
- 🤝 **Друзья** + просмотр публичного профиля пользователя
- 🕒 **Лента активности** (добавил/начал/завершил/оценил/оставил отзыв)
- 🏆 **Достижения**
- 🎲 **Случайный выбор** из коллекции
- 🔝 **Топы** (подборки/лидерборды)

## Быстрый старт

### 1. Клонирование и установка зависимостей

```bash
git clone <repo>
cd mediateka
npm install
```

### 2. Настройка переменных окружения

```bash
cp .env.example .env.local
```

Заполните `.env.local`:

```env
# База данных (Neon — бесплатный tier)
DATABASE_URL="postgresql://..."

# Better Auth (минимум 32 символа)
BETTER_AUTH_SECRET="super-secret-key-at-least-32-chars"
BETTER_AUTH_URL="http://localhost:3000"

# OAuth (опционально, но рекомендуется)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."

# API ключи
KINOPOISK_API_KEY="..."      # https://kinopoiskapiunofficial.tech/api
RAWG_API_KEY="..."      # https://rawg.io/apidocs
# OpenLibrary — бесплатно, ключ не нужен
```

### 3. Настройка базы данных

```bash
# Создать миграции из схемы
npm run db:generate

# Применить миграции
npm run db:migrate

# ИЛИ сразу запушить схему (для разработки)
npm run db:push

# UI для просмотра/редактирования БД (локально)
npm run db:studio
```

### 4. Запуск

```bash
npm run dev
```

Открыть:
Локально - [http://localhost:3000](http://localhost:3000),
На Vercel - [https://mediateka.vercel.app](https://mediateka.vercel.app/)

---

## Структура проекта

```
src/
├── app/
│   ├── (auth)/            # Страницы логина/регистрации
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/       # Защищённые страницы (требуют auth)
│   │   ├── dashboard/     # Главная с поиском
│   │   ├── collection/    # Моя коллекция
│   │   ├── profile/       # Профиль
│   │   ├── stats/         # Статистика
│   │   ├── quiz/          # Квиз по коллекции
│   │   ├── friends/       # Друзья
│   │   ├── activity/      # Лента активности
│   │   ├── random/        # Случайный элемент
│   │   ├── tops/          # Топы/подборки
│   │   ├── achievements/  # Достижения
│   │   ├── recommendations/ # Рекомендации
│   │   └── user/[id]/     # Публичный профиль пользователя
│   ├── api/
│   │   ├── auth/[...all]/ # Better Auth handler
│   │   ├── search/        # Агрегатор поиска
│   │   ├── collection/    # CRUD коллекции (+ теги)
│   │   ├── profile/       # Профиль / export / pinned / me
│   │   ├── stats/         # Статистика
│   │   ├── quiz/          # Квиз + результаты
│   │   ├── friends/       # Друзья
│   │   ├── notifications/ # Уведомления
│   │   ├── activity/      # Логи активности
│   │   ├── tags/          # CRUD тегов
│   │   ├── tops/          # Топы
│   │   ├── random/        # Случайный выбор
│   │   ├── recommendations/ # Рекомендации
│   │   └── users/search/  # Поиск пользователей
│   ├── layout.tsx
│   └── page.tsx           # Лендинг
├── components/
│   ├── layout/            # Navbar
│   ├── search/            # SearchSection, MediaCard, Skeleton
│   ├── collection/        # CollectionClient (grid + list)
│   ├── modals/            # MediaDetailModal
│   └── profile/           # ProfileClient
└── lib/
    ├── db/
    │   ├── schema.ts      # Drizzle схема
    │   └── index.ts       # Neon connection
    ├── auth/
    │   ├── index.ts       # Better Auth server config
    │   └── client.ts      # Better Auth client
    ├── api/
    │   ├── kinopoisk.ts   # Kinopoisk API
    │   ├── openLibrary.ts # OpenLibrary API
    │   └── rawg.ts        # RAWG API
    └── validations/
        └── collection.ts  # Zod schemas
```

## API Endpoints

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/search?q=...&type=all` | Поиск по всем источникам |
| GET | `/api/collection?status=...` | Коллекция пользователя (фильтр по статусу опционален) |
| POST | `/api/collection` | Добавить в коллекцию |
| PATCH | `/api/collection/:id` | Обновить статус/оценку/отзыв |
| DELETE | `/api/collection/:id` | Удалить из коллекции |
| GET | `/api/stats` | Агрегированная статистика + активность |
| GET | `/api/activity` | Лента активности |
| GET | `/api/quiz?category=all&count=10` | Получить вопросы квиза |
| POST | `/api/quiz/results` | Сохранить результат квиза |
| GET | `/api/profile` | Публичные данные профиля |
| GET | `/api/profile/me` | Профиль текущего пользователя |
| GET | `/api/profile/export` | Экспорт данных пользователя (CSV) |
| GET/POST | `/api/friends` | Список друзей / добавить друга |
| PATCH/DELETE | `/api/friends/:id` | Принять/удалить/управление связью |
| GET | `/api/notifications` | Список уведомлений |
| PATCH/DELETE | `/api/notifications/:id` | Прочитано / удалить |
| GET/POST | `/api/tags` | Список тегов / создать тег |
| PATCH/DELETE | `/api/tags/:id` | Обновить/удалить тег |
| GET | `/api/users/search?q=...` | Поиск пользователей |
| GET | `/api/tops` | Топы/подборки |
| GET | `/api/random` | Случайный элемент из коллекции |
| GET | `/api/recommendations` | Рекомендации |

## Схема БД

```
user            — Better Auth таблица пользователей
session         — Сессии
account         — OAuth аккаунты
verification    — Верификации email
media_item      — Кеш данных из внешних API
collection_item — Элементы коллекции пользователя
activity_log    — Логи активности
notification    — Уведомления
tag             — Теги
collection_item_tag — Связь элементов коллекции и тегов
friendship      — Друзья/заявки
quiz_result     — Результаты квиза
```

## Деплой на Vercel

```bash
# 1. Создать проект на Vercel
# 2. Подключить Neon Postgres (из Vercel Marketplace)
# 3. Добавить все env-переменные
# 4. Задеплоить

vercel deploy --prod
```

## Получение API ключей

- **KinoPoisk**: [themoviedb.org/settings/api](https://kinopoiskapiunofficial.tech/api) — бесплатно
- **RAWG**: [rawg.io/apidocs](https://rawg.io/apidocs) — бесплатно
- **OpenLibrary**: не требует ключа
- **Google OAuth**: [console.cloud.google.com](https://console.cloud.google.com)
- **GitHub OAuth**: [github.com/settings/developers](https://github.com/settings/developers)

____________________
# Курсовая работа.
## Карпов Никита 23м
