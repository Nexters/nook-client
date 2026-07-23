import ExpoModulesCore

// 공유 확장이 App Group UserDefaults("pending")에 큐잉한 항목을 읽고 비운다.
// ShareStore.swift 저장 계약과 1:1 대응 (group.com.nook.app.dev / key "pending").
public class NookShareModule: Module {
  private let appGroupId = "group.com.nook.app.dev"

  public func definition() -> ModuleDefinition {
    Name("NookShare")

    // pending 큐를 통째로 읽어 JSON 문자열로 반환하고, 원본은 즉시 비운다(take-and-clear).
    Function("takePending") { () -> String in
      guard let defaults = UserDefaults(suiteName: self.appGroupId),
            let pending = defaults.array(forKey: "pending"), !pending.isEmpty,
            JSONSerialization.isValidJSONObject(pending),
            let data = try? JSONSerialization.data(withJSONObject: pending),
            let json = String(data: data, encoding: .utf8)
      else {
        return "[]"
      }
      defaults.removeObject(forKey: "pending")
      return json
    }
  }
}
