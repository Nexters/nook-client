import SwiftUI
import UIKit

/// 키보드 높이를 실시간으로 추적해 패널 펼침 정도(1 = 펼침, 0 = 접힘)를 계산한다.
/// Android 의 imePanelFraction() 과 동일한 규칙.
final class KeyboardMonitor: ObservableObject {
    @Published private(set) var fraction: CGFloat = 1

    private var maxHeight: CGFloat = 0

    init() {
        NotificationCenter.default.addObserver(
            forName: UIResponder.keyboardWillChangeFrameNotification,
            object: nil,
            queue: .main
        ) { [weak self] note in
            self?.update(with: note)
        }
        NotificationCenter.default.addObserver(
            forName: UIResponder.keyboardWillHideNotification,
            object: nil,
            queue: .main
        ) { [weak self] note in
            self?.apply(height: 0, note: note)
        }
    }

    private func update(with note: Notification) {
        guard let frame = note.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect else { return }
        let screenHeight = UIScreen.main.bounds.height
        apply(height: max(0, screenHeight - frame.origin.y), note: note)
    }

    private func apply(height: CGFloat, note: Notification) {
        if height > maxHeight { maxHeight = height }
        let next = maxHeight > 0 ? max(0, 1 - height / maxHeight) : 1
        let duration = note.userInfo?[UIResponder.keyboardAnimationDurationUserInfoKey] as? Double ?? 0.25
        // 키보드 애니메이션과 같은 곡선·길이로 접혀야 따로 노는 느낌이 없다
        withAnimation(.easeOut(duration: duration)) { fraction = next }
    }
}

/// 실제 높이를 재서 fraction 만큼만 그리고(+페이드) 잘라낸다. Android 의 CollapsibleByIme 와 동일.
struct CollapsibleByKeyboard<Content: View>: View {
    let fraction: CGFloat
    @ViewBuilder let content: Content

    @State private var fullHeight: CGFloat = 0

    var body: some View {
        let f = min(max(fraction, 0), 1)
        content
            .background(
                GeometryReader { geo in
                    Color.clear.onAppear { fullHeight = geo.size.height }
                }
            )
            .frame(height: fullHeight * f, alignment: .top)
            .opacity(f)
            .clipped()
    }
}
