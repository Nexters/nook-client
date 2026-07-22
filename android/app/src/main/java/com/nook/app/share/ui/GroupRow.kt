package com.nook.app.share.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nook.app.share.model.Group

@Composable
fun GroupRow(group: Group, isSelected: Boolean, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .height(56.dp)
            .background(if (isSelected) Color(0xFFF3F4F6) else Color.Transparent)
            .noRippleClick(onClick)
            .padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(10.dp)
                .background(group.color),
        )
        Text(
            group.name,
            color = Color(0xFF1A1A1A),
            fontSize = 16.sp,
            modifier = Modifier
                .weight(1f)
                .padding(start = 16.dp),
        )
        Box(
            Modifier
                .size(24.dp)
                .clip(CircleShape)
                .background(if (isSelected) Color(0xFF1A1A1A) else Color(0xFFE9E9EC)),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                "✓",
                color = if (isSelected) Color.White else Color(0xFFC7C7CC),
                fontSize = 12.sp,
            )
        }
    }
}
