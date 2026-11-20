import './prototype-place-context-menu.css';
import { ContextMenu } from 'radix-ui';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Place } from '@/features/place';
import { buildNaverMapSearchUrl } from '@/features/place/lib/naverMapLink';
import { env } from '@/shared/config/env';
import { Icon16Share, Icon16Trash } from '@/shared/icons/NookIcons';
import { useCloseOnBack } from '@/shared/lib/backInterceptors';
import { useToast } from '@/shared/toast';
import { Popup } from '@/shared/ui';

/** NOOK-418 interaction mock: affects only this local preview, never the API. */
export function PrototypePlaceContextMenu({
  place,
  shared,
  children,
}: {
  place: Place;
  shared: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [menuKey, setMenuKey] = useState(0);
  const { showToast } = useToast();
  const press = useRef<{ x: number; y: number; timer: number } | null>(null);
  const suppressClick = useRef(false);
  const clearPress = useCallback(() => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  }, []);
  useEffect(() => clearPress, [clearPress]);
  const close = () => {
    setOpen(false);
    setMenuKey((value) => value + 1);
  };
  useCloseOnBack(open, close);
  if (!env.localPrototype) return children;
  if (removed) return null;
  return (
    <>
      {open
        ? createPortal(<div className="prototype-context-dim" aria-hidden="true" />, document.body)
        : null}
      <ContextMenu.Root key={menuKey} onOpenChange={setOpen}>
        <ContextMenu.Trigger asChild>
          <div
            className="prototype-context-trigger"
            data-prototype-place={place.id}
            onPointerDown={(event) => {
              suppressClick.current = false;
              if (event.pointerType !== 'mouse' || event.button !== 0) return;
              clearPress();
              const target = event.currentTarget;
              const { clientX: x, clientY: y } = event;
              press.current = {
                x,
                y,
                timer: window.setTimeout(() => {
                  suppressClick.current = true;
                  target.dispatchEvent(
                    new MouseEvent('contextmenu', {
                      bubbles: true,
                      cancelable: true,
                      clientX: x,
                      clientY: y,
                    }),
                  );
                }, 700),
              };
            }}
            onPointerMove={(event) => {
              if (
                press.current &&
                Math.hypot(event.clientX - press.current.x, event.clientY - press.current.y) > 10
              )
                clearPress();
            }}
            onPointerUp={clearPress}
            onPointerCancel={clearPress}
            onPointerLeave={clearPress}
            onClickCapture={(event) => {
              if (open || suppressClick.current) {
                suppressClick.current = false;
                event.preventDefault();
                event.stopPropagation();
              }
            }}
          >
            {children}
          </div>
        </ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Content
            className="prototype-context-menu text-gray-100"
            collisionPadding={16}
            aria-label={`${place.name} 관리`}
          >
            <ContextMenu.Item
              className="prototype-context-action"
              onSelect={async () => {
                try {
                  await navigator.clipboard.writeText(buildNaverMapSearchUrl(place));
                  showToast({ variant: 'simple', title: '장소 링크를 복사했어요' });
                } catch {
                  showToast({ variant: 'simple', title: '링크를 복사하지 못했어요' });
                }
              }}
            >
              공유하기
              <Icon16Share />
            </ContextMenu.Item>
            {!shared ? (
              <ContextMenu.Item
                className="prototype-context-action text-error"
                onSelect={() => setConfirming(true)}
              >
                아카이브에서 삭제
                <Icon16Trash size={20} />
              </ContextMenu.Item>
            ) : null}
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>
      <Popup
        open={confirming}
        onClose={() => setConfirming(false)}
        title="아카이브에서 장소를 삭제할까요?"
        description="목업에서는 이 화면의 카드만 제거돼요. 원본 게시물과 저장 데이터는 유지돼요."
        confirmLabel="삭제"
        variant="warning"
        onConfirm={() => {
          setConfirming(false);
          setRemoved(true);
          showToast({
            variant: 'link',
            title: '아카이브에서 장소를 삭제했어요',
            actionLabel: '취소',
            onAction: () => setRemoved(false),
          });
        }}
      />
    </>
  );
}
