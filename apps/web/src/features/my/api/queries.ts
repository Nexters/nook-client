import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchMyProfile, requestLogout, requestWithdraw } from '.';

export const myQueryKeys = {
  profile: ['my', 'profile'] as const,
};

export function useMyProfile() {
  return useQuery({
    queryKey: myQueryKeys.profile,
    queryFn: fetchMyProfile,
  });
}

/** 서버 세션 무효화만 담당한다. 기기 세션 정리는 호출부가 `useAuthSession().clear()`로 잇는다. */
export function useLogout() {
  return useMutation({
    mutationFn: requestLogout,
  });
}

/** 계정 삭제만 담당한다. 성공 시에만 호출부가 기기 세션을 지운다 — 실패하면 계정이 남아 있다. */
export function useWithdraw() {
  return useMutation({
    mutationFn: requestWithdraw,
  });
}
