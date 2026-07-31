import { CustomOverlay } from 'react-naver-maps';
import { cn } from '@/shared/lib/utils';

export function CurrentLocationDot({
  lat,
  lng,
  rippleKey = 0,
}: {
  lat: number;
  lng: number;
  /**
   * 값이 바뀔 때마다 파장 애니메이션을 처음부터 다시 재생한다(현재 위치 버튼).
   * 0 이면 아직 한 번도 누르지 않은 상태 — 고정 파장만 보여준다.
   */
  rippleKey?: number;
}) {
  return (
    <CustomOverlay position={{ lat, lng }}>
      <span className="relative block size-4.5 -translate-x-1/2 -translate-y-1/2">
        {/* 파장 — 버튼을 누르기 전에는 opacity 0 이라 아무것도 보이지 않는다.
            누르면 `location-ripple`(global.css) 이 3번 퍼지고, 마지막 파장이 퍼진
            자리에 그대로 머물러 고정 파장이 된다(forwards).
            key 가 바뀌면 노드가 새로 마운트되어 재생이 처음부터 다시 시작된다. */}
        <span
          key={rippleKey}
          aria-hidden="true"
          className={cn(
            'absolute -inset-2 rounded-full bg-blue opacity-0',
            rippleKey > 0 && 'animate-location-ripple motion-reduce:animate-none',
          )}
        />

        <span className="relative block size-full rounded-full border-2 border-gray-0 bg-blue shadow-sm" />
      </span>
    </CustomOverlay>
  );
}
