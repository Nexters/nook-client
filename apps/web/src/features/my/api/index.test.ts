import type { PickedImage } from '@nook/bridge-contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '@/shared/api';
import { uploadProfileImage } from '.';

const mocks = vi.hoisted(() => ({
  createProfileImageUpload: vi.fn(),
  request: vi.fn(),
}));

vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api')>()),
  createProfileImageUpload: mocks.createProfileImageUpload,
  apiClient: { request: mocks.request },
}));

// 'hi' 를 base64 로 인코딩한 값 — 디코딩하면 2바이트다.
const IMAGE: PickedImage = { base64: 'aGk=', mimeType: 'image/png', width: 10, height: 10 };

const TICKET = {
  uploadUrl: 'https://storage.example.com/upload?sig=abc',
  method: 'PUT',
  contentType: 'image/png',
  headers: {
    'Content-Type': 'image/png',
    'Cache-Control': 'public, max-age=31536000, immutable',
  },
  maxBytes: 1024,
  expiresAt: '2026-08-11T00:00:00Z',
  profileImageUrl: 'https://cdn.example.com/profile/1.png',
};

function ticketResponse(overrides: Partial<typeof TICKET> = {}) {
  return { resultType: 'SUCCESS' as const, success: { ...TICKET, ...overrides } };
}

describe('uploadProfileImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createProfileImageUpload.mockResolvedValue(ticketResponse());
    mocks.request.mockResolvedValue(undefined);
  });

  it('발급받은 presigned URL 로 이미지를 올리고 공개 URL 을 돌려준다', async () => {
    const url = await uploadProfileImage(IMAGE);

    expect(mocks.createProfileImageUpload).toHaveBeenCalledWith(
      { contentType: 'image/png' },
      { auth: 'required' },
    );

    const [uploadUrl, init] = mocks.request.mock.calls[0] ?? [];
    expect(uploadUrl).toBe(TICKET.uploadUrl);
    expect(init.method).toBe('PUT');
    // 서명 대상 헤더는 서버 응답값을 그대로 전달한다 — 하나라도 어긋나면 S3 가 거절한다.
    expect(init.headers).toEqual(TICKET.headers);
    expect(Array.from(new Uint8Array(init.body as ArrayBuffer))).toEqual([0x68, 0x69]);
    // 스토리지로 나가는 요청이라 토큰을 붙이지 않는다(ApiClient 기본값 유지).
    expect(init.auth).toBeUndefined();

    expect(url).toBe(TICKET.profileImageUrl);
  });

  it('기기가 주는 image/jpg 별칭은 서버 표기로 바꿔 발급받는다', async () => {
    await uploadProfileImage({ ...IMAGE, mimeType: 'image/jpg' });

    expect(mocks.createProfileImageUpload).toHaveBeenCalledWith(
      { contentType: 'image/jpeg' },
      { auth: 'required' },
    );
  });

  it('서버가 알려준 최대 용량을 넘으면 업로드하지 않는다', async () => {
    mocks.createProfileImageUpload.mockResolvedValue(ticketResponse({ maxBytes: 1 }));

    await expect(uploadProfileImage(IMAGE)).rejects.toBeInstanceOf(ApiClientError);
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it('업로드가 실패하면 공개 URL 을 돌려주지 않는다', async () => {
    mocks.request.mockRejectedValue(
      new ApiClientError('네트워크 연결을 확인해주세요.', { kind: 'network' }),
    );

    await expect(uploadProfileImage(IMAGE)).rejects.toBeInstanceOf(ApiClientError);
  });
});
