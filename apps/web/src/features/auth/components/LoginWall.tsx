import { useLocation, useNavigate } from 'react-router-dom';
import { Popup } from '@/shared/ui';

/**
 * 게스트가 계정이 필요한 곳에 닿았을 때 띄우는 안내(Figma `로그인 월`).
 *
 * 제목과 버튼은 어디서 뜨든 같고 **설명 한 줄만** 진입점마다 다르다 — 무엇 때문에
 * 로그인이 필요한지가 그 한 줄에 담긴다. 설명은 "~하려면 로그인이 필요해요" 로 쓴다
 * (명사형 "~을 위해" 는 화면이 늘수록 어색해진다).
 */
export interface LoginWallProps {
  open: boolean;
  /** 예: `저장한 공간을 보려면 로그인이 필요해요` */
  description: string;
  onCancel: () => void;
}

export function LoginWall({ open, description, onCancel }: LoginWallProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Popup
      open={open}
      onClose={onCancel}
      title="로그인하시겠어요?"
      description={description}
      cancelLabel="취소"
      confirmLabel="로그인하기"
      // 로그인이 끝나면 하던 자리로 돌아온다 (RedirectAuthenticated 가 이 값을 읽는다).
      onConfirm={() =>
        navigate('/login', { state: { from: `${location.pathname}${location.search}` } })
      }
    />
  );
}

/**
 * 화면 자체가 계정 없이는 그릴 게 없는 곳(게시물 상세·장소 상세)에서 쓰는 형태.
 * 들어오자마자 월이 떠 있고, 취소하면 왔던 곳으로 돌려보낸다 — 취소 후 빈 화면에
 * 갇히지 않게 하는 게 요점이다.
 */
export function EntryLoginWall({ description }: { description: string }) {
  const navigate = useNavigate();
  const location = useLocation();

  // 공유 딥링크로 앱을 처음 연 경우엔 돌아갈 히스토리가 없다(`key === 'default'`) —
  // 그때는 뒤로 대신 지도로 보낸다.
  const goBack = () =>
    location.key === 'default' ? navigate('/map', { replace: true }) : navigate(-1);

  return <LoginWall open description={description} onCancel={goBack} />;
}
