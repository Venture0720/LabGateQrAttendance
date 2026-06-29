# 🚀 LabGate — Laboratory Access Control System

Современная система контроля доступа в лаборатории на основе QR-кодов.

## 📋 Возможности

- 🔐 **Авторизация** — регистрация и вход через Supabase Auth
- 📱 **Сканер QR** — мобильный интерфейс для студентов
- 🚪 **Терминал двери** — QR-код с динамическим токеном (обновление каждые 10 сек)
- 📊 **История доступа** — логирование всех входов/выходов
- 🎨 **Glassmorphism UI** — тёмная тема с blur-эффектами
- 📲 **PWA** — установка на мобильное устройство как нативное приложение

## 🛠 Стек

- **Frontend:** Next.js 16 (App Router), React 19
- **Стили:** Tailwind CSS 4, Framer Motion
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **PWA:** Service Worker, manifest.json

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
cd labgate
npm install
```

### 2. Настройка Supabase

1. Создайте проект на [supabase.com](https://supabase.com)
2. Выполните SQL из `supabase/schema.sql` в SQL Editor
3. Скопируйте URL и ключи в `.env.local`

### 3. Запуск разработки

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000)

### 4. Создание админа

1. Зарегистрируйтесь через `/login`
2. В Supabase Dashboard → Authentication → Users
3. Найдите своего пользователя и измените `role` на `admin` в таблице `profiles`

## 📱 PWA — Установка на телефон

### iOS (iPhone/iPad):
1. Откройте сайт в Safari
2. Нажмите «Поделиться» → «На экран "Домой"»

### Android:
1. Откройте сайт в Chrome
2. Нажмите меню (⋮) → «Установить приложение»

## 🌐 Деплой на Vercel

### Шаг 1: Публикация на GitHub

```bash
# Инициализация git (если ещё не сделано)
git init
git add .
git commit -m "Initial LabGate commit"

# Создание репозитория на GitHub, затем:
git remote add origin https://github.com/yourusername/labgate.git
git branch -M main
git push -u origin main
```

### Шаг 2: Деплой на Vercel

1. Перейдите на [vercel.com](https://vercel.com) и войдите через GitHub
2. Нажмите **«Add New Project»**
3. Импортируйте репозиторий `labgate`
4. Нажмите **«Deploy»**

### Шаг 3: Настройка переменных окружения

В Dashboard Vercel → **Settings** → **Environment Variables**:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `your-supabase-url` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-supabase-anon-key` |
| `SUPABASE_SERVICE_ROLE_KEY` | `your-supabase-service-role-key` |

Перезапустите деплой после добавления переменных.

### Шаг 4: Доступ с мобильного

Получите URL вида `https://labgate.vercel.app`:
- Откройте на телефоне
- Установите как PWA (см. выше)

## 📁 Структура проекта

```
labgate/
├── public/                  # Статические файлы
│   ├── manifest.json        # PWA manifest
│   ├── sw.js                # Service Worker
│   └── icon-*.png           # PWA иконки
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx       # Корневой layout
│   │   ├── page.tsx         # Редирект
│   │   ├── login/page.tsx   # Страница входа
│   │   ├── student/page.tsx # Сканер QR (студент)
│   │   └── terminal/page.tsx # Терминал двери (admin)
│   ├── components/
│   │   └── PWAProvider.tsx  # PWA install prompt
│   ├── lib/
│   │   └── supabase.ts      # Supabase client
│   └── types/
│       └── index.ts         # TypeScript типы
├── supabase/
│   └── schema.sql           # SQL схема БД
├── .env.local               # Переменные окружения
└── package.json
```

## 🔒 Безопасность

- RLS (Row Level Security) на всех таблицах
- Динамические QR-токены с истечением 10 секунд
- Ролевая модель: student / admin

## 📝 Лицензия

MIT
