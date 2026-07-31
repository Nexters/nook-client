import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHideBottomMenu } from '@/app/bottom-menu-visibility';
import { capturePostHogEvent } from '@/lib/posthog';
import { cn } from '@/shared/lib/utils';
import {
  BackButton,
  Button,
  ColorChip,
  GROUP_COLORS,
  type GroupColor,
  Header,
  Input,
  Popup,
} from '@/shared/ui';
import { useCreateGroup, useDeleteGroup, useGroups, useUpdateGroup } from './api/queries';

/** 시안의 카운터 표기(`0/20`) 기준. */
const NAME_MAX_LENGTH = 20;

/** 아래에서 올라오고/내려가는 전환 시간. 아래 `duration-300` 과 같은 값이어야 한다. */
const SLIDE_DURATION_MS = 300;

export interface GroupFormPageProps {
  /** `create` = Figma `새 그룹 생성`, `edit` = Figma `그룹 편집` */
  mode: 'create' | 'edit';
}

/**
 * Figma `그룹 > 새 그룹 생성` / `그룹 편집`.
 * 두 시안이 제목·버튼 라벨·삭제 액션만 다른 같은 폼이라 mode 로 합쳤다.
 */
export function GroupFormPage({ mode }: GroupFormPageProps) {
  const { groupId } = useParams();
  const navigate = useNavigate();
  useHideBottomMenu();

  const editing = mode === 'edit';
  const { data: groups } = useGroups();
  const group = editing ? groups?.find((item) => String(item.id) === groupId) : undefined;

  // 편집 시 초기값은 목록 응답에서 온다. 사용자가 아직 건드리지 않은 필드는 undefined 로 두고
  // 서버 값을 그대로 비추므로, 응답이 늦게 도착해도 폼이 빈 채로 굳지 않는다.
  const [editedName, setName] = useState<string>();
  const [editedColor, setColor] = useState<GroupColor>();
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

  const name = editedName ?? group?.name ?? '';
  const color = editedColor ?? group?.color ?? GROUP_COLORS[0];

  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();

  const submitting = createGroup.isPending || updateGroup.isPending;
  const canSubmit = name.trim().length > 0 && !submitting;
  const requestError = createGroup.error ?? updateGroup.error ?? deleteGroup.error;

  const handleSubmit = () => {
    if (editing) {
      if (!group) return;

      updateGroup.mutate(
        { groupId: group.id, name: name.trim(), color },
        {
          onSuccess: () => {
            capturePostHogEvent('group_updated', { group_id: group.id, color });
            navigate(`/group/${group.id}`, { replace: true });
          },
        },
      );
      return;
    }

    createGroup.mutate(
      { name: name.trim(), color },
      {
        onSuccess: () => {
          capturePostHogEvent('group_created', { color });
          slideOutAndNavigate('/group');
        },
      },
    );
  };

  const handleDelete = () => {
    if (!group) return;

    deleteGroup.mutate(group.id, {
      onSuccess: () => {
        capturePostHogEvent('group_deleted', { group_id: group.id });
        navigate('/group', { replace: true });
      },
    });
  };

  return (
    <main
      // 슬라이드 동안 문서가 아래로 늘어나지 않도록 뷰포트에 고정한다(내용이 넘치면 안에서 스크롤).
      className={cn(
        'fixed inset-0 flex flex-col overflow-y-auto bg-gray-0',
        'transition-transform duration-300 ease-out motion-reduce:transition-none',
        slidIn ? 'translate-y-0' : 'translate-y-full',
      )}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <Header left={<BackButton />} title={editing ? '그룹 편집' : '새 그룹 생성'} />

      {/* 시안 수치: 좌우 16 / 상하 12 여백, 라벨-입력 사이 8 */}
      <div className="flex flex-col gap-2 px-4 py-3">
        <label htmlFor="group-name" className="text-b2 font-medium text-gray-70">
          그룹 이름
        </label>
        <Input
          id="group-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onClear={() => setName('')}
          maxLength={NAME_MAX_LENGTH}
          placeholder="새 그룹명을 입력해주세요"
        />
      </div>

      {/* 시안 수치: 팔레트 줄은 상하 20 여백에 가운데 정렬, 스와치 간격 20 */}
      <fieldset className="flex items-center justify-center gap-5 px-4 py-5">
        <legend className="sr-only">그룹 색상</legend>
        {GROUP_COLORS.map((groupColor) => (
          <ColorChip
            key={groupColor}
            color={groupColor}
            selected={groupColor === color}
            onClick={() => setColor(groupColor)}
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
            그룹 삭제
          </button>
        ) : null}
        {/* ApiClientError 의 메시지는 사용자에게 그대로 보여줄 수 있는 한국어다. */}
        {requestError ? (
          <p role="alert" className="text-b3 text-error">
            {requestError.message}
          </p>
        ) : null}
        <Button size="lg" fullWidth disabled={!canSubmit} onClick={handleSubmit}>
          {editing ? '저장하기' : '그룹 만들기'}
        </Button>
      </div>

      <Popup
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="그룹을 삭제하시겠어요?"
        description={
          <>
            그룹을 삭제하면 그룹 내 게시물도
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
