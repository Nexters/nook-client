import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderSharedArchiveHtml } from './og';

// vitest 는 워크스페이스 루트(apps/web)를 cwd 로 실행한다.
const REAL_INDEX_HTML = readFileSync(join(process.cwd(), 'index.html'), 'utf-8');

const BASE_HTML = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <title>nook</title>
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="nook" />
    <meta property="og:title" content="nook - 함께 저장하고 공유하는 공간" />
    <meta property="og:description" content="지도 위에 나만의 공간을 저장하고 친구와 공유해요" />
    <meta property="og:image" content="/og-default.png" />
    <meta property="og:url" content="" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

describe('renderSharedArchiveHtml', () => {
  it('아카이브 정보가 있으면 제목·설명·이미지·url 을 아카이브 기준으로 바꾼다', () => {
    const html = renderSharedArchiveHtml(BASE_HTML, {
      archive: {
        name: '성수 카페',
        ownerNickname: 'ehoidi',
        postCount: 12,
        thumbnailUrl: 'https://img.example/thumb.jpg',
      },
      shareUrl: 'https://www.everynook.co.kr/shared/tok-123',
      fallbackImageUrl: 'https://www.everynook.co.kr/og-default.png',
    });

    expect(html).toContain('<title>성수 카페 - Nook</title>');
    expect(html).toContain('property="og:title" content="성수 카페 - Nook"');
    expect(html).toContain('property="og:description" content="ehoidi님의 아카이브 · 12개 저장"');
    expect(html).toContain('property="og:image" content="https://img.example/thumb.jpg"');
    expect(html).toContain(
      'property="og:url" content="https://www.everynook.co.kr/shared/tok-123"',
    );
  });

  it('아카이브가 없으면(만료·삭제) 제목·설명은 기본값을 유지하고 이미지·url 만 채운다', () => {
    const html = renderSharedArchiveHtml(BASE_HTML, {
      archive: null,
      shareUrl: 'https://www.everynook.co.kr/shared/expired',
      fallbackImageUrl: 'https://www.everynook.co.kr/og-default.png',
    });

    expect(html).toContain('<title>nook</title>');
    expect(html).toContain('property="og:title" content="nook - 함께 저장하고 공유하는 공간"');
    expect(html).toContain(
      'property="og:image" content="https://www.everynook.co.kr/og-default.png"',
    );
    expect(html).toContain(
      'property="og:url" content="https://www.everynook.co.kr/shared/expired"',
    );
  });

  it('썸네일이 없는 아카이브는 기본 이미지로 대체한다', () => {
    const html = renderSharedArchiveHtml(BASE_HTML, {
      archive: { name: '빈 아카이브', postCount: 0 },
      shareUrl: 'https://www.everynook.co.kr/shared/empty',
      fallbackImageUrl: 'https://www.everynook.co.kr/og-default.png',
    });

    expect(html).toContain(
      'property="og:image" content="https://www.everynook.co.kr/og-default.png"',
    );
  });

  it('닉네임이 없으면 "님의" 없이 건수만 보여준다', () => {
    const html = renderSharedArchiveHtml(BASE_HTML, {
      archive: { name: '닉네임 없는 아카이브', postCount: 3 },
      shareUrl: 'https://www.everynook.co.kr/shared/no-nick',
      fallbackImageUrl: 'https://www.everynook.co.kr/og-default.png',
    });

    expect(html).toContain('property="og:description" content="아카이브 · 3개 저장"');
  });

  it('아카이브 이름에 HTML 특수문자가 있으면 이스케이프한다(마크업 삽입 방지)', () => {
    const html = renderSharedArchiveHtml(BASE_HTML, {
      archive: { name: '<script>alert(1)</script>', postCount: 1 },
      shareUrl: 'https://www.everynook.co.kr/shared/xss',
      fallbackImageUrl: 'https://www.everynook.co.kr/og-default.png',
    });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('실제 index.html 의 og:* 태그를 모두 갈아치운다 — 태그가 빠지면 조용히 무시되고 배포될 수 있어 실제 파일로 직접 검증한다', () => {
    const html = renderSharedArchiveHtml(REAL_INDEX_HTML, {
      archive: {
        name: '성수 카페',
        ownerNickname: 'ehoidi',
        postCount: 12,
        thumbnailUrl: 'https://img.example/thumb.jpg',
      },
      shareUrl: 'https://www.everynook.co.kr/shared/tok-123',
      fallbackImageUrl: 'https://www.everynook.co.kr/og-default.png',
    });

    expect(html).toContain('<title>성수 카페 - Nook</title>');
    expect(html).toContain('property="og:title" content="성수 카페 - Nook"');
    expect(html).toContain('property="og:description" content="ehoidi님의 아카이브 · 12개 저장"');
    expect(html).toContain('property="og:image" content="https://img.example/thumb.jpg"');
    expect(html).toContain(
      'property="og:url" content="https://www.everynook.co.kr/shared/tok-123"',
    );
  });
});
