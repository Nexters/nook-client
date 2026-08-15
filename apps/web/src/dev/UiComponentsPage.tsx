import { type ReactNode, useState } from 'react';
import logo from '@/assets/logo/header_logo.svg';
import type { Group } from '@/features/group';
import { CollectionCard, GroupCard, GroupCreateRow, GroupSelectRow } from '@/features/group';
import { MyMenuRow, MyMenuSection } from '@/features/my';
import type { Place } from '@/features/place';
import {
  PlaceCard,
  PlaceDetailHeader,
  PlaceInfo,
  PlacePhotos,
  PlacePhotoViewer,
  PlaceRow,
} from '@/features/place';
import type { Post } from '@/features/post';
import { OriginalPostLink, PostInfo, SavedPostCard, SavedPostContext } from '@/features/post';
import {
  Icon16Chat,
  Icon16Info,
  Icon16Insta,
  Icon16Paper,
  Icon16User,
  Icon16Version,
  Icon32GroupSelected,
  Icon32GroupUnselected,
  Icon32MapSelected,
  Icon32MapUnselected,
  Icon32MySelected,
  Icon32MyUnselected,
  Icon40Location,
  Icon44Error,
} from '@/shared/icons/NookIcons';
import { useToast } from '@/shared/toast';
import type { BottomMenuItem, GroupColor } from '@/shared/ui';
import {
  Avatar,
  BackButton,
  Badge,
  BottomMenu,
  Button,
  ButtonGroup,
  Carousel,
  Checkbox,
  ColorChip,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  FloatingButton,
  GROUP_COLORS,
  GroupTag,
  Header,
  Input,
  Popup,
  ShareButton,
  Snackbar,
  Thumbnail,
  Toast,
} from '@/shared/ui';

/**
 * 개발 전용 UI 확인 페이지 (`/dev/ui`, import.meta.env.DEV 에서만 라우트 등록).
 *
 * Storybook 을 대신해 `src/shared/ui` 의 공용 프리미티브를 한 화면에서 확인한다.
 * 섹션 구성은 Figma `Tabloid - 4 > Component` 의 라벨(Box Btn / Check Btn /
 * Floating Btn / Bottom menu / Popup / Input / Chips / Tag)을 그대로 따른다.
 *
 * - 실제 공용 컴포넌트를 직접 import (복제/Preview 파일 없음).
 * - 상태가 필요한 컴포넌트는 이 페이지 내부 로컬 state 로만 제어.
 * - API/서버/도메인 store 는 연결하지 않는다 (필요 데이터는 mock).
 */

/** 시안 `Header/54` (94:3986) 의 84x32 로고 */
function LogoMark() {
  return <img src={logo} alt="nook" className="h-8 w-[84px]" />;
}

// ── 페이지 내부 레이아웃 헬퍼 (공용 컴포넌트 아님, 이 페이지 전용) ──
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-gray-10 py-6">
      <h2 className="text-b1 font-semibold text-gray-100">{title}</h2>
      <div className="mt-4 flex flex-col gap-5">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-b3 text-gray-50">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

// Thumbnail/Avatar 확인용 mock 이미지. 네트워크 없이(WebView 오프라인) 뜨도록
// 외부 URL 대신 인라인 data URI 를 쓴다.
const SAMPLE_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
       <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
         <stop offset="0" stop-color="#38c8c4"/><stop offset="1" stop-color="#a58af2"/>
       </linearGradient></defs>
       <rect width="120" height="120" fill="url(#g)"/>
     </svg>`,
  );

/** 사진 태그(`n/6`)와 캐러셀을 확인하려면 여러 장이 필요하다 — 색만 다른 같은 도형. */
const SAMPLE_PHOTOS = ['#38c8c4', '#a58af2', '#f2a58a', '#8af2a5', '#f28ac8', '#c8f28a'].map(
  (color) =>
    `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="343" height="212"><rect width="343" height="212" fill="${color}"/></svg>`,
    )}`,
);

// 도메인 컴포넌트 확인용 mock. 실제 API/store 는 연결하지 않는다(룰 §3 도메인 섹션).
const MOCK_GROUP_FILLED: Group = {
  id: 1,
  name: '카페',
  color: 'yellow',
  placeCount: 112,
  thumbnails: Array.from({ length: 5 }, () => SAMPLE_IMAGE),
};
const MOCK_GROUP_EMPTY: Group = {
  id: 2,
  name: '서촌 놀거리',
  color: 'sky',
  placeCount: 0,
  thumbnails: [],
};
const MOCK_GROUP_LONG: Group = {
  id: 3,
  name: '이름이 아주 길어지는 그룹은 말줄임으로 잘립니다',
  color: 'purple',
  placeCount: 3,
};
const MOCK_GROUPS = [MOCK_GROUP_FILLED, MOCK_GROUP_EMPTY, MOCK_GROUP_LONG];

// 공개 그룹(다른 사람이 만든 것) — CollectionCard 용
const MOCK_COLLECTIONS: Group[] = [
  {
    id: 101,
    name: '지금 가기 좋은 초록뷰 카페',
    color: 'green',
    placeCount: 3,
    authorHandle: '@abcde',
    thumbnails: [SAMPLE_IMAGE],
  },
  {
    id: 102,
    name: '몰래 가려고 저장해둔 서울 카페인데 제목이 길면 잘립니다',
    color: 'sky',
    placeCount: 1,
    authorHandle: '@abcde',
    thumbnails: [SAMPLE_IMAGE],
  },
];

const MOCK_POST: Post = {
  id: 'post1',
  authorHandle: '@nook.official on instagram',
  sharedBy: 'by Purr',
  caption:
    '북적이는 성수에서 여유로운 카페를 찾고 있다면 망설임 없이 추천드릴 퍼머넌트해비탯🥛 ' +
    '성수는 사람이 많아서 카페를 잘 안 가게 되는데 여기는 통창 너머로 골목이 보여서 오래 앉아 있게 돼요.',
  images: Array.from({ length: 4 }, () => SAMPLE_IMAGE),
  originalUrl: 'https://example.com/post',
  thumbnail: SAMPLE_IMAGE,
};

const MOCK_PLACE: Place = {
  id: 'p1',
  name: '아이소',
  category: '카페',
  distance: '16.2km',
  address: '경기 용인시 처인구 양지읍 은이로 72',
  region: '서울',
  landmark: '서울대입구역 2번 출구',
  keywords: ['조용한', '정갈한', '혼밥', '친절한'],
  thumbnail: SAMPLE_IMAGE,
};
const MOCK_PLACE_NO_IMAGE: Place = {
  id: 'p2',
  name: '탐석과 사랑',
  category: '카페',
  distance: '16.2km',
  address: '경기 용인시 처인구 양지읍 은이로 72',
};
const MOCK_PLACE_LONG: Place = {
  id: 'p3',
  name: '이름이 아주 길어지는 장소는 한 줄로 말줄임 처리됩니다',
  category: '아주 긴 업종명도 잘립니다',
  address: '서울특별시 성동구 서울숲7길 9 4층 아주 긴 주소도 한 줄로 잘립니다',
};

// 앱 라우터(splat `/dev/ui/*`) 하위 경로를 가리켜, 탭을 눌러도 이 페이지에 머문다.
const NAV_ITEMS: BottomMenuItem[] = [
  {
    to: '/dev/ui',
    label: 'group',
    icon: <Icon32GroupUnselected />,
    activeIcon: <Icon32GroupSelected />,
    end: true,
  },
  {
    to: '/dev/ui/map',
    label: 'map',
    icon: <Icon32MapUnselected />,
    activeIcon: <Icon32MapSelected />,
  },
  {
    to: '/dev/ui/my',
    label: 'my',
    icon: <Icon32MyUnselected />,
    activeIcon: <Icon32MySelected />,
  },
];

export function UiComponentsPage() {
  const [selectedColor, setSelectedColor] = useState<GroupColor>('yellow');
  const [checked, setChecked] = useState(true);
  const [popupOpen, setPopupOpen] = useState(false);
  const [warningPopupOpen, setWarningPopupOpen] = useState(false);
  const [lastAction, setLastAction] = useState<string>('—');
  const [fabCount, setFabCount] = useState(0);
  const [groupName, setGroupName] = useState('초록뷰 카');
  const [selectedGroups, setSelectedGroups] = useState<number[]>([1]);
  const [bookmarked, setBookmarked] = useState<string[]>(['p1']);
  const [memo, setMemo] = useState('지우랑 가면 좋겠다');
  const [detailMemo, setDetailMemo] = useState('지우랑 가면 좋겠다');
  const [postMemo, setPostMemo] = useState('');
  const { showToast } = useToast();

  const toggleBookmark = (id: string, next: boolean) =>
    setBookmarked((prev) => (next ? [...prev, id] : prev.filter((item) => item !== id)));
  const [emptyMemo, setEmptyMemo] = useState('');
  const [photosOpen, setPhotosOpen] = useState(false);

  return (
    <main className="mx-auto max-w-2xl px-5 py-8 pb-24">
      <header>
        <h1 className="text-h1 text-gray-100">UI Components</h1>
        <p className="mt-1 text-b2 text-gray-60">
          공용 UI 컴포넌트(<code className="font-mono text-e2">src/shared/ui</code>)의 모양과 동작을
          확인합니다. 개발 환경 전용 페이지입니다.
        </p>
      </header>

      <Section title="Box Btn (Button)">
        <Row label="variant · size lg(52px)">
          <Button variant="primary" size="lg">
            생성 후 저장
          </Button>
          <Button variant="secondary" size="lg">
            새 그룹 생성
          </Button>
          <Button size="lg" disabled>
            Disabled
          </Button>
        </Row>
        <Row label="size md(44px)">
          <Button size="md">앱에서 보기</Button>
          <Button variant="secondary" size="md">
            취소
          </Button>
          <Button size="md" disabled>
            Disabled
          </Button>
        </Row>
        <Row label="variant warning — 파괴적 액션 전용">
          <Button variant="warning" size="md">
            삭제하기
          </Button>
          <Button variant="warning" size="lg">
            탈퇴하기
          </Button>
          <Button variant="warning" size="md" disabled>
            Disabled
          </Button>
        </Row>
        <Row label="size sm(36px)">
          <Button size="sm">앱에서 보기</Button>
          <Button variant="secondary" size="sm">
            취소
          </Button>
          <Button size="sm" disabled>
            Disabled
          </Button>
        </Row>
        <Row label="Icon + Text">
          <Button size="md">
            <Icon16Insta />
            원본 보기
          </Button>
        </Row>
        <Row label="fullWidth (Figma 343px 풀블리드)">
          <div className="w-full max-w-[343px]">
            <Button size="lg" fullWidth>
              생성 후 저장
            </Button>
          </div>
        </Row>
        <Row label="asChild (링크로 합성)">
          <Button asChild size="sm">
            <a href="#box-btn">Anchor 로 렌더</a>
          </Button>
        </Row>
      </Section>

      <Section title="ButtonGroup (2Button)">
        <Row label="size lg — 52px 버튼 2개, 간격 12">
          <div className="w-full max-w-[343px]">
            <ButtonGroup size="lg">
              <Button variant="secondary" size="lg">
                새 그룹 생성
              </Button>
              <Button size="lg">저장</Button>
            </ButtonGroup>
          </div>
        </Row>
        <Row label="size md — 44px 버튼 2개, 간격 8">
          <div className="w-full max-w-[248px]">
            <ButtonGroup size="md">
              <Button variant="secondary" size="md">
                취소
              </Button>
              <Button size="md">로그아웃</Button>
            </ButtonGroup>
          </div>
        </Row>
      </Section>

      <Section title="Checkbox (Check Btn)">
        <Row label={`controlled · 현재 ${checked ? 'Selected' : 'Unselected'}`}>
          <Checkbox
            checked={checked}
            onCheckedChange={(next) => setChecked(next === true)}
            aria-label="그룹 선택"
          />
          <span className="text-b2 text-gray-60">클릭해 상태를 전환합니다</span>
        </Row>
        <Row label="uncontrolled / disabled">
          <Checkbox defaultChecked aria-label="기본 선택됨" />
          <Checkbox aria-label="기본 해제됨" />
          <Checkbox disabled aria-label="비활성" />
        </Row>
      </Section>

      <Section title="Floating Btn">
        <Row label={`size lg(48px) · tone dark — Button/48_add (클릭 ${fabCount}회)`}>
          <FloatingButton floating={false} onClick={() => setFabCount((n) => n + 1)} />
          <FloatingButton floating={false} disabled />
        </Row>
        <Row label="size md(40px) · tone light — Button/40_location">
          {/* 흰 버튼이라 밝은 배경에선 안 보인다. 지도처럼 어두운 면 위에 얹어 확인한다. */}
          <div className="flex items-center gap-3 rounded-lg bg-gray-30 p-4">
            <FloatingButton
              floating={false}
              size="md"
              tone="light"
              aria-label="현위치로 이동"
              onClick={() => setFabCount((n) => n + 1)}
            >
              <Icon40Location />
            </FloatingButton>
            <FloatingButton floating={false} size="md" tone="light" disabled>
              <Icon40Location />
            </FloatingButton>
          </div>
        </Row>
        <p className="text-b3 text-gray-50">
          아래 우하단에 실제 <code className="font-mono text-e2">position: fixed</code> 로 떠 있는
          인스턴스가 하나 더 있습니다. 스크롤해도 따라오며 safe-area 를 피해 앉습니다.
        </p>
      </Section>

      <Section title="Bottom menu">
        <p className="text-b3 text-gray-50">
          <code className="font-mono text-e2">position: fixed</code> + NavLink 컴포넌트라, transform
          을 건 모바일 프레임(375px) 안에 고정을 가둬 확인합니다. 탭을 누르면
          <code className="font-mono text-e2"> /dev/ui</code> 하위 경로로 이동하며 이 페이지에 머문
          채 활성 상태가 전환됩니다.
        </p>
        {/* transform 이 걸린 조상은 자식 fixed 의 포함 블록이 되어 프레임 내부에 고정된다. */}
        <div
          className="relative mx-auto h-[360px] w-full max-w-[375px] overflow-hidden rounded-2xl border border-gray-20 bg-gray-10"
          style={{ transform: 'translateZ(0)' }}
        >
          <div className="p-4">
            <p className="text-b2 text-gray-60">모바일 뷰포트 미리보기</p>
          </div>
          <BottomMenu items={NAV_ITEMS} />
        </div>
      </Section>

      <Section title="Popup">
        <Row label={`열고 닫기 · 마지막 동작: ${lastAction}`}>
          <Button size="md" onClick={() => setPopupOpen(true)}>
            기본 팝업
          </Button>
          <Button variant="warning" size="md" onClick={() => setWarningPopupOpen(true)}>
            warning 팝업
          </Button>
        </Row>
        <p className="text-b3 text-gray-50">
          ESC / 취소 / 확인 으로 닫히고, 열려 있는 동안 포커스가 팝업 안에 갇히며 배경 스크롤이
          잠깁니다. AlertDialog 특성상 배경 딤 클릭으로는 닫히지 않습니다.
        </p>
        <Popup
          open={popupOpen}
          onClose={() => {
            setPopupOpen(false);
            setLastAction('닫힘(취소·ESC·배경)');
          }}
          onConfirm={() => setLastAction('로그아웃 확인')}
          title="로그아웃 하시겠어요?"
          description="로그아웃하면 로그인 화면으로 이동해요."
          cancelLabel="취소"
          confirmLabel="로그아웃"
        />
        <Popup
          open={warningPopupOpen}
          variant="warning"
          onClose={() => {
            setWarningPopupOpen(false);
            setLastAction('닫힘(취소·ESC)');
          }}
          onConfirm={() => setLastAction('탈퇴 확인')}
          title="탈퇴하시겠어요?"
          description="저장한 장소와 기록이 모두 삭제되고 복구할 수 없어요."
          cancelLabel="취소"
          confirmLabel="탈퇴하기"
        />
      </Section>

      <Section title="Drawer (vaul)">
        <Row label="트리거로 열고 닫기 (기본 modal 사용)">
          <Drawer>
            <DrawerTrigger asChild>
              <Button size="md">시트 열기</Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>목표 설정</DrawerTitle>
                <DrawerDescription>하루 활동 목표를 설정해요.</DrawerDescription>
              </DrawerHeader>
              <DrawerFooter>
                <Button size="md">저장</Button>
                <DrawerClose asChild>
                  <Button variant="secondary" size="md">
                    취소
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </Row>
        <p className="text-b3 text-gray-50">
          드래그·스냅·ARIA 는 vaul 이 담당하고, 여기선 색/여백 토큰만 우리 값으로 바꿨습니다. 지도
          위 비모달·스냅포인트 버전은{' '}
          <code className="font-mono text-e2">features/map/components/PlaceSheet</code> 참고.
        </p>
      </Section>

      <Section title="Input">
        <p className="text-b3 text-gray-50">
          시안의 Default/Focus/Typing/Filled 는 prop 이 아니라 실제 입력 상태에서 파생됩니다. 아래
          칸을 클릭해 포커스·입력해보면 네 상태가 그대로 나타납니다 — 글자수는 포커스 중에만, X
          버튼은 포커스 중 + 값이 있을 때만 보입니다.
        </p>
        <Row label="Scale=Large(52px) — Default / Filled / Disabled">
          <div className="flex w-full max-w-[343px] flex-col gap-2">
            <Input placeholder="새 그룹명을 입력해주세요" />
            <Input defaultValue="초록뷰 카페" />
            <Input placeholder="비활성" disabled />
          </div>
        </Row>
        <Row label="Scale=Small(44px)">
          <div className="flex w-full max-w-[343px] flex-col gap-2">
            <Input scale="sm" placeholder="새 그룹명을 입력해주세요" />
            <Input scale="sm" defaultValue="초록뷰 카페" />
          </div>
        </Row>
        <Row label={`Typing — onClear + maxLength (현재 ${groupName.length}자)`}>
          <div className="w-full max-w-[343px]">
            <Input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              onClear={() => setGroupName('')}
              maxLength={25}
              placeholder="새 그룹명을 입력해주세요"
            />
          </div>
        </Row>
        <Row label="maxLength 만 — 포커스 중에 X 버튼 없이 글자수만 (uncontrolled)">
          <div className="w-full max-w-[343px]">
            <Input scale="sm" maxLength={25} defaultValue="초록뷰" />
          </div>
        </Row>
      </Section>

      <Section title="Header">
        <p className="text-b3 text-gray-50">
          시안의 5개 variant 를 배경(variant) + 좌/제목/우 슬롯 조합으로 표현합니다. 로고는 애셋이라
          슬롯으로 받고, 뒤로가기·공유는 공용 BackButton / ShareButton 을 넣습니다.
        </p>
        <div className="flex flex-col gap-3">
          <Header
            variant="white"
            left={<LogoMark />}
            className="rounded-lg border border-gray-20"
          />
          <Header variant="gray" left={<LogoMark />} className="rounded-lg" />
          <Header
            variant="white"
            left={<BackButton />}
            title="새 그룹 생성"
            right={<ShareButton onClick={() => setLastAction('공유하기')} />}
            className="rounded-lg border border-gray-20"
          />
          <Header
            variant="white"
            left={<BackButton />}
            title="제목이 아주 길어지면 말줄임으로 잘리는지 확인합니다"
            right={<ShareButton onClick={() => setLastAction('공유하기')} />}
            className="rounded-lg border border-gray-20"
          />
          <Header size="bottom" left={<BackButton />} title="새 그룹 생성" />
        </div>
      </Section>

      <Section title="Toast / Snackbar">
        <Row label="Toast — 밝은 배경, 아이콘 슬롯 + 액션">
          <div className="w-full max-w-[343px]">
            <Toast
              icon={<Icon44Error />}
              action={
                <Button size="sm" onClick={() => setLastAction('토스트 로그인')}>
                  로그인
                </Button>
              }
            >
              로그인 해주세요
            </Toast>
          </div>
        </Row>
        <Row label="Snackbar — 어두운 반투명, 제목 + 설명 + 액션">
          {/* 반투명·blur 가 실제로 보이도록 패턴이 있는 배경 위에 얹는다. */}
          <div className="w-full max-w-[343px] rounded-xl bg-gray-20 p-3">
            <Snackbar
              title="위치를 찾지 못 했어요"
              description="게시물은 저장됐지만 지도에는 표시되지 않아요"
              action={
                <Button
                  size="sm"
                  className="bg-gray-0 text-gray-100 hover:bg-gray-10 active:bg-gray-10"
                  onClick={() => setLastAction('스낵바 수정하기')}
                >
                  수정하기
                </Button>
              }
            />
          </div>
        </Row>
        <Row label="Snackbar — description 없는 한 줄">
          <div className="w-full max-w-[343px] rounded-xl bg-gray-20 p-3">
            <Snackbar title="저장했어요" />
          </div>
        </Row>
        <Row label="useToast() — 실제 3초 소멸·스와이프 해제·큐 동작 확인용">
          <ButtonGroup>
            <Button
              size="sm"
              onClick={() =>
                showToast({
                  variant: 'description',
                  title: '위치를 찾지 못 했어요',
                  description: '게시물은 저장됐지만 지도에는 표시되지 않아요',
                })
              }
            >
              1. description
            </Button>
            <Button
              size="sm"
              onClick={() =>
                showToast({
                  variant: 'action',
                  title: '게시물 저장이 완료됐어요!',
                  actionLabel: '보러가기',
                  onAction: () => setLastAction('토스트 보러가기'),
                })
              }
            >
              2. action
            </Button>
            <Button
              size="sm"
              onClick={() =>
                showToast({
                  variant: 'undo',
                  title: '장소가 삭제 됐어요.',
                  onUndo: () => setLastAction('토스트 실행취소'),
                })
              }
            >
              3. undo
            </Button>
            <Button
              size="sm"
              onClick={() => showToast({ variant: 'simple', title: '지도에서 숨겼어요.' })}
            >
              4. simple
            </Button>
          </ButtonGroup>
        </Row>
      </Section>

      <Section title="GroupTag (Chip/Group_Tag)">
        <Row label="size lg(28px) — 라벨 B2">
          <GroupTag color="purple">밥집</GroupTag>
          <GroupTag color="green">카페</GroupTag>
          <GroupTag color="cement">아주 긴 그룹 이름도 한 줄로</GroupTag>
        </Row>
        <Row label="size sm(24px) — 라벨 B3">
          <GroupTag size="sm" color="yellow">
            카페
          </GroupTag>
          <GroupTag size="sm" color="red">
            밥집
          </GroupTag>
        </Row>
        <Row label="onClick 을 주면 button 으로 렌더된다 (모양은 동일)">
          <GroupTag color="blue" onClick={() => setLastAction('그룹 태그 클릭')}>
            눌러보기
          </GroupTag>
        </Row>
      </Section>

      <Section title="Chips (Chip_GroupColor)">
        <Row label={`8색 그룹 팔레트 · 클릭해 선택 (선택: ${selectedColor})`}>
          {/* 시안 간격 20px — 선택 테두리는 ring 이라 간격을 밀지 않는다. */}
          <div className="flex items-center gap-5">
            {GROUP_COLORS.map((color) => (
              <ColorChip
                key={color}
                color={color}
                selected={selectedColor === color}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>
        </Row>
      </Section>

      <Section title="Badge (Tag)">
        <Row label="number — Tag/24_Number (Roboto Mono 12, gray-70)">
          <Badge variant="number">99+</Badge>
          <Badge variant="number">12</Badge>
        </Row>
        <Row label="label — Tag/24_Kor (SUIT 12 Medium, gray-70)">
          <Badge variant="label">조용한</Badge>
          <Badge variant="label">뷰 맛집</Badge>
        </Row>
        <Row label="keyword — AI 요약 태그 (SUIT 12 Regular, gray-100)">
          <Badge variant="keyword">조용한</Badge>
          <Badge variant="keyword">뷰 맛집</Badge>
          <Badge variant="keyword">작업하기 좋은</Badge>
        </Row>
        <Row label="photo — 사진 태그 (SUIT 12 Medium, gray-0 / gray-100 80%)">
          <div className="flex size-24 items-end justify-end bg-gray-40 p-2">
            <Badge variant="photo">1/6</Badge>
          </div>
        </Row>
      </Section>

      <Section title="Thumbnail">
        <Row label="size lg(98px) — Default / Empty / Plus">
          <Thumbnail src={SAMPLE_IMAGE} alt="샘플 장소 사진" />
          <Thumbnail />
          <Thumbnail src={SAMPLE_IMAGE} alt="샘플 장소 사진" overflowCount={112} />
        </Row>
        <Row label="size sm(64px) — Thumbnail/60_img_x">
          <Thumbnail size="sm" src={SAMPLE_IMAGE} alt="샘플 장소 사진" />
          <Thumbnail size="sm" />
        </Row>
        <Row label="size fluid — 칸 너비를 채운다(3열 그리드 예시)">
          <div className="grid w-full grid-cols-3 gap-2">
            <Thumbnail size="fluid" src={SAMPLE_IMAGE} alt="샘플 장소 사진" />
            <Thumbnail size="fluid" src={SAMPLE_IMAGE} alt="샘플 장소 사진" />
            <Thumbnail size="fluid" src={SAMPLE_IMAGE} alt="샘플 장소 사진" overflowCount={7} />
          </div>
        </Row>
      </Section>

      <Section title="Carousel (캐러셀)">
        <p className="text-b3 text-gray-50">
          네이티브 scroll-snap 입니다. 가로로 밀면 스냅되고 하단 점이 따라옵니다. 슬라이드 크기는
          사용처가 정합니다 — 아래는 시안 기준 240x300. `initialIndex` 로 시작 위치를 정할 수
          있어(아래는 3번째부터) 그리드에서 고른 사진으로 확대뷰를 여는 데 쓴다.
        </p>
        <div className="mx-auto w-full max-w-[375px] rounded-lg border border-gray-20">
          <Carousel initialIndex={2}>
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className="h-[300px] w-60 overflow-hidden rounded-md border border-gray-20"
              >
                <img
                  src={SAMPLE_IMAGE}
                  alt={`샘플 ${index + 1}`}
                  className="size-full object-cover"
                />
              </div>
            ))}
          </Carousel>
        </div>
      </Section>

      <Section title="Avatar (Img/Profile)">
        <Row label="size lg(100px) — 이미지 / 기본 글리프 / 편집 배지">
          <Avatar src={SAMPLE_IMAGE} alt="프로필" />
          <Avatar />
          <Avatar onEdit={() => setLastAction('프로필 편집')} />
        </Row>
        <Row label="size sm(60px) — Img/60_Profile">
          <Avatar size="sm" src={SAMPLE_IMAGE} alt="프로필" />
          <Avatar size="sm" />
        </Row>
      </Section>

      <div className="mt-10 rounded-lg bg-gray-10 p-4">
        <h2 className="text-h2 text-gray-100">Feature components</h2>
        <p className="mt-1 text-b3 text-gray-60">
          <code className="font-mono text-e2">features/*/components</code> 의 도메인 컴포넌트입니다.
          mock props 로만 연결되어 있습니다.
        </p>
      </div>

      <Section title="group — GroupSelectRow / GroupCreateRow (List/Popup_Group)">
        <div className="mx-auto w-full max-w-[343px] overflow-hidden rounded-lg border border-gray-20">
          {/* 시안(28:1227) 조립 순서 — 생성 행이 맨 위 */}
          <GroupCreateRow onClick={() => setLastAction('새 그룹 생성')} />
          {MOCK_GROUPS.map((group) => (
            <GroupSelectRow
              key={group.id}
              group={group}
              selected={selectedGroups.includes(group.id)}
              onSelectedChange={(next) =>
                setSelectedGroups((prev) =>
                  next ? [...prev, group.id] : prev.filter((id) => id !== group.id),
                )
              }
            />
          ))}
        </div>
        <p className="text-b3 text-gray-50">
          행 전체가 체크박스입니다. 이름을 눌러도 토글되고 Tab/Space 로도 동작합니다.
        </p>
      </Section>

      <Section title="group — GroupCard (List/Home_Group)">
        <div className="mx-auto flex w-full max-w-[343px] flex-col gap-2">
          {/* Default: 썸네일 5장 → 3칸 + 마지막에 +2 */}
          <GroupCard group={MOCK_GROUP_FILLED} onClick={() => setLastAction('그룹 카드')} />
          {/* Empty: 썸네일 없음 */}
          <GroupCard group={MOCK_GROUP_EMPTY} />
          <GroupCard group={MOCK_GROUP_LONG} />
        </div>
      </Section>

      <Section title="place — PlaceRow (List/64_Place)">
        <div className="mx-auto flex w-full max-w-[343px] flex-col gap-4">
          {[MOCK_PLACE, MOCK_PLACE_NO_IMAGE, MOCK_PLACE_LONG].map((place) => (
            <PlaceRow
              key={place.id}
              place={place}
              bookmarked={bookmarked.includes(place.id)}
              onBookmarkedChange={(next) => toggleBookmark(place.id, next)}
              onClick={() => setLastAction(`장소: ${place.name}`)}
            />
          ))}
        </div>
        <p className="text-b3 text-gray-50">
          두 번째 행은 thumbnail 이 없어 시안의 <code className="font-mono text-e2">Image_x</code>{' '}
          로 파생됩니다. 별은 행 본문과 별개의 액션입니다.
        </p>

        <div className="mx-auto flex w-full max-w-[343px] flex-col gap-4">
          <PlaceRow
            place={MOCK_PLACE}
            bookmarked={bookmarked.includes(MOCK_PLACE.id)}
            onBookmarkedChange={(next) => toggleBookmark(MOCK_PLACE.id, next)}
            onDelete={() => setLastAction(`장소 삭제 요청: ${MOCK_PLACE.name}`)}
          />
        </div>
        <p className="text-b3 text-gray-50">
          onDelete 를 넘긴 행은 왼쪽으로 밀면 삭제 버튼이 나옵니다(확인 모달은 사용처 책임).
        </p>
      </Section>

      <Section title="place — PlaceInfo (장소 info)">
        <div className="mx-auto flex w-full max-w-[343px] flex-col gap-6">
          {/* 메모 O — 수정 누르면 그 자리에서 편집, Enter/바깥클릭 저장, Esc 취소 */}
          {/* 거리 prefix + 주소 복사 버튼(onAddressCopied 를 넘겼을 때만 생긴다) */}
          <PlaceInfo
            address="서울 성동구 서울숲7길 9 4층"
            distance="4.6km"
            onAddressCopied={() => setLastAction('주소 복사됨')}
            businessStatus="영업중"
            businessHours="11:00 - 19:30"
            memo={memo}
            onMemoChange={(next) => {
              setMemo(next);
              setLastAction(`메모 저장: ${next || '(비움)'}`);
            }}
          />
          {/* 메모 X — 비어 있으면 "작성" */}
          <PlaceInfo
            address="서울 성동구 서울숲7길 9 4층"
            businessStatus="영업중"
            businessHours="11:00 - 19:30"
            memo={emptyMemo}
            onMemoChange={(next) => {
              setEmptyMemo(next);
              setLastAction(`메모 저장: ${next || '(비움)'}`);
            }}
          />
          {/* 주소·영업시간 없이 메모 줄만 */}
          {/* onMemoChange 없음 → 읽기 전용 */}
          <PlaceInfo memo="주소와 영업시간이 없으면 그 줄은 통째로 빠집니다" />
        </div>
      </Section>

      <Section title="place — PlacePhotos (장소 사진)">
        <p className="text-b3 text-gray-50">
          대표 썸네일 + photoUrls. 여러 장일 때만 우상단에 `2/6` 사진 태그가 붙고, 프레임(212px)을
          넘는 사진은 잘려 보입니다. 누르면 전체보기(2열 그리드 → 확대뷰)가 열립니다.
        </p>
        <div className="mx-auto flex w-full max-w-[343px] flex-col gap-6">
          <PlacePhotos photos={SAMPLE_PHOTOS} onPhotoClick={() => setPhotosOpen(true)} />
          {/* 1장이면 캐러셀도 사진 태그도 없다 */}
          <PlacePhotos photos={[SAMPLE_IMAGE]} />
          {/* 사진이 없으면 같은 크기의 빈 프레임 */}
          <PlacePhotos photos={[]} />
        </div>
        {photosOpen ? (
          <PlacePhotoViewer
            title="퍼머넌트해비탯"
            photos={SAMPLE_PHOTOS}
            onClose={() => setPhotosOpen(false)}
          />
        ) : null}
      </Section>

      <Section title="place — PlaceCard (장소 카드)">
        <p className="text-b3 text-gray-50">
          시안 폭 167.5px 는 (343 - gap 8) / 2 라서, 카드는 w-full 이고 열 수는 부모 그리드가
          정합니다.
        </p>
        <div className="mx-auto grid w-full max-w-[343px] grid-cols-2 gap-2">
          <PlaceCard place={MOCK_PLACE} onClick={() => setLastAction('장소 카드')} />
          <PlaceCard place={MOCK_PLACE_LONG} />
        </div>
      </Section>

      <Section title="place — PlaceDetailHeader (업체 정보)">
        <p className="text-b3 text-gray-50">
          같은 헤더를 세 화면이 공유합니다. 바텀시트를 끌어올리면 1 → 2 로 이어지므로 컴포넌트를
          쪼개지 않고 <code className="font-mono text-e2">info</code> 슬롯 유무로 나눕니다. 즐겨찾기
          별은 세 경우 모두 실제로 토글됩니다.
        </p>

        <Row label="1. 바텀시트(접힘) — 상세 정보 없음">
          <div className="w-full max-w-[343px] rounded-lg border border-gray-20 p-4">
            <PlaceDetailHeader
              place={MOCK_PLACE}
              bookmarked={bookmarked.includes(MOCK_PLACE.id)}
              onBookmarkedChange={(next) => toggleBookmark(MOCK_PLACE.id, next)}
            />
          </div>
        </Row>

        <Row label="2. 풀페이지(끌어올림) — 상세 정보 노출">
          <div className="w-full max-w-[343px] rounded-lg border border-gray-20 p-4">
            <PlaceDetailHeader
              place={MOCK_PLACE}
              bookmarked={bookmarked.includes(MOCK_PLACE.id)}
              onBookmarkedChange={(next) => toggleBookmark(MOCK_PLACE.id, next)}
              info={
                <PlaceInfo
                  address="서울 성동구 서울숲7길 9 4층"
                  businessStatus="영업중"
                  businessHours="11:00 - 19:30"
                  memo={detailMemo}
                  onMemoChange={setDetailMemo}
                />
              }
            />
          </div>
        </Row>

        <Row label={`3. 위치를 찾지 못한 장소 — 마지막 동작: ${lastAction}`}>
          <div className="w-full max-w-[343px] rounded-lg border border-gray-20 p-4">
            <PlaceDetailHeader
              place={MOCK_PLACE_NO_IMAGE}
              recognized={false}
              bookmarked={bookmarked.includes(MOCK_PLACE_NO_IMAGE.id)}
              onBookmarkedChange={(next) => toggleBookmark(MOCK_PLACE_NO_IMAGE.id, next)}
              onAddInfo={() => setLastAction('정보 추가하기')}
            />
          </div>
        </Row>
      </Section>

      <Section title="post — SavedPostCard (저장된 게시물)">
        <div className="mx-auto w-full max-w-[375px] rounded-lg border border-gray-20">
          <SavedPostCard post={MOCK_POST} groups={[{ id: 1, name: '밥집', color: 'purple' }]} />
        </div>
        <p className="text-b3 text-gray-50">
          이미지 줄은 공용 Carousel(scroll-snap)이고, 본문은 2줄로 접힙니다. "더보기"로 펼칩니다.
        </p>
      </Section>

      <Section title="post — SavedPostContext / OriginalPostLink / PostInfo">
        <Row label="SavedPostContext — 장소 연결 화면 상단 안내 띠">
          <div className="w-full max-w-[343px]">
            <SavedPostContext post={MOCK_POST} />
          </div>
        </Row>
        <Row label="OriginalPostLink — 원본 보기 버튼 (외부 링크)">
          <div className="w-full max-w-[343px]">
            <OriginalPostLink
              label="@nook.official on instagram"
              onClick={() => setLastAction('원본 보기')}
            />
          </div>
        </Row>
        <Row label="PostInfo — 게시물 정보 (메모 O / 메모 X)">
          <div className="flex w-full max-w-[343px] flex-col gap-4">
            <PostInfo
              groups={[{ id: 1, name: '카페', color: 'yellow' }]}
              memo="지우랑 가면 좋겠다"
              onMemoChange={(next) => setLastAction(`게시물 메모: ${next}`)}
            />
            <PostInfo
              groups={[
                { id: 1, name: '밥집', color: 'purple' },
                { id: 2, name: '카페', color: 'yellow' },
              ]}
              memo={postMemo}
              onMemoChange={setPostMemo}
            />
            {/* onMemoEdit — 인라인 편집 대신 외부 편집기(게시물 상세의 메모 시트)를 여는 형태 */}
            <PostInfo
              groups={[{ id: 1, name: '카페', color: 'yellow' }]}
              memo="지우랑 가면 좋겠다"
              onMemoEdit={() => setLastAction('메모 편집 시트 열기')}
            />
          </div>
        </Row>
      </Section>

      <Section title="group — CollectionCard (List/2Line)">
        <p className="text-b3 text-gray-50">
          시안 <code className="font-mono text-e2">List/Thumbnail_2Lines</code> 는 이 카드를 2열로
          깐 그리드라 별도 컴포넌트가 아닙니다.
        </p>
        <div className="mx-auto grid w-full max-w-[343px] grid-cols-2 gap-2">
          {MOCK_COLLECTIONS.map((group) => (
            <CollectionCard
              key={group.id}
              group={group}
              onClick={() => setLastAction(`컬렉션: ${group.name}`)}
            />
          ))}
        </div>
      </Section>

      <Section title="my — MyMenuRow / MyMenuSection (List/My)">
        <p className="text-b3 text-gray-50">
          계정 정보(로그인 정보)와 앱 정보(버전·약관·문의) 두 영역으로 나뉩니다. onClick 을 준 행만
          화살표가 붙고 버튼이 됩니다.
        </p>
        <div className="mx-auto flex w-full max-w-[343px] flex-col gap-4">
          <MyMenuSection title="계정 정보">
            <MyMenuRow
              icon={<Icon16User />}
              label="로그인 정보"
              value="kakao"
              onClick={() => setLastAction('로그인 정보')}
            />
          </MyMenuSection>

          <MyMenuSection title="앱 정보">
            <MyMenuRow icon={<Icon16Version />} label="버전 정보" badge="최신버전" value="v1.0" />
            <MyMenuRow
              icon={<Icon16Info />}
              label="개인정보 처리방침"
              onClick={() => setLastAction('개인정보 처리방침')}
            />
            <MyMenuRow
              icon={<Icon16Paper />}
              label="이용약관"
              onClick={() => setLastAction('이용약관')}
            />
            <MyMenuRow
              icon={<Icon16Chat />}
              label="문의하기"
              onClick={() => setLastAction('문의하기')}
            />
          </MyMenuSection>
        </div>
      </Section>

      {/* 실제 floating 동작 확인용 인스턴스 */}
      <FloatingButton onClick={() => setFabCount((n) => n + 1)} aria-label="장소 추가" />
    </main>
  );
}
