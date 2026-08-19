import ExpoModulesCore
import ObjectiveC
import UIKit

public final class NookWebViewKeyboardModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NookWebViewKeyboard")
    OnCreate {
      WKContentViewAccessoryBarRemover.installOnce()
    }
  }
}

/**
 * WKWebView 안에서 `<input>`에 포커스가 가면 iOS 가 키보드 위에 자동으로 붙이는
 * "이전/다음/완료" 액세서리 바를 없앤다. 이 바는 페이지 콘텐츠가 아니라 WebKit 내부
 * 뷰(`WKContentView`)가 그리는 OS 크롬이라, 웹 쪽(CSS·JS)에서는 지울 방법이 없다 —
 * 우리 앱(WKWebView 셸) 안에서만 이 스위즐링으로 없앨 수 있다.
 *
 * `WKContentView` 는 비공개 클래스라 컴파일 타임에 타입으로 참조할 수 없어 런타임에
 * 클래스 이름으로 찾는다. iOS 메이저 업데이트로 WebKit 내부 구조가 바뀌어 클래스나
 * getter 를 못 찾으면 조용히 아무 일도 하지 않는다(원래 동작인 "바가 보임"으로
 * 남을 뿐 크래시하지 않는다).
 */
enum WKContentViewAccessoryBarRemover {
  private static var didInstall = false

  static func installOnce() {
    guard !didInstall else { return }
    didInstall = true

    guard let contentViewClass = NSClassFromString("WKContentView"),
      let method = class_getInstanceMethod(
        contentViewClass,
        #selector(getter: UIResponder.inputAccessoryView)
      )
    else { return }

    let removeAccessoryView: @convention(block) (AnyObject) -> UIView? = { _ in nil }
    method_setImplementation(method, imp_implementationWithBlock(removeAccessoryView))
  }
}
