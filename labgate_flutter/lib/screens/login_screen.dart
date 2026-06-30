import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../services/supabase_service.dart';
import '../widgets/glass_card.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _showPassword = false;
  bool _loading = false;
  String _error = '';

  @override
  void dispose() {
    _usernameCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final username = _usernameCtrl.text.trim().toLowerCase();
    final password = _passwordCtrl.text;

    if (username.isEmpty) {
      setState(() => _error = 'Введите логин');
      return;
    }
    if (username.contains(' ')) {
      setState(() => _error = 'Логин не должен содержать пробелы');
      return;
    }
    if (username.contains('@')) {
      setState(() => _error = 'Введите только логин, без @domain');
      return;
    }
    if (password.isEmpty) {
      setState(() => _error = 'Введите пароль');
      return;
    }

    setState(() {
      _loading = true;
      _error = '';
    });

    try {
      final res = await SupabaseService.signIn(
        username: username,
        password: password,
      );

      if (res.user == null) {
        setState(() => _error = 'Неверный логин или пароль');
        return;
      }

      // Verify role
      await Future.delayed(const Duration(milliseconds: 300));
      final profile = await SupabaseService.getProfile(res.user!.id);

      if (profile == null) {
        await SupabaseService.signOut();
        setState(() => _error = 'Профиль не найден');
        return;
      }

      if (!mounted) return;
      if (profile.isProfessor) {
        context.go('/professor');
      } else {
        context.go('/student');
      }
    } catch (e) {
      String msg = e.toString();
      if (msg.contains('Invalid login credentials')) {
        msg = 'Неверный логин или пароль';
      } else if (msg.contains('Email not confirmed')) {
        msg = 'Отключите подтверждение email в настройках Supabase';
      } else if (msg.contains('rate limit') || msg.contains('over_email_send_rate_limit')) {
        msg = 'Слишком много попыток. Подождите немного.';
      } else if (msg.contains('User already registered')) {
        msg = 'Пользователь уже существует. Войдите.';
      }
      setState(() => _error = msg);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(0, -0.3),
            radius: 1.2,
            colors: [Color(0xFF1a1040), Color(0xFF0A0A0F)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 400),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Logo
                    const Icon(Icons.qr_code_scanner,
                        size: 64, color: Color(0xFF6C63FF))
                        .animate()
                        .fadeIn(duration: 600.ms)
                        .scale(begin: const Offset(0.7, 0.7), end: const Offset(1, 1)),
                    const SizedBox(height: 16),
                    Text(
                      'LabGate',
                      style: GoogleFonts.pressStart2p(
                        fontSize: 22,
                        color: Colors.white,
                        letterSpacing: 1,
                      ),
                    ).animate().fadeIn(delay: 200.ms, duration: 600.ms).slideY(begin: 0.3, end: 0),
                    const SizedBox(height: 8),
                    Text(
                      'Система контроля доступа',
                      style: TextStyle(
                          color: Colors.white.withOpacity(0.4), fontSize: 12),
                    ).animate().fadeIn(delay: 400.ms, duration: 600.ms),
                    const SizedBox(height: 40),

                    // Form
                    GlassCard(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        children: [
                          _InputField(
                            controller: _usernameCtrl,
                            label: 'Логин',
                            icon: Icons.person_outline,
                          ),
                          const SizedBox(height: 16),
                          _InputField(
                            controller: _passwordCtrl,
                            label: 'Пароль',
                            icon: Icons.lock_outline,
                            obscure: !_showPassword,
                            suffix: IconButton(
                              icon: Icon(
                                _showPassword
                                    ? Icons.visibility_off
                                    : Icons.visibility,
                                color: Colors.white38,
                                size: 20,
                              ),
                              onPressed: () =>
                                  setState(() => _showPassword = !_showPassword),
                            ),
                          ),
                          if (_error.isNotEmpty) ...[
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.red.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                    color: Colors.red.withOpacity(0.3)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.error_outline,
                                      color: Colors.redAccent, size: 16),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(_error,
                                        style: const TextStyle(
                                            color: Colors.redAccent,
                                            fontSize: 13)),
                                  ),
                                ],
                              ),
                            ),
                          ],
                          const SizedBox(height: 20),
                          SizedBox(
                            width: double.infinity,
                            child: GlassButton(
                              onPressed: _loading ? null : _submit,
                              loading: _loading,
                              child: const Center(
                                child: Text(
                                  'Войти',
                                  style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                      color: Colors.white),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _InputField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final IconData icon;
  final bool obscure;
  final Widget? suffix;

  const _InputField({
    required this.controller,
    required this.label,
    required this.icon,
    this.obscure = false,
    this.suffix,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: Colors.white.withOpacity(0.4)),
        prefixIcon: Icon(icon, color: Colors.white38, size: 20),
        suffixIcon: suffix,
        filled: true,
        fillColor: Colors.white.withOpacity(0.05),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide:
              const BorderSide(color: Color(0xFF6C63FF), width: 1.5),
        ),
      ),
    );
  }
}
