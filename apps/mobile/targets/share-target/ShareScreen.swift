import SwiftUI

// 새 그룹 생성 행 + 그룹 4개까지 노출(56*5=280), 초과 시 스크롤
private let scrollRegion: CGFloat = 280
private let dismissThreshold: CGFloat = 120
// ShareViewController.dismissDuration 과 같아야 딤과 시트가 함께 사라진다
private let dismissDuration: TimeInterval = 0.22

struct ShareScreen: View {
    let groups: [Group]
    let onSave: (Set<String>, String) -> Void
    let onCreateGroup: (String, Int) -> Void
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
    }
}

private struct SelectGroupContent: View {
    let groups: [Group]
    let panelFraction: CGFloat
    let onSave: (Set<String>, String) -> Void
    let onNewGroup: () -> Void

    @State private var selected: Set<String> = []
    @State private var memo: String = ""
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

        CollapsibleByKeyboard(fraction: panelFraction) {
            SheetButton(text: "저장하기", primary: true, enabled: !selected.isEmpty) {
                onSave(selected, memo)
            }
                .padding(16)
        }
    }
}

private struct CreateGroupContent: View {
    let panelFraction: CGFloat
    let onCreateGroup: (String, Int) -> Void
    let onBack: () -> Void

    @State private var name: String = ""
    @State private var selectedColor: Int = -1
    @FocusState private var nameFocused: Bool

    var body: some View {
        CreateGroupHeader(onBack: onBack)

        Spacer().frame(height: 20)

        InputField(text: $name, placeholder: "새 그룹명을 입력해주세요", focused: $nameFocused)
            .padding(.horizontal, 16)
            .padding(.bottom, 12)

        ColorPalette(selectedIndex: selectedColor) { selectedColor = $0 }

        CollapsibleByKeyboard(fraction: panelFraction) {
            SheetButton(
                text: "그룹 만들기",
                primary: true,
                enabled: !name.trimmingCharacters(in: .whitespaces).isEmpty && selectedColor >= 0
            ) {
                onCreateGroup(name, selectedColor)
            }
            .padding(16)
        }
    }
}

// 새 그룹 생성 화면 상단바: 좌측 뒤로가기 + 중앙 타이틀
private struct CreateGroupHeader: View {
    let onBack: () -> Void

    var body: some View {
        ZStack {
            Text("새 그룹 생성")
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

// 홈 인디케이터 인셋을 1회 캡처(키보드 높이와 무관하게 고정)
private struct SafeAreaReader: View {
    let onRead: (CGFloat) -> Void

    var body: some View {
        GeometryReader { geo in
            Color.clear.onAppear { onRead(geo.safeAreaInsets.bottom) }
        }
    }
}
