import { Component, type ReactNode } from 'react';
import { reportClientError } from '@/app/route-error';

/**
 * 지도만 따로 감싸는 에러 경계. 네이버 지도 SDK 는 콘솔에 등록되지 않은 주소(예: 실기기에서
 * Mac IP 로 접속한 dev 서버)에서 인증에 실패하면 내부 객체가 비어 `LatLng` 생성에서 터진다.
 * 그 예외가 라우트까지 올라가면 화면 전체가 죽으므로, 지도 자리만 빈 배경으로 바꾸고 시트·
 * 하단 탭 등 나머지 화면은 그대로 쓸 수 있게 한다.
 */
/**
 * dev 서버에 localhost 가 아닌 주소(실기기 Safari 의 Mac IP 등)로 들어오면 네이버 인증이
 * 어차피 실패하므로 지도를 아예 띄우지 않는다 — 실패한 SDK 가 이벤트마다 던지는 에러를 피한다.
 */
const skipMapInDev =
  import.meta.env.DEV && !['localhost', '127.0.0.1'].includes(window.location.hostname);

export class MapErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: skipMapInDev };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[map-error]', error);
    reportClientError('map', error);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="absolute inset-0 flex items-start justify-center bg-gray-10 pt-24">
          <p className="text-b2 text-gray-50">
            {skipMapInDev ? '이 주소에서는 지도를 띄우지 않아요' : '지도를 불러오지 못했어요'}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
