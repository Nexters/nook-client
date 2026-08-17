import SwiftUI

struct Group: Identifiable {
    let id: Int64
    let name: String
    let color: Color
}

// 화면이 fixture를 직접 참조하지 않도록 composition root에서만 사용하는 임시 데이터.
// 서버 연동 후 제거하고 ShareViewController에서 조회 결과를 ShareScreen에 주입한다.
// 순서와 값은 웹의 아카이브 팔레트(apps/web/src/styles/global.css)를 그대로 따른다 — 공유시트에서 고른
// 색과 앱 목록에서 보이는 색이 달라지면 안 된다.
let paletteColors: [Color] = [
    Color(hex: 0xFFA30E),
    Color(hex: 0xFF7566),
    Color(hex: 0xFF8DBC),
    Color(hex: 0xA58AF2),
    Color(hex: 0x559BFF),
    Color(hex: 0x38C8C4),
    Color(hex: 0x2BAE7F),
    Color(hex: 0x738295),
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
