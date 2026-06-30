import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../providers/auth_provider.dart';
import '../services/supabase_service.dart';
import '../widgets/glass_card.dart';

class StudentScreen extends ConsumerWidget {
  const StudentScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(profileProvider);

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(0, -0.5),
            radius: 1.2,
            colors: [Color(0xFF0d1a40), Color(0xFF0A0A0F)],
          ),
        ),
        child: SafeArea(
          child: profileAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(
                child: Text('Ошибка: $e',
                    style: const TextStyle(color: Colors.white))),
            data: (profile) {
              if (profile == null || !profile.isStudent) {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  context.go('/login');
                });
                return const SizedBox();
              }
              return _StudentBody(username: profile.username);
            },
          ),
        ),
      ),
    );
  }
}

class _StudentBody extends StatelessWidget {
  final String username;
  const _StudentBody({required this.username});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          // Header
          GlassCard(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('LabGate',
                        style: GoogleFonts.pressStart2p(
                            fontSize: 14,
                            color: Colors.white)),
                    Text('Кабинет студента',
                        style: TextStyle(
                            fontSize: 11,
                            color: Colors.white.withOpacity(0.3),
                            letterSpacing: 1.2)),
                  ],
                ),
                TextButton.icon(
                  onPressed: () async {
                    await SupabaseService.signOut();
                    if (context.mounted) context.go('/login');
                  },
                  icon: const Icon(Icons.logout, size: 16, color: Colors.white38),
                  label: Text('Выйти',
                      style: TextStyle(
                          color: Colors.white.withOpacity(0.4), fontSize: 13)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Profile card
          GlassCard(
            child: Row(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white.withOpacity(0.1)),
                  ),
                  child: const Icon(Icons.person, color: Colors.white70, size: 28),
                ),
                const SizedBox(width: 16),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(username,
                        style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.white)),
                    Row(
                      children: [
                        Icon(Icons.school,
                            size: 14, color: Colors.white.withOpacity(0.4)),
                        const SizedBox(width: 4),
                        Text('Доступ к лабораториям',
                            style: TextStyle(
                                fontSize: 13,
                                color: Colors.white.withOpacity(0.4))),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // QR Scan button
          Expanded(
            child: GlassCard(
              onTap: () => context.push('/scan'),
              child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(28),
                        border:
                            Border.all(color: Colors.white.withOpacity(0.1)),
                      ),
                      child: const Icon(Icons.qr_code_scanner,
                          size: 52, color: Colors.white70),
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      'Сканировать QR-код',
                      style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Colors.white),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Наведите камеру на QR у входа\nв лабораторию',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          fontSize: 14, color: Colors.white.withOpacity(0.4)),
                    ),
                    const SizedBox(height: 24),
                    GlassButton(
                      onPressed: () => context.push('/scan'),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text('Открыть сканер',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600)),
                          SizedBox(width: 8),
                          Icon(Icons.arrow_forward,
                              size: 16, color: Colors.white),
                        ],
                      ),
                    ),
                  ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Info
          GlassCard(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const Text('💡', style: TextStyle(fontSize: 16)),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'QR-код расположен у входа в лабораторию. Вход будет записан автоматически под вашим логином.',
                    style: TextStyle(
                        fontSize: 12, color: Colors.white.withOpacity(0.4)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
