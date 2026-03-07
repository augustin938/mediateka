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

- 🔍 **Умный поиск** с debounce (400ms) по TMDB, OpenLibrary и RAWG одновременно
- 📋 **Статусы**: Хочу / В процессе / Завершено / Брошено
- ⭐ **Оценки** от 1 до 10 + текстовый отзыв
- 🔄 **Оптимистичные обновления** статусов без задержки
- 📱 **Адаптивный дизайн** (4 → 2 → 1 колонка)
- 💀 **Skeleton screens** при загрузке
- 🔔 **Toast-уведомления** через Sonner
- 🔐 **OAuth**: Google + GitHub
- 👤 **Профиль** со статистикой коллекции

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
TMDB_API_KEY="..."      # https://www.themoviedb.org/settings/api
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
```

### 4. Запуск

```bash
npm run dev
```

Открыть [http://localhost:3000](http://localhost:3000)

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
│   │   └── profile/       # Профиль
│   ├── api/
│   │   ├── auth/[...all]/ # Better Auth handler
│   │   ├── search/        # Агрегатор поиска
│   │   └── collection/    # CRUD коллекции
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
    │   ├── tmdb.ts        # TMDB API
    │   ├── openLibrary.ts # OpenLibrary API
    │   └── rawg.ts        # RAWG API
    └── validations/
        └── collection.ts  # Zod schemas
```

## API Endpoints

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/search?q=...&type=all` | Поиск по всем источникам |
| GET | `/api/collection` | Получить коллекцию пользователя |
| POST | `/api/collection` | Добавить в коллекцию |
| PATCH | `/api/collection/:id` | Обновить статус/оценку/отзыв |
| DELETE | `/api/collection/:id` | Удалить из коллекции |

## Схема БД

```
users           — Better Auth таблица пользователей
sessions        — Сессии
accounts        — OAuth аккаунты
verifications   — Верификации email
media_item      — Кеш данных из внешних API
collection_item — Элементы коллекции пользователя
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

- **TMDB**: [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) — бесплатно
- **RAWG**: [rawg.io/apidocs](https://rawg.io/apidocs) — бесплатно
- **OpenLibrary**: не требует ключа
- **Google OAuth**: [console.cloud.google.com](https://console.cloud.google.com)
- **GitHub OAuth**: [github.com/settings/developers](https://github.com/settings/developers)

## Лицензия

MIT
