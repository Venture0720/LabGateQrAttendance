"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Calendar, 
  User, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  X,
  BarChart3,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { supabase } from "@/lib/supabase";

// --- Types ---

type Role = 'student' | 'professor';
type Status = 'success' | 'denied';

interface ScanLog {
  id: string;
  userName: string;
  email: string;
  role: Role;
  status: Status;
  scannedAt: string;
  roomName: string;
}

interface UserStats {
  totalVisits: number;
  firstVisit: string;
  lastVisit: string;
  recentLogs: ScanLog[];
}

// --- Sub-components ---

const StatusBadge = ({ status }: { status: Status }) => {
  const isSuccess = status === 'success';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
      isSuccess ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
    }`}>
      {isSuccess ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
      {isSuccess ? 'Успешно' : 'Отказ'}
    </span>
  );
};

const RoleBadge = ({ role }: { role: Role }) => {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/5 text-white/40 border border-white/10">
      {role === 'student' ? 'Студент' : 'Профессор'}
    </span>
  );
};

// --- Main Page Component ---

export default function ReportsPage() {
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week'>('all');
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();

    // Real-time updates for reports
    const channel = supabase
      .channel('reports-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'visitors' }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("visitors")
      .select(`
        *,
        rooms(name),
        profiles(username, role)
      `)
      .order("scanned_at", { ascending: false });

    if (data) {
      const formattedLogs: ScanLog[] = data.map((v: any) => ({
        id: v.id,
        userName: v.name || v.profiles?.username || "Неизвестный",
        email: v.profiles?.username ? `${v.profiles.username.toLowerCase()}@labgate.local` : "no-email@labgate.local",
        role: v.profiles?.role || (v.name.toLowerCase().includes('prof') ? 'professor' : 'student'),
        status: 'success',
        scannedAt: v.scanned_at,
        roomName: v.rooms?.name || "Удаленная комната"
      }));
      setLogs(formattedLogs);
    }
    setLoading(false);
  };

  // Filter Logic
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = log.userName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           log.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      if (dateFilter === 'all') return true;

      const logDate = new Date(log.scannedAt);
      const now = new Date();
      
      if (dateFilter === 'today') {
        return logDate.toDateString() === now.toDateString();
      }
      
      if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return logDate >= weekAgo;
      }

      return true;
    }).sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());
  }, [logs, searchQuery, dateFilter]);

  const selectedUserData = useMemo((): UserStats | null => {
    if (!selectedUserEmail) return null;
    const userLogs = logs.filter(l => l.email === selectedUserEmail)
                               .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());
    
    if (userLogs.length === 0) return null;

    return {
      totalVisits: userLogs.filter(l => l.status === 'success').length,
      firstVisit: userLogs[userLogs.length - 1].scannedAt,
      lastVisit: userLogs[0].scannedAt,
      recentLogs: userLogs.slice(0, 10)
    };
  }, [logs, selectedUserEmail]);

  const selectedUserInfo = logs.find(l => l.email === selectedUserEmail);

  return (
    <div className="min-h-full flex flex-col p-4 md:p-8 relative overflow-hidden bg-transparent">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 w-full z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <Link href="/professor" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-4 text-sm group">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              Назад в панель
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-white/90">Отчеты по посещениям</h1>
            <p className="text-white/40 mt-1 text-sm font-medium">Просматривайте и анализируйте логи доступа в реальном времени</p>
          </div>
          <div className="flex items-center gap-2 glass p-1 rounded-xl">
             <button 
               onClick={() => setDateFilter('all')}
               className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${dateFilter === 'all' ? 'bg-white/10 text-white border border-white/10' : 'text-white/40 hover:text-white'}`}
             >
               Всё время
             </button>
             <button 
               onClick={() => setDateFilter('week')}
               className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${dateFilter === 'week' ? 'bg-white/10 text-white border border-white/10' : 'text-white/40 hover:text-white'}`}
             >
               Неделя
             </button>
             <button 
               onClick={() => setDateFilter('today')}
               className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${dateFilter === 'today' ? 'bg-white/10 text-white border border-white/10' : 'text-white/40 hover:text-white'}`}
             >
               Сегодня
             </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto space-y-6 w-full z-10">
        {/* Filters */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-white/60 transition-colors">
            <Search size={20} />
          </div>
          <input 
            type="text"
            placeholder="Поиск по имени или email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-4 shadow-sm focus:outline-none focus:ring-1 focus:ring-white/20 transition-all text-white placeholder:text-white/20 text-base"
          />
        </div>

        {/* Table Container */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Время</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Пользователь</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Локация</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Роль</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40 text-right">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white/90">
                          {new Date(log.scannedAt).toLocaleDateString('ru-RU')}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-white/30 tracking-wider">
                          {new Date(log.scannedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setSelectedUserEmail(log.email)}
                        className="flex items-center gap-3 group text-left"
                      >
                        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:bg-white/10 group-hover:text-white transition-colors border border-white/10">
                          <User size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">
                            {log.userName}
                          </span>
                          <span className="text-[10px] text-white/30 font-medium">{log.email}</span>
                        </div>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-white/60 font-medium">{log.roomName}</span>
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge role={log.role} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <StatusBadge status={log.status} />
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center text-white/20">
                        <Search size={48} className="mb-4 opacity-10" />
                        <p className="text-lg font-bold">Ничего не найдено</p>
                        <p className="text-sm font-medium">Попробуйте изменить параметры поиска или фильтры</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Drawer Overlay */}
      <AnimatePresence>
        {selectedUserEmail && selectedUserData && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUserEmail(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md glass backdrop-blur-[40px] border-l border-white/10 shadow-2xl z-50 overflow-y-auto"
            >
              {/* Drawer Header */}
              <div className="p-8 border-b border-white/5 sticky top-0 bg-white/[0.02] backdrop-blur-3xl z-10">
                <div className="flex items-center justify-between mb-8">
                  <button 
                    onClick={() => setSelectedUserEmail(null)}
                    className="p-2 hover:bg-white/5 rounded-full text-white/40 transition-colors"
                  >
                    <X size={20} />
                  </button>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Статистика</span>
                  <div className="w-10" /> {/* Spacer */}
                </div>
                
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-[2.5rem] bg-white/10 text-white flex items-center justify-center text-3xl font-bold border border-white/10">
                    {selectedUserInfo?.userName.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white/90 tracking-tight">{selectedUserInfo?.userName}</h2>
                    <p className="text-white/40 text-sm font-medium">{selectedUserInfo?.email}</p>
                    <div className="mt-3">
                      <RoleBadge role={selectedUserInfo?.role || 'student'} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Content */}
              <div className="p-8 space-y-10">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-card p-5 border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-2 text-white/30 mb-2">
                      <BarChart3 size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Входов</span>
                    </div>
                    <div className="text-3xl font-bold text-white/90">{selectedUserData.totalVisits}</div>
                  </div>
                  <div className="glass-card p-5 border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-2 text-white/30 mb-2">
                      <Calendar size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Крайний</span>
                    </div>
                    <div className="text-sm font-bold text-white/90">
                      {new Date(selectedUserData.lastVisit).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                </div>

                {/* Date Summary */}
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 flex items-center gap-2">
                    <Clock size={14} />
                    Активность
                  </h3>
                  
                  <div className="relative border-l border-white/10 ml-3 pl-8 space-y-8">
                    {selectedUserData.recentLogs.map((log) => (
                      <div key={log.id} className="relative">
                        {/* Dot */}
                        <div className={`absolute -left-[37px] top-1.5 w-2.5 h-2.5 rounded-full border border-white/20 ${log.status === 'success' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]'}`} />
                        
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-bold text-white/90">{log.roomName}</span>
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-tighter">
                              {new Date(log.scannedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                             <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">
                               {new Date(log.scannedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                             </span>
                             <StatusBadge status={log.status} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                  <p className="text-[10px] font-bold text-white/30 leading-relaxed uppercase tracking-wider">
                    <strong>Первый вход:</strong> {new Date(selectedUserData.firstVisit).toLocaleString('ru-RU')}
                  </p>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-8 border-t border-white/5 bg-white/[0.01] mt-auto">
                <button 
                  onClick={() => setSelectedUserEmail(null)}
                  className="w-full glass-button py-4 font-bold text-white/90"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
