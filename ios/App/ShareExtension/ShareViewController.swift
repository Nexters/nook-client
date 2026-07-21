import UIKit
import UniformTypeIdentifiers

// App Group ID는 capacitor.config.ts / 양쪽 entitlements와 일치해야 함 (docs/ios-share-target.md)
class ShareViewController: UIViewController {
    private let appGroupId = "group.com.nook.app"

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        handleShare()
    }

    private func handleShare() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            return complete()
        }

        var texts: [String] = []
        let group = DispatchGroup()

        for item in items {
            for provider in item.attachments ?? [] {
                if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { data, _ in
                        if let url = data as? URL { texts.append(url.absoluteString) }
                        group.leave()
                    }
                } else if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { data, _ in
                        if let text = data as? String { texts.append(text) }
                        group.leave()
                    }
                }
            }
        }

        group.notify(queue: .main) { [weak self] in
            self?.save(texts: texts)
            self?.openHostApp()
            self?.complete()
        }
    }

    private func save(texts: [String]) {
        guard let userDefaults = UserDefaults(suiteName: appGroupId) else { return }
        userDefaults.set(["title": "", "texts": texts, "files": []], forKey: "SharedData")
        userDefaults.synchronize()
    }

    private func openHostApp() {
        guard let url = URL(string: "capacitor://share") else { return }
        // 확장에서는 UIApplication.shared 접근 불가 → responder chain으로 획득
        var responder: UIResponder? = self
        while let current = responder {
            if let application = current as? UIApplication {
                application.open(url, options: [:], completionHandler: nil)
                return
            }
            responder = current.next
        }
    }

    private func complete() {
        extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }
}
