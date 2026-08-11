import type { PickedImage } from '@nook/bridge-contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchMyProfile,
  requestLogout,
  requestWithdraw,
  updateMyProfile,
  uploadProfileImage,
} from '.';

export const myQueryKeys = {
  profile: ['my', 'profile'] as const,
};

export function useMyProfile() {
  return useQuery({
    queryKey: myQueryKeys.profile,
    queryFn: fetchMyProfile,
  });
}

export interface SaveProfileInput {
  nickname: string;
  /** 새로 고른 이미지. 없으면 기존 이미지를 그대로 둔다. */
  image?: PickedImage | null;
}

/**
 * 회원 정보 저장. 새 이미지가 있으면 업로드해서 받은 공개 URL 까지 함께 반영한다.
 * 업로드가 실패하면 프로필을 건드리지 않는다 — 저장 전체가 실패로 끝난다.
 */
export function useSaveProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ nickname, image }: SaveProfileInput) => {
      const profileImageUrl = image ? await uploadProfileImage(image) : undefined;
      return updateMyProfile(profileImageUrl ? { nickname, profileImageUrl } : { nickname });
    },
    // 응답이 곧 최신 프로필이라 다시 조회하지 않고 캐시를 바로 갈아끼운다.
    onSuccess: (profile) => queryClient.setQueryData(myQueryKeys.profile, profile),
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
