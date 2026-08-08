import {
  ApiClientError,
  getMe as getMeEndpoint,
  logout as logoutEndpoint,
  unwrapApiResponse,
  withdraw as withdrawEndpoint,
} from '@/shared/api';

export interface MyProfile {
  id: number;
  nickname: string;
  profileImageUrl: string | null;
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

export async function requestLogout(): Promise<void> {
  unwrapApiResponse(await logoutEndpoint({ auth: 'required' }));
}

export async function requestWithdraw(): Promise<void> {
  unwrapApiResponse(await withdrawEndpoint({ auth: 'required' }));
}
