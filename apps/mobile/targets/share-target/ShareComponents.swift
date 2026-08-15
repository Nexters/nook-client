import SwiftUI

// 핸들을 아래로 끌면 시트가 손가락을 따라 내려가고, 놓을 때 임계값 넘으면 닫힌다
struct SheetHandle: View {
    let onDrag: (CGFloat) -> Void
    let onDragEnd: () -> Void

    var body: some View {
        Capsule()
            .fill(Color(hex: 0xE4E6E9))
            .frame(width: 48, height: 4)
            .frame(maxWidth: .infinity, minHeight: 40)
            .contentShape(Rectangle())
            // 시트가 따라 움직이면 local 좌표가 같이 밀려 떨림이 생긴다 → global 기준으로 측정
            .gesture(
                DragGesture(minimumDistance: 0, coordinateSpace: .global)
                    .onChanged { onDrag($0.translation.height) }
                    .onEnded { _ in onDragEnd() }
            )
    }
}

struct CreateGroupRow: View {
    let onTap: () -> Void

    var body: some View {
        HStack(spacing: 8) {
            NookIcon(name: .icon24Add)
                .padding(.leading, 10)
            Text("새 아카이브 생성")
                .suit(16, .medium)
                .foregroundColor(Color(hex: 0x67707D))
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, minHeight: 56, maxHeight: 56)
        .contentShape(Rectangle())
        .onTapGesture(perform: onTap)
    }
}

struct GroupRow: View {
    let group: Group
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        HStack(spacing: 0) {
            Rectangle()
                .fill(group.color)
                .frame(width: 10, height: 10)
            Text(group.name)
                .suit(16, .medium)
                .foregroundColor(Color(hex: 0x1A1A1A))
                .padding(.leading, 16)
            Spacer(minLength: 0)
            NookIcon(name: isSelected ? .checkBtnSelected : .checkBtnUnselected)
        }
        .padding(.horizontal, 16)
        .frame(maxWidth: .infinity, minHeight: 56, maxHeight: 56)
        .background(isSelected ? Color(hex: 0xF3F4F6) : Color.clear)
        .contentShape(Rectangle())
        .onTapGesture(perform: onTap)
    }
}

struct ColorPalette: View {
    let selectedIndex: Int
    let onSelect: (Int) -> Void

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(paletteColors.enumerated()), id: \.offset) { index, color in
                // 셀 28×28(칩 20 + 4pt 여유×2) 고정 → 선택돼도 레이아웃 안 밀림
                ZStack {
                    if index == selectedIndex {
                        Rectangle()
                            .stroke(Color(hex: 0x1F1F1F), lineWidth: 1)
                            .frame(width: 28, height: 28)
                    }
                    Rectangle()
                        .fill(color)
                        .frame(width: 20, height: 20)
                }
                .frame(width: 28, height: 28)
                .contentShape(Rectangle())
                .onTapGesture { onSelect(index) }
                if index < paletteColors.count - 1 { Spacer(minLength: 0) }
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .padding(.horizontal, 16)
        .padding(.bottom, 24)
    }
}

struct InputField: View {
    @Binding var text: String
    let placeholder: String
    var focused: FocusState<Bool>.Binding
    var maxLength: Int = 25
    @State private var isActivated = false

    var body: some View {
        HStack(spacing: 8) {
            ZStack(alignment: .leading) {
                if text.isEmpty {
                    Text(placeholder)
                        .suit(16, .medium)
                        .foregroundColor(Color(hex: 0x99A0AC))
                }
                if isActivated {
                    TextField("", text: $text)
                        .font(.suit(16, .medium))
                        .foregroundColor(Color(hex: 0x1F1F1F))
                        .focused(focused)
                        .onChange(of: text) { value in
                            if value.count > maxLength { text = String(value.prefix(maxLength)) }
                        }
                } else if !text.isEmpty {
                    Text(text)
                        .font(.suit(16, .medium))
                        .foregroundColor(Color(hex: 0x1F1F1F))
                }
            }
            if focused.wrappedValue && !text.isEmpty {
                NookIcon(name: .icon24Delete)
                    .onTapGesture { text = "" }
            }
            if focused.wrappedValue {
                Text("\(text.count)/\(maxLength)")
                    .suit(12, .medium)
                    .foregroundColor(Color(hex: 0x99A0AC))
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(focused.wrappedValue ? Color(hex: 0x1F1F1F) : Color(hex: 0xCACED4), lineWidth: 1)
        )
        .contentShape(Rectangle())
        .onTapGesture {
            guard !isActivated else { return }
            isActivated = true
            DispatchQueue.main.async { focused.wrappedValue = true }
        }
        .onAppear {
            isActivated = false
            focused.wrappedValue = false
        }
        .onDisappear {
            isActivated = false
            focused.wrappedValue = false
        }
    }
}

struct SheetButton: View {
    let text: String
    let primary: Bool
    var enabled: Bool = true
    let onTap: () -> Void

    private var background: Color {
        if !enabled { return Color(hex: 0xCACED4) }
        return primary ? Color(hex: 0x1F1F1F) : Color(hex: 0x848B96)
    }

    var body: some View {
        Text(text)
            .suit(16, primary ? .bold : .regular)
            .foregroundColor(.white)
            .frame(maxWidth: .infinity, minHeight: 52)
            .background(RoundedRectangle(cornerRadius: 8).fill(background))
            .contentShape(Rectangle())
            .onTapGesture { if enabled { onTap() } }
    }
}
