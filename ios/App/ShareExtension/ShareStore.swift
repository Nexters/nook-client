import Foundation

// pending 을 App Group UserDefaults 에 큐잉.
struct ShareStore {

    private let appGroupId = "group.com.nook.app.dev"

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
        guard let defaults = UserDefaults(suiteName: appGroupId) else { return }

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
