class UserProfile {
  final String id; // Clerk User ID
  final String babyNickname;
  final DateTime dueDate;
  final Gender gender;
  final Relation relation;
  final MembershipTier membershipTier;
  final DateTime createdAt;
  final DateTime updatedAt;

  const UserProfile({
    required this.id,
    required this.babyNickname,
    required this.dueDate,
    required this.gender,
    required this.relation,
    required this.membershipTier,
    required this.createdAt,
    required this.updatedAt,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String,
      babyNickname: json['baby_nickname'] as String,
      dueDate: DateTime.parse(json['due_date'] as String),
      gender: Gender.fromString(json['gender'] as String),
      relation: Relation.fromString(json['relation'] as String),
      membershipTier: MembershipTier.fromString(
        json['membership_tier'] as String,
      ),
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'baby_nickname': babyNickname,
      'due_date': dueDate.toIso8601String(),
      'gender': gender.value,
      'relation': relation.value,
      'membership_tier': membershipTier.value,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  UserProfile copyWith({
    String? id,
    String? babyNickname,
    DateTime? dueDate,
    Gender? gender,
    Relation? relation,
    MembershipTier? membershipTier,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return UserProfile(
      id: id ?? this.id,
      babyNickname: babyNickname ?? this.babyNickname,
      dueDate: dueDate ?? this.dueDate,
      gender: gender ?? this.gender,
      relation: relation ?? this.relation,
      membershipTier: membershipTier ?? this.membershipTier,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is UserProfile &&
        other.id == id &&
        other.babyNickname == babyNickname &&
        other.dueDate == dueDate &&
        other.gender == gender &&
        other.relation == relation &&
        other.membershipTier == membershipTier &&
        other.createdAt == createdAt &&
        other.updatedAt == updatedAt;
  }

  @override
  int get hashCode {
    return Object.hash(
      id,
      babyNickname,
      dueDate,
      gender,
      relation,
      membershipTier,
      createdAt,
      updatedAt,
    );
  }

  @override
  String toString() {
    return 'UserProfile(id: $id, babyNickname: $babyNickname, dueDate: $dueDate, gender: $gender, relation: $relation, membershipTier: $membershipTier, createdAt: $createdAt, updatedAt: $updatedAt)';
  }
}

enum Gender {
  boy('boy'),
  girl('girl'),
  unknown('unknown');

  const Gender(this.value);
  final String value;

  static Gender fromString(String value) {
    return Gender.values.firstWhere(
      (gender) => gender.value == value,
      orElse: () => Gender.unknown,
    );
  }
}

enum Relation {
  mother('mother'),
  father('father');

  const Relation(this.value);
  final String value;

  static Relation fromString(String value) {
    return Relation.values.firstWhere(
      (relation) => relation.value == value,
      orElse: () => Relation.mother,
    );
  }
}

enum MembershipTier {
  basic('basic'),
  premium('premium'),
  expert('expert');

  const MembershipTier(this.value);
  final String value;

  static MembershipTier fromString(String value) {
    return MembershipTier.values.firstWhere(
      (tier) => tier.value == value,
      orElse: () => MembershipTier.basic,
    );
  }
}
