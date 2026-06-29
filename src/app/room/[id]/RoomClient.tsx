"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { CheckCircle2 } from "lucide-react";

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
        setError(visitError.message);
      } else {
        setSubmitted(true);
      }
      setLoading(false);
    };

    checkAuthAndSubmit();
  }, [roomId, router]);

  if (error) {
    return (
      <div className="min-h-full flex items-center justify-center p-4 bg-transparent">
        <div className="glass-card p-8 text-center max-w-sm">
          <h1 className="text-xl font-bold mb-2 text-red-400">Ошибка</h1>
          <p className="text-white/40 text-sm mb-6">{error}</p>
          <button
            onClick={() => router.push("/scan")}
            className="glass-button px-6 py-3 text-sm font-bold text-white/80"
          >
            Сканировать снова
          </button>
        </div>
      </div>
    );
  }

  if (!room && !error) {
    return (
      <div className="min-h-full flex items-center justify-center p-4 bg-transparent">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white/5 border-t-white/40 rounded-full animate-spin" />
          <p className="text-white/20 animate-pulse font-medium text-sm">Запись входа...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-full flex items-center justify-center p-4 relative overflow-hidden bg-transparent">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-10 text-center max-w-sm relative z-10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <CheckCircle2 className="w-20 h-20 text-white/80 mx-auto mb-6" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h1 className="text-3xl font-bold mb-2 text-white/90 tracking-tight">Добро пожаловать!</h1>
            {room && (
              <p className="text-white/60 font-semibold mb-4 text-lg">{room.name}</p>
            )}
            <p className="text-white/30 text-xs font-medium uppercase tracking-widest">
              Вы вошли как{" "}
              <span className="text-white/60 font-black">{userName}</span>
            </p>
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/student")}
            className="mt-10 w-full glass-button py-4 text-sm font-bold text-white/80"
          >
            На главную
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return null;
}
