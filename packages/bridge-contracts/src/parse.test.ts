import { describe, expect, it } from 'vitest';
import { parseNativeToWeb, parseWebToNative } from './parse';

describe('parseWebToNative', () => {
  it('지원하는 메시지를 파싱한다', () => {
    expect(
      parseWebToNative('{"v":1,"type":"OPEN_EXTERNAL_URL","payload":{"url":"https://nook.com"}}'),
    ).toEqual({ v: 1, type: 'OPEN_EXTERNAL_URL', payload: { url: 'https://nook.com' } });
  });

  it.each([
    'null',
    '[]',
    '{"v":2,"type":"WEB_READY","payload":{}}',
    '{"v":1,"type":"OPEN_EXTERNAL_URL"}',
    '{"v":1,"type":"OPEN_EXTERNAL_URL","payload":{}}',
    '{"v":1,"type":"UNKNOWN","payload":{}}',
  ])('잘못됐거나 지원하지 않는 메시지는 무시한다: %s', (json) => {
    expect(parseWebToNative(json)).toBeNull();
  });
});

describe('parseNativeToWeb', () => {
  it('APP_RESUMED 메시지를 파싱한다', () => {
    expect(parseNativeToWeb('{"v":1,"type":"APP_RESUMED","payload":{}}')).toEqual({
      v: 1,
      type: 'APP_RESUMED',
      payload: {},
    });
  });

  it('지원하지 않는 메시지는 무시한다', () => {
    expect(parseNativeToWeb('{"v":1,"type":"UNKNOWN","payload":{}}')).toBeNull();
  });
});
