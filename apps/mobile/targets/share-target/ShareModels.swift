import SwiftUI

struct Group: Identifiable {
    let id: Int64
    let name: String
    let color: Color
}

// 화면이 fixture를 직접 참조하지 않도록 composition root에서만 사용하는 임시 데이터.
// 서버 연동 후 제거하고 ShareViewController에서 조회 결과를 ShareScreen에 주입한다.
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

let groupColorNames = ["YELLOW", "CORAL", "PINK", "PURPLE", "BLUE", "MINT", "GREEN", "GRAY"]

func groupColor(_ name: String) -> Color {
    let index = groupColorNames.firstIndex(of: name) ?? groupColorNames.count - 1
    return paletteColors[index]
}

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
