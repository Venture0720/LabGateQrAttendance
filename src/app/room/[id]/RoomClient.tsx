"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, XCircle } from "lucide-react";

export default function RoomClientContent() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;
  const [room, setRoom] = useState<{ name: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    if (!roomId || roomId === "temp") return;

    const checkAuthAndSubmit = async () => {
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

      setUserName(profile.username);
      setLoading(true);

      const { data, error: roomError } = await supabase
        .from("rooms")
        .select("name, is_active")
        .eq("id", roomId)
        .single();

      if (roomError || !data || !data.is_active) {
        setError("Комната не найдена или неактивна");
        setLoading(false);
        return;
      }
      setRoom(data);

      const { error: visitError } = await supabase.from("visitors").insert({
        room_id: roomId,
        profile_id: user.id,
        name: profile.username,
      });

      if (visitError) {
        console.error("Visit insert error:", visitError);
        // If it's a duplicate or something, we might still want to show success 
        // if they are already registered for this room today? 
        // But for now, let's just show the error.
        setError(visitError.message);
      } else {
        setSubmitted(true);
        // Small vibration feedback if supported
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
      }
      setLoading(false);
    };

    checkAuthAndSubmit();
  }, [roomId, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-transparent">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 text-center max-w-sm w-full"
        >
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold mb-2 text-white/90">Упс! Ошибка</h1>
          <p className="text-white/40 text-sm mb-8 leading-relaxed">{error}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push("/scan")}
              className="w-full glass-button py-4 text-sm font-bold text-white/90"
            >
              Сканировать снова
            </button>
            <button
              onClick={() => router.push("/student")}
              className="w-full py-3 text-xs font-medium text-white/30 hover:text-white transition-colors"
            >
              В личный кабинет
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (loading && !submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-transparent">
        <div className="relative">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-2 border-white/5 border-t-white/40 rounded-full"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" />
          </div>
        </div>
        <p className="mt-6 text-white/20 font-medium text-sm tracking-widest uppercase">Регистрация входа...</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-transparent">
        <div className="liquid-blob top-[-10%] right-[-10%] w-80 h-80 opacity-20" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="glass-card p-10 text-center max-w-sm w-full relative z-10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              delay: 0.2, 
              type: "spring", 
              stiffness: 260, 
              damping: 20 
            }}
            className="w-24 h-24 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8 shadow-2xl"
          >
            <CheckCircle2 className="w-12 h-12 text-white/80" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h1 className="text-3xl font-bold mb-2 text-white/90 tracking-tight">Готово!</h1>
            <p className="text-white/40 text-sm mb-6">Ваш визит успешно зафиксирован</p>
            
            <div className="py-4 px-6 bg-white/[0.03] border border-white/5 rounded-2xl mb-8">
              <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold mb-1">Лаборатория</p>
              <p className="text-lg font-bold text-white/80 leading-tight">{room?.name}</p>
            </div>

            <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
              Студент: <span className="text-white/60">{userName}</span>
            </p>
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/student")}
            className="mt-10 w-full glass-button py-4.5 text-sm font-bold text-white/90 shadow-xl"
          >
            Понятно
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return null;
}
