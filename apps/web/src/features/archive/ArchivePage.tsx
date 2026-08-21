import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MainTabPageLayout } from '@/app/layouts/MainTabPageLayout';
import { useIsAuthenticated } from '@/features/auth/session/AuthSessionProvider';
import { useLoginGate } from '@/features/auth/session/useLoginGate';
import { FloatingButton } from '@/shared/ui';
import { ArchiveFormPage } from './ArchiveFormPage';
import { useArchives } from './api/queries';
import { ArchiveCard } from './components/ArchiveCard';
import { ArchiveEmpty } from './components/ArchiveEmpty';
import { GUEST_ARCHIVE } from './guest';

/** Figma `아카이브 > 홈 - 아카이브` (아카이브 없음 / 빈 아카이브 / 아카이브 여러개). */
export function ArchivePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAuthenticated = useIsAuthenticated();
  const { gate, wall } = useLoginGate();
  const { data, isPending, isError } = useArchives();
  const archives = isAuthenticated ? data : [GUEST_ARCHIVE];
  // 생성 화면은 이 목록 위에 얹는 오버레이다(`ArchiveFormPage` 주석 참고) — 그래서 열림
  // 상태의 주인이 URL 이 아니라 이 컴포넌트다.
  const [creating, setCreating] = useState(false);

  // 목록 밖에서 오는 진입은 `?new` 를 달고 온다(공유 게시물 저장 시트의 "새 아카이브
  // 만들기"). 열자마자 파라미터는 지운다 — 남겨두면 새로고침·뒤로가기로 다시 열린다.
  useEffect(() => {
    if (!searchParams.has('new')) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('new');
        return next;
      },
      { replace: true },
    );
    gate('아카이브를 만들려면 로그인이 필요해요', () => setCreating(true));
  }, [searchParams, setSearchParams, gate]);

  return (
    <MainTabPageLayout>
      {/* 목록은 문서 흐름 그대로 #root 스크롤에 맡긴다(러버밴드). 탭바·FAB 는 fixed 라
          스크롤과 무관하게 제자리를 지킨다. */}
      <main
        className="bg-gray-10 px-4"
        // 하단 탭바(60px) + FAB 가 마지막 카드를 가리지 않도록 스크롤 끝에 여백을 둔다.
        style={{ paddingBottom: 'calc(7.5rem + env(safe-area-inset-bottom))' }}
      >
        {/* 로딩 중에는 빈 상태 문구가 잠깐 스쳐 지나가지 않도록 아무것도 그리지 않는다.
            게스트는 쿼리를 돌리지 않아 계속 pending 이라, 먼저 갈라 기본 아카이브를 그린다. */}
        {isAuthenticated && isPending ? null : isError ? (
          <ArchiveEmpty message="아카이브를 불러오지 못했어요" />
        ) : archives?.length === 0 ? (
          <ArchiveEmpty message="아직 생성한 아카이브가 없어요" />
        ) : (
          <div className="flex flex-col gap-2">
            {archives?.map((archive) => (
              <ArchiveCard
                key={archive.id}
                archive={archive}
                onClick={() => navigate(`/archive/${archive.id}`)}
              />
            ))}
          </div>
        )}

        <FloatingButton
          aboveBottomMenu
          aria-label="새 아카이브 만들기"
          onClick={() => gate('아카이브를 만들려면 로그인이 필요해요', () => setCreating(true))}
        />
        {creating ? <ArchiveFormPage mode="create" onClose={() => setCreating(false)} /> : null}
        {wall}
      </main>
    </MainTabPageLayout>
  );
}
