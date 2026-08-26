import {
  type AppVersionPolicyResponseUpdateType,
  getPolicy as getPolicyEndpoint,
  unwrapApiResponse,
} from '@/shared/api';

export type AppUpdateType = AppVersionPolicyResponseUpdateType;

export interface AppVersionPolicy {
  updateType: AppUpdateType;
  latestBuildNumber: number | null;
  latestVersion: string | null;
  storeUrl: string | null;
}

/**
 * 앱 버전 정책 — 공개 API 라 auth 없이 부른다. 서버가 요구하는 X-App-Platform ·
 * X-App-Build-Number 는 ApiClient 가 모든 요청에 자동으로 싣는다.
 */
export async function fetchAppVersionPolicy(): Promise<AppVersionPolicy> {
  const dto = unwrapApiResponse(await getPolicyEndpoint());
  if (!dto) throw new Error('앱 버전 정책 응답이 비어 있어요');
  return {
    updateType: dto.updateType,
    latestBuildNumber: dto.latestBuildNumber ?? null,
    latestVersion: dto.latestVersion ?? null,
    storeUrl: dto.storeUrl ?? null,
  };
}
