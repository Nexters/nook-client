import { nativeBridge } from '@/native-bridge';
import { env } from '@/shared/config/env';

// UT(사용자 테스트)용 행동 분석. 테스터 구분은 하지 않는다 — UT 토큰이 빌드에 박혀 있어
// 모든 테스트폰의 JWT sub 가 같고, identify 하면 PostHog 가 전원을 한 명으로 합쳐버린다.
//
// posthog-js 는 초기 청크를 78kB(gzip) 키운다. 분석 때문에 첫 화면이 늦어질 이유가 없어
// 지연 로딩하고, 실패해도 앱 동작에는 영향을 주지 않는다.
if (!env.isDev && env.posthogKey && env.posthogHost) {
  void import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(env.posthogKey, {
        api_host: env.posthogHost,
        defaults: '2026-05-30',
        capture_pageview: 'history_change',
        capture_pageleave: true,
        // 프로젝트 설정 토글에 맡기지 않고 여기서 켠다. 히트맵이 UT 의 목적이다.
        capture_heatmaps: true,
        capture_exceptions: true,
        disable_session_recording: false,
        // 로그인·게시물 작성 입력이 리플레이에 그대로 남지 않게 한다.
        session_recording: { maskAllInputs: true },
      });
      // 테스트 기기 구분용. ios / android / web.
      posthog.register({ nook_platform: nativeBridge.platform });
    })
    .catch(() => {});
}
