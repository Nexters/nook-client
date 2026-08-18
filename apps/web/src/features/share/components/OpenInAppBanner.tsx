import { useEffect, useRef } from 'react';
import { nativeBridge } from '@/native-bridge';
import { useToast } from '@/shared/toast';
import { Button } from '@/shared/ui';
import { buildAppSharedLink } from '../lib/appLink';

/** 앱 미설치 판별 타이머 — 스킴 이동이 성공하면 탭이 백그라운드로 빠져 문서가 숨는다. */
const OPEN_TIMEOUT_MS = 1500;

interface OpenInAppBannerProps {
  token: string;
}

/**
 * 브라우저에서 공유 페이지를 열었을 때만 노출 — 셸 웹뷰(ios/android)에선 이미 앱 안이다.
 * 스토어 폴백 링크는 앱 등록 후 이 컴포넌트에 추가한다.
 */
export function OpenInAppBanner({ token }: OpenInAppBannerProps) {
  const { showToast } = useToast();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 타이머가 살아있는 동안 화면을 벗어나면(다른 라우트로 이동) 정리해 —
  // 언마운트 뒤 엉뚱한 화면에 "앱이 설치되어 있지 않아요" 토스트가 뜨는 걸 막는다.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (nativeBridge.platform !== 'web') return null;

  return (
    <div className="flex items-center justify-between gap-2 bg-gray-10 px-4 py-2">
      <span className="text-b2 text-gray-80">nook 앱에서 보기</span>
      <Button
        size="sm"
        onClick={() => {
          window.location.href = buildAppSharedLink(token);
          timeoutRef.current = setTimeout(() => {
            if (!document.hidden) {
              showToast({ variant: 'simple', title: '앱이 설치되어 있지 않아요' });
            }
          }, OPEN_TIMEOUT_MS);
        }}
      >
        열기
      </Button>
    </div>
  );
}
