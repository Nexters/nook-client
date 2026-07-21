import SwiftUI
import UIKit
import UniformTypeIdentifiers

// App Group ID는 capacitor.config.ts / 양쪽 entitlements와 일치해야 함 (docs/ios-share-target.md)
private let appGroupId = "group.com.nook.app.dev"

private struct MockGroup: Identifiable {
    let id: String
    let name: String
    let color: Color
}

private let mockGroups: [MockGroup] = [
    MockGroup(id: "cafe", name: "카페", color: Color(red: 0.97, green: 0.83, blue: 0.30)),
    MockGroup(id: "cinema", name: "독립영화관", color: Color(red: 0.30, green: 0.60, blue: 0.97)),
    MockGroup(id: "lpbar", name: "LP바", color: Color(red: 0.18, green: 0.65, blue: 0.48)),
    MockGroup(id: "saturday", name: "토요일 모임 장소", color: Color(red: 0.56, green: 0.49, blue: 0.97)),
]

private struct ShareSheetView: View {
    let onSave: (Set<String>) -> Void
    let onNewGroup: () -> Void
    let onDismiss: () -> Void

    @State private var selected: Set<String> = []

    var body: some View {
        ZStack(alignment: .bottom) {
            Color.black.opacity(0.4)
                .ignoresSafeArea()
                .onTapGesture(perform: onDismiss)

            VStack(spacing: 0) {
                Capsule()
                    .fill(Color(white: 0.85))
                    .frame(width: 48, height: 4)
                    .padding(.top, 12)
                    .padding(.bottom, 8)

                ForEach(mockGroups) { group in
                    Button {
                        if selected.contains(group.id) {
                            selected.remove(group.id)
                        } else {
                            selected.insert(group.id)
                        }
                    } label: {
                        HStack(spacing: 14) {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(group.color)
                                .frame(width: 16, height: 16)
                            Text(group.name)
                                .font(.system(size: 16))
                                .foregroundColor(Color(white: 0.1))
                            Spacer()
                            ZStack {
                                Circle()
                                    .fill(selected.contains(group.id) ? Color(white: 0.1) : Color(white: 0.9))
                                    .frame(width: 24, height: 24)
                                Image(systemName: "checkmark")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(selected.contains(group.id) ? .white : Color(white: 0.72))
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                    }
                }

                HStack(spacing: 16) {
                    Button(action: onNewGroup) {
                        Text("새 그룹 생성")
                            .font(.system(size: 16))
                            .foregroundColor(Color(white: 0.4))
                            .frame(maxWidth: .infinity, minHeight: 52)
                            .background(RoundedRectangle(cornerRadius: 14).fill(Color(white: 0.9)))
                    }
                    Button(action: { onSave(selected) }) {
                        Text("저장")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity, minHeight: 52)
                            .background(RoundedRectangle(cornerRadius: 14).fill(Color(white: 0.1)))
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .padding(.bottom, 24)
            }
            .background(
                RoundedCorner(radius: 20)
                    .fill(Color.white)
                    .ignoresSafeArea(edges: .bottom)
            )
        }
    }
}

private struct RoundedCorner: Shape {
    let radius: CGFloat

    func path(in rect: CGRect) -> Path {
        Path(
            UIBezierPath(
                roundedRect: rect,
                byRoundingCorners: [.topLeft, .topRight],
                cornerRadii: CGSize(width: radius, height: radius)
            ).cgPath)
    }
}

class ShareViewController: UIViewController {

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

        let sheet = ShareSheetView(
            onSave: { [weak self] selected in
                self?.extractTexts { texts in
                    self?.save(texts: texts, groups: selected)
                    self?.complete()
                }
            },
            onNewGroup: { [weak self] in
                self?.extractTexts { texts in
                    self?.save(texts: texts, groups: [])
                    self?.openHostApp()
                    self?.complete()
                }
            },
            onDismiss: { [weak self] in
                self?.complete()
            }
        )

        let host = UIHostingController(rootView: sheet)
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

        group.notify(queue: .main) { completion(texts) }
    }

    private func save(texts: [String], groups: Set<String>) {
        guard let userDefaults = UserDefaults(suiteName: appGroupId) else { return }
        userDefaults.set(["title": "", "texts": texts, "files": []], forKey: "SharedData")
        var pending = userDefaults.array(forKey: "PendingGroupSelections") as? [[String: Any]] ?? []
        pending.append(["texts": texts, "groups": Array(groups)])
        userDefaults.set(pending, forKey: "PendingGroupSelections")
        userDefaults.synchronize()
    }

    private func openHostApp() {
        guard let url = URL(string: "capacitor://share") else { return }
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
