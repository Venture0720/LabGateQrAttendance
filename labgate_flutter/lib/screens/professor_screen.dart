import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/room.dart';
import '../models/visitor.dart';
import '../providers/auth_provider.dart';
import '../providers/rooms_provider.dart';
import '../services/supabase_service.dart';
import '../widgets/glass_card.dart';
import 'package:intl/intl.dart';

class ProfessorScreen extends ConsumerStatefulWidget {
  const ProfessorScreen({super.key});

  @override
  ConsumerState<ProfessorScreen> createState() => _ProfessorScreenState();
}

class _ProfessorScreenState extends ConsumerState<ProfessorScreen> {
  int _tab = 0;
  String? _selectedRoomId;
  final _newRoomCtrl = TextEditingController();

  @override
  void dispose() {
    _newRoomCtrl.dispose();
    super.dispose();
  }

  Future<void> _createRoom() async {
    final name = _newRoomCtrl.text.trim();
    if (name.isEmpty) return;
    try {
      await SupabaseService.createRoom(name);
      _newRoomCtrl.clear();
      ref.invalidate(roomsProvider);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ошибка: $e')),
        );
      }
    }
  }

  Future<void> _deactivateRoom(String roomId) async {
    try {
      await SupabaseService.deactivateRoom(roomId);
      ref.invalidate(roomsProvider);
      if (_selectedRoomId == roomId) {
        setState(() => _selectedRoomId = null);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ошибка удаления: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _showCreateRoomDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1a1a2e),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Новая комната',
            style: TextStyle(color: Colors.white)),
        content: TextField(
          controller: _newRoomCtrl,
          autofocus: true,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            hintText: 'Название комнаты',
            hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
            filled: true,
            fillColor: Colors.white.withOpacity(0.05),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFF6C63FF), width: 1.5),
            ),
          ),
          onSubmitted: (_) => _createRoom(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text('Отмена',
                style: TextStyle(color: Colors.white.withOpacity(0.4))),
          ),
          ElevatedButton(
            onPressed: _createRoom,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF6C63FF),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Создать'),
          ),
        ],
      ),
    );
  }

  void _showQrDialog(Room room) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1a1a2e),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(room.name,
            style: const TextStyle(color: Colors.white),
            textAlign: TextAlign.center),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
              child: QrImageView(
                data: room.id,
                version: QrVersions.auto,
                size: 220,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'ID: ${room.id.substring(0, 8)}...',
              style: TextStyle(
                  color: Colors.white.withOpacity(0.4), fontSize: 12),
            ),
            const SizedBox(height: 8),
            TextButton.icon(
              onPressed: () {
                Clipboard.setData(ClipboardData(text: room.id));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('ID скопирован')),
                );
              },
              icon: const Icon(Icons.copy, size: 16, color: Color(0xFF6C63FF)),
              label: const Text('Скопировать ID',
                  style: TextStyle(color: Color(0xFF6C63FF))),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Закрыть',
                style: TextStyle(color: Color(0xFF6C63FF))),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final profileAsync = ref.watch(profileProvider);

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(0, -0.5),
            radius: 1.2,
            colors: [Color(0xFF1a0d40), Color(0xFF0A0A0F)],
          ),
        ),
        child: SafeArea(
          child: profileAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(
                child: Text('Ошибка: $e',
                    style: const TextStyle(color: Colors.white))),
            data: (profile) {
              if (profile == null || !profile.isProfessor) {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  context.go('/login');
                });
                return const SizedBox();
              }
              return _ProfessorBody(
                username: profile.username,
                tab: _tab,
                selectedRoomId: _selectedRoomId,
                onTabChange: (t) => setState(() => _tab = t),
                onRoomSelect: (id) => setState(() => _selectedRoomId = id),
                onCreateRoom: _showCreateRoomDialog,
                onShowQr: _showQrDialog,
                onDeactivate: _deactivateRoom,
              );
            },
          ),
        ),
      ),
    );
  }
}

class _ProfessorBody extends ConsumerWidget {
  final String username;
  final int tab;
  final String? selectedRoomId;
  final void Function(int) onTabChange;
  final void Function(String) onRoomSelect;
  final VoidCallback onCreateRoom;
  final void Function(Room) onShowQr;
  final void Function(String) onDeactivate;

  const _ProfessorBody({
    required this.username,
    required this.tab,
    required this.selectedRoomId,
    required this.onTabChange,
    required this.onRoomSelect,
    required this.onCreateRoom,
    required this.onShowQr,
    required this.onDeactivate,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final roomsAsync = ref.watch(roomsProvider);

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Header
          GlassCard(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('LabGate',
                        style: GoogleFonts.pressStart2p(
                            fontSize: 14, color: Colors.white)),
                    Text('Кабинет преподавателя',
                        style: TextStyle(
                            fontSize: 11,
                            color: Colors.white.withOpacity(0.3),
                            letterSpacing: 1.2)),
                  ],
                ),
                Row(
                  children: [
                    IconButton(
                      onPressed: () => context.push('/reports'),
                      icon: const Icon(Icons.bar_chart,
                          color: Colors.white54, size: 22),
                      tooltip: 'Отчёты',
                    ),
                    TextButton.icon(
                      onPressed: () async {
                        await SupabaseService.signOut();
                        if (context.mounted) context.go('/login');
                      },
                      icon: const Icon(Icons.logout,
                          size: 16, color: Colors.white38),
                      label: Text('Выйти',
                          style: TextStyle(
                              color: Colors.white.withOpacity(0.4),
                              fontSize: 13)),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Tabs
          GlassCard(
            padding: const EdgeInsets.all(4),
            child: Row(
              children: [
                _TabBtn(
                    label: 'Комнаты',
                    icon: Icons.door_front_door,
                    selected: tab == 0,
                    onTap: () => onTabChange(0)),
                _TabBtn(
                    label: 'История',
                    icon: Icons.history,
                    selected: tab == 1,
                    onTap: () => onTabChange(1)),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Content
          Expanded(
            child: tab == 0
                ? _RoomsTab(
                    roomsAsync: roomsAsync,
                    selectedRoomId: selectedRoomId,
                    onRoomSelect: onRoomSelect,
                    onCreateRoom: onCreateRoom,
                    onShowQr: onShowQr,
                    onDeactivate: onDeactivate,
                  )
                : _HistoryTab(selectedRoomId: selectedRoomId),
          ),
        ],
      ),
    );
  }
}

class _TabBtn extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  const _TabBtn(
      {required this.label,
      required this.icon,
      required this.selected,
      required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: selected
                ? const Color(0xFF6C63FF).withOpacity(0.2)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon,
                  size: 16,
                  color: selected
                      ? const Color(0xFF6C63FF)
                      : Colors.white38),
              const SizedBox(width: 6),
              Text(label,
                  style: TextStyle(
                      color: selected ? Colors.white : Colors.white38,
                      fontSize: 13,
                      fontWeight: selected
                          ? FontWeight.w600
                          : FontWeight.normal)),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoomsTab extends ConsumerWidget {
  final AsyncValue<List<Room>> roomsAsync;
  final String? selectedRoomId;
  final void Function(String) onRoomSelect;
  final VoidCallback onCreateRoom;
  final void Function(Room) onShowQr;
  final void Function(String) onDeactivate;

  const _RoomsTab({
    required this.roomsAsync,
    required this.selectedRoomId,
    required this.onRoomSelect,
    required this.onCreateRoom,
    required this.onShowQr,
    required this.onDeactivate,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return roomsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(
          child: Text('Ошибка: $e',
              style: const TextStyle(color: Colors.white))),
      data: (rooms) => Column(
        children: [
          SizedBox(
            width: double.infinity,
            child: GlassButton(
              onPressed: onCreateRoom,
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.add, size: 18, color: Colors.white),
                  SizedBox(width: 8),
                  Text('Создать комнату',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          if (rooms.isEmpty)
            Expanded(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.door_front_door,
                        size: 48, color: Colors.white.withOpacity(0.2)),
                    const SizedBox(height: 12),
                    Text('Нет активных комнат',
                        style: TextStyle(
                            color: Colors.white.withOpacity(0.3),
                            fontSize: 15)),
                  ],
                ),
              ),
            )
          else
            Expanded(
              child: ListView.separated(
                itemCount: rooms.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (ctx, i) {
                  final room = rooms[i];
                  final isSelected = room.id == selectedRoomId;
                  return GlassCard(
                    padding: const EdgeInsets.all(16),
                    color: isSelected
                        ? const Color(0xFF6C63FF).withOpacity(0.1)
                        : null,
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: const Color(0xFF6C63FF).withOpacity(0.15),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.door_front_door,
                                  color: Color(0xFF6C63FF), size: 20),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(room.name,
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600)),
                            ),
                            IconButton(
                              onPressed: () => onShowQr(room),
                              icon: const Icon(Icons.qr_code,
                                  color: Color(0xFF6C63FF), size: 22),
                              tooltip: 'QR-код',
                            ),
                            IconButton(
                              onPressed: () => onRoomSelect(room.id),
                              icon: Icon(Icons.people,
                                  color: isSelected
                                      ? const Color(0xFF6C63FF)
                                      : Colors.white38,
                                  size: 22),
                              tooltip: 'Посетители',
                            ),
                            IconButton(
                              onPressed: () =>
                                  _confirmDeactivate(context, room),
                              icon: const Icon(Icons.delete_outline,
                                  color: Colors.redAccent, size: 22),
                              tooltip: 'Удалить',
                            ),
                          ],
                        ),
                        if (isSelected) ...[
                          const SizedBox(height: 12),
                          const Divider(color: Colors.white12),
                          const SizedBox(height: 8),
                          _VisitorsList(roomId: room.id),
                        ],
                      ],
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  void _confirmDeactivate(BuildContext context, Room room) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1a1a2e),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Удалить комнату?',
            style: TextStyle(color: Colors.white)),
        content: Text('"${room.name}" будет деактивирована.',
            style: TextStyle(color: Colors.white.withOpacity(0.6))),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text('Отмена',
                style: TextStyle(color: Colors.white.withOpacity(0.4))),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              onDeactivate(room.id);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Удалить'),
          ),
        ],
      ),
    );
  }
}

class _VisitorsList extends ConsumerWidget {
  final String roomId;
  const _VisitorsList({required this.roomId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final visitorsAsync = ref.watch(visitorsForRoomProvider(roomId));
    return visitorsAsync.when(
      loading: () => const Padding(
        padding: EdgeInsets.all(8),
        child: CircularProgressIndicator(strokeWidth: 2),
      ),
      error: (e, _) => Text('Ошибка: $e',
          style: const TextStyle(color: Colors.redAccent, fontSize: 12)),
      data: (visitors) {
        if (visitors.isEmpty) {
          return Text('Нет посетителей',
              style: TextStyle(
                  color: Colors.white.withOpacity(0.3), fontSize: 13));
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Посетители (${visitors.length})',
                style: TextStyle(
                    color: Colors.white.withOpacity(0.4),
                    fontSize: 12,
                    letterSpacing: 0.5)),
            const SizedBox(height: 8),
            ...visitors.take(5).map((v) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    children: [
                      const Icon(Icons.person_outline,
                          size: 14, color: Colors.white38),
                      const SizedBox(width: 6),
                      Expanded(
                          child: Text(v.name,
                              style: const TextStyle(
                                  color: Colors.white70, fontSize: 13))),
                      Text(
                        DateFormat('dd.MM HH:mm').format(v.scannedAt.toLocal()),
                        style: TextStyle(
                            color: Colors.white.withOpacity(0.3),
                            fontSize: 11),
                      ),
                    ],
                  ),
                )),
            if (visitors.length > 5)
              Text('+ ещё ${visitors.length - 5}...',
                  style: TextStyle(
                      color: Colors.white.withOpacity(0.3), fontSize: 12)),
          ],
        );
      },
    );
  }
}

class _HistoryTab extends ConsumerWidget {
  final String? selectedRoomId;
  const _HistoryTab({this.selectedRoomId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final visitorsAsync = ref.watch(allVisitorsMonthProvider);
    return visitorsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(
          child: Text('Ошибка: $e',
              style: const TextStyle(color: Colors.white))),
      data: (visitors) {
        if (visitors.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.history,
                    size: 48, color: Colors.white.withOpacity(0.2)),
                const SizedBox(height: 12),
                Text('Нет посетителей за последние 30 дней',
                    style: TextStyle(
                        color: Colors.white.withOpacity(0.3), fontSize: 15)),
              ],
            ),
          );
        }
        return ListView.separated(
          itemCount: visitors.length,
          separatorBuilder: (_, __) => const SizedBox(height: 6),
          itemBuilder: (ctx, i) {
            final v = visitors[i];
            return GlassCard(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.person,
                        color: Colors.white54, size: 18),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(v.name,
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 14,
                                fontWeight: FontWeight.w500)),
                        if (v.roomName != null)
                          Text(v.roomName!,
                              style: TextStyle(
                                  color: Colors.white.withOpacity(0.4),
                                  fontSize: 12)),
                      ],
                    ),
                  ),
                  Text(
                    DateFormat('dd.MM.yy\nHH:mm').format(v.scannedAt.toLocal()),
                    textAlign: TextAlign.right,
                    style: TextStyle(
                        color: Colors.white.withOpacity(0.3), fontSize: 11),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
