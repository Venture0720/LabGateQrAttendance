"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AnimatedContent from "@/components/AnimatedContent";
import { supabase } from "@/lib/supabase";
import type { Room, Visitor, Profile } from "@/types";
import QRCode from "qrcode";
import { LogOut, Plus, Users, Clock, Copy, Check, Trash2, CalendarDays, DoorOpen, BarChart3 } from "lucide-react";

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
  const [viewTab, setViewTab] = useState<"rooms" | "history">("rooms");

  const [userProfile, setUserProfile] = useState<Profile | null>(null);

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
  }

  const fetchRooms = async () => {
    const { data } = await supabase
      .from("rooms")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setRooms(data || []);
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
    const { error: delError } = await supabase
      .from("rooms")
      .update({ is_active: false })
      .eq("id", roomId);
    if (delError) {
      setError("Ошибка удаления: " + delError.message);
      return;
    }
    if (selectedRoom === roomId) {
      setSelectedRoom("");
      setQrDataUrl("");
    }
    fetchRooms();
  };

  const handleGenerateQR = async (roomId: string) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://labgate.vercel.app";
    const roomUrl = `${baseUrl}/room/${roomId}`;

    try {
      const dataUrl = await generateQR(roomUrl);
      setQrDataUrl(dataUrl);
      setSelectedRoom(roomId);
      setViewTab("rooms"); // switch to rooms view if not there
    } catch (err) {
      console.error("QR generation error:", err);
      setError("Ошибка генерации QR");
    }
  };

  const handleCopyLink = async () => {
    if (!selectedRoom) return;
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://labgate.vercel.app";
    const roomUrl = `${baseUrl}/room/${selectedRoom}`;
    await navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const selectedRoomData = rooms.find((r) => r.id === selectedRoom);

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-transparent">
      <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto relative z-10 overflow-hidden pb-[88px]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl z-20 shrink-0">
          <div>
            <h1 className="pixel-title text-base leading-tight">LabGate</h1>
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mt-1">Кабинет профессора</p>
          </div>
          <button
            onClick={handleLogout}
            className="btn-glass p-2.5"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {viewTab === "rooms" && (
            <div className="space-y-4">
              {/* Create Room */}
              <AnimatedContent distance={30} duration={0.7} ease="power3.out">
                <div className="glass-card p-5">
                  <h2 className="font-pixel text-[10px] mb-4 flex items-center gap-2 text-white/60 tracking-widest">
                    <Plus className="w-3 h-3" />
                    НОВАЯ КОМНАТА
                  </h2>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      className="input-glass flex-1 px-4 py-3 text-sm"
                      placeholder="Название (напр. Лаб. 1)"
                      onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
                    />
                    <button
                      onClick={handleCreateRoom}
                      disabled={loading}
                      className="btn-primary px-4 disabled:opacity-50"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                </div>
              </AnimatedContent>

              {/* Rooms List */}
              <AnimatedContent distance={30} duration={0.7} ease="power3.out" delay={0.1}>
                <div className="glass p-4">
                  <h3 className="font-pixel text-[10px] uppercase tracking-widest mb-3 text-white/40">Доступные комнаты</h3>
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
                            className="btn-danger p-2 shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                </div>
              </AnimatedContent>

              {/* QR Code & Visitors List for selected room */}
              {selectedRoom && selectedRoomData && qrDataUrl && (
                <div className="space-y-4">
                  <AnimatedContent distance={20} scale={0.97} duration={0.6} ease="power3.out">
                    <div className="glass-card p-6 text-center flex flex-col items-center">
                      <h2 className="font-pixel text-xs text-white/80 tracking-wider mb-1">QR-КОД</h2>
                      <p className="text-xs text-white/40 mb-4 font-medium">{selectedRoomData.name}</p>

                    <div className="inline-block p-3 bg-white rounded-2xl mb-4">
                      <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 md:w-56 md:h-56 object-contain" />
                    </div>

                      <div className="flex items-center justify-center gap-2 w-full">
                        <button
                          onClick={handleCopyLink}
                          className="btn-glass flex items-center justify-center gap-2 w-full py-3 text-sm"
                        >
                          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                          {copied ? "Скопировано!" : "Копировать ссылку"}
                        </button>
                      </div>
                    </div>
                  </AnimatedContent>

                  <AnimatedContent distance={20} duration={0.6} ease="power3.out" delay={0.15}>
                    <div className="glass p-4">
                      <h3 className="font-pixel text-[10px] uppercase tracking-widest mb-3 text-white/40 flex items-center gap-2">
                        <Users className="w-3 h-3" />
                        Посетители ({selectedRoomData?.name})
                      </h3>
                      {visitors.length === 0 ? (
                        <p className="text-xs text-white/30 text-center py-4 font-medium">Пока нет посетителей</p>
                      ) : (
                        <div className="space-y-2">
                          {visitors.map((visitor) => (
                            <div
                              key={visitor.id}
                              className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white/5"
                            >
                              <p className="text-sm font-medium truncate pr-2 text-white/90">{visitor.name}</p>
                              <span className="text-xs text-white/40 flex items-center gap-1 shrink-0">
                                <Clock className="w-3 h-3" />
                                {new Date(visitor.scanned_at).toLocaleTimeString("ru-RU", { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </AnimatedContent>
                </div>
              )}
            </div>
          )}

          {/* Global Monthly History Tab */}
          {viewTab === "history" && (
            <AnimatedContent distance={30} duration={0.7} ease="power3.out">
              <div className="space-y-4">
              <div className="glass-card p-5">
                <h2 className="font-pixel text-xs text-white/80 tracking-wider mb-1 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  ИСТОРИЯ ЗА МЕСЯЦ
                </h2>
                <p className="text-xs text-white/40">
                  Посещения всех лабораторий за последние 30 дней.
                </p>
              </div>

              <div className="glass p-2">
                {allVisitors.length === 0 ? (
                  <p className="text-center text-white/30 py-10 text-sm font-medium">Нет записей о посещениях.</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {allVisitors.map((v) => (
                      <div key={v.id} className="flex flex-col p-3 rounded-xl hover:bg-white/5 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-medium text-white">{v.name}</p>
                          <span className="text-[10px] text-white/40 whitespace-nowrap bg-white/5 px-2 py-0.5 rounded-full">
                            {new Date(v.scanned_at).toLocaleString("ru-RU", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-white/40 flex items-center gap-1">
                          <DoorOpen className="w-3 h-3" />
                          {v.rooms?.name || "Удаленная комната"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </div>
            </AnimatedContent>
          )}

        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe pt-2 bg-gradient-to-t from-[#030712] to-transparent">
        <div className="glass-card rounded-2xl flex items-center justify-around p-2 mb-4">
          <button
            onClick={() => setViewTab("rooms")}
            className={`flex flex-col items-center gap-1 w-full py-2 rounded-xl transition-all ${
              viewTab === "rooms" ? "text-white bg-white/10" : "text-white/40 hover:text-white"
            }`}
          >
            <DoorOpen className="w-6 h-6" />
            <span className="font-pixel text-[8px]">КОМНАТЫ</span>
          </button>

          <button
            onClick={() => setViewTab("history")}
            className={`flex flex-col items-center gap-1 w-full py-2 rounded-xl transition-all ${
              viewTab === "history" ? "text-white bg-white/10" : "text-white/40 hover:text-white"
            }`}
          >
            <CalendarDays className="w-6 h-6" />
            <span className="font-pixel text-[8px]">ИСТОРИЯ</span>
          </button>

          <button
            onClick={goToReports}
            className="flex flex-col items-center gap-1 w-full py-2 rounded-xl text-white/40 hover:text-white transition-all"
          >
            <BarChart3 className="w-6 h-6" />
            <span className="font-pixel text-[8px]">ОТЧЕТЫ</span>
          </button>
        </div>
      </div>
    </div>
  );
}
