# 공용 아이콘

Web, iOS Share Extension, Android Share Target에서 사용하는 디자인 아이콘은
`packages/icons`의 SVG를 원본(SSOT)으로 관리한다. 플랫폼별 생성 코드는 직접 수정하지 않는다.

## 구조

```text
packages/icons/
├── src/                         # 직접 수정하는 SVG 원본
│   └── <icon-name>.svg
├── generate.mjs                 # 플랫폼 코드 생성기
├── package.json
└── README.md

apps/web/src/shared/icons/
└── NookIcons.tsx                # React SVG 컴포넌트

apps/mobile/targets/share-target/
└── NookIcons.generated.swift    # SwiftUI Shape

apps/mobile/modules/share-target/android/src/main/java/com/nook/app/share/ui/
└── NookIcons.generated.kt       # Compose Canvas 아이콘
```

생성 파일은 네이티브 빌드와 Web 타입 검사가 생성기 실행 없이도 동작하도록 저장소에 커밋한다.
파일 상단에 `Do not edit directly`가 있으면 원본 SVG를 수정하고 다시 생성해야 한다.

## 아이콘 추가

1. `packages/icons/src`에 소문자 snake_case 이름으로 SVG를 추가한다. 크기를 이름에 포함하면
   생성 컴포넌트 이름에도 반영된다(예: `16_arrow_right.svg` → `Icon16ArrowRight`).
2. 아래 SVG 규칙을 확인한다.
3. 생성 명령을 실행한다.
4. 세 플랫폼에서 크기와 굵기를 확인한다.
5. SVG 원본과 생성 파일을 함께 커밋한다.

```bash
pnpm icons:generate
pnpm typecheck
```

예를 들어 `16_arrow_right.svg`는 다음 이름으로 생성된다.

| 플랫폼 | 생성 이름 |
| --- | --- |
| Web | `Icon16ArrowRight` |
| iOS | `.icon16ArrowRight` |
| Android | `NookIconName.Icon16ArrowRight` |

## SVG 규칙

생성기는 범용 SVG 변환기가 아니다. 세 플랫폼에서 결과를 동일하게 유지하는 데 필요한 SVG 요소만
지원한다.

- 양수 너비와 높이를 가진 `viewBox`를 사용한다. `24×24`로 고정하지 않는다.
- SVG의 `width`, `height`, `viewBox`는 플랫폼별 생성 코드에 보존된다. `width`와 `height`가
  없으면 `viewBox` 크기를 기본 표시 크기로 사용한다.
- 접근성과 Biome 검사를 위해 `<title>`을 넣는다.
- 도형은 `path`와 `circle`을 지원한다. `rect`와 `line`은 path로 변환한다.
- 경로 명령은 절대 좌표 `M`, `L`, `H`, `V`, `C`, `Q`, `Z`를 지원한다.
- `fill`, `fill-rule`, `stroke`, `stroke-width`, `stroke-linecap`은 생성 코드에 그대로 반영된다.
- 색상은 `#RRGGBB`, `white`, `black`, `none`을 지원한다.

```svg
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <title>Selected checkbox</title>
  <circle cx="12" cy="12" r="11" fill="#1F1F1F" />
  <path d="M7 12L10 15L17 9" stroke="white" stroke-width="1.5" />
</svg>
```

지원하지 않는 요소나 경로 명령을 사용하면 `pnpm icons:generate`가 실패한다. 필요한 SVG 기능은
생성기에 명시적으로 추가하고 세 플랫폼 출력을 함께 테스트한다.

## 플랫폼별 사용

### Web

```tsx
import { Icon24Add } from '@/shared/icons/NookIcons';

<Icon24Add size={24} />;
```

`size`는 아이콘 너비를 지정하며 원본 가로세로 비율을 유지한다. 너비와 높이를 각각 제어해야 하면
`width`와 `height`를 사용한다. 아무 값도 넘기지 않으면 SVG 원본의 `width`, `height`를 사용한다.

아이콘만 있는 버튼은 아이콘이 아니라 버튼에 `aria-label`을 지정한다.

### iOS Share Extension

```swift
NookIcon(name: .icon24Back)
```

아무 크기도 지정하지 않으면 SVG 원본 크기를 사용한다. `size`를 지정하면 해당 값을 너비로 삼고
원본 가로세로 비율에 맞춰 높이를 계산한다.

### Android Share Target

```kotlin
NookIcon(
    name = NookIconName.Icon24Back,
    modifier = Modifier.size(24.dp),
)
```

## 검증

생성 파일이 SVG 원본과 일치하는지만 확인하려면 다음 명령을 사용한다.

```bash
pnpm icons:check
```

`pnpm typecheck`는 먼저 `icons:check`를 실행한다. 원본만 바꾸고 생성하지 않았거나 생성 파일을 직접
수정했다면 검사에 실패한다.

플랫폼별 렌더링은 최종적으로 각 앱에서 확인한다. 특히 작은 크기에서는 SVG viewBox와 Canvas 배율
때문에 보이는 굵기가 달라질 수 있으므로 실제 기기에서 확인한다.

## 공용화하지 않는 이미지

다음 자산은 플랫폼 규격이 서로 달라 이 패키지에서 관리하지 않는다.

- iOS App Icon과 Android Adaptive Icon
- 스플래시 이미지
- 사진과 일러스트 같은 비트맵
- SVG 안에 비트맵을 포함한 프로필 이미지 같은 이미지형 자산
- 플랫폼 관습을 따라야 하는 시스템 아이콘

제품 UI에서 세 플랫폼의 모양이 같아야 하는 아이콘만 공용 SVG로 관리한다.
