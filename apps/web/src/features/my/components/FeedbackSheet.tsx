import { useState } from 'react';
import { Icon32Delete } from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';
import { useToast } from '@/shared/toast';
import { Button, Drawer, DrawerContent, DrawerTitle } from '@/shared/ui';

const FEEDBACK_MAX = 500;

const MOODS = [
  { id: 'good', label: '좋아요' },
  { id: 'meh', label: '아쉬워요' },
  { id: 'idea', label: '제안할게요' },
] as const;
type Mood = (typeof MOODS)[number]['id'];

const PLACEHOLDER: Record<Mood, string> = {
  good: '어떤 점이 좋았는지 들려주세요.',
  meh: '어디서 불편했는지 알려주시면 고칠게요.',
  idea: '있으면 좋겠는 기능을 적어주세요.',
};

/**
 * 마이 > 피드백 보내기 — 메일(문의하기)까지 가지 않고 한두 줄로 바로 남기는 창구.
 * 우리 제목형 바텀시트 규격(ArchiveFilterSheet): 핸들 없음, 헤더 px-4 py-5 H2 + 닫기,
 * 탭바 위 z-[70], 하단 Button_52 풀폭. 입력 상자는 공용 Input 과 같은 테두리·라운드.
 *
 * ponytail: 받는 API 가 아직 없다 — `onSubmit` 으로 넘기기만 한다(프로토타입은 로컬에 남긴다).
 */
export function FeedbackSheet({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (feedback: { mood: Mood; message: string }) => void;
}) {
  const { showToast } = useToast();
  const [mood, setMood] = useState<Mood>('good');
  const [message, setMessage] = useState('');
  const canSend = message.trim().length > 0;

  const reset = () => {
    setMood('good');
    setMessage('');
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DrawerContent
        aria-describedby={undefined}
        showHandle={false}
        overlayClassName="z-[70]"
        className="z-[70]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-start justify-between px-4 py-5">
          <div className="flex flex-col gap-1">
            <DrawerTitle className="text-h2 font-semibold text-gray-100">피드백 보내기</DrawerTitle>
            <p className="text-b2 font-medium text-gray-60">
              누크를 쓰면서 든 생각을 편하게 남겨주세요.
            </p>
          </div>
          <button
            type="button"
            aria-label="닫기"
            onClick={() => onOpenChange(false)}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
          >
            <Icon32Delete />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-4" data-vaul-no-drag>
          <fieldset className="flex gap-2">
            <legend className="sr-only">어떤 피드백인가요?</legend>
            {MOODS.map((item) => (
              <label
                key={item.id}
                className={cn(
                  'flex h-9 cursor-pointer items-center rounded-full border px-4 text-b2 font-semibold transition-colors',
                  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gray-100',
                  mood === item.id
                    ? 'border-gray-100 bg-gray-100 text-gray-0'
                    : 'border-gray-30 bg-gray-0 text-gray-70',
                )}
              >
                <input
                  type="radio"
                  name="feedback-mood"
                  value={item.id}
                  checked={mood === item.id}
                  onChange={() => setMood(item.id)}
                  className="sr-only"
                />
                {item.label}
              </label>
            ))}
          </fieldset>

          <label className="flex flex-col rounded-lg border border-gray-30 bg-gray-0 px-4 py-3 transition-colors focus-within:border-gray-100">
            <span className="sr-only">피드백 내용</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, FEEDBACK_MAX))}
              placeholder={PLACEHOLDER[mood]}
              rows={5}
              className="w-full resize-none bg-transparent text-b2 font-medium text-gray-100 outline-none placeholder:text-gray-40"
            />
            <span className="self-end text-b3 font-medium text-gray-50 tabular-nums">
              {message.length}/{FEEDBACK_MAX}
            </span>
          </label>
        </div>

        <div className="p-4">
          <Button
            size="lg"
            fullWidth
            disabled={!canSend}
            onClick={() => {
              onSubmit({ mood, message: message.trim() });
              onOpenChange(false);
              reset();
              showToast({ variant: 'simple', title: '소중한 의견 고마워요. 꼼꼼히 읽어볼게요' });
            }}
          >
            보내기
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
