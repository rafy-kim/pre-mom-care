class Chat {
  final String id;
  final String userId;
  final String title;
  final DateTime createdAt;

  const Chat({
    required this.id,
    required this.userId,
    required this.title,
    required this.createdAt,
  });

  factory Chat.fromJson(Map<String, dynamic> json) {
    return Chat(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      title: json['title'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'title': title,
      'created_at': createdAt.toIso8601String(),
    };
  }

  Chat copyWith({
    String? id,
    String? userId,
    String? title,
    DateTime? createdAt,
  }) {
    return Chat(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      title: title ?? this.title,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Chat &&
        other.id == id &&
        other.userId == userId &&
        other.title == title &&
        other.createdAt == createdAt;
  }

  @override
  int get hashCode {
    return Object.hash(id, userId, title, createdAt);
  }

  @override
  String toString() {
    return 'Chat(id: $id, userId: $userId, title: $title, createdAt: $createdAt)';
  }
}
