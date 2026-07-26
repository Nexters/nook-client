import { createContext, useContext } from 'react';

/**
 * 앱 셸(App.tsx 의 375~450px 모바일 뷰 래퍼) DOM 엘리먼트.
 *
 * Drawer(vaul) 처럼 `position: fixed` + Portal 을 쓰는 컴포넌트는 기본적으로
 * `document.body` 에 포탈되어 뷰포트 전체 기준으로 위치가 잡힌다. 데스크톱처럼
 * 뷰포트가 셸보다 넓을 때도 셸 폭 안에 붙어있게 하려면, 이 컨테이너를 해당
 * 컴포넌트의 `container` prop 으로 넘겨 셸 안으로 포탈시켜야 한다.
 */
export const AppShellContainerContext = createContext<HTMLElement | null>(null);

export function useAppShellContainer() {
  return useContext(AppShellContainerContext);
}
