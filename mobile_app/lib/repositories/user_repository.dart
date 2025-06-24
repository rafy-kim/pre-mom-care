import '../models/index.dart';
import 'api_client.dart';

class UserRepository {
  final ApiClient _apiClient;

  UserRepository({ApiClient? apiClient})
    : _apiClient = apiClient ?? ApiClient();

  // Get user profile
  Future<ApiResponse<UserProfile>> getUserProfile(String userId) async {
    return await _apiClient.get<UserProfile>(
      '/api/user/$userId',
      fromJson: (json) => UserProfile.fromJson(json),
    );
  }

  // Create user profile
  Future<ApiResponse<UserProfile>> createUserProfile({
    required String id,
    required String babyNickname,
    required DateTime dueDate,
    required Gender gender,
    required Relation relation,
    MembershipTier membershipTier = MembershipTier.basic,
  }) async {
    final body = {
      'id': id,
      'baby_nickname': babyNickname,
      'due_date': dueDate.toIso8601String(),
      'gender': gender.value,
      'relation': relation.value,
      'membership_tier': membershipTier.value,
    };

    return await _apiClient.post<UserProfile>(
      '/api/user',
      body: body,
      fromJson: (json) => UserProfile.fromJson(json),
    );
  }

  // Update user profile
  Future<ApiResponse<UserProfile>> updateUserProfile({
    required String userId,
    String? babyNickname,
    DateTime? dueDate,
    Gender? gender,
    Relation? relation,
    MembershipTier? membershipTier,
  }) async {
    final body = <String, dynamic>{};

    if (babyNickname != null) body['baby_nickname'] = babyNickname;
    if (dueDate != null) body['due_date'] = dueDate.toIso8601String();
    if (gender != null) body['gender'] = gender.value;
    if (relation != null) body['relation'] = relation.value;
    if (membershipTier != null) body['membership_tier'] = membershipTier.value;

    return await _apiClient.put<UserProfile>(
      '/api/user/$userId',
      body: body,
      fromJson: (json) => UserProfile.fromJson(json),
    );
  }

  // Delete user profile
  Future<ApiResponse<void>> deleteUserProfile(String userId) async {
    return await _apiClient.delete<void>('/api/user/$userId');
  }

  void dispose() {
    _apiClient.dispose();
  }
}
