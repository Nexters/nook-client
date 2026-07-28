package com.nook.app.share.model

import androidx.compose.ui.graphics.Color

data class Group(val id: Long, val name: String, val color: Color)

// 화면이 fixture를 직접 참조하지 않도록 composition root에서만 사용하는 임시 데이터.
// 서버 연동 후 제거하고 ShareActivity에서 조회 결과를 ShareScreen에 주입한다.
val paletteColors = listOf(
    Color(0xFFF7D44C),
    Color(0xFFF76C5E),
    Color(0xFFF79FC4),
    Color(0xFFA98FF7),
    Color(0xFF4C9AF7),
    Color(0xFF2FC4B2),
    Color(0xFF2FA57B),
    Color(0xFF848B96),
)

val groupColorNames = listOf("YELLOW", "CORAL", "PINK", "PURPLE", "BLUE", "MINT", "GREEN", "GRAY")
fun groupColor(name: String): Color = paletteColors[groupColorNames.indexOf(name).takeIf { it >= 0 } ?: 7]
