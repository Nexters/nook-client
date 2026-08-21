import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { useHideBottomMenu } from '@/app/bottom-menu-visibility';
import { useSlideScreen } from '@/app/slide-screen';
import { EntryLoginWall } from '@/features/auth/components/LoginWall';
import { useIsAuthenticated } from '@/features/auth/session/AuthSessionProvider';
import { capturePostHogEvent } from '@/lib/posthog';
import { Icon24Close } from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';
import {
  ARCHIVE_COLORS,
  type ArchiveColor,
  BackButton,
  Button,
  ColorChip,
  Header,
  Input,
} from '@/shared/ui';
import { useArchives, useCreateArchive, useUpdateArchive } from './api/queries';
import { ArchiveDeletePopup } from './components/ArchiveDeletePopup';

/** 시안의 카운터 표기(`0/20`) 기준. */
const NAME_MAX_LENGTH = 20;

export type ArchiveFormPageProps =
  | {
      /**
       * Figma `새 아카이브 생성` — 라우트가 아니라 아카이브 목록 위에 얹는 오버레이다.
       * 위/아래로 미끄러지는 전환이라 뒤에 목록이 그대로 보여야 하고, 라우트로 두면 그
       * 자리가 빈 배경이 된다.
       */
      mode: 'create';
      /** 내려가는 전환이 끝난 뒤 호출된다 — 이 화면을 걷어내는 건 소유자(ArchivePage)다. */
      onClose: () => void;
    }
  | {
      /** Figma `아카이브 편집` — `/archive/:archiveId/edit` 라우트. 닫기는 히스토리 뒤로다. */
      mode: 'edit';
      onClose?: undefined;
    };

/**
 * Figma `아카이브 > 새 아카이브 생성` / `아카이브 편집`.
 * 두 시안이 제목·버튼 라벨·삭제 액션만 다른 같은 폼이라 mode 로 합쳤다.
 */
export function ArchiveFormPage({ mode, onClose }: ArchiveFormPageProps) {
  const { archiveId } = useParams();
  const navigate = useNavigate();

  const isAuthenticated = useIsAuthenticated();
  const editing = mode === 'edit';
  const { data: archives } = useArchives();
  const archive = editing ? archives?.find((item) => String(item.id) === archiveId) : undefined;

  // 편집 시 초기값은 목록 응답에서 온다. 사용자가 아직 건드리지 않은 필드는 undefined 로 두고
  // 서버 값을 그대로 비추므로, 응답이 늦게 도착해도 폼이 빈 채로 굳지 않는다.
  const [editedName, setName] = useState<string>();
  const [editedColor, setColor] = useState<ArchiveColor>();
  const [deleteOpen, setDeleteOpen] = useState(false);

  // 편집은 라우트라 탭바를 숨겨야 한다. 생성 오버레이는 탭바보다 위로 덮으므로 숨기지
  // 않는다 — 숨기면 시트가 다 내려간 다음에야 탭바가 뒤늦게 올라온다.
  useHideBottomMenu(editing);

  /**
   * 생성 화면은 시트처럼 아래에서 올라오고 아래로 내려가며 닫힌다(편집은 기존대로 바로
   * 뜬다). 축만 다르고 "전환이 끝난 뒤 화면을 닫는다"는 계약은 같아 `useSlideScreen` 을
   * 그대로 쓴다 — 우상단 닫기와 Android 하드웨어 백(훅의 인터셉터)이 같은 전환에서 만난다.
   * iOS 좌측 스와이프는 좌상단 뒤로가기 버튼을 없애면서 함께 꺼진다(`shared/lib/backGesture`)
   * — 아래로 내려가는 화면이 옆으로 밀려 나가면 전환 축이 어긋난다.
   */
  const close = useCallback(() => onClose?.(), [onClose]);
  const { slidIn, slideOut } = useSlideScreen({ open: !editing, close });

  const name = editedName ?? archive?.name ?? '';
  const color = editedColor ?? archive?.color ?? ARCHIVE_COLORS[0];

  const createArchive = useCreateArchive();
  const updateArchive = useUpdateArchive();

  const submitting = createArchive.isPending || updateArchive.isPending;
  const canSubmit = name.trim().length > 0 && !submitting;
  const requestError = createArchive.error ?? updateArchive.error;

  const handleSubmit = () => {
    if (editing) {
      if (!archive) return;

      updateArchive.mutate(
        { archiveId: archive.id, name: name.trim(), color },
        {
          onSuccess: () => {
            capturePostHogEvent('archive_updated', { archive_id: archive.id, color });
            navigate(`/archive/${archive.id}`, { replace: true });
          },
        },
      );
      return;
    }

    createArchive.mutate(
      { name: name.trim(), color },
      {
        onSuccess: () => {
          capturePostHogEvent('archive_created', { color });
          slideOut();
        },
      },
    );
  };

  // 목록의 FAB·더보기 메뉴에서 이미 막지만 URL 로 직접 올 수 있다. 계정 없이는 저장할
  // 곳이 없는 화면이라 진입 자체를 월로 막고, 취소하면 왔던 화면으로 돌려보낸다.
  if (!isAuthenticated) {
    return (
      <EntryLoginWall
        description={
          editing ? '아카이브 편집에 로그인이 필요해요' : '아카이브를 만들려면 로그인이 필요해요'
        }
      />
    );
  }

  // 생성은 목록 위에 얹는 오버레이라 이 문서의 main 이 아니다(main 은 화면에 하나여야 한다).
  const Container = editing ? 'main' : 'div';

  const screen = (
    <Container
      data-slot="archive-form"
      // 슬라이드 동안 문서가 아래로 늘어나지 않도록 뷰포트에 고정한다(내용이 넘치면 안에서 스크롤).
      className={cn(
        'fixed inset-0 flex flex-col overflow-hidden bg-gray-0',
        // 생성 오버레이는 하단 탭바(z-[60]) 위로 덮는다.
        !editing && 'z-[70]',
        // duration 은 `useSlideScreen` 의 SLIDE_DURATION_MS 와 같은 값이어야 한다.
        'transition-transform duration-300 ease-out motion-reduce:transition-none',
        // 편집은 전환 없이 바로 뜬다 — 아래에서 올라오는 건 생성뿐이다.
        editing || slidIn ? 'translate-y-0' : 'translate-y-full',
      )}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <Header
        // 생성은 좌상단 뒤로가기 대신 우상단 닫기다(시안 273:10642) — 떠나는 길을 아래로
        // 내려가는 전환 하나로 모은다. 편집은 옆에서 열리는 화면이라 그대로 뒤로가기다.
        left={editing ? <BackButton /> : undefined}
        title={editing ? '아카이브 편집' : '새 아카이브 생성'}
        right={
          editing ? undefined : (
            <button type="button" onClick={slideOut} aria-label="닫기">
              <Icon24Close />
            </button>
          )
        }
      />

      {/* 헤더는 위에 남기고, 넘치는 만큼은 이 안에서만 스크롤한다. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        {/* 시안 수치: 좌우 16 / 상하 12 여백, 라벨-입력 사이 8 */}
        <div className="flex flex-col gap-2 px-4 py-3">
          <label htmlFor="archive-name" className="text-b2 font-medium text-gray-70">
            아카이브 이름
          </label>
          <Input
            id="archive-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onClear={() => setName('')}
            maxLength={NAME_MAX_LENGTH}
            placeholder="새 아카이브명을 입력해주세요"
          />
        </div>

        {/* 시안 수치: 팔레트 줄은 상하 20 여백에 가운데 정렬, 스와치 간격 20 */}
        <fieldset className="flex items-center justify-center gap-5 px-4 py-5">
          <legend className="sr-only">아카이브 색상</legend>
          {ARCHIVE_COLORS.map((archiveColor) => (
            <ColorChip
              key={archiveColor}
              color={archiveColor}
              selected={archiveColor === color}
              onClick={() => setColor(archiveColor)}
            />
          ))}
        </fieldset>

        {/* 하단 고정 액션. 키보드가 올라오면 네이티브 WebView 가 뷰포트를 줄여 함께 올라온다. */}
        <div
          className="mt-auto flex flex-col items-center gap-4 px-4 pt-4"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          {editing ? (
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="text-b2 font-medium text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
            >
              아카이브 삭제
            </button>
          ) : null}
          {/* ApiClientError 의 메시지는 사용자에게 그대로 보여줄 수 있는 한국어다. */}
          {requestError ? (
            <p role="alert" className="text-b3 text-error">
              {requestError.message}
            </p>
          ) : null}
          <Button size="lg" fullWidth disabled={!canSubmit} onClick={handleSubmit}>
            {editing ? '저장하기' : '아카이브 만들기'}
          </Button>
        </div>
      </div>

      {archive ? (
        <ArchiveDeletePopup
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          archive={archive}
        />
      ) : null}
    </Container>
  );

  // 생성 오버레이는 body 로 포탈한다. 셸(`app/providers`)의 will-change-transform 이 스택
  // 컨텍스트를 만들어, 그 안에서는 z-index 를 얼마로 줘도 body 로 포탈된 로고 헤더·탭바·FAB
  // 아래에 깔린다(그러면 이 화면의 헤더가 로고 헤더에 가려진다) — `SlideScreen` 이 body 로
  // 포탈하는 것과 같은 이유다. 편집은 라우트라 그 자리에 그대로 둔다.
  return editing ? screen : createPortal(screen, document.body);
}
