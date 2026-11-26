import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useArchives } from '@/features/archive/api/queries';
import { useSavedToArchivesToast } from '@/features/post/components/ArchiveJumpPopover';
import { POST_NO_HISTORY_STATE } from '@/features/post/postEntry';
import { Icon16Share } from '@/shared/icons/NookIcons';
import { useToast } from '@/shared/toast';
import { MoreMenu } from '@/shared/ui';
import { usePostShare, useSavePostShare } from './api/queries';
import { SharedPostErrorView, SharedPostView } from './components/SharedPostView';
import { postSharePreview, ShareSheet } from './components/ShareSheet';
import { shareErrorMessage } from './lib/shareError';
import { buildPostShareUrl } from './lib/shareUrl';

/**
 * Figma `게시물 공유 > 공유 받은 후 저장 전 화면` — 게시물 단위 공유 링크(`/shared-post/:token`).
 * 발급 시점 스냅샷을 읽기 전용으로 보여주고, 저장하면 내 게시물로 복사돼 게시물 상세로 넘어간다.
 * 이미 저장한 사람에겐 저장 칩 대신 내 아카이브("OO에 저장")가 보인다(NOOK-369 PM 확인).
 */
export function SharedPostSharePage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const showSavedToast = useSavedToArchivesToast();
  const { data: myArchives } = useArchives();
  const [shareOpen, setShareOpen] = useState(false);

  const shareQuery = usePostShare(token);
  const save = useSavePostShare();

  // 공유 링크는 보통 바깥에서 곧장 열린다 — 돌아갈 히스토리가 없으면 지도로 보낸다.
  const goBack = () =>
    location.key === 'default' ? navigate('/map', { replace: true }) : navigate(-1);

  if (shareQuery.isPending) return null;

  if (shareQuery.isError) {
    return (
      <SharedPostErrorView
        message={shareErrorMessage(shareQuery.error, '게시물을 불러오지 못했어요')}
        onBack={goBack}
      />
    );
  }

  const detail = shareQuery.data;

  return (
    <>
      <SharedPostView
        detail={detail}
        onBack={goBack}
        appPath={`shared-post/${token}`}
        // 시안·기획: 게시물 공유는 "아카이브에 저장" — 아카이브 공유의 "아카이브 추가"와 다르다.
        saveLabel="아카이브에 저장"
        // 시안: 공유받은 사람의 더보기는 "게시물 공유" 하나 — 받은 링크를 그대로 다시 건넨다.
        headerRight={
          <MoreMenu
            items={[
              { label: '게시물 공유', icon: <Icon16Share />, onSelect: () => setShareOpen(true) },
            ]}
          />
        }
        savePending={save.isPending}
        onSave={(input, closeSheet) =>
          save.mutate(
            { token, ...input },
            {
              onSuccess: (myPostId) => {
                closeSheet();
                showSavedToast(
                  input.groupIds.flatMap((id) => {
                    const archive = myArchives?.find((candidate) => candidate.id === id);
                    return archive ? [{ id, name: archive.name, color: archive.color }] : [];
                  }),
                );
                // 저장한 순간부터 내 게시물이다 — 장소 추가·삭제가 되는 게시물 상세로 넘긴다.
                // 바깥에서 곧장 연 링크면 이 화면이 첫 히스토리다 — 상세에서 뒤로가기가 갈 곳이
                // 없으니 이 화면의 뒤로가기(goBack)와 같이 홈 지도로 보내라고 알린다(NOOK-449).
                navigate(`/post/${myPostId}`, {
                  replace: true,
                  state: location.key === 'default' ? POST_NO_HISTORY_STATE : undefined,
                });
              },
              onError: () => showToast({ variant: 'simple', title: '게시물을 저장하지 못했어요' }),
            },
          )
        }
        // 장소 상세(지도)는 아카이브 공유 토큰만 알아서, 저장 전에는 장소 행을 열지 않는다.
      />
      <ShareSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        url={buildPostShareUrl(token)}
        title="게시물 공유"
        preview={postSharePreview(detail)}
      />
    </>
  );
}
