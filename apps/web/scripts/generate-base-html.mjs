#!/usr/bin/env node
// `vite build` 직후 `dist/index.html`(og:* 기본값을 담고 있다)을 문자열 상수로 구워
// `api/_lib/baseHtml.generated.ts` 에 써넣는다. Vercel Function(`api/shared.ts`)이
// 배포 시점에 이 파일을 fs 로 다시 읽으려 하면 `includeFiles`/cwd 매핑이 실제 Lambda
// 안에서 기대대로 동작하지 않아 조용히 실패한다(FUNCTION_INVOCATION_FAILED 또는 무한
// 리다이렉트 폴백) — 함수의 JS 번들 안에 문자열로 직접 박아 넣으면 그 실패 경로 자체가
// 없어진다.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const html = readFileSync(join(root, 'dist/index.html'), 'utf-8');

const output = `// 이 파일은 빌드 시 자동 생성된다 — 직접 수정하지 말 것.
// 생성: scripts/generate-base-html.mjs (vite build 직후 실행)
export const BASE_HTML = ${JSON.stringify(html)};
`;

writeFileSync(join(root, 'api/_lib/baseHtml.generated.ts'), output);
console.log('[generate-base-html] api/_lib/baseHtml.generated.ts 생성 완료');
