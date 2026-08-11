import Darwin
import Foundation
import OSLog
import Security

private let shareApiLogger = Logger(subsystem: "com.nook.app.share", category: "ShareAPI")

private struct ApiFailure: Decodable { let errorCode: String?; let reason: String? }
private struct ApiEnvelope<T: Decodable>: Decodable {
    let resultType: String
    let success: T?
    let error: ApiFailure?
}
private struct ApiStatusEnvelope: Decodable { let resultType: String; let error: ApiFailure? }
private struct TokenPair: Codable { let accessToken: String; let refreshToken: String }
private struct SessionRecord: Codable { let schemaVersion: Int; let accessToken: String; let refreshToken: String?; let revision: Int }
private struct ServerGroup: Decodable { let id: Int64; let name: String; let color: String }
private struct SavedPost: Decodable { let postId: Int64 }

enum ShareApiError: Error { case noSession, invalidResponse, http(Int), configuration, privatePost }

final class ShareApiClient {
    // API 버전 경로(/api/v1)까지 포함한 값이다. 웹의 VITE_API_BASE_URL 과 같은 규칙.
    private let baseURL: String
    private let session = ShareSessionVault()
    private let decoder = JSONDecoder()

    init?() {
        // Share Extension의 Info.plist는 apple-targets가 사용자 정의 키를 자동 병합하지 않는다.
        // 같은 앱 번들에 포함된 본앱의 Info.plist를 원본으로 사용해 환경별 API 설정을 공유한다.
        guard let value = Self.apiBaseURL(),
              !value.isEmpty, URL(string: value) != nil else { return nil }
        baseURL = value.hasSuffix("/") ? String(value.dropLast()) : value
    }

    func hasSession() -> Bool {
        do { return try session.read() != nil }
        catch { return false }
    }

    func groups() async throws -> [Group] {
        let data = try await protectedRequest(path: "/groups")
        let result = try unwrap(ApiEnvelope<[ServerGroup]>.self, data)
        return result.map { Group(id: $0.id, name: $0.name, color: groupColor($0.color)) }
    }

    func createGroup(name: String, colorIndex: Int) async throws -> Group {
        guard groupColorNames.indices.contains(colorIndex) else { throw ShareApiError.configuration }
        let body = try JSONSerialization.data(withJSONObject: [
            "name": name.trimmingCharacters(in: .whitespacesAndNewlines),
            "color": groupColorNames[colorIndex],
        ])
        let data = try await protectedRequest(path: "/groups", method: "POST", body: body)
        let result = try unwrap(ApiEnvelope<ServerGroup>.self, data)
        return Group(id: result.id, name: result.name, color: groupColor(result.color))
    }

    func save(url: String, groupIds: Set<Int64>, memo: String) async throws -> Int64 {
        let body = try JSONSerialization.data(withJSONObject: [
            "url": url, "groupIds": Array(groupIds), "memo": memo,
            "areGroupIdsPositive": groupIds.allSatisfy { $0 > 0 },
        ])
        let data = try await protectedRequest(path: "/posts", method: "POST", body: body)
        return try unwrap(ApiEnvelope<SavedPost>.self, data).postId
    }

    private func protectedRequest(path: String, method: String = "GET", body: Data? = nil) async throws -> Data {
        guard let record = try session.read() else { throw ShareApiError.noSession }
        let first = try await request(path: path, method: method, body: body, token: record.accessToken)
        if first.0 != 401 {
            guard (200..<300).contains(first.0) else { throw httpError(status: first.0, data: first.1) }
            return first.1
        }
        guard let refreshed = try await refresh(failedRevision: record.revision) else { throw ShareApiError.noSession }
        let retry = try await request(path: path, method: method, body: body, token: refreshed.accessToken)
        guard (200..<300).contains(retry.0) else {
            if retry.0 == 401 { try session.clear() }
            throw httpError(status: retry.0, data: retry.1)
        }
        return retry.1
    }

    private func refresh(failedRevision: Int) async throws -> SessionRecord? {
        let lockURL = try lockFileURL()
        let fd = open(lockURL.path, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
        guard fd >= 0 else { throw ShareApiError.configuration }
        defer { flock(fd, LOCK_UN); close(fd) }
        guard flock(fd, LOCK_EX) == 0 else { throw ShareApiError.configuration }
        guard let current = try session.read() else { return nil }
        if current.revision > failedRevision { return current }
        guard let refreshToken = current.refreshToken else { try session.clear(); return nil }
        let body = try JSONEncoder().encode(["refreshToken": refreshToken])
        let response = try await request(path: "/auth/token/refresh", method: "POST", body: body, token: nil)
        if (400..<500).contains(response.0) { try session.clear(); return nil }
        guard (200..<300).contains(response.0) else { throw ShareApiError.http(response.0) }
        let pair = try unwrap(ApiEnvelope<TokenPair>.self, response.1)
        return try session.write(accessToken: pair.accessToken, refreshToken: pair.refreshToken)
    }

    private func request(path: String, method: String, body: Data?, token: String?) async throws -> (Int, Data) {
        // 절대 경로를 relativeTo 로 붙이면 base 의 /api/v1 이 버려지므로 문자열로 잇는다.
        guard let url = URL(string: baseURL + path) else { throw ShareApiError.configuration }
        var request = URLRequest(url: url)
        request.httpMethod = method; request.httpBody = body; request.timeoutInterval = 15
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if body != nil { request.setValue("application/json", forHTTPHeaderField: "Content-Type") }
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw ShareApiError.invalidResponse }
        shareApiLogger.notice(
            "\(method, privacy: .public) \(path, privacy: .public) -> \(http.statusCode, privacy: .public)"
        )
#if DEBUG
        if path != "/auth/token/refresh" {
            let responseBody = String(data: data, encoding: .utf8) ?? "<binary>"
            shareApiLogger.notice("response: \(responseBody, privacy: .public)")
        }
#endif
        return (http.statusCode, data)
    }

    private func unwrap<T>(_ type: ApiEnvelope<T>.Type, _ data: Data) throws -> T where T: Decodable {
        let envelope = try decoder.decode(type, from: data)
        guard envelope.resultType == "SUCCESS" else { throw mappedError(envelope.error) }
        guard let value = envelope.success else { throw ShareApiError.invalidResponse }
        return value
    }

    private func httpError(status: Int, data: Data) -> ShareApiError {
        if status == 401 { return .http(status) }
        let failure = try? decoder.decode(ApiStatusEnvelope.self, from: data).error
        return mappedError(failure, fallbackStatus: status)
    }

    /// 서버가 확정한 `PRIVATE_POST` 만 비공개 안내로 보낸다.
    /// 나머지 실패는 네트워크 안내로 떨어뜨려 "다시하기" 를 남긴다 — 원인을 모르는 실패에
    /// "비공개 게시물" 을 띄우면 사용자가 할 수 있는 게 없다.
    private func mappedError(_ failure: ApiFailure?, fallbackStatus: Int? = nil) -> ShareApiError {
        if failure?.errorCode?.uppercased() == "PRIVATE_POST" { return .privatePost }
        if let fallbackStatus { return .http(fallbackStatus) }
        return .invalidResponse
    }

    private func lockFileURL() throws -> URL {
        guard let group = Bundle.main.object(forInfoDictionaryKey: "NookAppGroup") as? String,
              let root = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) else {
            throw ShareApiError.configuration
        }
        return root.appendingPathComponent("session-refresh.lock")
    }

    private static func apiBaseURL() -> String? {
        if let value = Bundle.main.object(forInfoDictionaryKey: "NookApiBaseUrl") as? String,
           !value.isEmpty {
            return value
        }

        let containingAppURL = Bundle.main.bundleURL
            .deletingLastPathComponent()
            .deletingLastPathComponent()
        return Bundle(url: containingAppURL)?
            .object(forInfoDictionaryKey: "NookApiBaseUrl") as? String
    }
}

private struct ShareSessionVault {
    private var query: [String: Any] {
        var value: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "com.nook.session.v1", kSecAttrAccount as String: "session"]
        if let group = Bundle.main.object(forInfoDictionaryKey: "NookSessionAccessGroup") as? String, !group.isEmpty { value[kSecAttrAccessGroup as String] = group }
        return value
    }
    func read() throws -> SessionRecord? {
        var q = query; q[kSecReturnData as String] = true; q[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?; let status = SecItemCopyMatching(q as CFDictionary, &item)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = item as? Data else { throw ShareApiError.configuration }
        return try JSONDecoder().decode(SessionRecord.self, from: data)
    }
    func write(accessToken: String, refreshToken: String?) throws -> SessionRecord {
        let record = SessionRecord(schemaVersion: 1, accessToken: accessToken, refreshToken: refreshToken, revision: ((try read())?.revision ?? 0) + 1)
        var q = query; q[kSecValueData as String] = try JSONEncoder().encode(record); q[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemDelete(query as CFDictionary)
        guard SecItemAdd(q as CFDictionary, nil) == errSecSuccess else { throw ShareApiError.configuration }
        return record
    }
    func clear() throws { SecItemDelete(query as CFDictionary) }
}
