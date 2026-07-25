import SwiftUI
import UIKit
import UniformTypeIdentifiers

class ShareViewController: UIViewController {

    private let store = ShareStore()

    // 시스템이 확장을 시트 카드로 감싸는 걸 막아 호스트 앱(인스타)이 뒤로 비치게 함
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        modalPresentationStyle = .overFullScreen
    }

    override init(nibName: String?, bundle: Bundle?) {
        super.init(nibName: nibName, bundle: bundle)
        modalPresentationStyle = .overFullScreen
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        var parent = view.superview
        while let current = parent {
            current.backgroundColor = .clear
            parent = current.superview
        }
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .clear

        let screen = ShareScreen(
            onSave: { [weak self] groups, memo in
                self?.extractTexts { texts in
                    self?.store.saveToGroups(texts: texts, groups: groups, memo: memo)
                    self?.complete()
                }
            },
            onCreateGroup: { [weak self] name, colorIndex in
                self?.extractTexts { texts in
                    self?.store.saveNewGroup(texts: texts, name: name, colorIndex: colorIndex)
                    self?.complete()
                }
            },
            onDismiss: { [weak self] in self?.complete() }
        )

        let host = UIHostingController(rootView: screen)
        host.view.backgroundColor = .clear
        addChild(host)
        view.addSubview(host.view)
        host.view.frame = view.bounds
        host.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        host.didMove(toParent: self)
    }

    private func extractTexts(completion: @escaping ([String]) -> Void) {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            return completion([])
        }

        var texts: [String] = []
        let group = DispatchGroup()
        let lock = NSLock()

        for item in items {
            for provider in item.attachments ?? [] {
                if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { data, _ in
                        if let url = data as? URL {
                            lock.lock()
                            texts.append(url.absoluteString)
                            lock.unlock()
                        }
                        group.leave()
                    }
                } else if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { data, _ in
                        if let text = data as? String {
                            lock.lock()
                            texts.append(text)
                            lock.unlock()
                        }
                        group.leave()
                    }
                }
            }
        }

        group.notify(queue: .main) { completion(texts) }
    }

    private func complete() {
        extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }
}
