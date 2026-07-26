package com.nook.app.share.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
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
            style = suit(16, FontWeight.Medium),
            modifier = Modifier
                .weight(1f)
                .padding(start = 16.dp),
        )
        NookIcon(
            name = if (isSelected) NookIconName.CheckBtnSelected else NookIconName.CheckBtnUnselected,
            modifier = Modifier.size(24.dp),
        )
    }
}
