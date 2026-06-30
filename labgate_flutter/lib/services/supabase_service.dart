import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/profile.dart';
import '../models/room.dart';
import '../models/visitor.dart';

class SupabaseService {
  static SupabaseClient get client => Supabase.instance.client;

  // тФАтФА Auth тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА

  static Future<AuthResponse> signIn({
    required String username,
    required String password,
  }) async {
    final email = '${username.toLowerCase().trim()}@labgate.local';
    return client.auth.signInWithPassword(email: email, password: password);
  }

  static Future<AuthResponse> signUp({
    required String username,
    required String password,
    required String role,
  }) async {
    final email = '${username.toLowerCase().trim()}@labgate.local';
    return client.auth.signUp(
      email: email,
      password: password,
      data: {'username': username.toLowerCase().trim(), 'role': role},
    );
  }

  static Future<void> signOut() => client.auth.signOut();

  static User? get currentUser => client.auth.currentUser;

  static Stream<AuthState> get authStateChanges =>
      client.auth.onAuthStateChange;

  // тФАтФА Profile тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА

  static Future<Profile?> getProfile(String userId) async {
    final data = await client
        .from('profiles')
        .select()
        .eq('id', userId)
        .maybeSingle();
    if (data == null) return null;
    return Profile.fromJson(data);
  }

  // тФАтФА Rooms тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА

  static Future<List<Room>> getRooms() async {
    final data = await client
        .from('rooms')
        .select()
        .eq('is_active', true)
        .order('created_at', ascending: false);
    return (data as List).map((e) => Room.fromJson(e)).toList();
  }

  static Future<Room> createRoom(String name) async {
    final data = await client
        .from('rooms')
        .insert({'name': name})
        .select()
        .single();
    return Room.fromJson(data);
  }

  static Future<void> deactivateRoom(String roomId) async {
    await client
        .from('rooms')
        .update({'is_active': false})
        .eq('id', roomId);
  }

  // тФАтФА Visitors тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА

  static Future<List<Visitor>> getVisitorsByRoom(String roomId) async {
    final data = await client
        .from('visitors')
        .select()
        .eq('room_id', roomId)
        .order('scanned_at', ascending: false);
    return (data as List).map((e) => Visitor.fromJson(e)).toList();
  }

  static Future<List<Visitor>> getVisitorsLastMonth() async {
    final thirtyDaysAgo =
        DateTime.now().subtract(const Duration(days: 30)).toIso8601String();
    final data = await client
        .from('visitors')
        .select('*, rooms(name)')
        .gte('scanned_at', thirtyDaysAgo)
        .order('scanned_at', ascending: false);
    return (data as List).map((e) => Visitor.fromJson(e)).toList();
  }

  static Future<void> recordVisit({
    required String roomId,
    required String username,
  }) async {
    await client.from('visitors').insert({
      'room_id': roomId,
      'name': username,
    });
  }

  static Future<void> recordVisitIfNotExists({
    required String roomId,
    required String userId,
    required String username,
  }) async {
    final existing = await client
        .from('visitors')
        .select('id')
        .eq('room_id', roomId)
        .eq('profile_id', userId)
        .maybeSingle();
    if (existing != null) return;
    await client.from('visitors').insert({
      'room_id': roomId,
      'profile_id': userId,
      'name': username,
    });
  }

  // тФАтФА Realtime тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА

  static RealtimeChannel subscribeToRooms(void Function() onUpdate) {
    return client
        .channel('rooms-changes')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'rooms',
          callback: (_) => onUpdate(),
        )
        .subscribe();
  }

  static RealtimeChannel subscribeToVisitors(
    String roomId,
    void Function(Map<String, dynamic>) onInsert,
  ) {
    return client
        .channel('visitors-changes-$roomId')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'visitors',
          callback: (payload) => onInsert(payload.newRecord),
        )
        .subscribe();
  }
}

