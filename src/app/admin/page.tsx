"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Trash2, Users, History, AlertTriangle, Shield, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Profile {
  id: string;
  username: string;
  role: string;
  created_at: string;
}

interface Visitor {
  id: string;
  name: string;
  scanned_at: string;
  room_id: string;
  rooms?: { name: string };
}

export default function AdminPage() {
  const router = useRouter();
  const [adminId, setAdminId] = useState<string>("");
  const [users, setUsers] = useState<Profile[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [tab, setTab] = useState<"users" | "history">("users");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [router]);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") { router.push("/login"); return; }
    setAdminId(user.id);
    fetchUsers();
    fetchHistory();
  }

  async function fetchUsers() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setUsers(data || []);
  }

  async function fetchHistory() {
    const { data } = await supabase
      .from("visitors")
      .select("id, name, scanned_at, room_id, rooms(name)")
      .order("scanned_at", { ascending: false })
      .limit(200);
    setVisitors((data as any) || []);
  }

  async function handleDeleteUser(userId: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, adminId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Ошибка удаления");
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setConfirmDelete(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleClearHistory() {
    setLoading(true);
    setError("");
    try {
      const { error: err } = await supabase.from("visitors").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (err) throw new Error(err.message);
      setVisitors([]);
      setConfirmClear(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteVisit(visitId: string) {
    const { error: err } = await supabase.from("visitors").delete().eq("id", visitId);
    if (err) { setError(err.message); return; }
    setVisitors((prev) => prev.filter((v) => v.id !== visitId));
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const roleColor = (role: string) => {
    if (role === "admin") return "text-yellow-400";
    if (role === "professor") return "text-blue-400";
    return "text-green-400";
  };

  return (
    <div className="min-h-full flex flex-col p-4 relative overflow-hidden bg-transparent">
      <div className="max-w-2xl mx-auto w-full relative z-10 space-y-4">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between glass p-4"
        >
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-yellow-400" />
            <div>
              <h1 className="pixel-title text-lg text-white/90">LabGate</h1>
              <p className="text-xs text-yellow-400/70 uppercase tracking-wider font-semibold">Администратор</p>
            </div>
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

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass-card p-3 border border-red-500/30 flex items-center gap-2 text-red-400 text-sm"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass p-1 flex gap-1"
        >
          <button
            onClick={() => setTab("users")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === "users" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
          >
            <Users className="w-4 h-4" />
            Пользователи ({users.length})
          </button>
          <button
            onClick={() => setTab("history")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === "history" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
          >
            <History className="w-4 h-4" />
            История ({visitors.length})
          </button>
        </motion.div>

        {/* Users Tab */}
        {tab === "users" && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-white/30 uppercase tracking-wider">Все аккаунты</p>
              <button onClick={fetchUsers} className="text-white/30 hover:text-white/60 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            {users.map((user) => (
              <motion.div
                key={user.id}
                layout
                className="glass-card p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-white/90 truncate">{user.username}</p>
                  <p className={`text-xs font-medium uppercase tracking-wider ${roleColor(user.role)}`}>{user.role}</p>
                  <p className="text-xs text-white/30 mt-0.5">{new Date(user.created_at).toLocaleDateString("ru-RU")}</p>
                </div>
                {user.role !== "admin" && (
                  confirmDelete === user.id ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {loading ? "..." : "Удалить"}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-xs transition-colors"
                      >
                        Отмена
                      </button>
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setConfirmDelete(user.id)}
                      className="shrink-0 p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  )
                )}
              </motion.div>
            ))}
            {users.length === 0 && (
              <div className="glass-card p-8 text-center text-white/30 text-sm">Нет пользователей</div>
            )}
          </motion.div>
        )}

        {/* History Tab */}
        {tab === "history" && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-white/30 uppercase tracking-wider">Журнал посещений</p>
              <div className="flex items-center gap-2">
                <button onClick={fetchHistory} className="text-white/30 hover:text-white/60 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                {visitors.length > 0 && (
                  confirmClear ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleClearHistory}
                        disabled={loading}
                        className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {loading ? "..." : "Очистить всё"}
                      </button>
                      <button
                        onClick={() => setConfirmClear(false)}
                        className="px-3 py-1 rounded-lg bg-white/5 text-white/40 text-xs transition-colors"
                      >
                        Отмена
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmClear(true)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 text-xs transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Очистить историю
                    </button>
                  )
                )}
              </div>
            </div>
            {visitors.map((visit) => (
              <motion.div
                key={visit.id}
                layout
                className="glass-card p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-white/90 text-sm truncate">{visit.name}</p>
                  <p className="text-xs text-white/40 truncate">
                    {(visit.rooms as any)?.name || visit.room_id}
                  </p>
                  <p className="text-xs text-white/25 mt-0.5">
                    {new Date(visit.scanned_at).toLocaleString("ru-RU")}
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDeleteVisit(visit.id)}
                  className="shrink-0 p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </motion.button>
              </motion.div>
            ))}
            {visitors.length === 0 && (
              <div className="glass-card p-8 text-center text-white/30 text-sm">История пуста</div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
