import { useNavigate } from 'react-router-dom';
import { MainTabPageLayout } from '@/app/layouts/MainTabPageLayout';
import { FloatingButton } from '@/shared/ui';
import { useGroups } from './api/queries';
import { GroupCard } from './components/GroupCard';
import { GroupEmpty } from './components/GroupEmpty';

/** Figma `그룹 > 홈 - 그룹` (그룹 없음 / 빈 그룹 / 그룹 여러개). */
export function GroupPage() {
  const navigate = useNavigate();
  const { data: groups, isPending, isError } = useGroups();

  return (
    <MainTabPageLayout>
      {/* 목록은 문서 흐름 그대로 #root 스크롤에 맡긴다(러버밴드). 탭바·FAB 는 fixed 라
          스크롤과 무관하게 제자리를 지킨다. */}
      <main
        className="bg-gray-10 px-4"
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

        <FloatingButton
          aboveBottomMenu
          aria-label="새 그룹 만들기"
          onClick={() => navigate('/group/new')}
        />
      </main>
    </MainTabPageLayout>
  );
}
