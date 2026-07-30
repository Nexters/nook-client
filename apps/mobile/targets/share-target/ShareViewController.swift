import SwiftUI
import UIKit
import UniformTypeIdentifiers
import OSLog

private let shareLogger = Logger(subsystem: "com.nook.app.share", category: "ShareExtension")

private typealias OpenURLCompletion = @convention(block) (Bool) -> Void
private typealias OpenURLImplementation = @convention(c) (
    AnyObject,
    Selector,
    NSURL,
    NSDictionary,
    OpenURLCompletion?
) -> Void

class ShareViewController: UIViewController {

    private let api = ShareApiClient()
    private var isCompleting = false

    // 호스트 앱의 텍스트 입력 responder가 공유 확장 표시 뒤에도 키보드를 유지하지 않도록
    // 키보드가 없는 컨트롤러가 확장의 초기 first responder를 맡는다.
    override var canBecomeFirstResponder: Bool { true }

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

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        claimInitialFocus()

        // 시스템의 공유 확장 표시 애니메이션이 끝난 뒤 responder를 복원하는 경우가 있어
        // 사용자가 입력창을 누르지 않은 경우에만 한 번 더 키보드 없는 responder를 잡는다.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
            guard let self, !self.hasTextInputFirstResponder(in: self.view) else { return }
            self.claimInitialFocus()
        }
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .clear
        loadGroups()
    }

    @MainActor
    private func loadGroups() {
        guard let api else {
            presentFeedback(.network) { [weak self] in self?.loadGroups() }
            return
        }
        guard api.hasSession() else {
            presentFeedback(.login) { [weak self] in self?.openContainingApp(path: "login") }
            return
        }

        Task { [weak self] in
            guard let self else { return }
            do {
                let groups = try await api.groups()
                self.mountScreen(groups: groups)
            } catch {
                shareLogger.error("그룹 조회 실패: \(String(describing: error), privacy: .public)")
                self.handleFailure(error) { [weak self] in self?.loadGroups() }
            }
        }
    }

    private func mountScreen(groups: [Group]) {
        let screen = ShareScreen(
            groups: groups,
            onSave: { [weak self] groups, memo, finishSaving in
                shareLogger.notice("저장 시작 (groups=\(groups.count, privacy: .public))")
                guard let self else {
                    finishSaving(false)
                    return
                }
                self.savePost(groups: groups, memo: memo, finishSaving: finishSaving)
            },
            onCreateGroup: { [weak self] name, colorIndex, finishCreating in
                guard let self else {
                    finishCreating(false)
                    return
                }
                self.createGroup(
                    name: name,
                    colorIndex: colorIndex,
                    existingGroups: groups,
                    finishCreating: finishCreating
                )
            },
            onDismiss: { [weak self] in self?.complete() }
        )

        setRoot(screen)
    }

    @MainActor
    private func savePost(
        groups: Set<Int64>,
        memo: String,
        finishSaving: ((Bool) -> Void)? = nil
    ) {
        extractTexts { [weak self] texts in
            guard let self else {
                finishSaving?(false)
                return
            }
            Task { [weak self] in
                guard let self else { return }
                do {
                    guard let url = self.firstSharedURL(in: texts) else {
                        throw ShareApiError.privatePost
                    }
                    guard let api = self.api else { throw ShareApiError.configuration }
                    let postId = try await api.save(url: url, groupIds: groups, memo: memo)
                    await MainActor.run {
                        finishSaving?(true)
                        self.presentFeedback(.success) { [weak self] in
                            self?.openContainingApp(path: "post/\(postId)")
                        }
                    }
                } catch {
                    shareLogger.error("게시글 저장 실패: \(String(describing: error), privacy: .public)")
                    await MainActor.run {
                        finishSaving?(false)
                        self.handleFailure(error) { [weak self] in
                            self?.savePost(groups: groups, memo: memo)
                        }
                    }
                }
            }
        }
    }

    @MainActor
    private func createGroup(
        name: String,
        colorIndex: Int,
        existingGroups: [Group],
        finishCreating: ((Bool) -> Void)? = nil
    ) {
        Task { [weak self] in
            guard let self else { return }
            do {
                guard let api = self.api else { throw ShareApiError.configuration }
                let created = try await api.createGroup(name: name, colorIndex: colorIndex)
                finishCreating?(true)
                self.replaceScreen(groups: existingGroups + [created])
            } catch {
                shareLogger.error("그룹 생성 실패: \(String(describing: error), privacy: .public)")
                finishCreating?(false)
                self.handleFailure(error) { [weak self] in
                    self?.createGroup(name: name, colorIndex: colorIndex, existingGroups: existingGroups)
                }
            }
        }
    }

    @MainActor
    private func setRoot<Content: View>(_ root: Content) {
        children.forEach { child in
            child.willMove(toParent: nil)
            child.view.removeFromSuperview()
            child.removeFromParent()
        }

        let host = UIHostingController(rootView: root)
        host.view.backgroundColor = .clear
        addChild(host)
        view.addSubview(host.view)
        host.view.frame = view.bounds
        host.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        host.didMove(toParent: self)

        // 공유를 호출한 호스트 앱에서 열려 있던 키보드 상태가 확장으로 이어지거나,
        // 첫 TextField가 초기 responder가 되지 않도록 첫 렌더 다음 run loop에서 해제한다.
        host.view.endEditing(true)
        DispatchQueue.main.async { [weak self, weak host] in
            host?.view.endEditing(true)
            self?.view.window?.endEditing(true)
        }
    }

    private func replaceScreen(groups: [Group]) {
        mountScreen(groups: groups)
    }

    private func claimInitialFocus() {
        view.endEditing(true)
        view.window?.endEditing(true)
        let claimed = becomeFirstResponder()
        print("[NookShare] initial focus claimed: \(claimed)")
    }

    private func hasTextInputFirstResponder(in root: UIView) -> Bool {
        if root.isFirstResponder && (root is UITextField || root is UITextView) { return true }
        return root.subviews.contains { hasTextInputFirstResponder(in: $0) }
    }

    private func extractTexts(completion: @escaping ([String]) -> Void) {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            return completion([])
        }

        let texts = SharedTextAccumulator()
        let group = DispatchGroup()

        for item in items {
            if let contentText = item.attributedContentText?.string, !contentText.isEmpty {
                texts.append(contentText)
            }
            for provider in item.attachments ?? [] {
                shareLogger.notice(
                    "provider types: \(provider.registeredTypeIdentifiers.joined(separator: ", "), privacy: .public)"
                )
                if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    _ = provider.loadDataRepresentation(for: UTType.url) { data, error in
                        if let data, let value = decodeSharedText(data) {
                            texts.append(value)
                        } else if let error {
                            shareLogger.error("공유 URL 로드 실패: \(String(describing: error), privacy: .public)")
                        }
                        group.leave()
                    }
                } else if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    _ = provider.loadDataRepresentation(for: UTType.plainText) { data, error in
                        if let data, let value = decodeSharedText(data) {
                            texts.append(value)
                        } else if let error {
                            shareLogger.error("공유 텍스트 로드 실패: \(String(describing: error), privacy: .public)")
                        }
                        group.leave()
                    }
                }
            }
        }

        group.notify(queue: .main) {
            let values = texts.snapshot()
            shareLogger.notice("공유 데이터 추출 완료 (count=\(values.count, privacy: .public))")
            completion(values)
        }
    }

    private func firstSharedURL(in texts: [String]) -> String? {
        guard let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue) else {
            return nil
        }
        for (index, text) in texts.enumerated() {
            let normalized = text.replacingOccurrences(of: "\0", with: "")
            shareLogger.notice(
                "공유 URL 후보[\(index, privacy: .public)]: \(String(reflecting: normalized), privacy: .public)"
            )

            let range = NSRange(normalized.startIndex..., in: normalized)
            if let url = detector.firstMatch(in: normalized, range: range)?.url,
               let scheme = url.scheme?.lowercased(),
               scheme == "http" || scheme == "https" {
                shareLogger.notice("공유 URL 선택: \(url.absoluteString, privacy: .public)")
                return url.absoluteString
            }

            if let match = normalized.range(
                of: #"https?://[^\s<>\"']+"#,
                options: [.regularExpression, .caseInsensitive]
            ) {
                let value = String(normalized[match])
                    .trimmingCharacters(in: CharacterSet(charactersIn: ".,;)]}"))
                if URL(string: value) != nil {
                    shareLogger.notice("공유 URL 선택(regex): \(value, privacy: .public)")
                    return value
                }
            }
        }
        shareLogger.error("공유 데이터에서 HTTP URL을 찾지 못함 (count=\(texts.count, privacy: .public))")
        return nil
    }

    private func isAuthenticationError(_ error: Error) -> Bool {
        guard let apiError = error as? ShareApiError else { return false }
        switch apiError {
        case .noSession, .http(401): return true
        default: return false
        }
    }

    @MainActor
    private func handleFailure(_ error: Error, retry: @escaping () -> Void) {
        if isAuthenticationError(error) {
            presentFeedback(.login) { [weak self] in self?.openContainingApp(path: "login") }
        } else if case ShareApiError.privatePost = error {
            presentFeedback(.privatePost) { [weak self] in self?.complete() }
        } else {
            presentFeedback(.network, onAction: retry)
        }
    }

    @MainActor
    private func presentFeedback(_ kind: ShareFeedbackKind, onAction: @escaping () -> Void) {
        setRoot(ShareFeedbackOverlay(kind: kind, onAction: onAction))
    }

    @MainActor
    private func openContainingApp(path: String) {
        guard let extensionBundleID = Bundle.main.bundleIdentifier else {
            complete()
            return
        }
        let appBundleID = extensionBundleID.replacingOccurrences(of: ".ShareExtension", with: "")
        guard let url = URL(string: "\(appBundleID)://\(path)") else {
            complete()
            return
        }

        // Share Extension에서는 공식 open이 보통 false를 반환한다. 공식 경로를 먼저
        // 시도하고, 실패한 경우에만 responder chain에서 UIApplication 런타임 객체를
        // 찾아 동일한 URL을 연다. 후자는 Apple이 지원하지 않는 호환성 우회 경로다.
        extensionContext?.open(url) { [weak self] opened in
            DispatchQueue.main.async {
                guard let self else { return }
                if opened {
                    shareLogger.notice("본앱 열기 성공 (extensionContext)")
                    self.complete()
                    return
                }

                shareLogger.notice("extensionContext 본앱 열기 실패; responder chain 우회 시도")
                guard self.openContainingAppViaResponderChain(url) else {
                    shareLogger.error("responder chain에서 UIApplication.open을 찾지 못함")
                    self.complete()
                    return
                }

                // UIKit이 completion handler를 호출하지 않는 iOS 조합에서도 공유 화면이
                // 멈추지 않도록 안전하게 종료한다.
                DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak self] in
                    guard let self, !self.isCompleting else { return }
                    shareLogger.error("UIApplication.open completion 미수신; 공유 화면 종료")
                    self.complete()
                }
            }
        }
    }

    @MainActor
    private func openContainingAppViaResponderChain(_ url: URL) -> Bool {
        let selector = NSSelectorFromString("openURL:options:completionHandler:")
        guard let applicationClass = NSClassFromString("UIApplication") else { return false }

        var responder: UIResponder? = self
        while let current = responder {
            responder = current.next
            guard current.isKind(of: applicationClass), current.responds(to: selector) else {
                continue
            }

            let completion: OpenURLCompletion = { [weak self] opened in
                DispatchQueue.main.async {
                    if opened {
                        shareLogger.notice("본앱 열기 성공 (UIApplication.open 우회)")
                    } else {
                        shareLogger.error("본앱 열기 실패 (UIApplication.open 우회)")
                    }
                    self?.complete()
                }
            }
            let implementation = current.method(for: selector)
            let openURL = unsafeBitCast(implementation, to: OpenURLImplementation.self)
            openURL(current, selector, url as NSURL, [:] as NSDictionary, completion)
            return true
        }

        return false
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

private final class SharedTextAccumulator: @unchecked Sendable {
    private let lock = NSLock()
    private var values: [String] = []

    func append(_ value: String) {
        lock.lock()
        values.append(value)
        lock.unlock()
    }

    func snapshot() -> [String] {
        lock.lock()
        defer { lock.unlock() }
        return values
    }
}

private func decodeSharedText(_ data: Data) -> String? {
    if let url = try? NSKeyedUnarchiver.unarchivedObject(ofClass: NSURL.self, from: data) {
        return url.absoluteString
    }

    if let propertyList = try? PropertyListSerialization.propertyList(from: data, format: nil) {
        if let value = propertyList as? String { return value }
        if let url = propertyList as? URL { return url.absoluteString }
        if let url = propertyList as? NSURL { return url.absoluteString }
        if let value = findHTTPURL(in: propertyList) { return value }
    }

    for encoding in [String.Encoding.utf8, .utf16, .utf16LittleEndian, .utf16BigEndian] {
        if let value = String(data: data, encoding: encoding)?
            .replacingOccurrences(of: "\0", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines.union(.controlCharacters)),
           !value.isEmpty {
            return value
        }
    }
    return nil
}

private func findHTTPURL(in value: Any) -> String? {
    if let url = value as? URL,
       let scheme = url.scheme?.lowercased(),
       scheme == "http" || scheme == "https" {
        return url.absoluteString
    }
    if let url = value as? NSURL,
       let value = url.absoluteString,
       value.hasPrefix("http://") || value.hasPrefix("https://") {
        return value
    }
    if let text = value as? String,
       let match = text.range(
           of: #"https?://[^\s<>\"']+"#,
           options: [.regularExpression, .caseInsensitive]
       ) {
        return String(text[match])
            .trimmingCharacters(in: CharacterSet(charactersIn: ".,;)]}"))
    }
    if let values = value as? [Any] {
        for item in values {
            if let url = findHTTPURL(in: item) { return url }
        }
    }
    if let dictionary = value as? [AnyHashable: Any] {
        for item in dictionary.values {
            if let url = findHTTPURL(in: item) { return url }
        }
    }
    return nil
}
