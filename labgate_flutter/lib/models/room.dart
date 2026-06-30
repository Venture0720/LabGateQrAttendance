class Room {
  final String id;
  final String name;
  final DateTime createdAt;
  final bool isActive;
  final String? createdBy;

  const Room({
    required this.id,
    required this.name,
    required this.createdAt,
    required this.isActive,
    this.createdBy,
  });

  factory Room.fromJson(Map<String, dynamic> json) => Room(
        id: json['id'] as String,
        name: json['name'] as String,
        createdAt: DateTime.parse(json['created_at'] as String),
        isActive: json['is_active'] as bool,
        createdBy: json['created_by'] as String?,
      );
}
