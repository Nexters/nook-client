package com.nook.app.share

import androidx.compose.animation.core.Animatable
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import kotlin.math.roundToInt
import kotlinx.coroutines.launch
import com.nook.app.share.model.Group
import com.nook.app.share.model.previewGroups
import com.nook.app.share.ui.CollapsibleByIme
import com.nook.app.share.ui.ColorPalette
import com.nook.app.share.ui.CreateGroupRow
import com.nook.app.share.ui.GroupRow
import com.nook.app.share.ui.InputField
import com.nook.app.share.ui.SheetButton
import com.nook.app.share.ui.noRippleClick
import com.nook.app.share.ui.suit

// 새 그룹 생성 행 + 그룹 4개까지 노출(56*5=280), 초과 시 스크롤. 새 그룹 생성 행도 스크롤에 포함.
private const val SCROLL_REGION_DP = 280

@Composable
fun ShareScreen(
    groups: List<Group>,
    onSave: (Set<String>, String) -> Unit,
    onCreateGroup: (String, Int) -> Unit,
    onDismiss: () -> Unit,
) {
    var showCreate by remember { mutableStateOf(false) }
    val panelFraction = imePanelFraction()

    val scope = rememberCoroutineScope()
    val offsetY = remember { Animatable(0f) }
    val dismissThreshold = with(LocalDensity.current) { 120.dp.toPx() }

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
                .offset { IntOffset(0, offsetY.value.roundToInt()) }
                .fillMaxWidth()
                .background(Color.White)
                // 시트 내부 터치는 여기서 소비 → dim(뒷배경)으로 새서 닫히는 것 방지
                .noRippleClick {}
                .navigationBarsPadding()
                .imePadding(),
        ) {
            SheetHandle(
                onDrag = { delta ->
                    scope.launch { offsetY.snapTo((offsetY.value + delta).coerceAtLeast(0f)) }
                },
                onDragEnd = {
                    if (offsetY.value > dismissThreshold) {
                        scope.launch {
                            offsetY.animateTo(2000f)
                            onDismiss()
                        }
                    } else {
                        scope.launch { offsetY.animateTo(0f) }
                    }
                },
            )
            if (showCreate) {
                CreateGroupContent(panelFraction, onCreateGroup, onBack = { showCreate = false })
            } else {
                SelectGroupContent(
                    groups,
                    panelFraction,
                    onSave,
                    onCreateGroup = { showCreate = true },
                )
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

// 핸들을 아래로 끌면 시트가 손가락을 따라 내려가고, 놓을 때 임계값 넘으면 닫힌다
@Composable
private fun SheetHandle(onDrag: (Float) -> Unit, onDragEnd: () -> Unit) {
    Box(
        Modifier
            .fillMaxWidth()
            .height(40.dp)
            .pointerInput(Unit) {
                detectVerticalDragGestures(onDragEnd = onDragEnd) { change, dragAmount ->
                    change.consume()
                    onDrag(dragAmount)
                }
            },
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
    groups: List<Group>,
    panelFraction: Float,
    onSave: (Set<String>, String) -> Unit,
    onCreateGroup: () -> Unit,
) {
    val selected = remember { mutableStateListOf<String>() }
    var memo by remember { mutableStateOf("") }

    // 키보드가 열리면 핸들 + 인풋만 남기고, 그룹 리스트는 키보드 인셋에 맞춰 실시간 접힘
    CollapsibleByIme(panelFraction) {
        Column(
            Modifier
                .fillMaxWidth()
                .heightIn(max = SCROLL_REGION_DP.dp)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
        ) {
            CreateGroupRow(onClick = onCreateGroup)
            groups.forEach { group ->
                val isSelected = selected.contains(group.id)
                GroupRow(group, isSelected) {
                    if (isSelected) selected.remove(group.id) else selected.add(group.id)
                }
            }
        }
    }

    // 리스트와 메모 사이 8dp 간격 (스크롤 영역 밖 → 280 = 56*5 순수 유지)
    Spacer(Modifier.height(8.dp))

    InputField(
        value = memo,
        onChange = { memo = it },
        placeholder = "추가로 메모하고 싶은 내용이 있나요?",
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 16.dp)
            .padding(bottom = 12.dp),
    )

    CollapsibleByIme(panelFraction) {
        SheetButton(
            "저장하기",
            primary = true,
            enabled = selected.isNotEmpty(),
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
        ) {
            onSave(selected.toSet(), memo)
        }
    }
}

@Composable
private fun CreateGroupContent(
    panelFraction: Float,
    onCreateGroup: (String, Int) -> Unit,
    onBack: () -> Unit,
) {
    var newGroupName by remember { mutableStateOf("") }
    var selectedColor by remember { mutableStateOf(-1) }

    CreateGroupHeader(onBack)

    Spacer(Modifier.height(20.dp))

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

    // 키보드 열리면 그룹 만들기 버튼 숨김
    CollapsibleByIme(panelFraction) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(16.dp),
        ) {
            SheetButton(
                "그룹 만들기",
                primary = true,
                modifier = Modifier.weight(1f),
                enabled = newGroupName.isNotBlank() && selectedColor >= 0,
            ) {
                onCreateGroup(newGroupName, selectedColor)
            }
        }
    }
}

// 새 그룹 생성 화면 상단바: 좌측 뒤로가기 + 중앙 타이틀, 요소는 상단 정렬
@Composable
private fun CreateGroupHeader(onBack: () -> Unit) {
    Box(
        Modifier
            .fillMaxWidth()
            .height(44.dp)
            .padding(horizontal = 16.dp),
    ) {
        NookIcon(
            name = NookIconName.Icon24Back,
            modifier = Modifier
                .align(Alignment.CenterStart)
                .size(24.dp)
                .noRippleClick(onBack),
        )
        Text(
            "새 그룹 생성",
            Modifier.align(Alignment.Center),
            color = Color(0xFF1F1F1F),
            style = suit(16, FontWeight.SemiBold),
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF888888, widthDp = 390, heightDp = 500)
@Composable
private fun ShareScreenPreview() {
    ShareScreen(
        groups = previewGroups,
        onSave = { _, _ -> },
        onCreateGroup = { _, _ -> },
        onDismiss = {},
    )
}
