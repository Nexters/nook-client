import SwiftUI

struct Group: Identifiable {
    let id: String
    let name: String
    let color: Color
}

let mockGroups: [Group] = [
    Group(id: "cafe", name: "카페", color: Color(hex: 0xF7D44C)),
    Group(id: "cinema", name: "독립영화관", color: Color(hex: 0x4C9AF7)),
    Group(id: "lpbar", name: "LP바", color: Color(hex: 0x2FA57B)),
    Group(id: "saturday", name: "토요일 모임 장소", color: Color(hex: 0x8F7CF7)),
]

let paletteColors: [Color] = [
    Color(hex: 0xF7D44C),
    Color(hex: 0xF76C5E),
    Color(hex: 0xF79FC4),
    Color(hex: 0xA98FF7),
    Color(hex: 0x4C9AF7),
    Color(hex: 0x2FC4B2),
    Color(hex: 0x2FA57B),
    Color(hex: 0x848B96),
]

extension Color {
    // Android의 0xRRGGBB 값을 그대로 쓰기 위한 헬퍼 (RGB 반올림 오차 없이 스펙 일치)
    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255.0,
            green: Double((hex >> 8) & 0xFF) / 255.0,
            blue: Double(hex & 0xFF) / 255.0
        )
    }
}
