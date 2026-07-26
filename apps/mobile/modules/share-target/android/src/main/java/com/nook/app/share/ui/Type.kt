package com.nook.app.share.ui

import androidx.compose.ui.text.PlatformTextStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.LineHeightStyle
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.nook.app.share.R

val Suit = FontFamily(
    Font(R.font.suit_regular, FontWeight.Normal),
    Font(R.font.suit_medium, FontWeight.Medium),
    Font(R.font.suit_semibold, FontWeight.SemiBold),
    Font(R.font.suit_bold, FontWeight.Bold),
)

// 공통 텍스트 규칙: SUIT, 행간 150%, 자간 -2%, 폰트패딩 제거(광학 중앙정렬)
fun suit(size: Int, weight: FontWeight): TextStyle = TextStyle(
    fontFamily = Suit,
    fontSize = size.sp,
    fontWeight = weight,
    lineHeight = (size * 1.5f).sp,
    letterSpacing = (-0.02).em,
    platformStyle = PlatformTextStyle(includeFontPadding = false),
    lineHeightStyle = LineHeightStyle(
        alignment = LineHeightStyle.Alignment.Center,
        trim = LineHeightStyle.Trim.None,
    ),
)
