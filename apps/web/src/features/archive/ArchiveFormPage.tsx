import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHideBottomMenu } from '@/app/bottom-menu-visibility';
import { capturePostHogEvent } from '@/lib/posthog';
import { cn } from '@/shared/lib/utils';
import { useToast } from '@/shared/toast';
import {
  ARCHIVE_COLORS,
  type ArchiveColor,
  BackButton,
  Button,
  ColorChip,
  Header,
  Input,
  Popup,
} from '@/shared/ui';
import { useArchives, useCreateArchive, useDeleteArchive, useUpdateArchive } from './api/queries';

/** 시안의 카운터 표기(`0/20`) 기준. */
const NAME_MAX_LENGTH = 20;

/** 아래에서 올라오고/내려가는 전환 시간. 아래 `duration-300` 과 같은 값이어야 한다. */
const SLIDE_DURATION_MS = 300;

export interface ArchiveFormPageProps {
  /** `create` = Figma `새 아카이브 생성`, `edit` = Figma `아카이브 편집` */
  mode: 'create' | 'edit';
}

/**
 * Figma `아카이브 > 새 아카이브 생성` / `아카이브 편집`.
 * 두 시안이 제목·버튼 라벨·삭제 액션만 다른 같은 폼이라 mode 로 합쳤다.
 */
export function ArchiveFormPage({ mode }: ArchiveFormPageProps) {
  const { archiveId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  useHideBottomMenu();

  const editing = mode === 'edit';
  const { data: archives } = useArchives();
  const archive = editing ? archives?.find((item) => String(item.id) === archiveId) : undefined;

  // 편집 시 초기값은 목록 응답에서 온다. 사용자가 아직 건드리지 않은 필드는 undefined 로 두고
  // 서버 값을 그대로 비추므로, 응답이 늦게 도착해도 폼이 빈 채로 굳지 않는다.
  const [editedName, setName] = useState<string>();
  const [editedColor, setColor] = useState<ArchiveColor>();
  const [deleteOpen, setDeleteOpen] = useState(false);

  // 생성 화면만 시트처럼 아래에서 올라온다(편집은 기존대로 바로 뜬다).
  // 첫 페인트는 화면 밖에서 시작해야 전환이 걸리므로 다음 프레임에 올린다.
  const [slidIn, setSlidIn] = useState(editing);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setSlidIn(true));
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(closeTimer.current);
    };
  }, []);

  /** 생성 완료 — 화면이 아래로 내려간 뒤에 이동한다. */
  const slideOutAndNavigate = (to: string) => {
    setSlidIn(false);
    closeTimer.current = setTimeout(() => navigate(to, { replace: true }), SLIDE_DURATION_MS);
  };

  const name = editedName ?? archive?.name ?? '';
  const color = editedColor ?? archive?.color ?? ARCHIVE_COLORS[0];

  const createArchive = useCreateArchive();
  const updateArchive = useUpdateArchive();
  const deleteArchive = useDeleteArchive();

  const submitting = createArchive.isPending || updateArchive.isPending;
  const canSubmit = name.trim().length > 0 && !submitting;
  const requestError = createArchive.error ?? updateArchive.error ?? deleteArchive.error;

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
          slideOutAndNavigate('/archive');
        },
      },
    );
  };

  const handleDelete = () => {
    if (!archive) return;

    deleteArchive.mutate(archive.id, {
      onSuccess: () => {
        capturePostHogEvent('archive_deleted', { archive_id: archive.id });
        navigate('/archive', { replace: true });
        showToast({ variant: 'simple', title: `"${archive.name}" 아카이브가 삭제 됐어요.` });
      },
    });
  };

  return (
    <main
      // 슬라이드 동안 문서가 아래로 늘어나지 않도록 뷰포트에 고정한다(내용이 넘치면 안에서 스크롤).
      className={cn(
        'fixed inset-0 flex flex-col overflow-hidden bg-gray-0',
        'transition-transform duration-300 ease-out motion-reduce:transition-none',
        slidIn ? 'translate-y-0' : 'translate-y-full',
      )}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <Header left={<BackButton />} title={editing ? '아카이브 편집' : '새 아카이브 생성'} />

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

      <Popup
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="아카이브를 삭제하시겠어요?"
        description={
          <>
            아카이브를 삭제하면 아카이브 내 게시물도
            <br />
            모두 삭제돼요.
          </>
        }
        confirmLabel="삭제하기"
        variant="warning"
        onConfirm={handleDelete}
      />
    </main>
  );
}
