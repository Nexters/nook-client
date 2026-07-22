package com.nook.app

import android.content.Intent
import android.graphics.Color as AndroidColor
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import kotlin.math.roundToInt
import org.json.JSONArray
import org.json.JSONObject

private data class GroupItem(val id: String, val name: String, val color: Color)

private val mockGroups = listOf(
    GroupItem("cafe", "카페", Color(0xFFF7D44C)),
    GroupItem("cinema", "독립영화관", Color(0xFF4C9AF7)),
    GroupItem("lpbar", "LP바", Color(0xFF2FA57B)),
    GroupItem("saturday", "토요일 모임 장소", Color(0xFF8F7CF7)),
)

private const val SCROLL_REGION_DP = 232
private const val SCROLL_THRESHOLD = 5

private val paletteColors = listOf(
    Color(0xFFF7D44C),
    Color(0xFFF76C5E),
    Color(0xFFF79FC4),
    Color(0xFFA98FF7),
    Color(0xFF4C9AF7),
    Color(0xFF2FC4B2),
    Color(0xFF2FA57B),
    Color(0xFF848B96),
)

class ShareActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // dim이 상태바·노치 영역까지 덮도록 edge-to-edge
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = AndroidColor.TRANSPARENT
        window.navigationBarColor = AndroidColor.TRANSPARENT
        // 키보드가 열리면 인풋이 그 위로 올라오도록 (imePadding과 함께 동작)
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)

        val sharedText =
            if (intent?.action == Intent.ACTION_SEND) intent.getStringExtra(Intent.EXTRA_TEXT).orEmpty()
            else ""

        setContent {
            ShareOverlay(
                onSave = { groups, memo -> save(sharedText, groups, memo); finish() },
                onCreateGroup = { name, colorIndex ->
                    saveNewGroup(sharedText, name, colorIndex)
                    finish()
                },
                onDismiss = { finish() },
            )
        }
    }

    private fun save(text: String, groups: Set<String>, memo: String) {
        try {
            val prefs = getSharedPreferences("nook_shares", MODE_PRIVATE)
            val pending = JSONArray(prefs.getString("pending", "[]"))
            pending.put(
                JSONObject().apply {
                    put("text", text)
                    put("groups", JSONArray(groups))
                    put("memo", memo)
                    put("savedAt", System.currentTimeMillis())
                },
            )
            prefs.edit().putString("pending", pending.toString()).apply()
        } catch (_: Exception) {
        }
    }

    private fun saveNewGroup(text: String, name: String, colorIndex: Int) {
        try {
            val prefs = getSharedPreferences("nook_shares", MODE_PRIVATE)
            val pending = JSONArray(prefs.getString("pending", "[]"))
            pending.put(
                JSONObject().apply {
                    put("text", text)
                    put("newGroupName", name)
                    put("newGroupColorIndex", colorIndex)
                    put("savedAt", System.currentTimeMillis())
                },
            )
            prefs.edit().putString("pending", pending.toString()).apply()
        } catch (_: Exception) {
        }
    }
}

// Android Studio에서 이 파일 열면 오른쪽 Split/Design 창에 실시간 미리보기 (빌드 불필요)
@Preview(showBackground = true, backgroundColor = 0xFF888888, widthDp = 390, heightDp = 500)
@Composable
private fun ShareOverlayPreview() {
    ShareOverlay(onSave = { _, _ -> }, onCreateGroup = { _, _ -> }, onDismiss = {})
}

@Composable
private fun ShareOverlay(
    onSave: (Set<String>, String) -> Unit,
    onCreateGroup: (String, Int) -> Unit,
    onDismiss: () -> Unit,
) {
    val selected = remember { mutableStateListOf<String>() }
    var memo by remember { mutableStateOf("") }
    var showCreate by remember { mutableStateOf(false) }
    var newGroupName by remember { mutableStateOf("") }
    var selectedColor by remember { mutableStateOf(-1) }

    // 키보드(IME) 인셋의 실시간 높이로 패널 펼침 정도를 계산 → 키보드와 완전히 동기화
    val density = LocalDensity.current
    val keyboard =
        (WindowInsets.ime.getBottom(density) - WindowInsets.navigationBars.getBottom(density))
            .coerceAtLeast(0)
    var maxKeyboard by remember { mutableStateOf(0) }
    if (keyboard > maxKeyboard) maxKeyboard = keyboard
    // 1 = 펼침(키보드 닫힘), 0 = 접힘(키보드 열림)
    val panelFraction = if (maxKeyboard > 0) 1f - keyboard.toFloat() / maxKeyboard else 1f

    Box(Modifier.fillMaxSize()) {
        Box(
            Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.4f))
                .noRippleClick(onDismiss),
        )

        Column(
            Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(Color.White)
                // 시트 내부 터치는 여기서 소비 → dim(뒷배경)으로 새서 닫히는 것 방지
                .noRippleClick {}
                .navigationBarsPadding()
                .imePadding(),
        ) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(40.dp),
                contentAlignment = Alignment.Center,
            ) {
                Box(ㅅ
                    Modifier
                        .size(width = 48.dp, height = 4.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(Color(0xFFE4E6E9)),
                )
            }

            if (!showCreate) {
                // 키보드가 열리면 핸들 + 인풋만 남기고, 그룹 리스트는 키보드 인셋에 맞춰 실시간 접힘
                CollapsibleByIme(panelFraction) {
                    // 그룹 5개 이상이면 스크롤 영역 232dp 고정 (시트 최대 높이 ~440)
                    val listModifier =
                        if (mockGroups.size >= SCROLL_THRESHOLD) Modifier.height(SCROLL_REGION_DP.dp)
                        else Modifier
                    Column(
                        listModifier
                            .fillMaxWidth()
                            .verticalScroll(rememberScrollState())
                            .padding(start = 16.dp, end = 16.dp, bottom = 8.dp),
                    ) {
                        mockGroups.forEach { group ->
                            val isSelected = selected.contains(group.id)
                            GroupRow(group, isSelected) {
                                if (isSelected) selected.remove(group.id) else selected.add(group.id)
                            }
                        }
                    }
                }

                // 1개 이상 선택 시 메모 필드 노출
                if (selected.isNotEmpty()) {
                    InputField(
                        value = memo,
                        onChange = { memo = it },
                        placeholder = "추가로 메모하고 싶은 내용이 있나요?",
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(start = 16.dp, end = 16.dp)
                            .padding(bottom = 12.dp),
                    )
                }

                CollapsibleByIme(panelFraction) {
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        SheetButton("새 그룹 생성", primary = false, modifier = Modifier.weight(1f)) {
                            showCreate = true
                        }
                        SheetButton("저장", primary = true, modifier = Modifier.weight(1f)) {
                            onSave(selected.toSet(), memo)
                        }
                    }
                }
            } else {
                // 새 그룹 생성 화면
                InputField(
                    value = newGroupName,
                    onChange = { newGroupName = it },
                    placeholder = "새 그룹명을 입력해주세요",
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 16.dp, end = 16.dp)
                        .padding(bottom = 12.dp),
                )

                ColorPalette(selectedColor) { selectedColor = it }

                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                ) {
                    SheetButton(
                        "생성 후 저장",
                        primary = true,
                        modifier = Modifier.weight(1f),
                        enabled = newGroupName.isNotBlank() && selectedColor >= 0,
                    ) {
                        onCreateGroup(newGroupName, selectedColor)
                    }
                }
            }
        }
    }
}

// fraction: 1 = 완전히 펼침, 0 = 접힘. 실제 높이를 측정해 fraction 만큼만 그려서(+페이드) 클리핑.
@Composable
private fun CollapsibleByIme(fraction: Float, content: @Composable () -> Unit) {
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

@Composable
private fun GroupRow(group: GroupItem, isSelected: Boolean, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .background(if (isSelected) Color(0xFFF3F4F6) else Color.Transparent)
            .noRippleClick(onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
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

@Composable
private fun ColorPalette(selectedIndex: Int, onSelect: (Int) -> Unit) {
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

@Composable
private fun InputField(
    value: String,
    onChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier,
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
        val fieldStyle = TextStyle(
            fontSize = 16.sp,
            fontWeight = FontWeight.Medium,
            letterSpacing = (-0.32).sp,
            lineHeight = 24.sp,
            color = Color(0xFF1F1F1F),
        )
        BasicTextField(
            value = value,
            onValueChange = onChange,
            singleLine = true,
            textStyle = fieldStyle,
            modifier = Modifier
                .fillMaxWidth()
                .onFocusChanged { focused = it.isFocused },
            decorationBox = { inner ->
                if (value.isEmpty()) {
                    Text(placeholder, style = fieldStyle.copy(color = Color(0xFF99A0AC)))
                }
                inner()
            },
        )
    }
}

@Composable
private fun SheetButton(
    text: String,
    primary: Boolean,
    modifier: Modifier,
    enabled: Boolean = true,
    onClick: () -> Unit,
) {
    val background = when {
        !enabled -> Color(0xFFCACED4)
        primary -> Color(0xFF1F1F1F)
        else -> Color(0xFF848B96)
    }
    Box(
        modifier
            .height(52.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(background)
            .then(if (enabled) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(10.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text,
            color = Color.White,
            fontSize = 16.sp,
            fontWeight = if (primary) FontWeight.Bold else FontWeight.Normal,
        )
    }
}

@Composable
private fun Modifier.noRippleClick(onClick: () -> Unit): Modifier =
    this.clickable(
        indication = null,
        interactionSource = remember { MutableInteractionSource() },
        onClick = onClick,
    )
