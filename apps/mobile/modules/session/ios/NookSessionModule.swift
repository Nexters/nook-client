import ExpoModulesCore
import Foundation
import Security

public final class NookSessionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NookSession")
    AsyncFunction("getSession") { try SessionVault().read() }
    AsyncFunction("setSession") { (accessToken: String, refreshToken: String?) in
      try SessionVault().write(accessToken: accessToken, refreshToken: refreshToken)
    }
    AsyncFunction("clearSession") {
      try SessionVault().clear()
      if let group = Bundle.main.object(forInfoDictionaryKey: "NookAppGroup") as? String,
         let defaults = UserDefaults(suiteName: group) {
        defaults.removeObject(forKey: "pending")
        defaults.removeObject(forKey: "groups")
      }
    }
  }
}

struct NativeStoredSession: Codable {
  let schemaVersion: Int
  let accessToken: String
  let refreshToken: String?
  let revision: Int

  var dictionary: [String: Any?] {
    ["schemaVersion": schemaVersion, "accessToken": accessToken, "refreshToken": refreshToken, "revision": revision]
  }
}

struct SessionVault {
  private let service = "com.nook.session.v1"
  private let account = "session"
  private var accessGroup: String? {
    guard let appGroup = Bundle.main.object(forInfoDictionaryKey: "NookSessionAccessGroup") as? String,
          !appGroup.isEmpty else { return nil }
    return appGroup
  }

  func read() throws -> [String: Any?]? {
    var query = baseQuery
    query[kSecReturnData as String] = true
    query[kSecMatchLimit as String] = kSecMatchLimitOne
    var item: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &item)
    if status == errSecItemNotFound { return nil }
    guard status == errSecSuccess, let data = item as? Data else { throw VaultError.keychain(status) }
    return try JSONDecoder().decode(NativeStoredSession.self, from: data).dictionary
  }

  func write(accessToken: String, refreshToken: String?) throws -> [String: Any?] {
    guard !accessToken.isEmpty else { throw VaultError.invalidToken }
    let currentRevision = ((try read())?["revision"] as? Int) ?? 0
    let session = NativeStoredSession(schemaVersion: 1, accessToken: accessToken, refreshToken: refreshToken, revision: currentRevision + 1)
    let data = try JSONEncoder().encode(session)
    var attributes = baseQuery
    attributes[kSecValueData as String] = data
    attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    SecItemDelete(baseQuery as CFDictionary)
    let status = SecItemAdd(attributes as CFDictionary, nil)
    guard status == errSecSuccess else { throw VaultError.keychain(status) }
    return session.dictionary
  }

  func clear() throws {
    let status = SecItemDelete(baseQuery as CFDictionary)
    guard status == errSecSuccess || status == errSecItemNotFound else { throw VaultError.keychain(status) }
  }

  private var baseQuery: [String: Any] {
    var query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: account]
    if let accessGroup { query[kSecAttrAccessGroup as String] = accessGroup }
    return query
  }
}

enum VaultError: Error { case invalidToken; case keychain(OSStatus) }
