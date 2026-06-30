"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, User, QrCode, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AnimatedContent from "@/components/AnimatedContent";

type Role = "professor" | "student" | null;

const roleConfig = {
  professor: {
    label: "Профессор",
    sub: "Управление комнатами и QR",
    icon: GraduationCap,
  },
  student: {
    label: "Студент",
    sub: "Вход в лабораторию по QR",
    icon: User,
  },
};

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

    const cleanUsername = username.toLowerCase().trim();
    if (!cleanUsername) { setError("Введите логин"); setLoading(false); return; }
    if (/\s/.test(cleanUsername)) { setError("Логин не должен содержать пробелы"); setLoading(false); return; }
    if (/@/.test(cleanUsername)) { setError("Введите только логин, без @domain"); setLoading(false); return; }

    const email = `${cleanUsername}@labgate.local`;
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      if (authError.message.includes("Email not confirmed")) {
        setError("Почта не подтверждена. Отключите 'Confirm Email' в настройках Supabase.");
      } else if (authError.message.toLowerCase().includes("rate limit")) {
        setError("Слишком много попыток. Подождите немного.");
      } else if (authError.message === "Invalid login credentials") {
        setError("Неверный логин или пароль");
      } else {
        setError(authError.message);
      }
      setLoading(false);
      return;
    }

    if (data.user) {
      let { data: profile, error: profileError } = await supabase
        .from("profiles").select("role, username").eq("id", data.user.id).maybeSingle();

      if (!profile || profileError) {
        await new Promise(r => setTimeout(r, 500));
        const retry = await supabase.from("profiles").select("role, username").eq("id", data.user.id).maybeSingle();
        profile = retry.data;
        profileError = retry.error;
      }

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setError("Профиль не найден");
        setLoading(false);
        return;
      }

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

  return (
    <div className="min-h-full flex flex-col items-center justify-start pt-12 md:pt-20 p-4 relative overflow-y-auto">
      <div className="w-full max-w-md relative z-10">

        {/* Logo */}
        <AnimatedContent distance={40} duration={0.9} ease="power3.out" delay={0}>
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2.5rem] glass mb-6"
              style={{ boxShadow: "0 0 40px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.15)" }}>
              <QrCode className="w-10 h-10 text-white/80" />
            </div>
            <h1 className="pixel-title text-2xl mb-3 leading-tight">LabGate</h1>
            <p className="text-white/40 font-medium text-sm tracking-wide">Система доступа в лаборатории</p>
          </div>
        </AnimatedContent>

        {/* Role Selection */}
        {!selected && (
          <AnimatedContent distance={50} duration={0.8} ease="power3.out" delay={0.15}>
            <div className="glass-card p-6 md:p-8 space-y-4">
              <h2 className="font-pixel text-xs text-white/60 mb-4 text-center tracking-widest">ВЫБЕРИТЕ РОЛЬ</h2>

              {(["professor", "student"] as const).map((role, i) => {
                const c = roleConfig[role];
                const Icon = c.icon;
                return (
                  <button
                    key={role}
                    onClick={() => setSelected(role)}
                    className="btn-glass w-full flex items-center gap-4 p-5 text-left"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                      <Icon className="w-6 h-6 text-white/80" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white/90 truncate">{c.label}</p>
                      <p className="text-xs text-white/40 truncate mt-0.5">{c.sub}</p>
                    </div>
                    <span className="text-white/20 text-lg">›</span>
                  </button>
                );
              })}
            </div>
          </AnimatedContent>
        )}

        {/* Login Form */}
        {selected && (
          <AnimatedContent distance={40} direction="horizontal" duration={0.7} ease="power3.out">
            <div className="glass-card p-6 md:p-8">
              <button
                onClick={() => { setSelected(null); setError(""); setUsername(""); setPassword(""); }}
                className="text-sm text-white/40 hover:text-white/80 transition-colors mb-8 block font-medium"
              >
                ← Назад
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                  {(() => { const Icon = roleConfig[selected].icon; return <Icon className="w-6 h-6 text-white/80" />; })()}
                </div>
                <div>
                  <h2 className="font-pixel text-xs text-white/80 tracking-wider">
                    {roleConfig[selected].label.toUpperCase()}
                  </h2>
                  <p className="text-xs text-white/40 mt-1">Введите логин и пароль</p>
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs text-white/40 mb-2 font-medium tracking-wide uppercase">Логин</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="username"
                    autoComplete="username"
                    className="input-glass w-full px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/40 mb-2 font-medium tracking-wide uppercase">Пароль</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="input-glass w-full px-4 py-3 pr-12 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors p-1"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-4 mt-2 text-sm font-pixel tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "ВХОД..." : "ВОЙТИ"}
                </button>
              </form>
            </div>
          </AnimatedContent>
        )}
      </div>
    </div>
  );
}
