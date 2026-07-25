import SwiftUI

// 그룹 5개 이상이면 리스트를 232pt로 고정하고 스크롤 (시트 최대 높이 ~440)
private let scrollRegion: CGFloat = 232
private let scrollThreshold = 5

struct ShareScreen: View {
    let onSave: (Set<String>, String) -> Void
    let onCreateGroup: (String, Int) -> Void
    let onDismiss: () -> Void

    @State private var showCreate = false
    @State private var bottomInset: CGFloat = 0

    var body: some View {
        ZStack(alignment: .bottom) {
            Color.black.opacity(0.4)
                .ignoresSafeArea()
                .onTapGesture(perform: onDismiss)

            VStack(spacing: 0) {
                SheetHandle()
                if showCreate {
                    CreateGroupContent(onCreateGroup: onCreateGroup)
                } else {
                    SelectGroupContent(onSave: onSave, onNewGroup: { showCreate = true })
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.bottom, bottomInset)
            .background(Color.white)
            // 홈 인디케이터 영역까지 흰 배경만 확장(키보드 회피는 유지: .container 한정)
            .ignoresSafeArea(.container, edges: .bottom)
        }
        .background(SafeAreaReader { bottomInset = $0 })
    }
}

private struct SelectGroupContent: View {
    let onSave: (Set<String>, String) -> Void
    let onNewGroup: () -> Void

    @State private var selected: Set<String> = []
    @State private var memo: String = ""
    @FocusState private var memoFocused: Bool

    var body: some View {
        // 키보드가 열리면(메모 입력) 핸들 + 인풋만 남기고 리스트·버튼은 접힘
        if !memoFocused {
            groupList
        }

        if !selected.isEmpty {
            InputField(text: $memo, placeholder: "추가로 메모하고 싶은 내용이 있나요?", focused: $memoFocused)
                .padding(.horizontal, 16)
                .padding(.bottom, 12)
        }

        if !memoFocused {
            HStack(spacing: 12) {
                SheetButton(text: "새 그룹 생성", primary: false, onTap: onNewGroup)
                SheetButton(text: "저장", primary: true) { onSave(selected, memo) }
            }
            .padding(16)
        }
    }

    @ViewBuilder
    private var groupList: some View {
        let rows = VStack(spacing: 0) {
            ForEach(mockGroups) { group in
                GroupRow(group: group, isSelected: selected.contains(group.id)) {
                    if selected.contains(group.id) { selected.remove(group.id) }
                    else { selected.insert(group.id) }
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 8)

        if mockGroups.count >= scrollThreshold {
            ScrollView { rows }.frame(height: scrollRegion)
        } else {
            rows
        }
    }
}

private struct CreateGroupContent: View {
    let onCreateGroup: (String, Int) -> Void

    @State private var name: String = ""
    @State private var selectedColor: Int = -1
    @FocusState private var nameFocused: Bool

    var body: some View {
        InputField(text: $name, placeholder: "새 그룹명을 입력해주세요", focused: $nameFocused)
            .padding(.horizontal, 16)
            .padding(.bottom, 12)

        ColorPalette(selectedIndex: selectedColor) { selectedColor = $0 }

        HStack(spacing: 0) {
            SheetButton(
                text: "생성 후 저장",
                primary: true,
                enabled: !name.trimmingCharacters(in: .whitespaces).isEmpty && selectedColor >= 0
            ) {
                onCreateGroup(name, selectedColor)
            }
        }
        .padding(16)
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
