import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BottomMenuVisibilityProvider } from '@/app/bottom-menu-visibility';
import { ArchiveDetailPage } from '@/features/archive/ArchiveDetailPage';
import { ArchiveFormPage } from '@/features/archive/ArchiveFormPage';
import { ArchivePage } from '@/features/archive/ArchivePage';
import type { Archive } from '@/features/archive/types';
import { onBackGestureChange } from '@/shared/lib/backGesture';
import { runBackInterceptors } from '@/shared/lib/backInterceptors';
import { ToastProvider } from '@/shared/toast';

/**
 * iOS 엣지 스와이프가 하는 일 — 화면을 거치지 않고 히스토리를 한 칸 되돌린다.
 * WKWebView 는 웹에 이벤트를 주지 않고 히스토리를 직접 조작하므로, 라우터 레벨의
 * navigate(-1) 이 그 경로를 그대로 재현한다.
 */
function HistoryBackProbe() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(-1)}>
      히스토리 뒤로
    </button>
  );
}

/** `/map` 착지 확인용 — 실제 화면 대신 쿼리스트링을 그대로 보여준다. */
function MapRouteProbe() {
  const location = useLocation();
  return <div>지도 화면{location.search}</div>;
}

const ARCHIVES: Archive[] = [
  { id: 1, name: '카페', color: 'yellow', placeCount: 114, accessType: 'OWNED' },
  { id: 2, name: '독립영화관', color: 'blue', placeCount: 3, accessType: 'OWNED' },
  {
    id: 3,
    name: '지우랑 놀러가고 싶은 곳',
    color: 'cement',
    placeCount: 12,
    accessType: 'SHARED',
    owner: { nickname: 'ehoidi' },
    shareToken: 'tok-123',
  },
];

// HTTP 전송이 아니라 화면 ↔ Query ↔ feature API 배선만 검증한다.
const mocks = vi.hoisted(() => ({
  fetchArchives: vi.fn(),
  fetchArchivePosts: vi.fn(),
  fetchArchivePlaces: vi.fn(),
  createArchive: vi.fn(),
  updateArchive: vi.fn(),
  deleteArchive: vi.fn(),
  deleteArchivePosts: vi.fn(),
  issueShareLink: vi.fn(),
  removeSharedArchive: vi.fn(),
}));

vi.mock('@/features/archive/api', () => mocks);

function renderArchiveRoutes(initialPath: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const wrapper = (children: ReactNode) => (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BottomMenuVisibilityProvider value={{ hidden: false, setHidden: () => {} }}>
          {children}
        </BottomMenuVisibilityProvider>
      </ToastProvider>
    </QueryClientProvider>
  );

  return render(
    wrapper(
      <MemoryRouter initialEntries={[initialPath]}>
        <HistoryBackProbe />
        <Routes>
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/archive/new" element={<ArchiveFormPage mode="create" />} />
          <Route path="/archive/:archiveId" element={<ArchiveDetailPage />} />
          <Route path="/archive/:archiveId/edit" element={<ArchiveFormPage mode="edit" />} />
          <Route path="/shared/:token/post/:postId" element={<div>공유 게시물 상세</div>} />
          <Route path="/map" element={<MapRouteProbe />} />
        </Routes>
      </MemoryRouter>,
    ),
  );
}

describe('아카이브 화면', () => {
  beforeEach(() => {
    mocks.fetchArchives.mockReset().mockResolvedValue(ARCHIVES);
    mocks.fetchArchivePosts
      .mockReset()
      .mockResolvedValue({ posts: [], nextPage: undefined, totalElements: 0 });
    mocks.fetchArchivePlaces
      .mockReset()
      .mockResolvedValue({ places: [], nextPage: undefined, totalElements: 0 });
    mocks.createArchive.mockReset().mockResolvedValue(undefined);
    mocks.updateArchive.mockReset().mockResolvedValue(undefined);
    mocks.deleteArchive.mockReset().mockResolvedValue(undefined);
    mocks.deleteArchivePosts.mockReset().mockResolvedValue(undefined);
    mocks.issueShareLink.mockReset().mockResolvedValue('tok-123');
    mocks.removeSharedArchive.mockReset().mockResolvedValue(undefined);
  });

  it('목록에서 아카이브를 누르면 상세로 이동한다', async () => {
    renderArchiveRoutes('/archive');

    fireEvent.click(await screen.findByRole('button', { name: /카페/ }));

    expect(screen.getByRole('heading', { name: '카페' })).toBeInTheDocument();
  });

  it('목록에 없는 아카이브 상세는 못 찾는 화면 대신 목록으로 돌려보낸다', async () => {
    renderArchiveRoutes('/archive/999');

    // 삭제 직후 무효화가 팝업의 navigate 보다 먼저 끝났을 때도 같은 분기를 탄다.
    expect(await screen.findByRole('button', { name: /카페/ })).toBeInTheDocument();
    expect(screen.queryByText('아카이브를 찾을 수 없어요')).not.toBeInTheDocument();
  });

  it('새 아카이브 생성은 이름이 비면 버튼이 비활성화되고, 입력하면 생성 요청을 보낸다', async () => {
    renderArchiveRoutes('/archive/new');

    const submit = screen.getByRole('button', { name: '아카이브 만들기' });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText('아카이브 이름'), { target: { value: '토요일 모임' } });
    expect(submit).toBeEnabled();

    fireEvent.click(submit);
    // mutate 는 두 번째 인자로 mutation context 를 넘기므로 첫 인자만 본다.
    await vi.waitFor(() =>
      expect(mocks.createArchive.mock.calls[0]?.[0]).toEqual({
        name: '토요일 모임',
        color: 'yellow',
      }),
    );
  });

  it('아카이브 편집에서 이름과 색상을 바꿔 저장하면 수정 요청을 보낸다', async () => {
    renderArchiveRoutes('/archive/1/edit');

    const input = await screen.findByDisplayValue('카페');
    fireEvent.change(input, { target: { value: '동네 카페' } });
    fireEvent.click(screen.getByRole('button', { name: 'purple 아카이브 색상' }));
    fireEvent.click(screen.getByRole('button', { name: '저장하기' }));

    await vi.waitFor(() =>
      expect(mocks.updateArchive.mock.calls[0]?.[0]).toEqual({
        archiveId: 1,
        name: '동네 카페',
        color: 'purple',
      }),
    );
  });

  it('아카이브 상세는 저장된 게시물 목록과 소유자 닉네임을 그린다', async () => {
    mocks.fetchArchivePosts.mockResolvedValue({
      posts: [
        { id: 7, name: '초록뷰 카페', placeCount: 3, authorHandle: '@abcde', thumbnails: [] },
      ],
      nextPage: undefined,
      ownerNickname: 'Purr',
      totalElements: 12,
    });
    mocks.fetchArchivePlaces.mockResolvedValue({
      places: [],
      nextPage: undefined,
      totalElements: 114,
    });

    renderArchiveRoutes('/archive/1');

    expect(await screen.findByText('초록뷰 카페')).toBeInTheDocument();
    expect(mocks.fetchArchivePosts.mock.calls[0]?.[0]).toBe(1);
    expect(screen.getByText('by Purr')).toBeInTheDocument();
    // 소유자 닉네임은 아카이브 조회가 아니라 게시물 페이지 응답에서 온다.
    const card = screen.getByRole('button', { name: /초록뷰 카페/ });
    expect(within(card).getByText('@abcde')).toBeInTheDocument();
    expect(within(card).getByText('3 Places')).toBeInTheDocument();
    // 탭 카운트는 각 목록 응답의 totalElements 가 채운다.
    expect(screen.getByRole('tab', { name: /게시물/ })).toHaveTextContent('12');
    expect(screen.getByRole('tab', { name: /장소/ })).toHaveTextContent('114');
  });

  it('아카이브 상세 장소 탭을 누르면 저장된 장소 목록을 그린다', async () => {
    mocks.fetchArchivePosts.mockResolvedValue({
      posts: [
        { id: 7, name: '초록뷰 카페', placeCount: 3, authorHandle: '@abcde', thumbnails: [] },
      ],
      nextPage: undefined,
      ownerNickname: 'Purr',
      totalElements: 1,
    });
    mocks.fetchArchivePlaces.mockResolvedValue({
      places: [{ id: '42', name: '을지다락', category: '카페', region: '서울' }],
      nextPage: undefined,
      totalElements: 1,
    });

    renderArchiveRoutes('/archive/1');

    fireEvent.click(await screen.findByRole('tab', { name: /장소/ }));

    expect(await screen.findByText('을지다락')).toBeInTheDocument();
    // 장소 카드는 게시물 카드와 같은 그리드에 놓이는 세로형(PlaceCard) — 지역·업종을 보여준다.
    expect(screen.getByText('서울 • 카페')).toBeInTheDocument();
    expect(mocks.fetchArchivePlaces.mock.calls[0]?.[0]).toBe(1);
  });

  it('아카이브 상세에 게시물이 없으면 탭 없이 빈 상태를 보여준다', async () => {
    renderArchiveRoutes('/archive/1');

    expect(await screen.findByText('저장한 게시물이 없어요')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    // 편집·공유 칩도 함께 내린다(시안 263:10971) — 두 액션은 더보기 메뉴에만 남는다.
    expect(screen.queryByRole('button', { name: '아카이브 편집' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /공유/ })).not.toBeInTheDocument();
  });

  it('상세 더보기 메뉴의 아카이브 편집을 누르면 편집 화면으로 이동한다', async () => {
    mocks.fetchArchivePosts.mockResolvedValue({
      posts: [
        { id: 7, name: '초록뷰 카페', placeCount: 3, authorHandle: '@abcde', thumbnails: [] },
      ],
      nextPage: undefined,
      ownerNickname: 'Purr',
      totalElements: 1,
    });

    renderArchiveRoutes('/archive/1');
    expect(await screen.findByText('초록뷰 카페')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '아카이브 편집' }));

    expect(await screen.findByDisplayValue('카페')).toBeInTheDocument();
  });

  it('더보기 메뉴의 아카이브 공유는 링크를 발급해 공유 시트를 연다', async () => {
    renderArchiveRoutes('/archive/1');

    fireEvent.click(await screen.findByRole('button', { name: '더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '아카이브 공유' }));

    // mutate 는 두 번째 인자로 mutation context 를 넘기므로 첫 인자만 본다.
    await vi.waitFor(() => expect(mocks.issueShareLink.mock.calls[0]?.[0]).toBe(1));
    // 시트에 조립된 공유 URL 대신 시안의 프리뷰 카드와 공유 수단이 보인다.
    expect(await screen.findByText('링크 복사')).toBeInTheDocument();
    expect(screen.getByText('더보기')).toBeInTheDocument();
    // 프리뷰 카드 — 아카이브 이름과 개수 요약.
    expect(screen.getByText('114 Places')).toBeInTheDocument();
  });

  it('상세 더보기 메뉴의 아카이브 삭제는 확인 팝업을 거쳐 삭제 요청을 보낸다', async () => {
    mocks.fetchArchivePosts.mockResolvedValue({
      posts: [
        { id: 7, name: '초록뷰 카페', placeCount: 3, authorHandle: '@abcde', thumbnails: [] },
      ],
      nextPage: undefined,
      ownerNickname: 'Purr',
      totalElements: 1,
    });

    renderArchiveRoutes('/archive/1');
    expect(await screen.findByText('초록뷰 카페')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '아카이브 삭제' }));
    expect(screen.getByText('아카이브를 삭제하시겠어요?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '삭제하기' }));
    await vi.waitFor(() => expect(mocks.deleteArchive.mock.calls[0]?.[0]).toBe(1));
    // 목록으로 돌아간 뒤에도 무엇을 지웠는지 이름으로 알려준다.
    expect(await screen.findByText('"카페" 아카이브가 삭제 됐어요.')).toBeInTheDocument();
  });

  it('선택 삭제는 고른 게시물을 확인 팝업을 거쳐 일괄 삭제 요청으로 보낸다', async () => {
    mocks.fetchArchivePosts.mockResolvedValue({
      posts: [
        { id: 7, name: '초록뷰 카페', placeCount: 3, thumbnails: [] },
        { id: 8, name: '을지로 카페', placeCount: 2, thumbnails: [] },
      ],
      nextPage: undefined,
      ownerNickname: 'Purr',
      totalElements: 2,
    });

    renderArchiveRoutes('/archive/1');
    expect(await screen.findByText('초록뷰 카페')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '선택 삭제' }));

    // 아무것도 고르지 않은 동안은 삭제 버튼이 비활성이다.
    expect(screen.getByRole('button', { name: '삭제하기' })).toBeDisabled();

    // 선택 모드에서 카드 탭은 상세 이동이 아니라 선택 토글이다.
    fireEvent.click(screen.getByRole('button', { name: /초록뷰 카페/ }));
    fireEvent.click(screen.getByRole('button', { name: /을지로 카페/ }));

    fireEvent.click(screen.getByRole('button', { name: '2개 삭제하기' }));
    expect(screen.getByText('2개 게시물을 삭제하시겠어요?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '삭제하기' }));
    await vi.waitFor(() => expect(mocks.deleteArchivePosts.mock.calls[0]?.[0]).toEqual([7, 8]));
  });

  it('장소 탭에서는 선택 삭제 메뉴가 없다 — 장소는 여기서 지울 수 없다', async () => {
    mocks.fetchArchivePosts.mockResolvedValue({
      posts: [{ id: 7, name: '초록뷰 카페', placeCount: 3, thumbnails: [] }],
      nextPage: undefined,
      ownerNickname: 'Purr',
      totalElements: 1,
    });
    mocks.fetchArchivePlaces.mockResolvedValue({
      places: [{ id: '42', name: '을지다락', category: '카페', region: '서울' }],
      nextPage: undefined,
      totalElements: 1,
    });

    renderArchiveRoutes('/archive/1');

    // 게시물 탭에서는 있다.
    fireEvent.click(await screen.findByRole('button', { name: '더보기' }));
    expect(screen.getByRole('menuitem', { name: '선택 삭제' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });

    fireEvent.click(screen.getByRole('tab', { name: /장소/ }));
    expect(await screen.findByText('을지다락')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    expect(screen.queryByRole('menuitem', { name: '선택 삭제' })).not.toBeInTheDocument();
    // 아카이브 편집·삭제는 그대로 있다.
    expect(screen.getByRole('menuitem', { name: '아카이브 삭제' })).toBeInTheDocument();
  });

  it('선택 모드에서 장소 탭으로 넘어가면 선택 모드가 끝난다', async () => {
    mocks.fetchArchivePosts.mockResolvedValue({
      posts: [{ id: 7, name: '초록뷰 카페', placeCount: 3, thumbnails: [] }],
      nextPage: undefined,
      ownerNickname: 'Purr',
      totalElements: 1,
    });

    renderArchiveRoutes('/archive/1');
    expect(await screen.findByText('초록뷰 카페')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '선택 삭제' }));
    expect(screen.getByRole('button', { name: '삭제하기' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /장소/ }));

    expect(screen.queryByRole('button', { name: '삭제하기' })).not.toBeInTheDocument();
  });

  it('선택 삭제 모드에서 뒤로가기는 페이지를 떠나지 않고 모드만 종료한다', async () => {
    mocks.fetchArchivePosts.mockResolvedValue({
      posts: [
        { id: 7, name: '초록뷰 카페', placeCount: 3, authorHandle: '@abcde', thumbnails: [] },
      ],
      nextPage: undefined,
      ownerNickname: 'Purr',
      totalElements: 1,
    });

    renderArchiveRoutes('/archive/1');
    expect(await screen.findByText('초록뷰 카페')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '선택 삭제' }));
    expect(screen.getByRole('button', { name: '삭제하기' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(screen.queryByRole('button', { name: '삭제하기' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '카페' })).toBeInTheDocument();
    expect(mocks.deleteArchivePosts).not.toHaveBeenCalled();
  });

  it('선택 삭제 모드에서 히스토리 뒤로(iOS 엣지 스와이프)면 모드만 종료되고 선택도 비워진다', async () => {
    mocks.fetchArchivePosts.mockResolvedValue({
      posts: [
        { id: 7, name: '초록뷰 카페', placeCount: 3, authorHandle: '@abcde', thumbnails: [] },
      ],
      nextPage: undefined,
      ownerNickname: 'Purr',
      totalElements: 1,
    });

    renderArchiveRoutes('/archive/1');
    expect(await screen.findByText('초록뷰 카페')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '선택 삭제' }));
    fireEvent.click(screen.getByRole('button', { name: /초록뷰 카페/ }));
    expect(screen.getByRole('button', { name: '1개 삭제하기' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '히스토리 뒤로' }));

    // 모드만 접힌다 — 승격 전에는 여기서 아카이브 상세를 떠났다.
    expect(screen.queryByRole('button', { name: /삭제하기/ })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '카페' })).toBeInTheDocument();

    // 다시 들어가도 지난 선택은 남아 있지 않다.
    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '선택 삭제' }));
    expect(screen.getByRole('button', { name: '삭제하기' })).toBeInTheDocument();
  });

  it('아카이브 편집은 기존 이름을 채우고 삭제 확인 후 삭제 요청을 보낸다', async () => {
    renderArchiveRoutes('/archive/1/edit');

    expect(await screen.findByDisplayValue('카페')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '아카이브 삭제' }));
    expect(screen.getByText('아카이브를 삭제하시겠어요?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '삭제하기' }));
    await vi.waitFor(() => expect(mocks.deleteArchive.mock.calls[0]?.[0]).toBe(1));
    expect(await screen.findByText('"카페" 아카이브가 삭제 됐어요.')).toBeInTheDocument();
  });

  it('공유받은 아카이브 카드는 색 칩 대신 프로필 이미지를 놓고 소유자 닉네임을 보여준다', async () => {
    const { container } = renderArchiveRoutes('/archive');

    expect(await screen.findByText('ehoidi')).toBeInTheDocument();
    // 목록의 공유 아카이브는 하나뿐이고, 내 아카이브(OWNED)는 색 칩을 그대로 쓴다.
    const avatars = container.querySelectorAll('[data-slot="avatar"]');
    expect(avatars).toHaveLength(1);
    // 이 소유자에겐 profileImageUrl 이 없어 Avatar 의 기본(엠티) 이미지가 들어간다.
    expect(avatars[0]?.querySelector('img')).toHaveAttribute('src');
  });

  it('공유받은 아카이브 소유자에게 프로필 이미지가 있으면 그 이미지를 쓴다', async () => {
    mocks.fetchArchives.mockResolvedValue(
      ARCHIVES.map((archive) =>
        archive.accessType === 'SHARED'
          ? { ...archive, owner: { nickname: 'ehoidi', profileImageUrl: 'https://img/me.png' } }
          : archive,
      ),
    );

    const { container } = renderArchiveRoutes('/archive');

    expect(await screen.findByText('ehoidi')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="avatar"] img')).toHaveAttribute(
      'src',
      'https://img/me.png',
    );
  });

  it('공유받은 아카이브 상세의 게시물 카드는 공유 게시물 상세로 이동한다', async () => {
    mocks.fetchArchivePosts.mockResolvedValue({
      posts: [
        { id: 7, name: '초록뷰 카페', placeCount: 3, authorHandle: '@abcde', thumbnails: [] },
      ],
      nextPage: undefined,
      ownerNickname: 'ehoidi',
      totalElements: 1,
    });

    renderArchiveRoutes('/archive/3');
    fireEvent.click(await screen.findByRole('button', { name: /초록뷰 카페/ }));

    expect(await screen.findByText('공유 게시물 상세')).toBeInTheDocument();
  });

  it('공유받은 아카이브 상세의 처리 중·실패 게시물 카드는 탭해도 이동하지 않는다', async () => {
    mocks.fetchArchivePosts.mockResolvedValue({
      posts: [
        {
          id: 7,
          name: '',
          placeCount: 0,
          thumbnails: [],
          processingState: 'failed',
        },
      ],
      nextPage: undefined,
      ownerNickname: 'ehoidi',
      totalElements: 1,
    });

    renderArchiveRoutes('/archive/3');
    // 처리 실패 카드는 onClick 이 없어 button 이 아니라 div 로 렌더된다 — 탭할 버튼 자체가 없다.
    expect(await screen.findByText('불러오지 못했어요.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /불러오지 못했어요/ })).not.toBeInTheDocument();
  });

  it('공유받은 아카이브 상세의 장소 카드도 지도의 장소 상세로 이동한다', async () => {
    mocks.fetchArchivePosts.mockResolvedValue({
      posts: [
        { id: 7, name: '초록뷰 카페', placeCount: 3, authorHandle: '@abcde', thumbnails: [] },
      ],
      nextPage: undefined,
      ownerNickname: 'ehoidi',
      totalElements: 1,
    });
    mocks.fetchArchivePlaces.mockResolvedValue({
      places: [{ id: '42', name: '을지다락', category: '카페', region: '서울' }],
      nextPage: undefined,
      totalElements: 1,
    });

    renderArchiveRoutes('/archive/3');
    fireEvent.click(await screen.findByRole('tab', { name: /장소/ }));
    fireEvent.click(await screen.findByText('을지다락'));

    // 구독 아카이브의 장소는 내 상세 API 로 404 라, 공개 API 우회용 토큰이 함께 실린다.
    expect(await screen.findByText('지도 화면?placeId=42&shareToken=tok-123')).toBeInTheDocument();
  });

  it('공유받은 아카이브 상세 메뉴는 제거만 제공하고, 제거하면 구독 해제를 호출한다', async () => {
    renderArchiveRoutes('/archive/3');

    fireEvent.click(await screen.findByRole('button', { name: '더보기' }));
    expect(screen.queryByRole('menuitem', { name: '아카이브 편집' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: '내 목록에서 제거' }));
    fireEvent.click(screen.getByRole('button', { name: '제거하기' }));

    // mutate 는 두 번째 인자로 mutation context 를 넘기므로 첫 인자만 본다.
    await vi.waitFor(() => expect(mocks.removeSharedArchive.mock.calls[0]?.[0]).toBe(3));
  });

  /**
   * 생성 화면은 아래에서 올라오는 시트라, 나가는 길도 아래로 내려가는 전환 하나로 모은다
   * (시안 273:10642 — 좌상단 뒤로가기 대신 우상단 닫기). 옆으로 밀려 나가는 iOS 좌측
   * 스와이프는 축이 어긋나 허용하지 않는다.
   */
  describe('새 아카이브 생성 화면 나가기', () => {
    /** 지금 이 화면이 iOS 좌측 스와이프를 허용하는지 — 셸에 알리는 그 값 그대로다. */
    function listenBackGesture() {
      const calls: boolean[] = [];
      onBackGestureChange((enabled) => calls.push(enabled));
      return calls;
    }

    /** 목록의 + 로 들어간다 — 실제 진입 경로이자, 되감을 히스토리를 만드는 유일한 길이다. */
    async function openCreateFromList() {
      renderArchiveRoutes('/archive');
      fireEvent.click(await screen.findByRole('button', { name: '새 아카이브 만들기' }));
      return screen.findByRole('button', { name: '아카이브 만들기' });
    }

    const createScreen = () => screen.getByRole('main');
    const archiveList = () => screen.findByRole('button', { name: /카페/ });

    it('좌상단 뒤로가기 대신 우상단 닫기를 두고, 좌측 스와이프는 허용하지 않는다', async () => {
      const gesture = listenBackGesture();
      await openCreateFromList();

      expect(screen.getByRole('button', { name: '닫기' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '뒤로 가기' })).not.toBeInTheDocument();
      // 허용 판정은 공용 뒤로가기 버튼의 존재가 곧 규칙이다 — 버튼이 없으니 꺼져 있다.
      await vi.waitFor(() => expect(gesture.at(-1)).toBe(false));
    });

    it('닫기를 누르면 화면이 아래로 내려간 다음 목록으로 돌아간다', async () => {
      await openCreateFromList();

      fireEvent.click(screen.getByRole('button', { name: '닫기' }));

      // 이동보다 전환이 먼저다 — 아직 화면이 떠 있고 아래로 내려가는 중이다.
      expect(createScreen()).toHaveClass('translate-y-full');
      expect(await archiveList()).toBeInTheDocument();
    });

    it('Android 하드웨어 백도 같은 전환을 태운다', async () => {
      await openCreateFromList();

      // 인터셉터가 받았으면 true — 히스토리 뒤로가기로 곧장 빠지지 않는다.
      expect(runBackInterceptors()).toBe(true);

      expect(createScreen()).toHaveClass('translate-y-full');
      expect(await archiveList()).toBeInTheDocument();
    });

    it('생성이 끝나도 같은 전환으로 목록으로 돌아간다', async () => {
      await openCreateFromList();

      fireEvent.change(screen.getByLabelText('아카이브 이름'), {
        target: { value: '토요일 모임' },
      });
      fireEvent.click(screen.getByRole('button', { name: '아카이브 만들기' }));

      await vi.waitFor(() => expect(createScreen()).toHaveClass('translate-y-full'));
      expect(await archiveList()).toBeInTheDocument();
    });

    it('편집 화면은 그대로 좌상단 뒤로가기를 쓴다 — 옆에서 열리는 화면이다', async () => {
      renderArchiveRoutes('/archive/1/edit');

      expect(await screen.findByDisplayValue('카페')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '뒤로 가기' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '닫기' })).not.toBeInTheDocument();
    });
  });
});
