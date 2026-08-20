// 이 파일은 빌드 시 자동 생성된다 — 직접 수정하지 말 것.
// 생성: scripts/generate-base-html.mjs (vite build 직후 실행)
//
// 여기 커밋된 내용은 타입체크·로컬 개발용 자리표시자(placeholder)다 — `pnpm build`
// 를 실제로 돌리면 그 시점의 `dist/index.html`(해시된 에셋 경로 포함)로 덮어써진다.
export const BASE_HTML = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover"
    />
    <title>Nook</title>
    <link rel="icon" type="image/png" href="/favicon.png" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Nook" />
    <meta property="og:title" content="Nook - 함께 저장하고 공유하는 공간" />
    <meta property="og:description" content="지도 위에 나만의 공간을 저장하고 친구와 공유해요" />
    <meta property="og:image" content="/og-default.png" />
    <meta property="og:url" content="" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
