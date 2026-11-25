import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/shared/toast';
import { useSaveSharedPost, useSharedPostDetail } from './api/queries';
import { SharedPostErrorView, SharedPostView } from './components/SharedPostView';
import { shareErrorMessage } from './lib/shareError';

/**
 * Figma `아카이브 공유 > 공유 게시물 상세` — 공유자의 게시물을 읽기 전용으로 보고,
 * 마음에 들면 내 아카이브에 단건 저장한다. 저장하면 그 순간부터 내 게시물이므로
 * 기존 게시물 상세(`/post/{postId}`)로 전환한다 — 이 화면에는 "저장 후 편집 모드"가 없다.
 */
export function SharedPostDetailPage() {
  const { token = '', postId: postIdParam } = useParams();
  const sharedPostId = Number(postIdParam);
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const detailQuery = useSharedPostDetail(token, sharedPostId);
  const savePost = useSaveSharedPost();

  // 공유 게시물 상세는 북마크·공유 장소 시트의 게시물 타일 등으로 콜드 스타트 진입이
  // 가능하다 — 돌아갈 히스토리가 없으면(`key === 'default'`) 뒤로 대신 지도로 보낸다
  // (SharedArchivePage 의 goBack 과 같은 패턴).
  const goBack = () =>
    location.key === 'default' ? navigate('/map', { replace: true }) : navigate(-1);

  if (detailQuery.isPending) return null;

  if (detailQuery.isError) {
    return <SharedPostErrorView message={shareErrorMessage(detailQuery.error)} onBack={goBack} />;
  }

  return (
    <SharedPostView
      detail={detailQuery.data}
      onBack={goBack}
      savePending={savePost.isPending}
      onSave={(input, closeSheet) =>
        savePost.mutate(
          { shareToken: token, sharedPostId, ...input },
          {
            onSuccess: (myPostId) => {
              closeSheet();
              // 저장한 순간부터 내 게시물이다 — 편집 가능한 기존 상세로 전환한다.
              // replace: 뒤로가기가 "저장 전 공유 상세"로 돌아가 상태가 어긋나지 않게.
              // entry=share 는 붙이지 않는다 — 그건 네이티브 공유 확장 딥링크 전용 마커라
              // (appLink.ts/PostDetailPage.tsx) 여기서 재사용하면 뒤로가기가 엉뚱하게
              // /map 으로 튄다. 파라미터 없이 replace 하면 히스토리가
              // [/shared/tok, /post/123] 이 되어 평범한 뒤로가기로 공유 아카이브 상세로 돌아간다.
              navigate(`/post/${myPostId}`, { replace: true });
            },
            onError: () => showToast({ variant: 'simple', title: '게시물을 저장하지 못했어요' }),
          },
        )
      }
      // 장소 상세는 지도 화면이 소유한다 — 아카이브 상세의 장소 탭과 같은 딥링크.
      // 저장 안 한 장소의 404 우회용 공유 토큰을 함께 실어 보낸다.
      onPlaceClick={(placeId) => navigate(`/map?placeId=${placeId}&shareToken=${token}`)}
    />
  );
}
