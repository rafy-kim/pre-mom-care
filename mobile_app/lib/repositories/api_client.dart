import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

class ApiClient {
  static const String _baseUrl = 'http://localhost:3000'; // Remix dev server
  static const Duration _timeout = Duration(seconds: 30);

  final http.Client _client;
  String? _authToken;

  ApiClient({http.Client? client}) : _client = client ?? http.Client();

  // Set authentication token
  void setAuthToken(String? token) {
    _authToken = token;
  }

  // Get common headers
  Map<String, String> get _headers {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (_authToken != null) {
      headers['Authorization'] = 'Bearer $_authToken';
    }

    return headers;
  }

  // GET request
  Future<ApiResponse<T>> get<T>(
    String endpoint, {
    Map<String, String>? queryParams,
    T Function(Map<String, dynamic>)? fromJson,
  }) async {
    try {
      final uri = _buildUri(endpoint, queryParams);
      final response = await _client
          .get(uri, headers: _headers)
          .timeout(_timeout);

      return _handleResponse<T>(response, fromJson);
    } catch (e) {
      return ApiResponse.error(_handleException(e));
    }
  }

  // POST request
  Future<ApiResponse<T>> post<T>(
    String endpoint, {
    Map<String, dynamic>? body,
    T Function(Map<String, dynamic>)? fromJson,
  }) async {
    try {
      final uri = _buildUri(endpoint);
      final response = await _client
          .post(
            uri,
            headers: _headers,
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(_timeout);

      return _handleResponse<T>(response, fromJson);
    } catch (e) {
      return ApiResponse.error(_handleException(e));
    }
  }

  // PUT request
  Future<ApiResponse<T>> put<T>(
    String endpoint, {
    Map<String, dynamic>? body,
    T Function(Map<String, dynamic>)? fromJson,
  }) async {
    try {
      final uri = _buildUri(endpoint);
      final response = await _client
          .put(
            uri,
            headers: _headers,
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(_timeout);

      return _handleResponse<T>(response, fromJson);
    } catch (e) {
      return ApiResponse.error(_handleException(e));
    }
  }

  // DELETE request
  Future<ApiResponse<T>> delete<T>(
    String endpoint, {
    T Function(Map<String, dynamic>)? fromJson,
  }) async {
    try {
      final uri = _buildUri(endpoint);
      final response = await _client
          .delete(uri, headers: _headers)
          .timeout(_timeout);

      return _handleResponse<T>(response, fromJson);
    } catch (e) {
      return ApiResponse.error(_handleException(e));
    }
  }

  // Helper methods
  Uri _buildUri(String endpoint, [Map<String, String>? queryParams]) {
    final uri = Uri.parse('$_baseUrl$endpoint');
    if (queryParams != null && queryParams.isNotEmpty) {
      return uri.replace(queryParameters: queryParams);
    }
    return uri;
  }

  ApiResponse<T> _handleResponse<T>(
    http.Response response,
    T Function(Map<String, dynamic>)? fromJson,
  ) {
    final statusCode = response.statusCode;

    if (statusCode >= 200 && statusCode < 300) {
      // Success
      if (response.body.isEmpty) {
        return ApiResponse.success(null);
      }

      try {
        final data = jsonDecode(response.body);
        if (fromJson != null && data is Map<String, dynamic>) {
          return ApiResponse.success(fromJson(data));
        }
        return ApiResponse.success(data);
      } catch (e) {
        return ApiResponse.error('Invalid JSON response');
      }
    } else {
      // Error
      String errorMessage = 'HTTP $statusCode';
      try {
        final errorData = jsonDecode(response.body);
        if (errorData is Map<String, dynamic> && errorData['message'] != null) {
          errorMessage = errorData['message'] as String;
        }
      } catch (_) {
        // Use default error message
      }
      return ApiResponse.error(errorMessage);
    }
  }

  String _handleException(dynamic exception) {
    if (exception is SocketException) {
      return '인터넷 연결을 확인해주세요';
    } else if (exception is HttpException) {
      return '서버 연결에 문제가 발생했습니다';
    } else if (exception is FormatException) {
      return '잘못된 데이터 형식입니다';
    } else {
      return '알 수 없는 오류가 발생했습니다: ${exception.toString()}';
    }
  }

  void dispose() {
    _client.close();
  }
}

// API Response wrapper
class ApiResponse<T> {
  final T? data;
  final String? error;
  final bool isSuccess;

  const ApiResponse._({this.data, this.error, required this.isSuccess});

  factory ApiResponse.success(T? data) {
    return ApiResponse._(data: data, isSuccess: true);
  }

  factory ApiResponse.error(String error) {
    return ApiResponse._(error: error, isSuccess: false);
  }
}
