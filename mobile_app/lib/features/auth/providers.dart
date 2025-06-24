import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/index.dart';
import '../../repositories/api_client.dart';
import '../../repositories/user_repository.dart';

// Repository Providers
final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient();
});

final userRepositoryProvider = Provider<UserRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return UserRepository(apiClient: apiClient);
});

// Auth State Provider
final authStateProvider = StateNotifierProvider<AuthStateNotifier, AuthState>((
  ref,
) {
  final userRepository = ref.watch(userRepositoryProvider);
  return AuthStateNotifier(userRepository);
});

// Auth State Management
class AuthState {
  final UserProfile? userProfile;
  final bool isLoading;
  final String? error;
  final bool isAuthenticated;

  const AuthState({
    this.userProfile,
    this.isLoading = false,
    this.error,
    this.isAuthenticated = false,
  });

  AuthState copyWith({
    UserProfile? userProfile,
    bool? isLoading,
    String? error,
    bool? isAuthenticated,
  }) {
    return AuthState(
      userProfile: userProfile ?? this.userProfile,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
    );
  }
}

class AuthStateNotifier extends StateNotifier<AuthState> {
  final UserRepository _userRepository;

  AuthStateNotifier(this._userRepository) : super(const AuthState());

  // Load user profile
  Future<void> loadUserProfile(String userId) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final response = await _userRepository.getUserProfile(userId);

      if (response.isSuccess && response.data != null) {
        state = state.copyWith(
          userProfile: response.data,
          isLoading: false,
          isAuthenticated: true,
        );
      } else {
        state = state.copyWith(
          isLoading: false,
          error: response.error ?? '사용자 정보를 불러올 수 없습니다',
          isAuthenticated: false,
        );
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: '네트워크 오류가 발생했습니다',
        isAuthenticated: false,
      );
    }
  }

  // Create user profile
  Future<bool> createUserProfile({
    required String id,
    required String babyNickname,
    required DateTime dueDate,
    required Gender gender,
    required Relation relation,
    MembershipTier membershipTier = MembershipTier.basic,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final response = await _userRepository.createUserProfile(
        id: id,
        babyNickname: babyNickname,
        dueDate: dueDate,
        gender: gender,
        relation: relation,
        membershipTier: membershipTier,
      );

      if (response.isSuccess && response.data != null) {
        state = state.copyWith(
          userProfile: response.data,
          isLoading: false,
          isAuthenticated: true,
        );
        return true;
      } else {
        state = state.copyWith(
          isLoading: false,
          error: response.error ?? '프로필 생성에 실패했습니다',
        );
        return false;
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: '네트워크 오류가 발생했습니다');
      return false;
    }
  }

  // Update user profile
  Future<bool> updateUserProfile({
    required String userId,
    String? babyNickname,
    DateTime? dueDate,
    Gender? gender,
    Relation? relation,
    MembershipTier? membershipTier,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final response = await _userRepository.updateUserProfile(
        userId: userId,
        babyNickname: babyNickname,
        dueDate: dueDate,
        gender: gender,
        relation: relation,
        membershipTier: membershipTier,
      );

      if (response.isSuccess && response.data != null) {
        state = state.copyWith(userProfile: response.data, isLoading: false);
        return true;
      } else {
        state = state.copyWith(
          isLoading: false,
          error: response.error ?? '프로필 업데이트에 실패했습니다',
        );
        return false;
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: '네트워크 오류가 발생했습니다');
      return false;
    }
  }

  // Sign out
  void signOut() {
    state = const AuthState();
  }

  // Clear error
  void clearError() {
    state = state.copyWith(error: null);
  }
}
