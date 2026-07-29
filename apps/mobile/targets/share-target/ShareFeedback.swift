import SwiftUI

enum ShareFeedbackKind {
    case login
    case network
    case privatePost
    case success

    var icon: NookIconName {
        switch self {
        case .login: return .icon44Error
        case .network: return .icon44Fail
        case .privatePost: return .icon44Lock
        case .success: return .icon44Success
        }
    }

    var message: String {
        switch self {
        case .login: return "로그인 해주세요"
        case .network: return "네트워크가 원활하지 않아요"
        case .privatePost: return "비공개 게시물은 저장할 수 없어요"
        case .success: return "공유 완료!"
        }
    }

    var actionTitle: String {
        switch self {
        case .login: return "로그인"
        case .network: return "다시하기"
        case .privatePost: return "확인"
        case .success: return "앱에서 보기"
        }
    }
}

struct ShareFeedbackOverlay: View {
    let kind: ShareFeedbackKind
    let onAction: () -> Void
    @State private var isActing = false

    var body: some View {
        ZStack(alignment: .bottom) {
            Color.clear

            HStack(spacing: 8) {
                HStack(spacing: 4) {
                    NookIcon(name: kind.icon)
                        .frame(width: 44, height: 44)

                    Text(kind.message)
                        .suit(14, .semibold)
                        .foregroundColor(Color(hex: 0x1F1F1F))
                        .lineLimit(1)
                        .minimumScaleFactor(0.85)
                }

                Spacer(minLength: 0)

                Button {
                    guard !isActing else { return }
                    isActing = true
                    onAction()
                } label: {
                    Text(kind.actionTitle)
                        .suit(14, .semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .frame(minHeight: 36, maxHeight: 36)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color(hex: 0x1F1F1F))
                        )
                }
                .buttonStyle(.plain)
                .disabled(isActing)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .frame(maxWidth: 343, minHeight: 60, maxHeight: 60)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.white)
                    .shadow(color: Color.black.opacity(0.16), radius: 8, y: 4)
            )
            .padding(.horizontal, 16)
            .padding(.bottom, 24)
        }
        .ignoresSafeArea()
    }
}
