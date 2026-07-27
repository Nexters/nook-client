import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <main
      className="px-5"
      // 노치/홈 인디케이터 회피 (viewport-fit=cover 와 짝)
      style={{
        paddingTop: 'calc(1.5rem + env(safe-area-inset-top))',
        paddingBottom: 'calc(5.25rem + env(safe-area-inset-bottom))',
      }}
    >
      <h1 className="text-h1">nook</h1>
      <p className="text-b2 mt-1 text-gray-60">취향 기반 장소 아카이빙</p>
      {/* 탭바(group/map/my) 붙기 전까지 지도 화면 확인용 임시 링크 */}
      <Link
        to="/map"
        className="mt-7 flex items-center justify-center rounded-[10px] bg-gray-100 py-3 text-b2 font-medium text-gray-0"
      >
        지도로 이동
      </Link>
    </main>
  );
}
