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

describe('session messages', () => {
  it('SESSION_ESTABLISH의 토큰 쌍을 검증한다', () => {
    expect(
      parseWebToNative(
        '{"v":1,"type":"SESSION_ESTABLISH","payload":{"requestId":"r1","accessToken":"a","refreshToken":"r"}}',
      ),
    ).toEqual({
      v: 1,
      type: 'SESSION_ESTABLISH',
      payload: { requestId: 'r1', accessToken: 'a', refreshToken: 'r' },
    });
  });

  it('인증 SESSION_RESULT를 검증한다', () => {
    expect(
      parseNativeToWeb(
        '{"v":1,"type":"SESSION_RESULT","payload":{"requestId":"r1","status":"authenticated","accessToken":"a","revision":2}}',
      ),
    ).toMatchObject({ type: 'SESSION_RESULT', payload: { status: 'authenticated', revision: 2 } });
  });
});

describe('social login messages', () => {
  it.each(['apple', 'kakao'])('SOCIAL_LOGIN 요청을 파싱한다: %s', (provider) => {
    expect(
      parseWebToNative(
        `{"v":1,"type":"SOCIAL_LOGIN","payload":{"requestId":"r1","provider":"${provider}"}}`,
      ),
    ).toEqual({ v: 1, type: 'SOCIAL_LOGIN', payload: { requestId: 'r1', provider } });
  });

  it.each([
    '{"v":1,"type":"SOCIAL_LOGIN","payload":{"requestId":"r1","provider":"google"}}',
    '{"v":1,"type":"SOCIAL_LOGIN","payload":{"requestId":"r1"}}',
    '{"v":1,"type":"SOCIAL_LOGIN","payload":{"provider":"apple"}}',
  ])('알 수 없는 provider 나 requestId 누락은 무시한다: %s', (json) => {
    expect(parseWebToNative(json)).toBeNull();
  });

  it('apple 성공 결과의 자격증명을 파싱한다', () => {
    expect(
      parseNativeToWeb(
        '{"v":1,"type":"SOCIAL_LOGIN_RESULT","payload":{"requestId":"r1","provider":"apple","status":"success","credential":{"identityToken":"id","authorizationCode":"code"}}}',
      ),
    ).toEqual({
      v: 1,
      type: 'SOCIAL_LOGIN_RESULT',
      payload: {
        requestId: 'r1',
        provider: 'apple',
        status: 'success',
        credential: { identityToken: 'id', authorizationCode: 'code' },
      },
    });
  });

  it('kakao 성공 결과의 자격증명을 파싱한다', () => {
    expect(
      parseNativeToWeb(
        '{"v":1,"type":"SOCIAL_LOGIN_RESULT","payload":{"requestId":"r1","provider":"kakao","status":"success","credential":{"accessToken":"at"}}}',
      ),
    ).toMatchObject({ payload: { credential: { accessToken: 'at' } } });
  });

  it.each(['cancelled', 'error'])('실패 결과는 자격증명 없이 파싱한다: %s', (status) => {
    expect(
      parseNativeToWeb(
        `{"v":1,"type":"SOCIAL_LOGIN_RESULT","payload":{"requestId":"r1","provider":"apple","status":"${status}"}}`,
      ),
    ).toEqual({
      v: 1,
      type: 'SOCIAL_LOGIN_RESULT',
      payload: { requestId: 'r1', provider: 'apple', status },
    });
  });

  it.each([
    // success 인데 자격증명이 없거나 비어 있으면 백엔드 인증이 불가능하다
    '{"v":1,"type":"SOCIAL_LOGIN_RESULT","payload":{"requestId":"r1","provider":"apple","status":"success"}}',
    '{"v":1,"type":"SOCIAL_LOGIN_RESULT","payload":{"requestId":"r1","provider":"apple","status":"success","credential":{}}}',
    '{"v":1,"type":"SOCIAL_LOGIN_RESULT","payload":{"requestId":"r1","provider":"apple","status":"success","credential":{"identityToken":""}}}',
    '{"v":1,"type":"SOCIAL_LOGIN_RESULT","payload":{"requestId":"r1","provider":"apple","status":"unknown"}}',
  ])('자격증명이 없는 success 나 알 수 없는 status 는 무시한다: %s', (json) => {
    expect(parseNativeToWeb(json)).toBeNull();
  });
});
