package com.nook.app.share.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.nook.app.share.model.paletteColors

@Composable
fun ColorPalette(selectedIndex: Int, onSelect: (Int) -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 16.dp, bottom = 24.dp)
            .padding(horizontal = 20.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        paletteColors.forEachIndexed { index, color ->
            // 셀 28×28(칩 20 + 4dp 여유×2) 고정 → 선택돼도 레이아웃 안 밀림
            Box(
                Modifier
                    .size(28.dp)
                    .noRippleClick { onSelect(index) },
                contentAlignment = Alignment.Center,
            ) {
                // 선택 시 칩에서 4dp 떨어진 1px 사각 테두리(radius 없음)
                if (index == selectedIndex) {
                    Box(Modifier.matchParentSize().border(1.dp, Color(0xFF1F1F1F)))
                }
                // 칩: 20×20 사각형(radius 없음)
                Box(Modifier.size(20.dp).background(color))
            }
        }
    }
}
