import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../models/visitor.dart';
import '../providers/rooms_provider.dart';
import '../widgets/glass_card.dart';

class ReportsScreen extends ConsumerWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final visitorsAsync = ref.watch(allVisitorsMonthProvider);

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
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                // Header
                GlassCard(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 20, vertical: 14),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () => context.pop(),
                        icon: const Icon(Icons.arrow_back,
                            color: Colors.white70, size: 22),
                        style: IconButton.styleFrom(
                          backgroundColor: Colors.white.withOpacity(0.05),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Отчёты',
                              style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white)),
                          Text('За последние 30 дней',
                              style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.white.withOpacity(0.3),
                                  letterSpacing: 1)),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Content
                Expanded(
                  child: visitorsAsync.when(
                    loading: () =>
                        const Center(child: CircularProgressIndicator()),
                    error: (e, _) => Center(
                        child: Text('Ошибка: $e',
                            style: const TextStyle(color: Colors.white))),
                    data: (visitors) => _ReportsBody(visitors: visitors),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ReportsBody extends StatelessWidget {
  final List<Visitor> visitors;
  const _ReportsBody({required this.visitors});

  @override
  Widget build(BuildContext context) {
    if (visitors.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.bar_chart,
                size: 64, color: Colors.white.withOpacity(0.15)),
            const SizedBox(height: 16),
            Text('Нет данных за последние 30 дней',
                style: TextStyle(
                    color: Colors.white.withOpacity(0.3), fontSize: 16)),
          ],
        ),
      );
    }

    // Stats
    final totalVisits = visitors.length;
    final uniqueStudents = visitors.map((v) => v.name).toSet().length;
    final uniqueRooms = visitors.map((v) => v.roomId).toSet().length;

    // Group by room
    final Map<String, List<Visitor>> byRoom = {};
    for (final v in visitors) {
      final key = v.roomName ?? v.roomId;
      byRoom.putIfAbsent(key, () => []).add(v);
    }

    // Group by day
    final Map<String, int> byDay = {};
    for (final v in visitors) {
      final day = DateFormat('dd.MM').format(v.scannedAt.toLocal());
      byDay[day] = (byDay[day] ?? 0) + 1;
    }

    return SingleChildScrollView(
      child: Column(
        children: [
          // Stats row
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  icon: Icons.login,
                  label: 'Всего входов',
                  value: '$totalVisits',
                  color: const Color(0xFF6C63FF),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _StatCard(
                  icon: Icons.people,
                  label: 'Студентов',
                  value: '$uniqueStudents',
                  color: Colors.tealAccent,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _StatCard(
                  icon: Icons.door_front_door,
                  label: 'Комнат',
                  value: '$uniqueRooms',
                  color: Colors.orangeAccent,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // By room
          GlassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('По комнатам',
                    style: TextStyle(
                        color: Colors.white.withOpacity(0.5),
                        fontSize: 12,
                        letterSpacing: 1)),
                const SizedBox(height: 12),
                ...byRoom.entries.map((e) {
                  final pct = e.value.length / totalVisits;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(e.key,
                                  style: const TextStyle(
                                      color: Colors.white70, fontSize: 13),
                                  overflow: TextOverflow.ellipsis),
                            ),
                            Text('${e.value.length}',
                                style: const TextStyle(
                                    color: Colors.white54, fontSize: 13)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: pct,
                            backgroundColor: Colors.white.withOpacity(0.08),
                            valueColor: const AlwaysStoppedAnimation(
                                Color(0xFF6C63FF)),
                            minHeight: 6,
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Recent visits
          GlassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Последние посещения',
                    style: TextStyle(
                        color: Colors.white.withOpacity(0.5),
                        fontSize: 12,
                        letterSpacing: 1)),
                const SizedBox(height: 12),
                ...visitors.take(20).map((v) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.05),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(Icons.person,
                                color: Colors.white38, size: 16),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(v.name,
                                    style: const TextStyle(
                                        color: Colors.white70,
                                        fontSize: 13)),
                                if (v.roomName != null)
                                  Text(v.roomName!,
                                      style: TextStyle(
                                          color:
                                              Colors.white.withOpacity(0.3),
                                          fontSize: 11)),
                              ],
                            ),
                          ),
                          Text(
                            DateFormat('dd.MM HH:mm')
                                .format(v.scannedAt.toLocal()),
                            style: TextStyle(
                                color: Colors.white.withOpacity(0.3),
                                fontSize: 11),
                          ),
                        ],
                      ),
                    )),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 8),
          Text(value,
              style: TextStyle(
                  color: color,
                  fontSize: 24,
                  fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(label,
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: Colors.white.withOpacity(0.4), fontSize: 11)),
        ],
      ),
    );
  }
}
