import type { ImagePickSource } from '@nook/bridge-contracts';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBottomMenuVisibility } from '@/app/bottom-menu-visibility';
import { MainTabPageLayout } from '@/app/layouts/MainTabPageLayout';
import { useAuthSession } from '@/features/auth/session/AuthSessionProvider';
import { useGroups } from '@/features/group/api/queries';
import { useLogout, useMyProfile } from '@/features/my/api/queries';
import { MyMenuRow } from '@/features/my/components/MyMenuRow';
import { MyMenuSection } from '@/features/my/components/MyMenuSection';
import { ProfileImageSheet } from '@/features/my/components/ProfileImageSheet';
import { nativeBridge } from '@/native-bridge';
import {
  Icon16ArrowRight,
  Icon16Chat,
  Icon16Info,
  Icon16Paper,
  Icon16User,
  Icon16Version,
  Icon24Back,
} from '@/shared/icons/NookIcons';
import { Avatar, Button, Header, Input, Popup } from '@/shared/ui';

type Dialog = 'logout' | 'withdraw' | null;

export function MyPage() {
  const navigate = useNavigate();
  const [editingProfile, setEditingProfile] = useState(false);
  // 수정 API 연결 전까지는 저장해도 화면에서만 바뀐다.
  const [nicknameOverride, setNicknameOverride] = useState<string | null>(null);
  const [draftNickname, setDraftNickname] = useState<string>('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [imageSheetOpen, setImageSheetOpen] = useState(false);
  // 픽커로 고른 이미지의 data URI. 업로드 API 연결 전까지는 화면 미리보기만 한다.
  const [pickedImageUrl, setPickedImageUrl] = useState<string | null>(null);
  const { setHidden: setBottomMenuHidden } = useBottomMenuVisibility();
  const { clear: clearSession } = useAuthSession();
  const { data: profile, isPending: profilePending, isError: profileError } = useMyProfile();
  const { data: groups } = useGroups();
  const logout = useLogout();

  const nickname = nicknameOverride ?? profile?.nickname ?? '';
  const avatarUrl = pickedImageUrl ?? profile?.profileImageUrl ?? undefined;
  const savedPlaceCount = groups?.reduce((sum, group) => sum + group.placeCount, 0) ?? 0;

  const handlePickImage = async (source: ImagePickSource) => {
    setImageSheetOpen(false);
    // 셸 밖(개발용 브라우저)에서는 픽커를 열 수 없다.
    if (!nativeBridge.isNative) return;
    const result = await nativeBridge.requestImagePick(source);
    if (result.status === 'success' && result.image) {
      setPickedImageUrl(`data:${result.image.mimeType};base64,${result.image.base64}`);
    }
  };

  const handleLogout = async () => {
    if (logout.isPending) return;
    try {
      await logout.mutateAsync();
    } catch {
      // 서버 로그아웃이 실패해도(만료된 토큰 등) 기기 세션은 지운다.
    }
    setDialog(null);
    // 세션이 지워지면 RequireAuth 가 로그인 화면으로 보낸다.
    await clearSession();
  };

  useEffect(() => {
    setBottomMenuHidden(editingProfile);
    return () => setBottomMenuHidden(false);
  }, [editingProfile, setBottomMenuHidden]);

  const openProfileEditor = () => {
    setDraftNickname(nickname);
    setEditingProfile(true);
  };

  if (editingProfile) {
    return (
      <main
        className="flex min-h-dvh flex-col bg-gray-0"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <Header
          title="회원 정보"
          left={
            <button
              type="button"
              aria-label="마이페이지로 돌아가기"
              onClick={() => setEditingProfile(false)}
              className="flex size-6 items-center justify-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
            >
              <Icon24Back />
            </button>
          }
        />

        <section className="flex flex-1 flex-col px-4 pt-6">
          <div className="flex justify-center">
            <Avatar
              size="lg"
              src={avatarUrl}
              alt="프로필 이미지"
              onEdit={() => setImageSheetOpen(true)}
            />
          </div>

          <label htmlFor="nickname" className="mt-8 mb-1 block text-b3 font-medium text-gray-60">
            닉네임
          </label>
          <Input
            id="nickname"
            value={draftNickname}
            maxLength={25}
            aria-label="닉네임"
            onChange={(event) => setDraftNickname(event.target.value)}
            onClear={() => setDraftNickname('')}
          />

          <Button
            size="lg"
            fullWidth
            disabled={draftNickname.trim().length === 0}
            className="mt-auto mb-4"
            onClick={() => {
              setNicknameOverride(draftNickname.trim());
              setEditingProfile(false);
            }}
          >
            저장하기
          </Button>
        </section>

        <ProfileImageSheet
          open={imageSheetOpen}
          onOpenChange={setImageSheetOpen}
          onSelect={handlePickImage}
        />
      </main>
    );
  }

  return (
    <>
      <MainTabPageLayout>
        <main
          className="h-full overflow-y-auto bg-gray-10"
          style={{ paddingBottom: 'calc(3.75rem + env(safe-area-inset-bottom))' }}
        >
          {/* 로딩 중에는 빈 이름이 잠깐 스쳐 지나가지 않도록 카드를 그리지 않는다. */}
          {profilePending ? null : profileError ? (
            <p className="mx-4 flex h-25 items-center justify-center rounded-sm bg-gray-0 text-b2 text-gray-60">
              내 정보를 불러오지 못했어요
            </p>
          ) : (
            <button
              type="button"
              onClick={openProfileEditor}
              className="mx-4 flex h-25 w-[calc(100%-2rem)] items-center gap-4 rounded-sm bg-gray-0 px-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-inset"
            >
              <Avatar size="sm" src={avatarUrl} alt="프로필 이미지" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-b1 font-semibold text-gray-100">
                  {nickname}
                </span>
                <span className="mt-1 block font-mono text-e2 text-gray-60">
                  {groups ? `Group ${groups.length} · Save ${savedPlaceCount}` : null}
                </span>
              </span>
              <span aria-hidden="true" className="text-gray-40">
                <Icon16ArrowRight />
              </span>
            </button>
          )}

          <div className="mt-6 flex flex-col gap-5 px-4">
            <MyMenuSection title="계정 정보">
              {/* 로그인 provider 는 아직 API 가 내려주지 않는다. */}
              <MyMenuRow icon={<Icon16User />} label="로그인 정보" />
            </MyMenuSection>

            <MyMenuSection title="앱 정보">
              <MyMenuRow icon={<Icon16Version />} label="버전 정보" badge="최신버전" value="v1.0" />
              <MyMenuRow
                icon={<Icon16Info />}
                label="개인정보 처리방침"
                onClick={() => navigate('/my/privacy')}
              />
              <MyMenuRow
                icon={<Icon16Paper />}
                label="이용약관"
                onClick={() => navigate('/my/terms')}
              />
              <MyMenuRow icon={<Icon16Chat />} label="문의하기" onClick={() => {}} />
            </MyMenuSection>
          </div>

          <div className="flex h-14 items-center justify-center px-4 text-b2 font-semibold">
            <button
              type="button"
              onClick={() => setDialog('logout')}
              className="flex-1 text-gray-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
            >
              로그아웃
            </button>
            <span aria-hidden="true" className="h-6 w-px bg-gray-20" />
            <button
              type="button"
              onClick={() => setDialog('withdraw')}
              className="flex-1 text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
            >
              탈퇴하기
            </button>
          </div>
        </main>
      </MainTabPageLayout>

      <Popup
        open={dialog === 'logout'}
        onClose={() => setDialog(null)}
        title="로그아웃 하시겠어요?"
        description="로그아웃하면 로그인 화면으로 이동해요."
        confirmLabel="로그아웃"
        onConfirm={handleLogout}
      />
      <Popup
        open={dialog === 'withdraw'}
        onClose={() => setDialog(null)}
        title="탈퇴하시겠어요?"
        description={
          <>
            저장한 장소와 기록이 모두 삭제되고
            <br />
            복구할 수 없어요.
          </>
        }
        confirmLabel="탈퇴하기"
        variant="warning"
        onConfirm={() => setDialog(null)}
      />
    </>
  );
}
