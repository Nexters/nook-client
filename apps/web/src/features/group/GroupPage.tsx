export function GroupPage() {
  return (
    <main
      className="px-5"
      style={{
        paddingTop: 'calc(1.5rem + env(safe-area-inset-top))',
        paddingBottom: 'calc(5.25rem + env(safe-area-inset-bottom))',
      }}
    >
      <h1 className="text-h1">group</h1>
      <p className="mt-1 text-b2 text-gray-60">저장한 장소 그룹</p>
    </main>
  );
}
