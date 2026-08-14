import type { ImagePickSource, PickedImage } from '@nook/bridge-contracts';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBottomMenuVisibility } from '@/app/bottom-menu-visibility';
import { MainTabPageLayout } from '@/app/layouts/MainTabPageLayout';
import { SlideScreen, useSlideScreen } from '@/app/slide-screen';
import { useAuthSession } from '@/features/auth/session/AuthSessionProvider';
import { useGroups } from '@/features/group/api/queries';
import { useLogout, useMyProfile, useSaveProfile, useWithdraw } from '@/features/my/api/queries';
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
import { useHistoryBackedFlag } from '@/shared/lib/useHistoryBackedFlag';
import { useToast } from '@/shared/toast';
import { Avatar, Button, Header, Input, Popup, Skeleton } from '@/shared/ui';

type Dialog = 'logout' | 'withdraw' | null;

export function MyPage() {
  const navigate = useNavigate();
  // 뒤로가기(버튼·하드웨어 백·스와이프)로 닫혀야 해서 히스토리 엔트리로 승격한다.
  const [editingProfile, openEditingProfile, closeEditingProfile] =
    useHistoryBackedFlag('profileEdit');
  const [draftNickname, setDraftNickname] = useState<string>('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [imageSheetOpen, setImageSheetOpen] = useState(false);
  // 픽커로 고른 원본. 저장할 때 업로드해야 해서 data URI 가 아니라 그대로 들고 있는다.
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const { setHidden: setBottomMenuHidden } = useBottomMenuVisibility();
  const { clear: clearSession } = useAuthSession();
  const { data: profile, isPending: profilePending, isError: profileError } = useMyProfile();
  const { data: groups } = useGroups();
  const logout = useLogout();
  const withdraw = useWithdraw();
  const saveProfile = useSaveProfile();
  const { showToast } = useToast();
  // 회원 정보는 라우트가 아니라 이 화면 위에 얹히는 전체화면이라 open 을 직접 넘긴다.
  const { slidIn, slideOut } = useSlideScreen({
    open: editingProfile,
    close: closeEditingProfile,
  });

  const nickname = profile?.nickname ?? '';
  const previewUrl = pickedImage
    ? `data:${pickedImage.mimeType};base64,${pickedImage.base64}`
    : undefined;
  const avatarUrl = previewUrl ?? profile?.profileImageUrl ?? undefined;
  const savedPlaceCount = groups?.reduce((sum, group) => sum + group.placeCount, 0) ?? 0;
  // 서버는 KAKAO/APPLE 처럼 대문자로 주지만 시안 표기는 소문자다.
  const providerLabel = profile ? profile.provider.toLowerCase() : undefined;
  // 셸이 주입한 실제 앱 버전. 브라우저로 열면 알 수 없어 행에서 값만 빠진다.
  const appVersion = nativeBridge.appVersion ? `v${nativeBridge.appVersion}` : undefined;

  const handlePickImage = async (source: ImagePickSource) => {
    setImageSheetOpen(false);
    // 셸 밖(개발용 브라우저)에서는 픽커를 열 수 없다.
    if (!nativeBridge.isNative) return;
    const result = await nativeBridge.requestImagePick(source);
    if (result.status === 'success' && result.image) {
      setPickedImage(result.image);
    }
  };

  const handleSaveProfile = async () => {
    if (saveProfile.isPending) return;
    try {
      await saveProfile.mutateAsync({ nickname: draftNickname.trim(), image: pickedImage });
    } catch {
      // 실패하면 편집 화면에 머무른다 — 고른 사진과 입력이 날아가지 않게.
      showToast({
        variant: 'description',
        title: '저장하지 못했어요',
        description: '잠시 후 다시 시도해주세요',
      });
      return;
    }
    slideOut();
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

  const handleWithdraw = async () => {
    if (withdraw.isPending) return;
    try {
      await withdraw.mutateAsync();
    } catch {
      // 로그아웃과 달리 실패하면 계정이 남아 있다 — 세션을 지우지 않고 알린다.
      setDialog(null);
      showToast({
        variant: 'description',
        title: '탈퇴하지 못했어요',
        description: '잠시 후 다시 시도해주세요',
      });
      return;
    }
    setDialog(null);
    await clearSession();
  };

  useEffect(() => {
    setBottomMenuHidden(editingProfile);
    return () => setBottomMenuHidden(false);
  }, [editingProfile, setBottomMenuHidden]);

  // 편집 화면은 하드웨어 백·스와이프로도 닫히므로, 닫히는 길목 하나에서 저장 안 된 사진을 버린다.
  // 안 그러면 마이페이지 카드에 업로드된 적 없는 미리보기가 남는다.
  useEffect(() => {
    if (!editingProfile) setPickedImage(null);
  }, [editingProfile]);

  const openProfileEditor = () => {
    setDraftNickname(nickname);
    openEditingProfile();
  };

  // 슬라이드 동안 뒤로 마이페이지 목록이 비쳐야 해서, 분기 대신 목록 위에 얹는다.
  const profileEditScreen = editingProfile ? (
    <SlideScreen
      slidIn={slidIn}
      className="overflow-y-auto overscroll-contain"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <Header
        title="회원 정보"
        left={
          <button
            type="button"
            aria-label="마이페이지로 돌아가기"
            onClick={slideOut}
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
          disabled={draftNickname.trim().length === 0 || saveProfile.isPending}
          className="mt-auto"
          style={{ marginBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
          onClick={handleSaveProfile}
        >
          {saveProfile.isPending ? '저장 중...' : '저장하기'}
        </Button>
      </section>

      <ProfileImageSheet
        open={imageSheetOpen}
        onOpenChange={setImageSheetOpen}
        onSelect={handlePickImage}
      />
    </SlideScreen>
  ) : null;

  return (
    <>
      {/* 회원 정보가 덮고 있는 동안 뒤 목록으로 포커스가 들어가거나 낭독되지 않게 막는다. */}
      <div inert={editingProfile}>
        <MainTabPageLayout>
          <main
            className="h-full overflow-y-auto bg-gray-10"
            style={{ paddingBottom: 'calc(3.75rem + env(safe-area-inset-bottom))' }}
          >
            {/* 로딩 중에는 빈 이름이 잠깐 스쳐 지나가지 않도록 카드를 그리지 않는다. */}
            {/* 로딩 중에도 카드 자리를 같은 크기로 채워 레이아웃 시프트를 막는다. */}
            {profilePending ? (
              <div className="mx-4 flex h-25 items-center gap-4 rounded-sm bg-gray-0 px-4">
                <Skeleton className="size-15 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4.5 w-24" />
                  <Skeleton className="mt-2 h-3.5 w-32" />
                </div>
              </div>
            ) : profileError ? (
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
                <MyMenuRow icon={<Icon16User />} label="로그인 정보" value={providerLabel} />
              </MyMenuSection>

              <MyMenuSection title="앱 정보">
                {/* TODO: "최신버전" 배지는 아직 하드코딩이다 — 스토어 최신 버전을 알려주는
                  API 가 생기기 전까지는 실제 최신 여부를 판단할 수 없다. */}
                <MyMenuRow
                  icon={<Icon16Version />}
                  label="버전 정보"
                  badge="최신버전"
                  value={appVersion}
                />
                <MyMenuRow
                  icon={<Icon16Info />}
                  label="개인정보 처리방침"
                  onClick={() => navigate('/privacy')}
                />
                <MyMenuRow
                  icon={<Icon16Paper />}
                  label="이용약관"
                  onClick={() => navigate('/terms')}
                />
                <MyMenuRow
                  icon={<Icon16Chat />}
                  label="문의하기"
                  onClick={() => navigate('/support')}
                />
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
      </div>

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
        onConfirm={handleWithdraw}
      />

      {profileEditScreen}
    </>
  );
}
