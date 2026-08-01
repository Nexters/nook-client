package com.nook.app.share.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun InputField(
    value: String,
    onChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    maxLength: Int = 25,
) {
    var focused by remember { mutableStateOf(false) }
    Box(
        modifier
            .height(52.dp)
            .clip(RoundedCornerShape(8.dp))
            .border(
                1.dp,
                if (focused) Color(0xFF1F1F1F) else Color(0xFFCACED4),
                RoundedCornerShape(8.dp),
            )
            .padding(horizontal = 16.dp, vertical = 10.dp),
        contentAlignment = Alignment.CenterStart,
    ) {
        val fieldStyle = suit(16, FontWeight.Medium).copy(color = Color(0xFF1F1F1F))
        Row(
            Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            BasicTextField(
                value = value,
                onValueChange = { if (it.length <= maxLength) onChange(it) },
                singleLine = true,
                textStyle = fieldStyle,
                modifier = Modifier
                    .weight(1f)
                    .onFocusChanged { focused = it.isFocused },
                decorationBox = { inner ->
                    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.CenterStart) {
                        if (value.isEmpty()) {
                            Text(placeholder, style = fieldStyle.copy(color = Color(0xFF99A0AC)))
                        }
                        inner()
                    }
                },
            )
            // Focus + 1자 이상일 때만 노출되는 지우기 버튼
            if (focused && value.isNotEmpty()) {
                NookIcon(
                    name = NookIconName.Icon24Delete,
                    modifier = Modifier
                        .size(24.dp)
                        .noRippleClick { onChange("") },
                )
            }
            // 글자수 카운터는 Focus 시에만 노출
            if (focused) {
                Text(
                    "${value.length}/$maxLength",
                    color = Color(0xFF99A0AC),
                    style = suit(12, FontWeight.Medium),
                )
            }
        }
    }
}
