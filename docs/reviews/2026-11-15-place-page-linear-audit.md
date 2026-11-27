# 장소 페이지 기능정의 및 반영 차이

2026-11-15 확인. Linear nook 워크스페이스에서 작성자 `지우(jeewoo)`의 티켓을 조회하고, `/Users/moon/nook-client`의 현재 develop 및 로컬 프로토타입 수정본과 대조했다. 티켓 번호 오름차순이다. Linear 상태와 실제 코드 반영 여부는 별개로 기록했다. 실제 개발 서버 데이터/모바일 실기기/Figma 목표 비율은 검증하지 않았다.

## 기능정의 — 티켓 순서

| 티켓 | Linear 상태 | 기능 정의 | 현재 코드 및 필요한 작업 |
| --- | --- | --- | --- |
| [NOOK-319](https://linear.app/nooknook/issue/NOOK-319) | Done | 장소 리스트를 게시물 리스트 컴포넌트 기준으로 통일, 서브텍스트 SUIT | 기존 PlaceCard 사용. 새로 제작하지 않고 디자인 QA 기준으로 유지 |
| [NOOK-325](https://linear.app/nooknook/issue/NOOK-325) | Done | 장소 상세의 릴스 썸네일에 영상 표시, 이미지와 동일 프레임 | SavedPostTile/MediaBadge 경로가 존재. 영상 목 데이터와 실제 커버/크롭 추가 검증 필요 |
| [NOOK-326](https://linear.app/nooknook/issue/NOOK-326) | Done | 클러스터 선택 시 좌표 분포에 맞춰 필요한 깊이까지 확대 | zoomIntoCluster/zoomToFitSpan 구현. 분산된 샘플 좌표로 확대 시 분리 테스트 통과. 실지도 투영·겹침 검증 유지 |
| [NOOK-327](https://linear.app/nooknook/issue/NOOK-327) | Done | 선택 핀 강조, X·다른 핀·지도 빈 영역으로 선택 변경/해제 | 선택 핀 렌더 및 해제 경로 존재. NOOK-395의 검색 상태 보존과 함께 회귀 확인 |
| [NOOK-362](https://linear.app/nooknook/issue/NOOK-362) | In Progress | 직접 추가에서 기존 장소 선택 시 연결된 게시물 최초 6개 및 추가 로드 | PlaceDirectInputDrawer가 NO_CONNECTED_POSTS=[] 고정 사용. 검색 DTO existingPlaceId를 화면 모델로 전달하고 연결 게시물 조회·추가 로드 연동 필요. 직접 추가 화면의 연계 범위 |
| [NOOK-380](https://linear.app/nooknook/issue/NOOK-380) | Done | 최근 저장 장소를 마지막 데이터까지 추가 로드 | useInfiniteQuery/LoadMoreSentinel 존재. 로컬 30개도 20+10 페이지 확인 |
| [NOOK-382](https://linear.app/nooknook/issue/NOOK-382) | In Progress | 기존 이름/주소 검색에 사용자 메모·장소 태그 추가 | FE는 기존 검색 API 사용. 실제 서버 매칭 구현은 별도 확인 필요. 현재 목 검색은 이름·주소·카테고리만 검사하므로 메모·태그 샘플 검색도 추가 필요 |
| [NOOK-383](https://linear.app/nooknook/issue/NOOK-383) | In Review | 검색 포함 핀은 이미지, 미포함 주변 핀은 작은 원형. 결과 포함 장소는 스와이프 카드, 주변 장소는 단일 카드. 검색 맥락 유지 | outsideSearch 및 FloatingPlaceCards 분기 존재. 검색 API는 archiveFilter를 전달하지 않아 지도 필터와 결과 집합이 어긋날 여지. NOOK-431과 함께 실기기 검증 |
| [NOOK-384](https://linear.app/nooknook/issue/NOOK-384) | Todo | 카드 지역명 서울특별시→서울 통일, 카테고리·서울 순서 | 최근 장소는 dto.city를 그대로 전달하고 검색은 주소 첫 토큰 사용. PlaceCard는 지역·카테고리 순서. 정규화와 표시 순서를 티켓 기준으로 맞출 필요. 현재 샘플은 동네명을 city로 쓰므로 실제 지역 표기와도 구분 필요 |
| [NOOK-387](https://linear.app/nooknook/issue/NOOK-387) | In Review | 드래그 핸들·검색창·결과 수·필터 고정, 장소 목록만 스크롤. 검색 중에도 동일 | 일반 목록은 sticky 검색/필터 헤더가 있음. 검색 모드 overlay는 입력과 카드만 제공하며 건수·필터를 가림. 공통 고정 헤더 및 목록 스크롤 구조 정리 필요 |
| [NOOK-390](https://linear.app/nooknook/issue/NOOK-390) | Done | 2개 이상일 때 숫자 클러스터, 1개면 줌 무관 이미지 핀 | MapView에서 members.length===1을 개별 핀으로 렌더. 유지 대상 |
| [NOOK-391](https://linear.app/nooknook/issue/NOOK-391) | Todo | 공유 출처 소유자 프로필을 중복 제거해 최대 3개, +N 없음, 지도 필터와 연동 | 현재 RecentPlace/PlaceCard에 공유 소유자 프로필 목록이 없음. BE 응답 필드·FE 모델·아바타 스택·필터별 집계 필요. 내 장소와 중복이어도 공유 출처가 있으면 표시 |
| [NOOK-393](https://linear.app/nooknook/issue/NOOK-393) | Done | 최초 저장 이력 없을 때만 저장 안내 및 첫 저장 CTA | 기존 hasSaveHistory/빈 상태 분기 유지. 모든 데이터를 지운 기존 사용자와 신규 사용자 케이스를 분리 검증 |
| [NOOK-394](https://linear.app/nooknook/issue/NOOK-394) | Todo | 영업시간 데이터가 있으면 카드·상세에 표시, 없으면 잘못된 시간 표시 금지 | 상세는 openingHours/openNow 변환 및 PlaceInfo 연결이 있음. 목록 PlaceCard에는 영업시간 필드·렌더링이 없음. 실제 API 데이터 유무 확인 및 목록 노출 위치 디자인 확인 필요. 목 데이터는 영업시간이 없어 검증할 수 없음 |
| [NOOK-395](https://linear.app/nooknook/issue/NOOK-395) | Backlog | 지도 탭 시 최소 높이로 축소. 빈 검색은 종료, 입력한 검색어·결과·필터는 보존 | onEmptyMapClick가 selectedPlaceId가 있을 때만 연결됨. 선택 없는 목록/검색에서 축소·블러·빈 검색 종료 분기가 없음. 적용 후보이며 Backlog를 개발 확정으로 취급하지 않음 |
| [NOOK-408](https://linear.app/nooknook/issue/NOOK-408) | Done | 최신 장소 상세 컴포넌트, 전체 확장 전에도 주소 복사·외부 지도 이동 | PlaceDetail 축소/확장 경로에 해당 액션 존재. 검색 상세는 별도 플로팅 카드. 신규 구현보다 NOOK-431 QA 대상으로 유지 |
| [NOOK-419](https://linear.app/nooknook/issue/NOOK-419) | In Progress | 장소 0개·처리 완료·내 게시물 대상 비차단 인앱 배너와 게시물 보기 CTA | generated API에는 showBanner/unlinkedPostCount가 있으나 이를 소비하는 화면 코드가 없음. 배너 및 목록/장소 연결 경로 구현 필요. 11/3 변경으로 과거 주 1회 팝업 정책은 폐기됨. 배너 위치·닫기·재노출 정책은 티켓에서 아직 미확정 |
| [NOOK-422](https://linear.app/nooknook/issue/NOOK-422) | In Review | 검색 결과 아카이브 필터 탭을 검색창 아래 고정, 탭 가로 스크롤 및 선택 보존 | 현재 검색 패널에는 필터 탭 자체가 없음. NOOK-387의 필터 진입 버튼과 칩 탭의 최종 구조를 확정한 뒤 검색 결과/필터 API 배선 필요 |
| [NOOK-423](https://linear.app/nooknook/issue/NOOK-423) | Done | 동일 장소는 여러 게시물/아카이브에 속해도 지도 핀 1개 | fetchMapPins가 장소 id로 중복 제거. 다중 연결 샘플로 회귀 확인 |
| [NOOK-428](https://linear.app/nooknook/issue/NOOK-428) | Todo | 목록 썸네일의 시안 비율·cover·미디어 배지 및 빈/로딩 상태 일관성 | 현재 aspect-[167/208]과 object-cover가 존재. 티켓은 목표 비율 수치를 정하지 않았으므로 임의 변경 금지. 최신 Figma 대조 후 확정 |
| [NOOK-430](https://linear.app/nooknook/issue/NOOK-430) | In Progress | 기본 최신 순, 오래된 순, GPS 직선거리 가까운 순. 검색/필터 유지 및 위치 실패 시 기존 정렬 유지 | 생성 API 계약에는 sort/latitude/longitude가 있으나 useRecentPlaces/fetchRecentPlaces 및 목록 UI가 전달·제공하지 않음. 정렬 메뉴→쿼리 키→cursor 초기화→API 연동 필요. 목 데이터도 저장 시각 기준·안정적인 2차 정렬 보강 필요 |
| [NOOK-431](https://linear.app/nooknook/issue/NOOK-431) | Todo | 검색 선택 시 카드 잘림 없이 핀·지도·플로팅 카드 동기화 | 분기 및 FloatingPlaceCards는 존재. 티켓 자체가 런타임 표시 오류이므로 코드 존재만으로 완료 처리 불가. 375×812 및 iPhone에서 검색 진입·주변 핀·스와이프·뒤로가기·safe area 검증 우선 |

## 권장 반영 순서

1. 검색 헤더/필터 상태 통합: 387·422·383의 서로 다른 필터 표현과 현재 API 제약부터 정리.
2. 정렬 UI 및 상태/API 연결: 430. 검색/필터 통합 구조 위에서 검증.
3. 검색 상세 표시 QA: 431. 일반 상세와 검색 플로팅 카드 분기 및 375×812 검증.
4. 데이터 기반 표시: 391 소유자 프로필, 394 영업시간, 384 지역 표기, 382 메모·태그 검색.
5. 디자인 확정 후 428 썸네일 비율 반영.
6. 419 배너 미확정 정책을 닫고 반영. 395는 Backlog 적용 여부를 정한 뒤 진행.

공유 프로토타입에는 내 장소/공유 장소/복수 공유 소유자, 영업시간 있음·없음, 메모·태그 검색, 장소 없는 게시물, 위치 권한 실패, 검색 결과 0·1·여러 개를 포함해야 한다. 현재 30개 단일 소유자 목 데이터만으로는 위 정책을 검증할 수 없다.

## 공유

원하는 방식은 팀원이 로그인 없이 열고 조작하는 별도 미리보기 웹 링크다. localhost는 타인의 기기에서 열리지 않는다. 현재 목 어댑터는 DEV 전용이므로 일반 production build를 그대로 배포하면 목 모드가 꺼진다. 공유본은 별도 목 전용 빌드/진입점으로 구성하고 Linear 대상 이슈에 링크를 연결해야 한다. 아직 배포하거나 Linear 이슈를 변경하지 않았다.
