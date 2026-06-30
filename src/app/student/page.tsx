"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, QrCode, User, GraduationCap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AnimatedContent from "@/components/AnimatedContent";

export default function StudentPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, [router]);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: profile } = await supabase
      .from("profiles").select("*").eq("id", user.id).single();

    if (profile?.role !== "student") { router.push("/login"); return; }
    setProfile(profile);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-full flex flex-col p-4 relative overflow-hidden bg-transparent">
      <div className="max-w-md mx-auto w-full relative z-10 space-y-4">

        {/* Header */}
        <AnimatedContent distance={30} duration={0.7} ease="power3.out">
          <div className="flex items-center justify-between glass p-4">
            <div>
              <h1 className="pixel-title text-base leading-tight">LabGate</h1>
              <p className="text-xs text-white/30 uppercase tracking-wider font-semibold mt-1">Кабинет студента</p>
            </div>
            <button onClick={handleLogout} className="btn-glass flex items-center gap-2 px-4 py-2 text-sm">
              <LogOut className="w-4 h-4" />
              Выйти
            </button>
          </div>
        </AnimatedContent>

        {/* Profile card */}
        <AnimatedContent distance={40} duration={0.8} ease="power3.out" delay={0.1}>
          <div className="glass-card p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
              <User className="w-7 h-7 text-white/80" />
            </div>
            <div>
              <p className="font-bold text-lg text-white/90">{profile?.username || "Загрузка..."}</p>
              <p className="text-sm text-white/40 flex items-center gap-1 mt-0.5">
                <GraduationCap className="w-3.5 h-3.5" />
                Студент лаборатории
              </p>
            </div>
          </div>
        </AnimatedContent>

        {/* Main action — QR scanner */}
        <AnimatedContent distance={40} duration={0.8} ease="power3.out" delay={0.2}>
          <button
            onClick={() => router.push("/scan")}
            className="btn-glass w-full p-8 flex flex-col items-center gap-6 cursor-pointer group"
            style={{ borderRadius: "1.5rem" }}
          >
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10 relative z-10">
                <QrCode className="w-10 h-10 text-white/80 group-hover:text-white transition-colors" />
              </div>
              <div className="absolute inset-0 bg-white/5 rounded-3xl blur-xl" />
            </div>

            <div className="text-center">
              <p className="font-pixel text-xs text-white/80 tracking-wider mb-3">СКАНИРОВАТЬ QR-КОД</p>
              <p className="text-sm text-white/40">
                Наведите камеру на QR и войдите в лабораторию
              </p>
            </div>

            <div className="flex items-center gap-2 text-white/50 text-sm font-medium">
              <span>Открыть камеру</span>
              <span className="text-lg">→</span>
            </div>
          </button>
        </AnimatedContent>

        {/* Info */}
        <AnimatedContent distance={20} duration={0.7} ease="power3.out" delay={0.35}>
          <div className="glass p-4 rounded-2xl">
            <p className="text-xs text-white/40 text-center leading-relaxed">
              QR-код генерируется в кабинете профессора.<br />
              Каждое посещение фиксируется автоматически один раз.
            </p>
          </div>
        </AnimatedContent>

      </div>
    </div>
  );
}
