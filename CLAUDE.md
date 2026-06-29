# LabGate Project Guide

## Project Overview
LabGate is a mobile-first application for managing laboratory access using QR codes.
It is built with Next.js (static export), Supabase Auth, and Capacitor for Android.

## Security Architecture
- **Authentication**: Managed by Supabase Auth.
- **Login Flow**: Users log in with a username. Internally, this maps to `username@labgate.local`.
- **Authorization**: Role-based access control (RBAC) via the `public.profiles` table and PostgreSQL Row Level Security (RLS).
- **Data Safety**: Direct password storage in the database is removed. RLS policies ensure users only see relevant data.

## Mobile Build Instructions (APK)
To build the Android application:
1. **Export Next.js**: `npm run build` (generates the `out` folder).
2. **Sync Capacitor**: `npx cap sync android`.
3. **Build APK**:
   - Open Android Studio: `npx cap open android`.
   - In Android Studio: `Build > Build Bundle(s) / APK(s) > Build APK(s)`.
   - The APK will be in `android/app/build/outputs/apk/debug/`.

## Key Commands
- `npm run dev`: Run local development server.
- `npm run build`: Create static export for mobile.
- `npx cap sync`: Synchronize web assets with native project.
- `npx cap open android`: Open the Android project in Android Studio.

## Database Schema
The schema is defined in `supabase/schema.sql`.
- `public.profiles`: Stores user roles (`admin`, `student`, `developer`).
- `public.rooms`: Laboratory rooms created by admins.
- `public.visitors`: Log of scans (visits).
