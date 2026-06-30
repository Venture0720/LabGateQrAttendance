"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { Room } from "@/types";
import { LogOut, DoorOpen, Users, ArrowRight } from "lucide-react";

export default function RoomListPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Check auth
  useEffect(() => {
    if (localStorage.getItem("labgate-role") !== "student") {
      router.push("/login");
    }
  }, [router]);

  // Fetch rooms
  useEffect(() => {
    const fetchRooms = async () => {
      const { data } = await supabase
        .from("rooms")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      setRooms(data || []);
      setLoading(false);
    };
    fetchRooms();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("labgate-role");
    router.push("/login");
  };

  return (
    <div className="min-h-screen p-4 md:p-6 relative overflow-hidden bg-transparent">
      <div className="liquid-blob top-[-10%] right-[-10%] w-72 h-72" />
      <div className="liquid-blob bottom-[-10%] left-[-10%] w-72 h-72" />

      <div className="max-w-lg mx-auto relative z-10 space-y-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 200 }}
          className="flex items-center justify-between glass p-4"
        >
          <div>
            <h1 className="text-xl font-bold text-white/90 tracking-tight">LabGate</h1>
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Кабинет студента</p>
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

        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-8 text-center"
        >
          <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
            <DoorOpen className="w-8 h-8 text-white/70" />
          </div>
          <h2 className="text-2xl font-bold text-white/90 tracking-tight mb-2">Выберите комнату</h2>
          <p className="text-sm text-white/40 font-medium">
            Или отсканируйте QR-код для быстрого входа
          </p>
        </motion.div>

        {/* Rooms List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass p-4"
        >
          <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3 text-white/40">Доступные комнаты</h3>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-white/10 border-t-white/60 rounded-full animate-spin" />
            </div>
          ) : rooms.length === 0 ? (
            <p className="text-xs text-white/30 text-center py-8 font-medium">
              Нет доступных комнат. Обратитесь к профессору.
            </p>
          ) : (
            <div className="space-y-2">
              {rooms.map((room, i) => (
                <motion.a
                  key={room.id}
                  href={`/room/${room.id}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i, type: "spring", damping: 24, stiffness: 220 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 group-hover:text-white transition-colors">
                      <DoorOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-white/90">{room.name}</p>
                      <p className="text-[10px] text-white/30 font-medium uppercase tracking-wider">
                        {new Date(room.created_at).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </motion.a>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
