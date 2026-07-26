import Foundation

// 공유로 받은 내용을 앱이 다음 실행 때 읽어갈 수 있도록 App Group UserDefaults에 큐잉한다.
// Android의 ShareRepository(nook_shares/pending)와 동일한 구조.
struct ShareStore {

    private var appGroupId: String? {
        guard let extensionId = Bundle.main.bundleIdentifier,
              extensionId.hasSuffix(".ShareExtension") else { return nil }

        return "group." + String(extensionId.dropLast(".ShareExtension".count))
    }

    func saveToGroups(texts: [String], groups: Set<String>, memo: String) {
        append(texts: texts) { entry in
            entry["groups"] = Array(groups)
            entry["memo"] = memo
        }
    }

    func saveNewGroup(texts: [String], name: String, colorIndex: Int) {
        append(texts: texts) { entry in
            entry["newGroupName"] = name
            entry["newGroupColorIndex"] = colorIndex
        }
    }

    private func append(texts: [String], build: (inout [String: Any]) -> Void) {
        guard let appGroupId, let defaults = UserDefaults(suiteName: appGroupId) else { return }

        var entry: [String: Any] = [
            "text": texts.joined(separator: "\n"),
            "savedAt": Date().timeIntervalSince1970 * 1000,
        ]
        build(&entry)

        var pending = defaults.array(forKey: "pending") as? [[String: Any]] ?? []
        pending.append(entry)
        defaults.set(pending, forKey: "pending")
    }
}
