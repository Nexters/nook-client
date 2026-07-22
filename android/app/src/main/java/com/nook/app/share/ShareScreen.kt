package com.nook.app.share

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.nook.app.share.model.mockGroups
import com.nook.app.share.ui.CollapsibleByIme
import com.nook.app.share.ui.ColorPalette
import com.nook.app.share.ui.GroupRow
import com.nook.app.share.ui.InputField
import com.nook.app.share.ui.SheetButton
import com.nook.app.share.ui.noRippleClick

// 그룹 5개 이상이면 리스트를 232dp로 고정하고 스크롤 (시트 최대 높이 ~440)
private const val SCROLL_REGION_DP = 232
private const val SCROLL_THRESHOLD = 5

@Composable
fun ShareScreen(
    onSave: (Set<String>, String) -> Unit,
    onCreateGroup: (String, Int) -> Unit,
    onDismiss: () -> Unit,
) {
    var showCreate by remember { mutableStateOf(false) }
    val panelFraction = imePanelFraction()

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
            SheetHandle()
            if (showCreate) {
                CreateGroupContent(onCreateGroup)
            } else {
                SelectGroupContent(panelFraction, onSave, onCreateGroup = { showCreate = true })
            }
        }
    }
}

// 키보드(IME) 인셋의 실시간 높이로 패널 펼침 정도를 계산 → 키보드와 완전히 동기화.
// 반환값 1 = 펼침(키보드 닫힘), 0 = 접힘(키보드 열림).
@Composable
private fun imePanelFraction(): Float {
    val density = LocalDensity.current
    val keyboard =
        (WindowInsets.ime.getBottom(density) - WindowInsets.navigationBars.getBottom(density))
            .coerceAtLeast(0)
    var maxKeyboard by remember { mutableStateOf(0) }
    if (keyboard > maxKeyboard) maxKeyboard = keyboard
    return if (maxKeyboard > 0) 1f - keyboard.toFloat() / maxKeyboard else 1f
}

@Composable
private fun SheetHandle() {
    Box(
        Modifier
            .fillMaxWidth()
            .height(40.dp),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            Modifier
                .size(width = 48.dp, height = 4.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(Color(0xFFE4E6E9)),
        )
    }
}

@Composable
private fun SelectGroupContent(
    panelFraction: Float,
    onSave: (Set<String>, String) -> Unit,
    onCreateGroup: () -> Unit,
) {
    val selected = remember { mutableStateListOf<String>() }
    var memo by remember { mutableStateOf("") }

    // 키보드가 열리면 핸들 + 인풋만 남기고, 그룹 리스트는 키보드 인셋에 맞춰 실시간 접힘
    CollapsibleByIme(panelFraction) {
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
                onCreateGroup()
            }
            SheetButton("저장", primary = true, modifier = Modifier.weight(1f)) {
                onSave(selected.toSet(), memo)
            }
        }
    }
}

@Composable
private fun CreateGroupContent(onCreateGroup: (String, Int) -> Unit) {
    var newGroupName by remember { mutableStateOf("") }
    var selectedColor by remember { mutableStateOf(-1) }

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

@Preview(showBackground = true, backgroundColor = 0xFF888888, widthDp = 390, heightDp = 500)
@Composable
private fun ShareScreenPreview() {
    ShareScreen(onSave = { _, _ -> }, onCreateGroup = { _, _ -> }, onDismiss = {})
}
