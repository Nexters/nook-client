import SwiftUI
import UIKit

// 새 아카이브 생성 행 + 아카이브 4개까지 노출(56*5=280), 초과 시 스크롤
private let scrollRegion: CGFloat = 280
private let dismissThreshold: CGFloat = 120
// ShareViewController.dismissDuration 과 같아야 딤과 시트가 함께 사라진다
private let dismissDuration: TimeInterval = 0.22

struct ShareScreen: View {
    let groups: [Group]
    let onSave: (Set<Int64>, String, @escaping (Bool) -> Void) -> Void
    let onCreateGroup: (String, Int, @escaping (Bool) -> Void) -> Void
    let onDismiss: () -> Void

    @StateObject private var keyboard = KeyboardMonitor()
    @State private var showCreate = false
    @State private var bottomInset: CGFloat = 0
    @State private var dragOffset: CGFloat = 0
    @State private var closing = false

    // 시트를 화면 밖으로 내리면서 종료를 알린다. 컨트롤러가 같은 길이로 딤을 걷고 화면을 감춘다.
    private func close() {
        guard !closing else { return }
        closing = true
        withAnimation(.easeIn(duration: dismissDuration)) {
            dragOffset = UIScreen.main.bounds.height
        }
        onDismiss()
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            // 딤은 ShareViewController 가 윈도우 배경으로 깔고, 여긴 탭 영역만 잡는다
            Color.clear
                .contentShape(Rectangle())
                .onTapGesture(perform: close)

            VStack(spacing: 0) {
                SheetHandle(
                    onDrag: { dragOffset = max(0, $0) },
                    onDragEnd: {
                        if dragOffset > dismissThreshold {
                            close()
                        } else {
                            withAnimation(.easeOut(duration: 0.2)) { dragOffset = 0 }
                        }
                    }
                )
                if showCreate {
                    CreateGroupContent(
                        panelFraction: keyboard.fraction,
                        onCreateGroup: onCreateGroup,
                        onBack: { showCreate = false }
                    )
                } else {
                    SelectGroupContent(
                        groups: groups,
                        panelFraction: keyboard.fraction,
                        onSave: onSave,
                        onNewGroup: { showCreate = true }
                    )
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.bottom, bottomInset)
            .background(Color.white)
            // 홈 인디케이터 영역까지 흰 배경만 확장(키보드 회피는 유지: .container 한정)
            .ignoresSafeArea(.container, edges: .bottom)
            .offset(y: dragOffset)
        }
        .background(SafeAreaReader { bottomInset = $0 })
        // 루트(ZStack)가 기본 safe area 레이아웃을 따르면 위 VStack의
        // .padding(.bottom, bottomInset)과 이중으로 겹쳐 CTA 버튼이 시안보다 훨씬
        // 아래로 밀린다. 진짜 인셋 값은 SafeAreaReader가 UIWindow에서 직접 읽으므로
        // 여기서 무시해도 값 손실이 없다.
        .ignoresSafeArea(.container, edges: .bottom)
    }
}

private struct SelectGroupContent: View {
    let groups: [Group]
    let panelFraction: CGFloat
    let onSave: (Set<Int64>, String, @escaping (Bool) -> Void) -> Void
    let onNewGroup: () -> Void

    @State private var selected: Set<Int64> = []
    @State private var memo: String = ""
    @State private var isSaving = false
    @FocusState private var memoFocused: Bool

    var body: some View {
        // 키보드가 열리면 핸들 + 인풋만 남기고, 리스트는 키보드 높이에 맞춰 실시간 접힘
        CollapsibleByKeyboard(fraction: panelFraction) {
            ScrollView {
                VStack(spacing: 0) {
                    CreateGroupRow(onTap: onNewGroup)
                    ForEach(groups) { group in
                        GroupRow(group: group, isSelected: selected.contains(group.id)) {
                            if selected.contains(group.id) { selected.remove(group.id) }
                            else { selected.insert(group.id) }
                        }
                    }
                }
                .padding(.horizontal, 16)
            }
            .frame(height: scrollRegion)
        }

        // 리스트와 메모 사이 8pt 간격 (접힘 영역 밖 → 280 = 56*5 순수 유지)
        Spacer().frame(height: 8)

        InputField(text: $memo, placeholder: "추가로 메모하고 싶은 내용이 있나요?", focused: $memoFocused)
            .padding(.horizontal, 16)
            .padding(.bottom, 12)
            .onAppear { memoFocused = false }

        CollapsibleByKeyboard(fraction: panelFraction) {
            SheetButton(
                text: isSaving ? "저장 중..." : "저장하기",
                primary: true,
                enabled: !selected.isEmpty && !isSaving
            ) {
                isSaving = true
                memoFocused = false
                onSave(selected, memo) { succeeded in
                    if !succeeded { isSaving = false }
                }
            }
                .padding(16)
        }
    }
}

private struct CreateGroupContent: View {
    let panelFraction: CGFloat
    let onCreateGroup: (String, Int, @escaping (Bool) -> Void) -> Void
    let onBack: () -> Void

    @State private var name: String = ""
    @State private var selectedColor: Int = -1
    @State private var isCreating = false
    @FocusState private var nameFocused: Bool

    var body: some View {
        CreateGroupHeader(onBack: onBack)

        Spacer().frame(height: 20)

        InputField(text: $name, placeholder: "새 아카이브명을 입력해주세요", focused: $nameFocused, maxLength: 20)
            .padding(.horizontal, 16)
            .padding(.bottom, 12)
            .onAppear { nameFocused = false }

        ColorPalette(selectedIndex: selectedColor) { selectedColor = $0 }

        CollapsibleByKeyboard(fraction: panelFraction) {
            SheetButton(
                text: "아카이브 만들기",
                primary: true,
                enabled: !name.trimmingCharacters(in: .whitespaces).isEmpty && selectedColor >= 0 && !isCreating
            ) {
                guard !isCreating else { return }
                isCreating = true
                onCreateGroup(name, selectedColor) { succeeded in
                    if !succeeded { isCreating = false }
                }
            }
            .padding(16)
        }
    }
}

// 새 아카이브 생성 화면 상단바: 좌측 뒤로가기 + 중앙 타이틀
private struct CreateGroupHeader: View {
    let onBack: () -> Void

    var body: some View {
        ZStack {
            Text("새 아카이브 생성")
                .suit(16, .semibold)
                .foregroundColor(Color(hex: 0x1F1F1F))
            HStack {
                NookIcon(name: .icon24Back)
                    .contentShape(Rectangle())
                    .onTapGesture(perform: onBack)
                Spacer()
            }
        }
        .padding(.horizontal, 16)
        .frame(maxWidth: .infinity, minHeight: 44, maxHeight: 44)
    }
}

// 홈 인디케이터 인셋을 1회 캡처(키보드 높이와 무관하게 고정).
// GeometryReader.safeAreaInsets 는 루트 뷰에 .ignoresSafeArea 를 걸면 함께 0으로
// 사라진다 — 루트가 이중으로 세이프에어리어를 피하는(자동 회피 + 아래 수동 padding)
// 문제를 .ignoresSafeArea 로 끄면서도 진짜 인셋 값은 그대로 읽으려면, SwiftUI 레이어를
// 거치지 않고 UIWindow.safeAreaInsets 를 직접 읽어야 한다.
private struct SafeAreaReader: UIViewRepresentable {
    let onRead: (CGFloat) -> Void

    func makeUIView(context: Context) -> ProbeView {
        let view = ProbeView()
        view.onChange = onRead
        return view
    }

    func updateUIView(_ uiView: ProbeView, context: Context) {}

    final class ProbeView: UIView {
        var onChange: ((CGFloat) -> Void)?

        override func didMoveToWindow() {
            super.didMoveToWindow()
            onChange?(window?.safeAreaInsets.bottom ?? 0)
        }
    }
}
