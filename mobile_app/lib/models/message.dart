class Message {
  final String id;
  final String chatId;
  final MessageRole role;
  final dynamic content; // JSON content - can be String, Map, List, etc.
  final DateTime createdAt;

  const Message({
    required this.id,
    required this.chatId,
    required this.role,
    required this.content,
    required this.createdAt,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['id'] as String,
      chatId: json['chat_id'] as String,
      role: MessageRole.fromString(json['role'] as String),
      content: json['content'], // Keep as dynamic for flexibility
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'chat_id': chatId,
      'role': role.value,
      'content': content,
      'created_at': createdAt.toIso8601String(),
    };
  }

  Message copyWith({
    String? id,
    String? chatId,
    MessageRole? role,
    dynamic content,
    DateTime? createdAt,
  }) {
    return Message(
      id: id ?? this.id,
      chatId: chatId ?? this.chatId,
      role: role ?? this.role,
      content: content ?? this.content,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  // Helper method to get content as String if possible
  String get contentAsString {
    if (content is String) return content as String;
    if (content is Map || content is List) {
      // If it's a complex object, try to extract text content
      // This is a simplified approach - you might need more sophisticated logic
      return content.toString();
    }
    return content?.toString() ?? '';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Message &&
        other.id == id &&
        other.chatId == chatId &&
        other.role == role &&
        other.content == content &&
        other.createdAt == createdAt;
  }

  @override
  int get hashCode {
    return Object.hash(id, chatId, role, content, createdAt);
  }

  @override
  String toString() {
    return 'Message(id: $id, chatId: $chatId, role: $role, content: $content, createdAt: $createdAt)';
  }
}

enum MessageRole {
  user('user'),
  assistant('assistant');

  const MessageRole(this.value);
  final String value;

  static MessageRole fromString(String value) {
    return MessageRole.values.firstWhere(
      (role) => role.value == value,
      orElse: () => MessageRole.user,
    );
  }
}
