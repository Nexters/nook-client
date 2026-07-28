import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { apiClient } from '@/shared/api';
import '@/styles/global.css';

// ponytail: 인증 세션 모듈이 생기기 전까지 access token 을 localStorage 에서 직접 읽는다.
// 개발 중에는 브라우저 콘솔에서 넣어 보호 API를 확인한다.
//   localStorage.setItem('nook.accessToken', '<token>')
// 로그인/토큰 갱신 연동 시 이 한 줄을 세션 모듈 호출로 교체한다.
apiClient.setAccessTokenProvider(() => {
  const stored = localStorage.getItem('nook.accessToken');
  // 콘솔에서 붙여넣을 때 딸려오기 쉬운 공백·줄바꿈·`Bearer ` 접두사를 걷어낸다.
  return stored?.trim().replace(/^Bearer\s+/i, '') || null;
});

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root 엘리먼트를 찾을 수 없습니다');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
