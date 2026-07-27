package com.nook.app.share.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

// 그룹 목록 최상단의 "새 그룹 생성" 행
@Composable
fun CreateGroupRow(onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .height(56.dp)
            .noRippleClick(onClick),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        // 아이콘 좌측 패딩 10 → 리스트 컬럼 16 + 10 = 좌측에서 26
        NookIcon(
            name = NookIconName.Icon24Add,
            modifier = Modifier
                .padding(start = 10.dp)
                .size(24.dp),
        )
        Text(
            "새 그룹 생성",
            color = Color(0xFF67707D),
            style = suit(16, FontWeight.Medium),
        )
    }
}
