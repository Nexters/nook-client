import SwiftUI

struct SheetHandle: View {
    var body: some View {
        Capsule()
            .fill(Color(hex: 0xE4E6E9))
            .frame(width: 48, height: 4)
            .frame(maxWidth: .infinity, minHeight: 40)
    }
}

struct GroupRow: View {
    let group: Group
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 0) {
                // 칩: 10×10 사각형(radius 없음)
                Rectangle()
                    .fill(group.color)
                    .frame(width: 10, height: 10)
                Text(group.name)
                    .font(.system(size: 16))
                    .foregroundColor(Color(hex: 0x1A1A1A))
                    .padding(.leading, 16)
                Spacer(minLength: 0)
                ZStack {
                    Circle()
                        .fill(isSelected ? Color(hex: 0x1A1A1A) : Color(hex: 0xE9E9EC))
                        .frame(width: 24, height: 24)
                    Image(systemName: "checkmark")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(isSelected ? .white : Color(hex: 0xC7C7CC))
                }
            }
            .padding(.horizontal, 16)
            .frame(maxWidth: .infinity, minHeight: 56, maxHeight: 56)
            .background(isSelected ? Color(hex: 0xF3F4F6) : Color.clear)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
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
                    // 선택 시 칩에서 4pt 떨어진 1px 사각 테두리(radius 없음)
                    if index == selectedIndex {
                        Rectangle()
                            .stroke(Color(hex: 0x1F1F1F), lineWidth: 1)
                            .frame(width: 28, height: 28)
                    }
                    // 칩: 20×20 사각형(radius 없음)
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

    var body: some View {
        ZStack(alignment: .leading) {
            if text.isEmpty {
                Text(placeholder)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(Color(hex: 0x99A0AC))
            }
            TextField("", text: $text)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(Color(hex: 0x1F1F1F))
                .focused(focused)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, minHeight: 52)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(focused.wrappedValue ? Color(hex: 0x1F1F1F) : Color(hex: 0xCACED4), lineWidth: 1)
        )
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
        Button(action: { if enabled { onTap() } }) {
            Text(text)
                .font(.system(size: 16, weight: primary ? .bold : .regular))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity, minHeight: 52)
                .background(RoundedRectangle(cornerRadius: 8).fill(background))
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
    }
}
