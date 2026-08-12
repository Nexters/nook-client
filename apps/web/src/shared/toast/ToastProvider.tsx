import { Toast as ToastPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';

const TOAST_DURATION_MS = 3000;
/** CSS `--animate-toast-out` 길이(global.css)와 맞춰야 잔상 없이 큐가 넘어간다. */
const TOAST_EXIT_MS = 200;

export type ToastRequest =
  | { variant: 'description'; title: string; description: string }
  | { variant: 'action'; title: string; actionLabel: string; onAction: () => void }
  | { variant: 'simple'; title: string };

interface ActiveToast {
  id: string;
  request: ToastRequest;
}

interface ToastContextValue {
  showToast: (request: ToastRequest) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * 어디서든 토스트를 띄우는 훅. 3가지 타입(description/action/simple)만 제공한다 —
 * 화면마다 문구·버튼을 자유 조합하지 않고 디자인이 정의한 3개 모양 중 골라 쓰게 한다.
 * 자동 소멸(3초)·스와이프 해제·연속 노출 큐잉은 ToastProvider 가 전담한다.
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const [closingId, setClosingId] = useState<string | null>(null);
  const nextIdRef = useRef(0);

  const front = toasts[0] ?? null;
  const isOpen = front !== null && front.id !== closingId;

  const showToast = useCallback((request: ToastRequest) => {
    nextIdRef.current += 1;
    const id = `toast-${nextIdRef.current}`;
    setToasts((prev) => [...prev, { id, request }]);
  }, []);

  const closeFront = useCallback(() => {
    setClosingId((current) => current ?? (front ? front.id : current));
  }, [front]);

  // 타이머 만료·스와이프 해제 둘 다 Radix 가 open=false 로 알려온다.
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) closeFront();
    },
    [closeFront],
  );

  // closing 표시가 붙은 뒤 퇴장 애니메이션이 끝날 시간만큼 대기했다가 큐에서 제거한다.
  // 이때 비로소 다음 토스트가 새 key 로 마운트되며 진입 애니메이션을 새로 탄다.
  useEffect(() => {
    if (closingId === null) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== closingId));
      setClosingId(null);
    }, TOAST_EXIT_MS);
    return () => clearTimeout(timer);
  }, [closingId]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <ToastPrimitive.Provider duration={TOAST_DURATION_MS} swipeDirection="down">
        {children}
        {front ? (
          <ToastRoot
            key={front.id}
            request={front.request}
            open={isOpen}
            onOpenChange={handleOpenChange}
            onActionClick={closeFront}
          />
        ) : null}
        {createPortal(
          // 셸(AppProviders)의 will-change-transform 이 fixed 의 containing block 이 되는데,
          // 셸 높이는 페이지 콘텐츠만큼 늘어난다 — 뷰포트보다 긴 페이지에선 fixed 하단이
          // 화면 밖 문서 맨 아래로 밀려난다. body 로 포탈해 항상 실제 화면 기준으로 고정한다.
          <ToastPrimitive.Viewport
            className="fixed inset-x-0 z-50 flex justify-center px-4"
            style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
          />,
          document.body,
        )}
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

function ToastRoot({
  request,
  open,
  onOpenChange,
  onActionClick,
}: {
  request: ToastRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionClick: () => void;
}) {
  const simple = request.variant === 'simple';

  return (
    <ToastPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      className={cn(
        'flex h-15 w-full max-w-[343px] items-center gap-2.5 rounded-xl bg-gray-100/80 px-3 py-2',
        // Snackbar 와 동일한 시안 전용 값 — 디자인 시스템에 blur/shadow 토큰이 없다.
        'shadow-[0_5px_16px_0_rgba(0,0,0,0.22)] backdrop-blur-[2px]',
        'data-[state=open]:animate-toast-in data-[state=closed]:animate-toast-out',
        'data-[swipe=move]:translate-y-[var(--radix-toast-swipe-move-y)] data-[swipe=move]:transition-none',
        'data-[swipe=cancel]:translate-y-0 data-[swipe=cancel]:duration-200 data-[swipe=cancel]:ease-out',
        simple && 'justify-center',
      )}
    >
      {simple ? (
        <ToastPrimitive.Title className="truncate text-b2 font-medium text-gray-0">
          {request.title}
        </ToastPrimitive.Title>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <ToastPrimitive.Title className="truncate text-b2 font-medium text-gray-0">
            {request.title}
          </ToastPrimitive.Title>
          {request.variant === 'description' ? (
            <ToastPrimitive.Description className="truncate text-b3 font-normal text-gray-20">
              {request.description}
            </ToastPrimitive.Description>
          ) : null}
        </div>
      )}
      {request.variant === 'action' ? (
        <ToastPrimitive.Action altText={request.actionLabel} asChild>
          <Button
            size="sm"
            className="shrink-0 bg-gray-0 text-gray-100 hover:bg-gray-10 active:bg-gray-10"
            onClick={() => {
              request.onAction();
              onActionClick();
            }}
          >
            {request.actionLabel}
          </Button>
        </ToastPrimitive.Action>
      ) : null}
    </ToastPrimitive.Root>
  );
}
