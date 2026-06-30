# 🚀 LabGate Flutter

Мобильное приложение системы контроля доступа в лаборатории на Flutter (iOS + Android).

## 📋 Функционал

- 🔐 **Авторизация** — вход и регистрация через Supabase Auth (роли: студент / преподаватель)
- 📱 **Студент** — сканирование QR-кода камерой для записи посещения
- 🚪 **Преподаватель** — создание комнат, генерация QR-кодов, просмотр посетителей
- 📊 **Отчёты** — статистика посещений за 30 дней
- 🌙 **Dark UI** — glassmorphism тёмная тема

## 🛠 Стек

- **Flutter** 3.x (Dart 3.x)
- **Supabase** — база данных, авторизация, realtime
- **Riverpod** — управление состоянием
- **GoRouter** — навигация
- **mobile_scanner** — сканирование QR
- **qr_flutter** — генерация QR

## 🚀 Быстрый старт

### 1. Установка Flutter

Скачайте Flutter SDK: https://docs.flutter.dev/get-started/install

### 2. Установка зависимостей

```bash
cd labgate_flutter
flutter pub get
```

### 3. Запуск на Android

```bash
flutter run -d android
```

### 4. Запуск на iOS (требуется macOS + Xcode)

```bash
cd ios && pod install && cd ..
flutter run -d ios
```

### 5. Сборка APK для Android

```bash
flutter build apk --release
# APK: build/app/outputs/flutter-apk/app-release.apk
```

### 6. Сборка IPA для iOS

```bash
flutter build ipa --release
```

## 📁 Структура проекта

```
labgate_flutter/
├── lib/
│   ├── main.dart                    # Точка входа
│   ├── core/
│   │   ├── constants.dart           # Supabase URL и ключи
│   │   └── router.dart              # GoRouter навигация
│   ├── models/
│   │   ├── profile.dart             # Модель профиля
│   │   ├── room.dart                # Модель комнаты
│   │   └── visitor.dart             # Модель посещения
│   ├── providers/
│   │   ├── auth_provider.dart       # Провайдеры авторизации
│   │   └── rooms_provider.dart      # Провайдеры комнат/посетителей
│   ├── screens/
│   │   ├── login_screen.dart        # Экран входа/регистрации
│   │   ├── student_screen.dart      # Главный экран студента
│   │   ├── scan_screen.dart         # QR-сканер
│   │   ├── professor_screen.dart    # Кабинет преподавателя
│   │   └── reports_screen.dart      # Отчёты
│   ├── services/
│   │   └── supabase_service.dart    # Все запросы к Supabase
│   └── widgets/
│       └── glass_card.dart          # Glassmorphism карточка
├── android/
│   └── app/src/main/
│       └── AndroidManifest.xml      # Разрешения камеры + интернет
├── ios/
│   └── Runner/
│       └── Info.plist               # Разрешения камеры iOS
└── pubspec.yaml                     # Зависимости
```

## 🔒 Безопасность

- RLS (Row Level Security) на всех таблицах Supabase
- Проверка роли при входе (student / professor)
- QR-код содержит UUID комнаты — валидируется на клиенте

## ⚙️ База данных

Используется та же схема Supabase что и в веб-версии (`labgate/supabase/schema.sql`).
Никаких изменений в БД не требуется.

## 📝 Примечания

- Для iOS сборки нужен macOS с Xcode 15+
- Для Android достаточно Windows/Linux с Android Studio
- Supabase URL и ключи находятся в `lib/core/constants.dart`
