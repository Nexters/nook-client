import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * 라우트가 바뀌면 앱 스크롤러(#root, global.css)를 맨 위로 되돌린다.
 *
 * 화면마다 자기 스크롤 컨테이너를 두던 때는 페이지 언마운트로 스크롤이 함께 사라졌지만,
 * 이제 여러 화면이 #root 하나를 공유해서 이전 화면의 스크롤 위치가 다음 화면으로 새어
 * 들어간다. react-router 의 ScrollRestoration 은 window 스크롤만 다뤄 쓸 수 없다.
 */
export function RootScrollReset() {
  const { pathname } = useLocation();

  // biome-ignore lint/correctness/useExhaustiveDependencies: 경로가 바뀔 때마다 다시 실행한다.
  useEffect(() => {
    document.getElementById('root')?.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
