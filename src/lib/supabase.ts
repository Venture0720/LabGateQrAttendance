import { createClient } from '@supabase/supabase-js';

// Получаем переменные окружения
const supabaseUrlEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKeyEnv = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Используем заглушки только если переменные не заданы (для предотвращения ошибок при сборке)
// ВАЖНО: Приложение не будет работать с заглушками, нужно настроить Environment Variables в Vercel или .env
const supabaseUrl = (supabaseUrlEnv && supabaseUrlEnv !== 'undefined') 
  ? supabaseUrlEnv 
  : 'https://placeholder.supabase.co';

const supabaseAnonKey = (supabaseAnonKeyEnv && supabaseAnonKeyEnv !== 'undefined') 
  ? supabaseAnonKeyEnv 
  : 'placeholder';

if (typeof window !== 'undefined' && supabaseUrl.includes('placeholder')) {
  console.warn("Supabase URL is missing. Check your environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

