package com.nook.app.share.model

import androidx.compose.ui.graphics.Color

data class Group(val id: String, val name: String, val color: Color)

val mockGroups = listOf(
    Group("cafe", "카페", Color(0xFFF7D44C)),
    Group("cinema", "독립영화관", Color(0xFF4C9AF7)),
    Group("lpbar", "LP바", Color(0xFF2FA57B)),
    Group("saturday", "토요일 모임 장소", Color(0xFF8F7CF7)),
)

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
