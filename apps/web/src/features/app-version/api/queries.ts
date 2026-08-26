import { useQuery } from '@tanstack/react-query';
import { nativeBridge } from '@/native-bridge';
import { fetchAppVersionPolicy } from '.';

export const appVersionQueryKeys = {
  policy: ['app-version', 'policy'] as const,
};

/**
 * 앱 진입 시 한 번만 조회한다. 브라우저와 빌드 번호를 주입하지 않는 구버전 셸은
 * 필수 헤더를 채울 수 없어 서버가 거절하므로 애초에 부르지 않는다.
 */
export function useAppVersionPolicy() {
  return useQuery({
    queryKey: appVersionQueryKeys.policy,
    queryFn: fetchAppVersionPolicy,
    enabled: nativeBridge.isNative && !!nativeBridge.appBuildNumber,
    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
  });
}
