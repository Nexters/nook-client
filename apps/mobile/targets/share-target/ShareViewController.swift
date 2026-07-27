import SwiftUI
import UIKit
import UniformTypeIdentifiers

class ShareViewController: UIViewController {

    private let store = ShareStore()
    private var isCompleting = false

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
        // 딤은 화면 전체(노치·홈 인디케이터 포함)를 덮는 윈도우에 건다.
        // 별도 dimView를 투명화하면 그 아래 시스템의 흰 컨테이너가 먼저 드러난다.
        view.window?.backgroundColor = UIColor.black.withAlphaComponent(0.4)
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .clear

        let screen = ShareScreen(
            // TODO: 서버 연동 시 이 조립 지점에서 조회한 그룹 목록을 주입한다.
            groups: previewGroups,
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

    // SwiftUI 가 시트를 내리는 동안 딤도 같이 걷어내고, 끝나면 화면을 감춘 뒤 종료한다.
    // 감추지 않으면 시스템 dismiss 애니메이션이 흰 컨테이너를 한 번 더 내려보낸다.
    private func complete() {
        guard !isCompleting else { return }
        isCompleting = true

        let finish = { [weak self] in
            guard let self else { return }
            let context = self.extensionContext

            // completeRequest와 같은 렌더 트랜잭션에서 alpha만 바꾸면 iOS가 이전 프레임의
            // 흰 시스템 컨테이너를 dismiss 스냅샷으로 사용할 수 있다. 확장 윈도우를 먼저
            // 완전히 제거하고 합성을 확정한 다음, 다음 프레임에 시스템 종료를 요청한다.
            if let window = self.view.window {
                CATransaction.begin()
                CATransaction.setDisableActions(true)
                window.layer.removeAllAnimations()
                window.layer.opacity = 0
                window.alpha = 0
                window.isHidden = true
                CATransaction.commit()
                CATransaction.flush()
            }

            DispatchQueue.main.async {
                context?.completeRequest(returningItems: [], completionHandler: nil)
            }
        }

        guard let window = view.window else {
            finish()
            return
        }

        let dimFade = CABasicAnimation(keyPath: "backgroundColor")
        dimFade.fromValue = UIColor.black.withAlphaComponent(0.4).cgColor
        dimFade.toValue = UIColor.clear.cgColor
        dimFade.duration = Self.dismissDuration
        dimFade.timingFunction = CAMediaTimingFunction(name: .easeIn)

        // UIWindow의 backgroundColor는 UIView.animate에서 중간 프레임이 생략될 수 있다.
        // 모델 값은 즉시 clear로 두고, 표시 레이어만 시트와 같은 시간 동안 페이드한다.
        CATransaction.begin()
        CATransaction.setCompletionBlock(finish)
        window.backgroundColor = .clear
        window.layer.add(dimFade, forKey: "nook.dimFade")
        CATransaction.commit()
    }

    static let dismissDuration: TimeInterval = 0.22
}
