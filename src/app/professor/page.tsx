"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { Room, Visitor, Profile } from "@/types";
import QRCode from "qrcode";
import { LogOut, Plus, Users, Clock, Copy, Check, Trash2, CalendarDays, DoorOpen, BarChart3, GraduationCap, RefreshCw } from "lucide-react";

const generateQR = async (text: string): Promise<string> => {
  return await QRCode.toDataURL(text, {
    width: 300,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
};

export default function ProfessorPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]); // visitors for selected room
  const [allVisitors, setAllVisitors] = useState<any[]>([]); // all visitors for the month
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [newRoomName, setNewRoomName] = useState("");
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [viewTab, setViewTab] = useState<"rooms" | "history" | "students">("rooms");
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<string | null>(null);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);

  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const qrRotateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [qrTimeLeft, setQrTimeLeft] = useState(120);

  // Check auth
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

    if (profile?.role !== "professor") {
      router.push("/login");
      return;
    }

    setUserProfile(profile);
    fetchRooms();
    fetchAllVisitorsMonth();
    fetchAllProfiles();
  }

  const fetchRooms = async () => {
    const { data } = await supabase
      .from("rooms")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setRooms(data || []);
  };

  const fetchAllProfiles = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "student")
      .order("created_at", { ascending: false });
    setAllProfiles(data || []);
  };

  const fetchAllVisitorsMonth = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data } = await supabase
      .from("visitors")
      .select(`*, rooms(name)`)
      .gte("scanned_at", thirtyDaysAgo.toISOString())
      .order("scanned_at", { ascending: false });
    
    setAllVisitors(data || []);
  };

  // Fetch visitors for selected room
  useEffect(() => {
    if (!selectedRoom) return;
    fetchVisitors();
  }, [selectedRoom]);

  const fetchVisitors = async () => {
    const { data } = await supabase
      .from("visitors")
      .select("*")
      .eq("room_id", selectedRoom)
      .order("scanned_at", { ascending: false });
    setVisitors(data || []);
  };

  // Realtime listeners
  useEffect(() => {
    const roomsChannel = supabase
      .channel("rooms-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => {
        fetchRooms();
      })
      .subscribe();

    const visitorsChannel = supabase
      .channel("visitors-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "visitors" }, (payload) => {
        if (selectedRoom && payload.new.room_id === selectedRoom) {
          setVisitors((prev) => [payload.new as Visitor, ...prev]);
        }
        fetchAllVisitorsMonth(); // update monthly history as well
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomsChannel);
      supabase.removeChannel(visitorsChannel);
    };
  }, [selectedRoom]);

  const goToReports = () => {
    router.push("/professor/reports");
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("rooms")
      .insert({ name: newRoomName })
      .select()
      .single();

    if (error) {
      setError(error.message);
    } else {
      setNewRoomName("");
      fetchRooms();
      setSelectedRoom(data.id);
      handleGenerateQR(data.id);
    }
    setLoading(false);
  };

  const handleDeleteRoom = async (roomId: string) => {
    await supabase.from("rooms").update({ is_active: false }).eq("id", roomId);
    if (selectedRoom === roomId) {
      setSelectedRoom("");
      setQrDataUrl("");
      if (qrRotateRef.current) {
        clearInterval(qrRotateRef.current);
        qrRotateRef.current = null;
      }
    }
    fetchRooms();
  };

  const rotateQrToken = async (roomId: string) => {
    const newToken = crypto.randomUUID();
    const { error } = await supabase
      .from("rooms")
      .update({ qr_token: newToken, qr_token_updated_at: new Date().toISOString() })
      .eq("id", roomId);
    if (error) {
      console.error("QR token rotate error:", error);
      return null;
    }
    return newToken;
  };

  const handleGenerateQR = async (roomId: string) => {
    // Clear previous timer
    if (qrRotateRef.current) clearInterval(qrRotateRef.current);

    const generateWithToken = async (token: string) => {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://labgate.vercel.app";
      const roomUrl = `${baseUrl}/room/${roomId}?token=${token}`;
      try {
        const dataUrl = await generateQR(roomUrl);
        setQrDataUrl(dataUrl);
      } catch (err) {
        console.error("QR generation error:", err);
        setError("Ошибка генерации QR");
      }
    };

    // Get current token or rotate immediately
    const { data: room } = await supabase
      .from("rooms")
      .select("qr_token")
      .eq("id", roomId)
      .single();

    const initialToken = room?.qr_token || (await rotateQrToken(roomId));
    if (!initialToken) return;

    setSelectedRoom(roomId);
    setViewTab("rooms");
    setQrTimeLeft(120);
    await generateWithToken(initialToken);

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setQrTimeLeft((prev) => {
        if (prev <= 1) return 120;
        return prev - 1;
      });
    }, 1000);

    // Rotate every 2 minutes
    const rotateInterval = setInterval(async () => {
      const newToken = await rotateQrToken(roomId);
      if (newToken) {
        await generateWithToken(newToken);
        setQrTimeLeft(120);
      }
    }, 120000);

    qrRotateRef.current = rotateInterval;
    // Store countdown interval in a separate ref-like approach via closure cleanup
    // We'll clean both up on unmount
    return () => {
      clearInterval(countdownInterval);
      clearInterval(rotateInterval);
    };
  };

  const handleCopyLink = async () => {
    if (!selectedRoom) return;
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://labgate.vercel.app";
    const roomUrl = `${baseUrl}/room/${selectedRoom}`;
    await navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteUser = async (userId: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, adminId: userProfile?.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Ошибка удаления");
      setAllProfiles((prev) => prev.filter((u) => u.id !== userId));
      setConfirmDeleteUser(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const { error: err } = await supabase.from("visitors").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (err) throw new Error(err.message);
      setAllVisitors([]);
      setConfirmClearHistory(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVisit = async (visitId: string) => {
    const { error: err } = await supabase.from("visitors").delete().eq("id", visitId);
    if (err) { setError(err.message); return; }
    setAllVisitors((prev) => prev.filter((v) => v.id !== visitId));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const selectedRoomData = rooms.find((r) => r.id === selectedRoom);

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-transparent">
      <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto relative z-10 overflow-hidden pb-[88px]">
        {/* Header (Fixed at top) */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl z-20 shrink-0"
        >
          <div>
            <h1 className="text-xl font-bold text-white/90 tracking-tight">LabGate</h1>
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Кабинет профессора</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm text-white/40 hover:text-white"
          >
            <LogOut className="w-5 h-5" />
          </motion.button>
        </motion.div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {viewTab === "rooms" && (
            <div className="space-y-4">
              {/* Create Room */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-5"
              >
                <h2 className="text-sm font-bold mb-3 flex items-center gap-2 text-white/80">
                  <Plus className="w-4 h-4" />
                  Новая комната
                </h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all text-base"
                    placeholder="Название (напр. Лаб. 1)"
                    onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
                  />
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCreateRoom}
                    disabled={loading}
                    className="bg-white/10 hover:bg-white/15 text-white font-semibold px-4 rounded-xl border border-white/10 transition-all disabled:opacity-50"
                  >
                    <Plus className="w-5 h-5" />
                  </motion.button>
                </div>
                {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
              </motion.div>

              {/* Rooms List */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass p-4"
              >
                <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3 text-white/40">Доступные комнаты</h3>
                {rooms.length === 0 ? (
                  <p className="text-xs text-white/30 text-center py-4 font-medium">Нет комнат. Создайте первую!</p>
                ) : (
                  <div className="space-y-2">
                    {rooms.map((room) => {
                      const visitorCount = allVisitors.filter((v) => v.room_id === room.id).length;
                      return (
                        <div
                          key={room.id}
                          className={`flex items-center justify-between py-3 px-4 rounded-xl transition-all cursor-pointer ${
                            selectedRoom === room.id
                              ? "bg-white/[0.08] border border-white/10"
                              : "bg-white/[0.03] border border-white/5 hover:bg-white/[0.05]"
                          }`}
                          onClick={() => handleGenerateQR(room.id)}
                        >
                          <div className="flex items-center gap-3 truncate pr-2">
                            <span className="text-lg shrink-0 opacity-80">🚪</span>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate text-white/90">{room.name}</p>
                              <p className="text-xs text-white/40 truncate">
                                <Users className="w-3 h-3 inline mr-1" />
                                {visitorCount} за месяц
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room.id); }}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors text-red-400 shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>

              {/* QR Code & Visitors List for selected room */}
              {selectedRoom && selectedRoomData && qrDataUrl && (
                <div className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card p-6 text-center flex flex-col items-center"
                  >
                    <h2 className="text-lg font-bold text-white/90 tracking-tight mb-1">QR-код</h2>
                    <p className="text-xs text-white/40 mb-4 font-medium">{selectedRoomData.name}</p>

                    <div className="inline-block p-3 bg-white rounded-2xl mb-4">
                      <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 md:w-56 md:h-56 object-contain" />
                    </div>

                    {/* QR rotation countdown */}
                    <div className="flex items-center gap-2 mb-4 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                      <Clock className="w-4 h-4 text-white/40 shrink-0" />
                      <span className="text-xs text-white/50">Обновление через</span>
                      <span className={`text-sm font-bold tabular-nums ${qrTimeLeft <= 20 ? "text-red-400" : "text-white/80"}`}>
                        {Math.floor(qrTimeLeft / 60)}:{String(qrTimeLeft % 60).padStart(2, "0")}
                      </span>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass p-4"
                  >
                    <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3 text-white/40 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Посетители ({selectedRoomData?.name})
                    </h3>
                    {visitors.length === 0 ? (
                      <p className="text-xs text-white/30 text-center py-4 font-medium">Пока нет посетителей</p>
                    ) : (
                    <div className="space-y-2">
                      <AnimatePresence initial={false}>
                        {visitors.map((visitor) => (
                          <motion.div
                            key={visitor.id}
                            initial={{ opacity: 0, x: -20, height: 0 }}
                            animate={{ opacity: 1, x: 0, height: "auto" }}
                            exit={{ opacity: 0, x: 20, height: 0 }}
                            className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white/5 overflow-hidden"
                          >
                            <p className="text-sm font-medium truncate pr-2 text-white/90">{visitor.name}</p>
                            <span className="text-xs text-white/40 flex items-center gap-1 shrink-0">
                              <Clock className="w-3 h-3" />
                              {new Date(visitor.scanned_at).toLocaleTimeString("ru-RU", { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                    )}
                  </motion.div>
                </div>
              )}
            </div>
          )}

          {/* Global Monthly History Tab */}
          {viewTab === "history" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="glass-card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-white/60" />
                      История за месяц
                    </h2>
                    <p className="text-xs text-white/40">Посещения всех лабораторий за последние 30 дней.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={fetchAllVisitorsMonth} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    {allVisitors.length > 0 && (
                      confirmClearHistory ? (
                        <div className="flex items-center gap-2">
                          <button onClick={handleClearHistory} disabled={loading} className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium transition-colors disabled:opacity-50">
                            {loading ? "..." : "Очистить"}
                          </button>
                          <button onClick={() => setConfirmClearHistory(false)} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs transition-colors">Отмена</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmClearHistory(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 text-xs transition-colors">
                          <Trash2 className="w-3 h-3" />
                          Очистить
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="glass p-2">
                {allVisitors.length === 0 ? (
                  <p className="text-center text-white/30 py-10 text-sm font-medium">Нет записей о посещениях.</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {allVisitors.map((v) => (
                      <div key={v.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{v.name}</p>
                          <p className="text-xs text-white/40 flex items-center gap-1">
                            <DoorOpen className="w-3 h-3" />
                            {v.rooms?.name || "Удаленная комната"}
                          </p>
                          <span className="text-[10px] text-white/30">
                            {new Date(v.scanned_at).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <button onClick={() => handleDeleteVisit(v.id)} className="shrink-0 p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors ml-2">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Students Tab */}
          {viewTab === "students" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="glass-card p-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-white/60" />
                    Студенты
                  </h2>
                  <p className="text-xs text-white/40">Все зарегистрированные студенты.</p>
                </div>
                <button onClick={fetchAllProfiles} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <div className="glass p-2 space-y-1">
                {allProfiles.length === 0 ? (
                  <p className="text-center text-white/30 py-10 text-sm font-medium">Нет студентов.</p>
                ) : (
                  allProfiles.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white/90 truncate">{u.username}</p>
                        <p className="text-xs text-white/30">{new Date(u.created_at).toLocaleDateString("ru-RU")}</p>
                      </div>
                      {confirmDeleteUser === u.id ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => handleDeleteUser(u.id)} disabled={loading} className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium transition-colors disabled:opacity-50">
                            {loading ? "..." : "Удалить"}
                          </button>
                          <button onClick={() => setConfirmDeleteUser(null)} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs transition-colors">Отмена</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteUser(u.id)} className="shrink-0 p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe pt-2 bg-gradient-to-t from-[#030712] to-transparent">
        <div className="glass-card rounded-2xl flex items-center justify-around p-2 mb-4">
          <button
            onClick={() => setViewTab("rooms")}
            className={`flex flex-col items-center gap-1 w-full py-2 rounded-xl transition-all ${
              viewTab === "rooms" ? "text-white" : "text-white/40 hover:text-white"
            }`}
          >
            <DoorOpen className="w-6 h-6" />
            <span className="text-[10px] font-medium">Комнаты</span>
          </button>

          <button
            onClick={() => setViewTab("history")}
            className={`flex flex-col items-center gap-1 w-full py-2 rounded-xl transition-all ${
              viewTab === "history" ? "text-white" : "text-white/40 hover:text-white"
            }`}
          >
            <CalendarDays className="w-6 h-6" />
            <span className="text-[10px] font-medium">История</span>
          </button>

          <button
            onClick={() => setViewTab("students")}
            className={`flex flex-col items-center gap-1 w-full py-2 rounded-xl transition-all ${
              viewTab === "students" ? "text-white" : "text-white/40 hover:text-white"
            }`}
          >
            <GraduationCap className="w-6 h-6" />
            <span className="text-[10px] font-medium">Студенты</span>
          </button>

          <button
            onClick={goToReports}
            className="flex flex-col items-center gap-1 w-full py-2 rounded-xl text-white/40 hover:text-white transition-all"
          >
            <BarChart3 className="w-6 h-6" />
            <span className="text-[10px] font-medium">Отчеты</span>
          </button>
        </div>
      </div>
    </div>
  );
}
