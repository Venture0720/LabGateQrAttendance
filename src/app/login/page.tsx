"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GraduationCap, User, QrCode, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Role = "professor" | "student" | null;

export default function LoginPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Role>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    setError("");

    // Validate and clean username
    const cleanUsername = username.toLowerCase().trim();
    if (!cleanUsername) {
      setError("Введите логин");
      setLoading(false);
      return;
    }

    if (/\s/.test(cleanUsername)) {
      setError("Логин не должен содержать пробелы");
      setLoading(false);
      return;
    }

    if (/@/.test(cleanUsername)) {
      setError("Введите только логин, без @domain");
      setLoading(false);
      return;
    }

    const email = `${cleanUsername}@labgate.local`;

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error("Login error:", authError);
      if (authError.message.includes("Email not confirmed")) {
        setError("Почта не подтверждена. Отключите 'Confirm Email' в настройках Supabase.");
      } else if (authError.message.toLowerCase().includes("rate limit")) {
        setError("Слишком много попыток входа. Подождите немного или проверьте настройки лимитов в Supabase.");
      } else {
        // Показываем конкретную ошибку для отладки, если это не просто неверные данные
        if (authError.message === "Invalid login credentials") {
          setError("Неверный логин или пароль");
        } else {
          setError(authError.message);
        }
      }
      setLoading(false);
      return;
    }

    if (data.user) {
      // Fetch profile to verify role. Using maybeSingle to handle 'not found' gracefully.
      let { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, username")
        .eq("id", data.user.id)
        .maybeSingle();

      // If not found, retry once (sometimes RLS needs a moment to catch the new session)
      if (!profile || profileError) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const retry = await supabase
          .from("profiles")
          .select("role, username")
          .eq("id", data.user.id)
          .maybeSingle();
        profile = retry.data;
        profileError = retry.error;
      }

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setError("Профиль не найден");
        setLoading(false);
        return;
      }

      // Check if selected role matches profile role
      // Added case-insensitive comparison and trim for maximum robustness
      const dbRole = profile.role?.toLowerCase().trim();
      const expectedRole = selected?.toLowerCase().trim();

      if (dbRole !== expectedRole) {
        await supabase.auth.signOut();
        setError(`У вас нет прав для входа как ${roleConfig[selected].label}`);
        setLoading(false);
        return;
      }

      if (dbRole === "professor") router.push("/professor");
      else router.push("/student");
      return;
    }

    setError("Ошибка входа");
    setLoading(false);
  };

  const roleConfig = {
    professor: {
      label: "Профессор",
      sub: "Управление комнатами и QR",
      icon: GraduationCap,
      ring: "focus:ring-white/10",
      border: "hover:border-white/30",
    },
    student: {
      label: "Студент",
      sub: "Вход в лабораторию по QR",
      icon: User,
      ring: "focus:ring-white/10",
      border: "hover:border-white/30",
    },
  };

  const cfg = selected ? roleConfig[selected] : null;

  return (
    <div className="min-h-full flex flex-col items-center justify-start pt-12 md:pt-20 p-4 relative overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        {!selected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2.5rem] glass mb-6 glow">
              <QrCode className="w-10 h-10 text-white/80" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-2 tracking-tighter">LabGate</h1>
            <p className="text-white/40 font-medium text-sm">Система доступа в лаборатории</p>
          </motion.div>
        )}

        {/* Role Selection */}
        {!selected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 md:p-8 space-y-4"
          >
            <h2 className="text-lg font-semibold mb-2 text-center text-white/90">Выберите роль</h2>

            {(["professor", "student"] as const).map((role) => {
              const c = roleConfig[role];
              const Icon = c.icon;
              return (
                <motion.button
                  key={role}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelected(role)}
                  className={`w-full flex items-center gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/5 ${c.border} hover:bg-white/[0.08] transition-all`}
                >
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                    <Icon className="w-6 h-6 text-white/80" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-semibold text-white/90 truncate">{c.label}</p>
                    <p className="text-xs text-white/40 truncate">{c.sub}</p>
                  </div>
                  <Lock className="w-4 h-4 text-white/20 shrink-0" />
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {/* Login Form */}
        {selected && cfg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 md:p-8"
          >
            <button
              onClick={() => { setSelected(null); setError(""); setUsername(""); setPassword(""); }}
              className="text-sm text-white/40 hover:text-white transition-colors mb-8 block font-medium"
            >
              ← Назад к выбору роли
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                <cfg.icon className="w-6 h-6 text-white/80" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white/90">
                  Вход — {cfg.label}
                </h2>
                <p className="text-xs text-white/40">Введите логин и пароль</p>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/5 border border-red-500/20 text-red-400/80 px-4 py-3 rounded-xl mb-6 text-sm font-medium"
              >
                {error}
              </motion.div>
            )}


            <form onSubmit={handleLogin} className="space-y-6" autoComplete="off">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider ml-1">Логин</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-1 ${cfg.ring} focus:bg-white/[0.05] transition-all text-base`}
                    placeholder={selected === "professor" ? "prof" : "student"}
                    name="lg-user"
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    required
                  />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider ml-1">Пароль</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-4 pr-12 text-white placeholder:text-white/20 focus:outline-none focus:ring-1 ${cfg.ring} focus:bg-white/[0.05] transition-all text-base`}
                    placeholder="••••••••"
                    name="lg-pass"
                    autoComplete="current-password"
                    data-1p-ignore
                    data-lpignore="true"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-white/30 hover:text-white transition-colors rounded-lg"
                  >
                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-white/10 hover:bg-white/15 text-white font-bold py-4 rounded-xl border border-white/10 transition-all disabled:opacity-50 text-base shadow-xl"
              >
                {loading ? "Вход..." : "Войти"}
              </motion.button>

            </form>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
