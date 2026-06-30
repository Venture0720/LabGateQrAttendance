import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/room.dart';
import '../models/visitor.dart';
import '../services/supabase_service.dart';

final roomsProvider = FutureProvider.autoDispose<List<Room>>((ref) async {
  return SupabaseService.getRooms();
});

final selectedRoomIdProvider = StateProvider<String?>((ref) => null);

final visitorsForRoomProvider =
    FutureProvider.autoDispose.family<List<Visitor>, String>((ref, roomId) async {
  return SupabaseService.getVisitorsByRoom(roomId);
});

final allVisitorsMonthProvider =
    FutureProvider.autoDispose<List<Visitor>>((ref) async {
  return SupabaseService.getVisitorsLastMonth();
});
