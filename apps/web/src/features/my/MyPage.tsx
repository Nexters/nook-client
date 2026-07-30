import { useEffect, useState } from 'react';
import { useBottomMenuVisibility } from '@/app/bottom-menu-visibility';
import { MainTabPageLayout } from '@/app/layouts/MainTabPageLayout';
import { MyMenuRow } from '@/features/my/components/MyMenuRow';
import { MyMenuSection } from '@/features/my/components/MyMenuSection';
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

const USER = {
  nickname: '졸림핑',
  groupCount: 5,
  savedPlaceCount: 32,
  loginProvider: 'kakao',
} as const;

export function MyPage() {
  const [editingProfile, setEditingProfile] = useState(false);
  const [nickname, setNickname] = useState<string>(USER.nickname);
  const [draftNickname, setDraftNickname] = useState<string>(USER.nickname);
  const [dialog, setDialog] = useState<Dialog>(null);
  const { setHidden: setBottomMenuHidden } = useBottomMenuVisibility();

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
            <Avatar size="lg" alt="프로필 이미지" onEdit={() => {}} />
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
              setNickname(draftNickname.trim());
              setEditingProfile(false);
            }}
          >
            저장하기
          </Button>
        </section>
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
          <button
            type="button"
            onClick={openProfileEditor}
            className="mx-4 flex h-25 w-[calc(100%-2rem)] items-center gap-4 rounded-sm bg-gray-0 px-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-inset"
          >
            <Avatar size="sm" alt="프로필 이미지" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-b1 font-semibold text-gray-100">{nickname}</span>
              <span className="mt-1 block font-mono text-e2 text-gray-60">
                Group {USER.groupCount} · Save {USER.savedPlaceCount}
              </span>
            </span>
            <span aria-hidden="true" className="text-gray-40">
              <Icon16ArrowRight />
            </span>
          </button>

          <div className="mt-6 flex flex-col gap-5 px-4">
            <MyMenuSection title="계정 정보">
              <MyMenuRow
                icon={<Icon16User />}
                label="로그인 정보"
                value={USER.loginProvider}
                onClick={() => {}}
              />
            </MyMenuSection>

            <MyMenuSection title="앱 정보">
              <MyMenuRow icon={<Icon16Version />} label="버전 정보" badge="최신버전" value="v1.0" />
              <MyMenuRow icon={<Icon16Info />} label="개인정보 처리방침" onClick={() => {}} />
              <MyMenuRow icon={<Icon16Paper />} label="이용약관" onClick={() => {}} />
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
        onConfirm={() => setDialog(null)}
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
