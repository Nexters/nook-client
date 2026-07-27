import SwiftUI

enum SuitWeight: String {
    case regular = "SUIT-Regular"
    case medium = "SUIT-Medium"
    case semibold = "SUIT-SemiBold"
    case bold = "SUIT-Bold"
}

extension View {
    /// Android 의 suit(size, weight) 와 동일 규칙: 행간 150%, 자간 -2%.
    func suit(_ size: CGFloat, _ weight: SuitWeight) -> some View {
        font(.custom(weight.rawValue, size: size))
            .tracking(size * -0.02)
            .lineSpacing(size * 0.5)
    }
}

extension Font {
    static func suit(_ size: CGFloat, _ weight: SuitWeight) -> Font {
        .custom(weight.rawValue, size: size)
    }
}
