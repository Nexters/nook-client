import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHideBottomMenu } from '@/app/bottom-menu-visibility';
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
// TODO(api): 그룹 생성/수정/삭제 API 연동 시 목데이터 대신 mutation 으로 교체한다.
import { getMockGroup } from './mock/groups';

/** 시안의 카운터 표기(`0/20`) 기준. */
const NAME_MAX_LENGTH = 20;

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
  const group = editing ? getMockGroup(groupId) : undefined;

  const [name, setName] = useState(group?.name ?? '');
  const [color, setColor] = useState<GroupColor>(group?.color ?? GROUP_COLORS[0]);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const canSubmit = name.trim().length > 0;

  const handleSubmit = () => {
    // TODO(api): 생성/수정 요청 후 응답 id 로 이동한다. 지금은 화면 흐름만 확인한다.
    navigate(editing && groupId ? `/group/${groupId}` : '/group', { replace: true });
  };

  const handleDelete = () => {
    // TODO(api): 삭제 요청 후 목록으로 이동한다.
    navigate('/group', { replace: true });
  };

  return (
    <main
      className="flex min-h-dvh flex-col bg-gray-0"
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
