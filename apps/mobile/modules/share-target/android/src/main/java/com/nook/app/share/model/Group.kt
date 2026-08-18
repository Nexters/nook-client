package com.nook.app.share.model

import androidx.compose.ui.graphics.Color

data class Group(val id: Long, val name: String, val color: Color)

// 화면이 fixture를 직접 참조하지 않도록 composition root에서만 사용하는 임시 데이터.
// 서버 연동 후 제거하고 ShareActivity에서 조회 결과를 ShareScreen에 주입한다.
// 순서와 값은 웹의 아카이브 팔레트(apps/web/src/styles/global.css)를 그대로 따른다 — 공유시트에서 고른
// 색과 앱 목록에서 보이는 색이 달라지면 안 된다.
val paletteColors = listOf(
    Color(0xFFFFA30E),
    Color(0xFFFF7566),
    Color(0xFFFF8DBC),
    Color(0xFFA58AF2),
    Color(0xFF559BFF),
    Color(0xFF38C8C4),
    Color(0xFF2BAE7F),
    Color(0xFF738295),
)

val groupColorNames = listOf("YELLOW", "CORAL", "PINK", "PURPLE", "BLUE", "MINT", "GREEN", "GRAY")
fun groupColor(name: String): Color = paletteColors[groupColorNames.indexOf(name).takeIf { it >= 0 } ?: 7]
