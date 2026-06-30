"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut, QrCode, User, GraduationCap } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function StudentPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, [router]);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "student") {
      router.push("/login");
      return;
    }
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
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between glass p-4"
        >
          <div>
            <h1 className="text-xl font-bold text-white/90">LabGate</h1>
            <p className="text-xs text-white/30 uppercase tracking-wider font-semibold">Кабинет студента</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm text-white/40 hover:text-white"
          >
            <LogOut className="w-4 h-4" />
            Выйти
          </motion.button>
        </motion.div>

        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 flex items-center gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
            <User className="w-7 h-7 text-white/80" />
          </div>
          <div>
            <p className="font-bold text-lg text-white/90">{profile?.username || "Студент"}</p>
            <p className="text-sm text-white/40 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5" />
              Доступ к лабораториям
            </p>
          </div>
        </motion.div>

        {/* Main action — QR scanner */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/scan")}
          className="w-full glass-card p-8 flex flex-col items-center gap-6 cursor-pointer hover:bg-white/[0.06] border border-white/10 transition-all group"
        >
          {/* Animated QR icon */}
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10 relative z-10"
            >
              <QrCode className="w-10 h-10 text-white/80" />
            </motion.div>
            <div className="absolute inset-0 bg-white/5 rounded-3xl blur-xl" />
          </div>

          <div className="text-center">
            <p className="text-xl font-bold mb-1 text-white/90">Сканировать QR-код</p>
            <p className="text-sm text-white/40">
              Наведите камеру на QR у входа в лабораторию
            </p>
          </div>

          <div className="flex items-center gap-2 text-white/60 text-sm font-medium">
            <span>Открыть сканер</span>
            <motion.span
              animate={{ x: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            >
              →
            </motion.span>
          </div>
        </motion.button>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="glass p-4 rounded-2xl"
        >
          <p className="text-xs text-white/40 text-center leading-relaxed">
            💡 QR-код расположен у входа в лабораторию.<br />
            Вход будет записан автоматически под вашим логином.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
