import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHideBottomMenu } from '@/app/bottom-menu-visibility';
import { SlideScreen, useSlideScreen } from '@/app/slide-screen';
import { PLACE_REMINDER_KEY } from '@/features/archive/components/PlaceConnectionReminder';
import { setReminderHiddenUntil } from '@/features/archive/lib/reminderDismissal';
import { get2, unwrapApiResponse, update1 } from '@/shared/api';
import { AllowBackGesture } from '@/shared/lib/backGesture';
import { cn } from '@/shared/lib/utils';
import { useToast } from '@/shared/toast';
import { BackButton, Header } from '@/shared/ui';

const PUSH_PREVIEW_KEY = 'nook.prototype.settings.push';

/** 설정 시안 — 푸시 토글은 로컬 프로토타입 상태이며 실제 알림 권한과 별개다. */
export function SettingsPage() {
  useHideBottomMenu();
  const navigate = useNavigate();
  const { slidIn, slideOut } = useSlideScreen({
    close: useCallback(() => navigate('/my', { replace: true }), [navigate]),
  });
  const [pushEnabled, setPushEnabled] = useState(() => {
    try {
      return localStorage.getItem(PUSH_PREVIEW_KEY) !== 'false';
    } catch {
      return true;
    }
  });

  const client = useQueryClient();
  const { showToast } = useToast();
  const reminder = useQuery({
    queryKey: PLACE_REMINDER_KEY,
    queryFn: async () => unwrapApiResponse(await get2({ auth: 'required' })),
  });
  const updateReminder = useMutation({
    mutationFn: (enabled: boolean) => update1({ enabled }, { auth: 'required' }),
    onSuccess: async (_, enabled) => {
      if (enabled) setReminderHiddenUntil(0);
      await client.invalidateQueries({ queryKey: PLACE_REMINDER_KEY });
    },
    onError: () =>
      showToast({ variant: 'simple', title: '설정을 변경하지 못했어요. 다시 시도해주세요.' }),
  });
  const settings = [
    {
      id: 'push',
      title: '푸시 알림',
      description: '저장이 완료되면 알림을 보내드려요.',
      enabled: pushEnabled,
      setEnabled: setPushEnabled,
      key: PUSH_PREVIEW_KEY,
    },
    {
      id: 'reminder',
      title: '게시물 리마인드 보기',
      description: '장소가 없는 게시물을 모아 알려드려요.',
      enabled: reminder.data?.enabled ?? true,
      setEnabled: (enabled: boolean) => updateReminder.mutate(enabled),
      key: null,
    },
  ];

  return (
    <SlideScreen slidIn={slidIn} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <AllowBackGesture />
      <Header title="설정" left={<BackButton onClick={slideOut} />} />
      <main className="min-h-0 flex-1 overflow-y-auto bg-gray-0 px-4">
        {settings.map((setting) => (
          <div
            key={setting.id}
            className="flex items-center justify-between gap-3 border-b border-gray-10 px-2 py-4"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <p id={`${setting.id}-label`} className="text-b1 font-semibold text-gray-100">
                {setting.title}
              </p>
              <p id={`${setting.id}-description`} className="text-b2 font-medium text-gray-70">
                {setting.description}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={setting.enabled}
              disabled={
                setting.id === 'reminder' &&
                (reminder.isPending || reminder.isError || updateReminder.isPending)
              }
              aria-labelledby={`${setting.id}-label`}
              aria-describedby={`${setting.id}-description`}
              onClick={() => {
                const next = !setting.enabled;
                setting.setEnabled(next);
                try {
                  if (setting.key) localStorage.setItem(setting.key, String(next));
                } catch {
                  /* 현재 화면에서는 토글 상태를 유지한다. */
                }
              }}
              className={cn(
                'relative h-[26px] w-11 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-offset-2',
                setting.enabled ? 'bg-[#5488FF]' : 'bg-gray-20',
              )}
            >
              <span
                className={cn(
                  'absolute top-[3px] left-[3px] size-5 rounded-full bg-gray-0',
                  setting.enabled && 'translate-x-[18px]',
                )}
              />
            </button>
          </div>
        ))}
      </main>
    </SlideScreen>
  );
}
