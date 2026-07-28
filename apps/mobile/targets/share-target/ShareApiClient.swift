import Darwin
import Foundation
import Security

private struct ApiEnvelope<T: Decodable>: Decodable { let resultType: String; let success: T? }
private struct TokenPair: Codable { let accessToken: String; let refreshToken: String }
private struct SessionRecord: Codable { let schemaVersion: Int; let accessToken: String; let refreshToken: String?; let revision: Int }
private struct ServerGroup: Decodable { let id: Int64; let name: String; let color: String }

enum ShareApiError: Error { case noSession, invalidResponse, http(Int), configuration }

final class ShareApiClient {
    // API 버전 경로(/api/v1)까지 포함한 값이다. 웹의 VITE_API_BASE_URL 과 같은 규칙.
    private let baseURL: String
    private let session = ShareSessionVault()
    private let decoder = JSONDecoder()

    init?() {
        guard let value = Bundle.main.object(forInfoDictionaryKey: "NookApiBaseUrl") as? String,
              !value.isEmpty, URL(string: value) != nil else { return nil }
        baseURL = value.hasSuffix("/") ? String(value.dropLast()) : value
    }

    func groups() async throws -> [Group] {
        let data = try await protectedRequest(path: "/groups")
        let result = try unwrap(ApiEnvelope<[ServerGroup]>.self, data)
        return result.map { Group(id: $0.id, name: $0.name, color: groupColor($0.color)) }
    }

    func createGroup(name: String, colorIndex: Int) async throws -> Group {
        let body = try JSONSerialization.data(withJSONObject: ["name": name, "color": groupColorNames[colorIndex]])
        let data = try await protectedRequest(path: "/groups", method: "POST", body: body)
        let result = try unwrap(ApiEnvelope<ServerGroup>.self, data)
        return Group(id: result.id, name: result.name, color: groupColor(result.color))
    }

    func save(url: String, groupIds: Set<Int64>, memo: String) async throws {
        let body = try JSONSerialization.data(withJSONObject: [
            "url": url, "groupIds": Array(groupIds), "memo": memo,
            "areGroupIdsPositive": groupIds.allSatisfy { $0 > 0 },
        ])
        _ = try await protectedRequest(path: "/posts", method: "POST", body: body)
    }

    private func protectedRequest(path: String, method: String = "GET", body: Data? = nil) async throws -> Data {
        guard let record = try session.read() else { throw ShareApiError.noSession }
        let first = try await request(path: path, method: method, body: body, token: record.accessToken)
        if first.0 != 401 {
            guard (200..<300).contains(first.0) else { throw ShareApiError.http(first.0) }
            return first.1
        }
        guard let refreshed = try await refresh(failedRevision: record.revision) else { throw ShareApiError.noSession }
        let retry = try await request(path: path, method: method, body: body, token: refreshed.accessToken)
        guard (200..<300).contains(retry.0) else {
            if retry.0 == 401 { try session.clear() }
            throw ShareApiError.http(retry.0)
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
        return (http.statusCode, data)
    }

    private func unwrap<T>(_ type: ApiEnvelope<T>.Type, _ data: Data) throws -> T where T: Decodable {
        let envelope = try decoder.decode(type, from: data)
        guard envelope.resultType == "SUCCESS", let value = envelope.success else { throw ShareApiError.invalidResponse }
        return value
    }

    private func lockFileURL() throws -> URL {
        guard let group = Bundle.main.object(forInfoDictionaryKey: "NookAppGroup") as? String,
              let root = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) else {
            throw ShareApiError.configuration
        }
        return root.appendingPathComponent("session-refresh.lock")
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
