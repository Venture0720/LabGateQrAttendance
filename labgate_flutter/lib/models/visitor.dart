class Visitor {
  final String id;
  final String roomId;
  final String? profileId;
  final String name;
  final DateTime scannedAt;
  final String? roomName;

  const Visitor({
    required this.id,
    required this.roomId,
    this.profileId,
    required this.name,
    required this.scannedAt,
    this.roomName,
  });

  factory Visitor.fromJson(Map<String, dynamic> json) => Visitor(
        id: json['id'] as String,
        roomId: json['room_id'] as String,
        profileId: json['profile_id'] as String?,
        name: json['name'] as String,
        scannedAt: DateTime.parse(json['scanned_at'] as String),
        roomName: (json['rooms'] as Map<String, dynamic>?)?['name'] as String?,
      );
}
