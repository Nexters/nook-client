export function HomePage() {
  return (
    <main
      className="mx-auto max-w-md px-5"
      // 노치/홈 인디케이터 회피 (viewport-fit=cover 와 짝)
      style={{
        paddingTop: 'calc(1.5rem + env(safe-area-inset-top))',
        paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
      }}
    >
      <h1 className="text-h1">nook</h1>
      <p className="text-b2 mt-1 text-gray-60">취향 기반 장소 아카이빙</p>
    </main>
  );
}
