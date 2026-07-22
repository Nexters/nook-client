package com.nook.app

import android.content.Intent
import android.graphics.Color as AndroidColor
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
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

class ShareActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // dim이 상태바·노치 영역까지 덮도록 edge-to-edge
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = AndroidColor.TRANSPARENT
        window.navigationBarColor = AndroidColor.TRANSPARENT

        val sharedText =
            if (intent?.action == Intent.ACTION_SEND) intent.getStringExtra(Intent.EXTRA_TEXT).orEmpty()
            else ""

        setContent {
            ShareOverlay(
                onSave = { groups, memo -> save(sharedText, groups, memo); finish() },
                onNewGroup = { openMainApp(sharedText); finish() },
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

    private fun openMainApp(text: String) {
        startActivity(
            Intent(this, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                putExtra("sharedText", text)
            },
        )
    }
}

// Android Studio에서 이 파일 열면 오른쪽 Split/Design 창에 실시간 미리보기 (빌드 불필요)
@Preview(showBackground = true, backgroundColor = 0xFF888888, widthDp = 390, heightDp = 500)
@Composable
private fun ShareOverlayPreview() {
    ShareOverlay(onSave = { _, _ -> }, onNewGroup = {}, onDismiss = {})
}

@Composable
private fun ShareOverlay(
    onSave: (Set<String>, String) -> Unit,
    onNewGroup: () -> Unit,
    onDismiss: () -> Unit,
) {
    val selected = remember { mutableStateListOf<String>() }
    var memo by remember { mutableStateOf("") }

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
                .clip(RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
                .background(Color.White)
                .navigationBarsPadding()
                .padding(top = 12.dp, bottom = 24.dp),
        ) {
            Box(
                Modifier
                    .align(Alignment.CenterHorizontally)
                    .padding(bottom = 12.dp)
                    .size(width = 48.dp, height = 4.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(Color(0xFFD9DCE1)),
            )

            // 그룹 5개 이상이면 스크롤 영역 232dp 고정 (시트 최대 높이 ~440)
            val listModifier =
                if (mockGroups.size >= SCROLL_THRESHOLD) Modifier.height(SCROLL_REGION_DP.dp)
                else Modifier
            Column(
                listModifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp),
            ) {
                mockGroups.forEach { group ->
                    val isSelected = selected.contains(group.id)
                    GroupRow(group, isSelected) {
                        if (isSelected) selected.remove(group.id) else selected.add(group.id)
                    }
                }
            }

            // 1개 이상 선택 시 메모 필드 노출
            if (selected.isNotEmpty()) {
                MemoField(
                    value = memo,
                    onChange = { memo = it },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .padding(top = 8.dp),
                )
            }

            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .padding(top = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                SheetButton("새 그룹 생성", primary = false, modifier = Modifier.weight(1f), onClick = onNewGroup)
                SheetButton("저장", primary = true, modifier = Modifier.weight(1f)) {
                    onSave(selected.toSet(), memo)
                }
            }
        }
    }
}

@Composable
private fun GroupRow(group: GroupItem, isSelected: Boolean, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(if (isSelected) Color(0xFFF3F4F6) else Color.Transparent)
            .noRippleClick(onClick)
            .padding(horizontal = 8.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(18.dp)
                .clip(RoundedCornerShape(5.dp))
                .background(group.color),
        )
        Text(
            group.name,
            color = Color(0xFF1A1A1A),
            fontSize = 16.sp,
            modifier = Modifier
                .weight(1f)
                .padding(start = 14.dp),
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
private fun MemoField(value: String, onChange: (String) -> Unit, modifier: Modifier) {
    Box(
        modifier
            .height(52.dp)
            .clip(RoundedCornerShape(12.dp))
            .border(1.dp, Color(0xFFD9DCE1), RoundedCornerShape(12.dp))
            .padding(horizontal = 16.dp),
        contentAlignment = Alignment.CenterStart,
    ) {
        BasicTextField(
            value = value,
            onValueChange = onChange,
            singleLine = true,
            textStyle = TextStyle(fontSize = 15.sp, color = Color(0xFF1A1A1A)),
            modifier = Modifier.fillMaxWidth(),
            decorationBox = { inner ->
                if (value.isEmpty()) {
                    Text("추가로 메모하고 싶은 내용이 있나요?", color = Color(0xFF9AA0A6), fontSize = 15.sp)
                }
                inner()
            },
        )
    }
}

@Composable
private fun SheetButton(text: String, primary: Boolean, modifier: Modifier, onClick: () -> Unit) {
    Box(
        modifier
            .height(52.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(if (primary) Color(0xFF1A1A1A) else Color(0xFFE5E6EA))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text,
            color = if (primary) Color.White else Color(0xFF5F6572),
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
