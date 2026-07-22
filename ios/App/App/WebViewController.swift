import UIKit
import WebKit

/**
 * 얇은 네이티브 셸. WKWebView 로 원격 웹(app.nook.com)을 띄우고,
 * WebView 가 못 하는 것(외부 링크·공유 핸드오프 등)만 브리지로 담당한다.
 * - 웹 → 네이티브: window.webkit.messageHandlers.nook.postMessage(obj)
 * - 네이티브 → 웹: window.__nookReceive(jsonString)
 */
final class WebViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate {

    private var webView: WKWebView!
    // WEB_READY 전 전달 시 pending 유실 → 준비 후에만 전달
    private var webReady = false

    private static let webURL = URL(string: "https://app.nook.com")!
    private static let webOrigin = "https://app.nook.com"
    private static let appGroupId = "group.com.nook.app.dev"
    private static let bridgeName = "nook"

    override func loadView() {
        let controller = WKUserContentController()
        controller.add(self, name: Self.bridgeName)

        let config = WKWebViewConfiguration()
        config.userContentController = controller

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        view = webView
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appDidBecomeActive),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
        webView.load(URLRequest(url: Self.webURL))
    }

    @objc private func appDidBecomeActive() {
        guard webReady else { return }
        deliverPendingShares()
        postToWeb(["v": 1, "type": "APP_RESUMED", "payload": [String: Any]()])
    }

    // MARK: 웹 → 네이티브

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == Self.bridgeName,
              let dict = message.body as? [String: Any],
              let type = dict["type"] as? String else { return }

        switch type {
        case "OPEN_EXTERNAL_URL":
            if let payload = dict["payload"] as? [String: Any],
               let url = payload["url"] as? String {
                openExternal(url)
            }
        case "WEB_READY":
            webReady = true
            deliverPendingShares()
        case "REQUEST_LOCATION", "NAV_STATE":
            break  // 후속 레그(위치 브리지 / iOS 는 시스템 back 없음)
        default:
            break
        }
    }

    // MARK: 네이티브 → 웹

    private func postToWeb(_ message: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: message),
              let json = String(data: data, encoding: .utf8) else { return }
        let escaped = json
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
            .replacingOccurrences(of: "\n", with: "\\n")
        webView.evaluateJavaScript(
            "window.__nookReceive && window.__nookReceive('\(escaped)')",
            completionHandler: nil
        )
    }

    /// Share Extension 이 App Group 에 저장한 pending 을 웹에 전달하고 비운다.
    private func deliverPendingShares() {
        guard let defaults = UserDefaults(suiteName: Self.appGroupId),
              let pending = defaults.array(forKey: "pending") as? [[String: Any]],
              !pending.isEmpty else { return }
        postToWeb(["v": 1, "type": "SHARE_RECEIVED", "payload": ["items": pending]])
        defaults.set([], forKey: "pending")
    }

    private func openExternal(_ urlString: String) {
        guard urlString.hasPrefix("http://") || urlString.hasPrefix("https://"),
              let url = URL(string: urlString) else { return }
        UIApplication.shared.open(url)
    }

    // MARK: 외부 도메인은 시스템 브라우저, app.nook.com 은 인앱

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        if navigationAction.navigationType == .linkActivated,
           let url = navigationAction.request.url,
           !url.absoluteString.hasPrefix(Self.webOrigin) {
            openExternal(url.absoluteString)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }
}
