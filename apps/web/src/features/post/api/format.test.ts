import { describe, expect, it } from 'vitest';
import { formatAuthorHandle } from '.';

describe('formatAuthorHandle', () => {
  it('원본 URL 호스트로 출처를 붙인다', () => {
    expect(formatAuthorHandle('nook.official', 'https://www.instagram.com/p/abc/')).toBe(
      '@nook.official on instagram',
    );
  });

  it('계정명에 이미 @ 가 붙어 있어도 중복되지 않는다', () => {
    expect(formatAuthorHandle('@nook.official', 'https://instagram.com/p/abc/')).toBe(
      '@nook.official on instagram',
    );
  });

  it('아직 매핑에 없는 출처는 호스트를 그대로 쓴다', () => {
    expect(formatAuthorHandle('nook', 'https://blog.naver.com/nook/1')).toBe(
      '@nook on blog.naver.com',
    );
  });

  it('출처를 알 수 없으면 계정명까지만 쓴다', () => {
    expect(formatAuthorHandle('nook')).toBe('@nook');
    expect(formatAuthorHandle('nook', 'not-a-url')).toBe('@nook');
  });

  it('계정명이 없으면 빈 문자열 — 링크에 라벨을 그리지 않는다', () => {
    expect(formatAuthorHandle(null, 'https://instagram.com/p/abc/')).toBe('');
  });
});
