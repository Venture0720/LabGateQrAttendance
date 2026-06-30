import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/profile.dart';
import '../services/supabase_service.dart';

final authStateProvider = StreamProvider<AuthState>((ref) {
  return SupabaseService.authStateChanges;
});

final currentUserProvider = Provider<User?>((ref) {
  return SupabaseService.currentUser;
});

final profileProvider = FutureProvider.autoDispose<Profile?>((ref) async {
  final user = SupabaseService.currentUser;
  if (user == null) return null;
  return SupabaseService.getProfile(user.id);
});
