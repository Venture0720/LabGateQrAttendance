class Profile {
  final String id;
  final String username;
  final String role;
  final DateTime createdAt;

  const Profile({
    required this.id,
    required this.username,
    required this.role,
    required this.createdAt,
  });

  factory Profile.fromJson(Map<String, dynamic> json) => Profile(
        id: (json['id'] ?? '') as String,
        username: (json['username'] ?? '') as String,
        role: (json['role'] ?? '') as String,
        createdAt: json['created_at'] != null
            ? DateTime.parse(json['created_at'] as String)
            : DateTime.now(),
      );

  bool get isProfessor => role == 'professor';
  bool get isStudent => role == 'student';
}
