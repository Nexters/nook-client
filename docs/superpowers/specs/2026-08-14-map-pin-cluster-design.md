# 지도 핀 시안 반영 — 클러스터 / 썸네일 핀 / 선택 핀

Figma: 줌아웃 [139-16698](https://www.figma.com/design/wbenqjif79rIoUGob7fFBU/Untitled?node-id=139-16698) · [139-16759](https://www.figma.com/design/wbenqjif79rIoUGob7fFBU/Untitled?node-id=139-16759) / 줌인 [139-16903](https://www.figma.com/design/wbenqjif79rIoUGob7fFBU/Untitled?node-id=139-16903) / 선택 컴포넌트 [139-16888](https://www.figma.com/design/wbenqjif79rIoUGob7fFBU/Untitled?node-id=139-16888) · 선택 화면 [139-16820](https://www.figma.com/design/wbenqjif79rIoUGob7fFBU/Untitled?node-id=139-16820)

## 무엇을 만드나

지도 핀이 줌 레벨에 따라 두 가지 모드로 갈린다.

| 줌 | 표시 |
| --- | --- |
| `< PIN_DETAIL_MIN_ZOOM` | **클러스터 버블** — 근처 북마크를 묶어 개수만 보여주는 44px 원 |
| `>= PIN_DETAIL_MIN_ZOOM` | **썸네일 핀** — 48px 장소 사진 + 이름표 |
| 선택된 핀 (줌 무관) | **선택 핀** — 파란 물방울 + 카테고리 아이콘 + 흰 이름표 |

지금은 줌과 무관하게 16px 색 사각형 하나뿐이고, 선택 시에만 썸네일 말풍선으로 바뀐다. 그 구현(`PlacePin.tsx`)은 통째로 교체된다.

## 시안에서 읽어낸 값

Figma 원시값은 전부 기존 토큰에 그대로 대응한다. 새 토큰은 필요 없다.

**클러스터 버블** (`139:16757`)
- 44px 정원, `bg-gray-90/85` (`rgba(53,60,70,0.85)` = `--color-gray-90` 85%)
- 개수: `text-b2 font-medium text-gray-0` (14px Medium, -0.02em)
- **줌아웃 시안 두 장 모두 인스턴스가 전부 44×44** — 개수에 따라 원이 커지지 않는다. 시안 상 "65"가 커 보이는 건 착시다.

**썸네일 핀** (`139:16951`)
- 사진 48px, `rounded-lg`(8px), `border-2 border-gray-0`, `shadow-[0_2px_10px_rgba(0,0,0,0.25)]`, `object-cover`
- 사진 ↔ 이름표 간격 6px
- 이름표: `bg-gray-90/85`, `px-2 py-1`, `rounded-md`(6px), `shadow-[0_2px_10px_rgba(0,0,0,0.2)]`
  - 6px 그룹 색상 정사각 + 6px 간격 + `text-s1 text-gray-10`

**선택 핀** (`139:16888`)
- 물방울 43×48, 안에 24px 흰 아이콘 (물방울 좌상단 기준 (9.42, 9.42))
- 이름표: `bg-gray-0`, `border border-gray-20`, `rounded-md`, `px-[7px] py-[3px]`, `drop-shadow-[0_2px_5px_rgba(0,0,0,0.1)]`
  - 6px 그룹 색상 정사각 + `text-s1 text-gray-100`

시안의 물방울은 `#559BFF`(= `--color-blue`) 단색이지만, jade 결정에 따라 **그룹 색상을 따른다**(`color: GroupColor`). 시안 샘플이 파란 그룹이었던 것으로 본다. 구현 방법은 아래 "아이콘 에셋" 참고.

## 좌표 기준점(앵커)

`CustomOverlay` 는 자식 엘리먼트의 중심을 좌표에 맞춘다. 지금 `PlacePin` 은 16px 상자를 중심 정렬해 **핀 한가운데**가 좌표였다.

새 시안은 **그래픽 아래변이 좌표에 오도록** 바꾼다.
- 물방울은 뾰족한 끝이 좌표를 가리켜야 한다 → 아래변 = 좌표
- 썸네일 핀의 사진도 높이가 똑같이 48px이라, 같은 규칙을 쓰면 **선택될 때 그래픽이 튀지 않는다**
- 이름표는 좌표 6px 아래에 `absolute` 로 띄운다 — 문서 흐름에 두면 이름 길이만큼 상자가 커지며 앵커가 밀린다(현재 코드에 이미 같은 주석이 있다)

컨테이너는 `relative h-0 w-0`, 그래픽은 `absolute bottom-0 left-1/2 -translate-x-1/2`, 이름표는 `absolute top-1.5 left-1/2 -translate-x-1/2`.

클러스터 버블만 예외로 44px 상자를 중심 정렬한다(무게중심 = 원 중심).

## 클러스터링 방식

**웹 메르카토르 픽셀 공간에서의 반경 병합 — 순수 함수.**

```ts
// features/map/pin-cluster.ts
export function clusterPins(pins: MapPin[], zoom: number): PinCluster[]
export interface PinCluster { key: string; lat: number; lng: number; pins: MapPin[] }
```

각 핀의 위경도를 메르카토르 정규 좌표로 바꾼 뒤 `256 * 2^zoom` 을 곱해 월드 픽셀을 얻고, 기준 핀(씨앗)에서 `CLUSTER_MERGE_RADIUS_PX` 안에 있는 핀을 흡수한다. 클러스터 좌표는 소속 핀의 무게중심.

- 지도 인스턴스에 의존하지 않는 순수 함수라 단위 테스트가 그대로 가능하다 (`place-sheet-layout.ts` / `.test.ts` 와 같은 결).
- 화면 픽셀과 같은 좌표계라 여기서 잰 거리가 사용자가 화면에서 보는 거리와 일치한다. 위경도 도(degree)로 재면 고위도에서 가로가 늘어난다.
- 새 의존성이 없다. bbox 조회는 화면 안 핀만 내려주므로 수십 개 수준이고, `supercluster` 같은 라이브러리는 과하다. O(n²) 이지만 그 규모에선 무시할 만하다 — 수천 개로 늘면 이웃 탐색을 인덱싱하면 된다.
- `naver.maps.MarkerClustering` 은 별도 스크립트인 데다 `naver.maps.Marker` 전용이라, React `CustomOverlay` 로 그리는 지금 구조와 맞지 않는다.

### 격자에서 반경으로 바꾼 이유

처음엔 화면을 `CLUSTER_CELL_SIZE_PX` 격자로 잘라 같은 칸끼리 묶었다. 그런데 격자는 **칸 경계가 사이를 지나가면 바로 붙어 있는 핀도 갈라놓는다.** 줌아웃해도 경계 위치만 바뀔 뿐 계속 재발해서, 아무리 축소해도 "1"짜리 버블이 남았다.

실제 계정 데이터(32곳)로 같은 줌에서 두 방식을 비교한 결과:

| 줌 | 격자 (버블 / 그중 1짜리) | 반경 (버블 / 그중 1짜리) |
| --- | --- | --- |
| 13 | 19 / 14 | 13 / 9 |
| 12 | 12 / 8 | 9 / 4 |
| 10 | 7 / 5 | 5 / 4 |
| 8 | 6 / 5 | 3 / 2 |
| 6 (최소 줌) | **29, 1, 1, 1** | **31, 1** |

최소 줌에서 격자는 `29,1,1,1`, 반경은 `31,1` 이다. 남는 하나는 부산 쪽에 홀로 있는 장소라 따로 남는 게 맞다 — 서울 덩어리에 합치면 버블이 대전 어딘가에 찍혀 위치가 거짓말이 된다.

**병합은 연쇄되지 않는다.** 씨앗 반경 안까지만 흡수하고, 흡수된 핀의 이웃을 다시 끌어오지는 않는다. 연쇄 병합(single-link)을 허용하면 촘촘히 이어진 점들을 타고 서울에서 부산까지 한 덩어리가 되어 무게중심이 아무도 없는 곳에 찍힌다.

**씨앗 순서는 좌표(y → x → id)로 고정한다.** 입력 배열 순서가 흔들려도 같은 그룹과 같은 `key` 가 나와야 React 가 버블을 불필요하게 다시 마운트하지 않고, 테스트도 결정적이 된다.

**규칙**
- 클러스터는 `zoom < PIN_DETAIL_MIN_ZOOM` 일 때만 만든다. 그 이상에서는 시안대로 썸네일 핀이 서로 겹쳐도 그대로 둔다(줌인 시안에 겹친 핀이 그려져 있다).
- 멤버가 1개인 클러스터도 버블로 그린다 — 줌아웃 시안에 "1" 버블이 있다.
- **선택된 핀은 클러스터에서 제외**하고 줌과 무관하게 항상 선택 핀으로 그린다. 선택한 장소가 버블 속에 숨는 일이 없어야 한다.

## 상수 (jade가 실시간으로 조정할 자리)

`features/map/constants.ts`

```ts
/** 이 줌 이상에서 개별 썸네일 핀, 미만에서 클러스터 버블. */
export const PIN_DETAIL_MIN_ZOOM = 14;

/** 클러스터 병합 반경(화면 픽셀). 키우면 더 넓게 묶인다. 지름은 이 값의 두 배까지. */
export const CLUSTER_MERGE_RADIUS_PX = 72;

/** 버블을 눌렀을 때 확대할 줌 단계. */
export const CLUSTER_ZOOM_STEP = 2;
```

`PIN_DETAIL_MIN_ZOOM = 14` 근거: 줌아웃 시안 두 장은 수도권 전체(≈9)와 서울 구 단위(≈12–13)이고, 줌인 시안은 건물명이 보이는 가로 단위(≈15–16)다. 그 사이인 14로 잡았다. 지도 기본 줌은 18.

`PIN_LABEL_MIN_ZOOM = 16` 은 **삭제**한다. 새 시안은 썸네일 핀에 이름표가 항상 붙어 있어 별도 임계값이 필요 없다. `PlacePin` 의 `showLabel` prop 도 같이 없어진다.

## 데이터 — 썸네일을 핀까지 내린다

지금 `GET /places/map` 은 이미 `thumbnailUrl` 을 내려주는데 `toMapPin()` 이 버리고 있다. 그래서 선택된 핀 하나의 사진만 상세 응답에서 따로 가져와 `MapView` 에 `selectedThumbnail` prop 으로 꽂는 우회로가 있다.

새 시안은 **모든 핀에 사진이 필요**하므로 매퍼에서 살린다.

```ts
// types.ts
export interface MapPin {
  id: number; lat: number; lng: number; name: string; color: GroupColor;
  thumbnail?: string;   // 추가
}
```

따라오는 정리:
- `MapView` 의 `selectedThumbnail` prop 삭제
- `MapPage` 가 상세 응답으로 만드는 임시 핀에 `thumbnail: selectedPlace.thumbnail` 추가

사진이 없는 핀은 48px 상자를 `bg-gray-10` + 공용 빈 썸네일 고스트(`@/assets/images/98_Group.svg`, `shared/ui/thumbnail.tsx` 가 쓰는 것)로 채운다. 테두리·라운드는 핀 것을 그대로 쓴다.

## 아이콘 에셋 — 물방울은 아이콘 파이프라인에 넣지 않는다

물방울 색을 그룹 색상으로 바꿔야 한다는 요구가 `packages/icons` 파이프라인과 맞지 않는다. 실제 생성기를 샌드박스에 복사해 jade가 준 SVG로 돌려서 확인했다.

1. **원본 그대로는 아예 생성이 안 된다** — `Error: 48_pin_selected.svg: malformed path`. path 에 지수 표기(`1.35259e-07`, `3.02305e-05`)가 있고 생성기의 토큰 정규식(`generate.mjs:21`)이 `e` 를 숫자로 못 읽는다.
2. **`fill="currentColor"` 도 거부된다** — `Error: Unsupported color: currentColor`. `parseColor`(`generate.mjs:89-96`)는 `none` / `white` / `black` / `#rrggbb` 만 받는다.
3. 이 파이프라인에는 **색을 바꿀 수단이 아예 없다.** 생성되는 `NookIconProps` 는 `size`/`width`/`height` 만 받고 모든 path 에 hex 가 박힌다. 저장소의 아이콘 60여 개 전부 색이 고정이고 런타임에 아이콘을 틴트하는 곳이 한 군데도 없다.
4. 색을 받게 고치려면 웹만이 아니라 **iOS·Android 생성기까지 같이** 손대야 한다 — SwiftUI 는 `Color(red:green:blue:)`, Compose 는 `Color(0xFF……)` 리터럴을 그대로 박아 넣는다. 지도 핀 하나 때문에 3플랫폼 코드 생성기를 바꾸는 건 비용이 안 맞는다.

**그래서 둘을 나눈다.**

**물방울 → 지도 feature 로컬 컴포넌트** (`components/SelectedPinMarker.tsx`)

jade가 준 path 를 그대로 쓰고 `fill="currentColor"` 로 두고, 색은 Tailwind 텍스트 색 클래스로 준다. `color: GroupColor` 필드로 조절된다.

```tsx
<svg viewBox="0 0 43 48" width={43} height={48} className={COLOR_TEXT_CLASS[color]}>
  <path d="M21.422 0C27.1034 …Z" fill="currentColor" />
</svg>
```

인라인 `<svg>` 지만 벡터를 지어낸 게 아니라 jade가 준 path 를 그대로 옮기는 것이고, 지도만 쓰는 마커 도형이라 공용 아이콘 세트에 둘 이유도 없다. 지수 표기는 브라우저가 정상 처리하므로 `0` 으로 고칠 필요도 없어진다(위 1번 문제는 파이프라인을 안 타면 사라진다).

`shared/ui/color-chip.tsx` 에 `COLOR_TEXT_CLASS` 를 추가한다 — `COLOR_BG_CLASS` 와 같은 리터럴 맵 컨벤션(Tailwind 가 클래스명을 정적으로 스캔해야 하므로 `text-${color}` 같은 템플릿 문자열은 쓰지 않는다).

```ts
export const COLOR_TEXT_CLASS: Record<GroupColor, string> = {
  yellow: 'text-yellow', red: 'text-red', pink: 'text-pink', purple: 'text-purple',
  blue: 'text-blue', sky: 'text-sky', green: 'text-green', cement: 'text-cement',
};
```

**안쪽 24px 글리프도 같은 파일에 둔다**

처음엔 흰색 고정이니 `packages/icons` 에 `24_teacup.svg` 로 넣을 생각이었는데, 아래 "밝은 색에서 글리프 뒤집기"가 확정되면서 **글리프도 런타임에 색이 바뀌어야** 한다. 그래서 물방울과 같은 이유로 파이프라인을 못 탄다. 결과적으로 `packages/icons` 변경은 아예 없다 — `icons:generate` 를 돌릴 일도, iOS/Android 생성 파일 diff 도 없다.

카테고리별 아이콘 교체는 API에 카테고리가 없어 범위 밖이다. `GLYPH_PATH` 상수 자리를 카테고리 → path 맵으로 바꾸면 되게 물방울과 분리해 뒀다.

## 밝은 색에서 글리프 뒤집기

물방울이 그룹 색상을 따르면 흰 글리프가 밝은 색 위에서 안 보인다. WCAG 대비율로 재면 8색 **전부** `gray-100` 이 유리하게 나와서(파랑도 white 2.79 : gray-100 5.90) 시안이 파랑에 흰 글리프를 쓴 것과 어긋난다 — 기준으로 쓸 수 없다.

CIE L\* (perceptual lightness)로 재면 깔끔하게 끊긴다.

| 색 | L\* | 글리프 |
| --- | --- | --- |
| yellow | 86.2 | `gray-100` |
| pink | 77.4 | `gray-100` |
| sky | 73.6 | `gray-100` |
| red | 65.7 | `gray-0` |
| blue | 63.8 | `gray-0` (시안 기준) |
| purple | 63.8 | `gray-0` |
| green | 63.6 | `gray-0` |
| cement | 53.8 | `gray-0` |

sky(73.6)와 red(65.7) 사이에 8포인트 갭이 있고 시안이 흰 글리프를 쓴 blue 가 아래쪽이라, 그 갭을 경계로 `yellow`·`pink`·`sky` 세 색만 뒤집는다(`SelectedPinMarker` 의 `LIGHT_PIN_COLORS`).

## 컴포넌트 구성

```
features/map/
  pin-cluster.ts            (신규) clusterPins + 메르카토르 격자
  pin-cluster.test.ts       (신규)
  constants.ts              PIN_DETAIL_MIN_ZOOM / CLUSTER_MERGE_RADIUS_PX / CLUSTER_ZOOM_STEP 추가, PIN_LABEL_MIN_ZOOM 삭제
  types.ts                  MapPin.thumbnail 추가
  api/index.ts              toMapPin 에 thumbnail 매핑
  components/
    ClusterBubble.tsx       (신규) 44px 개수 버블
    SelectedPinMarker.tsx   (신규) 물방울 + 카테고리 아이콘, color 로 틴트
    PlacePin.tsx            전면 교체 — 썸네일 핀 / 선택 물방울
    PlacePin.test.tsx       갱신
    MapView.tsx             줌으로 모드 분기, selectedThumbnail prop 제거
  MapPage.tsx               selectedThumbnail 전달 제거, 임시 핀에 thumbnail 추가

shared/ui/color-chip.tsx    COLOR_TEXT_CLASS 추가
```

`packages/icons` 는 건드리지 않는다(위 "아이콘 에셋" 참고).

`MapView` 렌더 분기:

```tsx
const selectedPin = pins.find((pin) => pin.id === selectedPlaceId);
const rest = pins.filter((pin) => pin.id !== selectedPlaceId);
const clustered = zoom < PIN_DETAIL_MIN_ZOOM;
// clustered ? clusterPins(rest, zoom).map(ClusterBubble) : rest.map(PlacePin)
// selectedPin 은 항상 PlacePin selected 로 따로 렌더
```

줌 값은 지금처럼 `onIdle` 시점 것만 쓴다 — 줌 제스처 중간값까지 따라가면 클러스터가 깜빡이며 재구성된다(현재 코드의 이름표 관련 주석과 같은 이유).

## 클러스터 탭 동작 — 시안에 없는 부분 (jade 승인)

시안에는 클러스터를 눌렀을 때가 없다. 누를 수 없으면 사용자는 핀치 줌으로만 파고들 수 있어 막다른 길이 된다.

버블을 누르면 클러스터 무게중심으로 `panTo` 하면서 `zoom + 2` 로 확대한다. 멤버가 많으면 몇 번 눌러 들어가게 된다. 구현은 `MapView` 안에서 지도 인스턴스로 직접 처리하므로 상위로 새 prop 이 생기지 않는다.

## 테스트

- `pin-cluster.test.ts` — 같은 칸 묶임 / 다른 칸 분리 / 무게중심 / 멤버 1개 / 줌이 커질수록 잘게 쪼개짐
- `PlacePin.test.tsx` — 썸네일 핀에 사진+이름 렌더 / 사진 없으면 플레이스홀더 / `selected` 면 사진 대신 물방울 / 물방울이 `color` 에 맞는 틴트 클래스를 받음
- `ClusterBubble.test.tsx` — 개수 렌더, 클릭 콜백

검증: `pnpm lint && pnpm typecheck && pnpm test` (`pnpm check` 는 API 스키마까지 본다)

시각 확인은 jade가 직접 — 특히 `PIN_DETAIL_MIN_ZOOM` 과 `CLUSTER_MERGE_RADIUS_PX` 를 만져보며 정한다.

## 하지 않는 것

- 카테고리별 아이콘 (API에 카테고리 없음)
- 클러스터 개수에 따른 버블 크기 변화 (시안이 고정 44px)
- 서버 사이드 클러스터링
- 줌인 상태에서의 핀 겹침 회피
