import type { PickedImage } from '@nook/bridge-contracts';
import {
  ApiClientError,
  apiClient,
  createProfileImageUpload,
  getMe as getMeEndpoint,
  logout as logoutEndpoint,
  unwrapApiResponse,
  updateMe as updateMeEndpoint,
  withdraw as withdrawEndpoint,
} from '@/shared/api';

/** 사진 업로드는 공용 15초로는 모자랄 수 있다 — 픽커가 압축했어도 회선이 느릴 수 있다. */
const UPLOAD_TIMEOUT_MS = 30_000;

export interface MyProfile {
  id: number;
  nickname: string;
  profileImageUrl: string | null;
}

export interface MyProfilePatch {
  nickname?: string;
  profileImageUrl?: string;
}

export async function fetchMyProfile(): Promise<MyProfile> {
  const dto = unwrapApiResponse(await getMeEndpoint({ auth: 'required' }));
  if (!dto) {
    throw new ApiClientError('내 정보 응답이 비어 있습니다.', { kind: 'contract' });
  }
  return {
    id: dto.id,
    nickname: dto.nickname,
    profileImageUrl: dto.profileImageUrl ?? null,
  };
}

export async function updateMyProfile(patch: MyProfilePatch): Promise<MyProfile> {
  const dto = unwrapApiResponse(await updateMeEndpoint(patch, { auth: 'required' }));
  if (!dto) {
    throw new ApiClientError('내 정보 수정 응답이 비어 있습니다.', { kind: 'contract' });
  }
  return {
    id: dto.id,
    nickname: dto.nickname,
    profileImageUrl: dto.profileImageUrl ?? null,
  };
}

/** 픽커가 준 base64 를 업로드할 바이트로 되돌린다. */
function decodeBase64(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

/**
 * 기기마다 같은 형식을 다른 이름으로 주는 경우만 맞춘다.
 * 서버가 안 받는 형식을 임의로 바꾸면 실제 바이트와 Content-Type 이 어긋나므로 그대로 보내고,
 * 지원 형식 판단은 서버에 맡긴다.
 */
function normalizeContentType(mimeType: string): string {
  const [type = ''] = mimeType.split(';');
  const normalized = type.trim().toLowerCase();
  return normalized === 'image/jpg' ? 'image/jpeg' : normalized;
}

/**
 * presigned URL 로 이미지를 직접 올리고, 프로필에 저장할 공개 URL 을 돌려준다.
 * 업로드 PUT 은 우리 서버가 아닌 스토리지로 나가므로 토큰을 붙이지 않는다
 * (ApiClient 의 auth 기본값이 'none' 이고, 외부 출처엔 토큰 전달 자체가 막혀 있다).
 */
export async function uploadProfileImage(image: PickedImage): Promise<string> {
  const ticket = unwrapApiResponse(
    await createProfileImageUpload(
      { contentType: normalizeContentType(image.mimeType) },
      { auth: 'required' },
    ),
  );
  if (!ticket) {
    throw new ApiClientError('업로드 URL 응답이 비어 있습니다.', { kind: 'contract' });
  }

  const bytes = decodeBase64(image.base64);
  // 스토리지가 거절하면 원인을 알 수 없는 오류만 남아서, 서버가 알려준 한도로 먼저 거른다.
  if (bytes.byteLength > ticket.maxBytes) {
    throw new ApiClientError('이미지 용량이 너무 커요.', { kind: 'contract' });
  }

  await apiClient.request(ticket.uploadUrl, {
    method: ticket.method,
    body: bytes,
    // 서명 대상 헤더는 서버가 확정해 내려준다 — 값이 하나라도 어긋나면 S3 가 거절한다.
    headers: ticket.headers,
    timeoutMs: UPLOAD_TIMEOUT_MS,
  });

  return ticket.profileImageUrl;
}

export async function requestLogout(): Promise<void> {
  unwrapApiResponse(await logoutEndpoint({ auth: 'required' }));
}

export async function requestWithdraw(): Promise<void> {
  unwrapApiResponse(await withdrawEndpoint({ auth: 'required' }));
}
