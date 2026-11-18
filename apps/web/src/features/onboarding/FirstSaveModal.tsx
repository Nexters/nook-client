import { useNavigate } from 'react-router-dom';
import firstSavePost from '@/assets/images/first-save-post.png';
import { INSTAGRAM_URL } from '@/features/onboarding/OnboardingPage';
import { nativeBridge } from '@/native-bridge';
import { env } from '@/shared/config/env';
import { Icon32Delete } from '@/shared/icons/NookIcons';
import { Button } from '@/shared/ui';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';

/**
 * 한 번도 저장하지 않은 사람이 아카이브 탭에 들어오면 뜨는 안내 모달(Figma 366:14933).
 * `저장하러 가기` 는 `FirstSaveEmpty` 와 같은 인스타그램 게시물, `바로가기` 는 공유 시트 즐겨찾기 안내다.
 */
export function FirstSaveModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  // 즐겨찾기 안내는 iOS 시트 기준으로만 있다 — 마이페이지 메뉴와 같은 조건.
  const showSaveGuide = nativeBridge.platform === 'ios' || env.enableDevRoutes;

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onClose()}>
      <AlertDialogContent
        className="w-[343px] overflow-hidden rounded-2xl"
        aria-describedby={undefined}
      >
        <div className="flex justify-end px-4 pt-4">
          <AlertDialogCancel aria-label="닫기" className="rounded-full">
            <Icon32Delete />
          </AlertDialogCancel>
        </div>
        <AlertDialogTitle className="text-center text-h2 font-extrabold text-gray-90">
          인스타그램에서
          <br />첫 게시물을 저장해보세요
        </AlertDialogTitle>
        {/* PNG 에 카드 그림자 여백(위아래 ~18px)이 들어 있어 시안의 py-8 보다 덜 띄운다. */}
        <div className="flex justify-center py-[13px]">
          <img src={firstSavePost} alt="" className="h-[237px] w-[193px]" />
        </div>
        <div className="flex flex-col items-center pb-2">
          {showSaveGuide ? (
            <p className="flex gap-1 text-b3 font-semibold text-gray-90">
              즐겨찾기 설정하고 더 간편하게 저장해요.
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/save-guide');
                }}
                className="text-nook-blue"
              >
                바로가기
              </button>
            </p>
          ) : null}
          <div className="w-full p-4">
            <Button
              size="lg"
              fullWidth
              className="text-b2 font-semibold"
              onClick={() => nativeBridge.openExternalUrl(INSTAGRAM_URL)}
            >
              저장하러 가기
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
