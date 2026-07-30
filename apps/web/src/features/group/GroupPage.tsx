import { useNavigate } from 'react-router-dom';
import nookLogo from '@/assets/logo/Vector.svg';
import { FloatingButton, Header } from '@/shared/ui';
import { useGroups } from './api/queries';
import { GroupCard } from './components/GroupCard';
import { GroupEmpty } from './components/GroupEmpty';

/** Figma `그룹 > 홈 - 그룹` (그룹 없음 / 빈 그룹 / 그룹 여러개). */
export function GroupPage() {
  const navigate = useNavigate();
  const { data: groups, isPending, isError } = useGroups();

  return (
    // 뷰포트 높이에 고정한다 — 하단 탭바(fixed)와 FAB(fixed)는 화면이 작아져도 제자리를
    // 지키고, 넘치는 내용은 아래 목록 영역 안에서만 스크롤된다.
    <main
      className="flex h-dvh flex-col overflow-hidden bg-gray-10"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <Header
        variant="gray"
        className="shrink-0"
        left={<img src={nookLogo} alt="nook" className="h-[22px] w-[50px]" />}
      />

      <div
        className="min-h-0 flex-1 overflow-y-auto px-4"
        // 하단 탭바(60px) + FAB 가 마지막 카드를 가리지 않도록 스크롤 끝에 여백을 둔다.
        style={{ paddingBottom: 'calc(7.5rem + env(safe-area-inset-bottom))' }}
      >
        {/* 로딩 중에는 빈 상태 문구가 잠깐 스쳐 지나가지 않도록 아무것도 그리지 않는다. */}
        {isPending ? null : isError ? (
          <GroupEmpty message="그룹을 불러오지 못했어요" />
        ) : groups.length === 0 ? (
          <GroupEmpty message="아직 생성한 그룹이 없어요" />
        ) : (
          <div className="flex flex-col gap-2">
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onClick={() => navigate(`/group/${group.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <FloatingButton
        aboveBottomMenu
        aria-label="새 그룹 만들기"
        onClick={() => navigate('/group/new')}
      />
    </main>
  );
}
