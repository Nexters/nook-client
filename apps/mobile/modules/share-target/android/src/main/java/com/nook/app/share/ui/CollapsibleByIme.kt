package com.nook.app.share.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.Layout
import kotlin.math.roundToInt

// fraction: 1 = 완전히 펼침, 0 = 접힘. 실제 높이를 측정해 fraction 만큼만 그려서(+페이드) 클리핑한다.
@Composable
fun CollapsibleByIme(fraction: Float, content: @Composable () -> Unit) {
    val f = fraction.coerceIn(0f, 1f)
    Layout(
        content = content,
        modifier = Modifier
            .clipToBounds()
            .graphicsLayer { alpha = f },
    ) { measurables, constraints ->
        val placeable = measurables.first().measure(constraints)
        val h = (placeable.height * f).roundToInt()
        layout(placeable.width, h) {
            placeable.place(0, 0)
        }
    }
}
