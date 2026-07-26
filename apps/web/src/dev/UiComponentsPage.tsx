import { type ReactNode, useState } from 'react';
import type { BottomMenuItem, GroupColor } from '@/shared/ui';
import {
  Badge,
  BottomMenu,
  Button,
  ButtonGroup,
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
  Input,
  Popup,
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

// ── mock 아이콘 (dev 전용). lucide 미설치라 인라인 SVG 로 대체, currentColor 로
//    각 컴포넌트의 색상 토큰을 그대로 상속받는다. ──
function MapIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" strokeLinejoin="round" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}

function BookmarkIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M6 4h12v16l-6-4-6 4V4Z" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" strokeLinecap="round" />
    </svg>
  );
}

/** Figma `Button_Primary_44 > Property 1=Icon+Text` 확인용 16px 아이콘 */
function InstagramGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="12" height="12" rx="3.5" />
      <circle cx="8" cy="8" r="3" />
      <circle cx="11.6" cy="4.4" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
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

// 앱 라우터(splat `/dev/ui/*`) 하위 경로를 가리켜, 탭을 눌러도 이 페이지에 머문다.
const NAV_ITEMS: BottomMenuItem[] = [
  { to: '/dev/ui', label: 'map', icon: <MapIcon />, end: true },
  {
    to: '/dev/ui/group',
    label: 'group',
    icon: <BookmarkIcon />,
    activeIcon: <BookmarkIcon filled />,
  },
  { to: '/dev/ui/my', label: 'my', icon: <UserIcon />, activeIcon: <UserIcon filled /> },
];

export function UiComponentsPage() {
  const [selectedColor, setSelectedColor] = useState<GroupColor>('yellow');
  const [checked, setChecked] = useState(true);
  const [popupOpen, setPopupOpen] = useState(false);
  const [lastAction, setLastAction] = useState<string>('—');
  const [fabCount, setFabCount] = useState(0);

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
        <Row label="variant · size lg(48px)">
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
            <InstagramGlyph />
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
        <Row label="size lg — 48px 버튼 2개, 간격 12">
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
        <Row label={`floating={false} — 정적 배치 (클릭 ${fabCount}회)`}>
          <FloatingButton floating={false} onClick={() => setFabCount((n) => n + 1)} />
          <FloatingButton floating={false} disabled />
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
            팝업 열기
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
        <Row label="Default (placeholder)">
          <Input placeholder="새 그룹명을 입력해주세요" className="max-w-xs" />
        </Row>
        <Row label="Filled">
          <Input defaultValue="초록뷰 카페" className="max-w-xs" />
        </Row>
        <Row label="Disabled">
          <Input placeholder="비활성" disabled className="max-w-xs" />
        </Row>
      </Section>

      <Section title="Chips (Chip_GroupColor)">
        <Row label={`8색 그룹 팔레트 · 클릭해 선택 (선택: ${selectedColor})`}>
          {GROUP_COLORS.map((color) => (
            <ColorChip
              key={color}
              color={color}
              selected={selectedColor === color}
              onClick={() => setSelectedColor(color)}
            />
          ))}
        </Row>
      </Section>

      <Section title="Badge (Tag)">
        <Row label="number — Tag/24_Number (Roboto Mono 12, gray-70)">
          <Badge variant="number">99+</Badge>
          <Badge variant="number">12</Badge>
        </Row>
        <Row label="keyword — AI 요약 태그 (SUIT 12 Regular, gray-100)">
          <Badge variant="keyword">조용한</Badge>
          <Badge variant="keyword">뷰 맛집</Badge>
          <Badge variant="keyword">작업하기 좋은</Badge>
        </Row>
      </Section>

      {/* 실제 floating 동작 확인용 인스턴스 */}
      <FloatingButton onClick={() => setFabCount((n) => n + 1)} aria-label="장소 추가" />
    </main>
  );
}
