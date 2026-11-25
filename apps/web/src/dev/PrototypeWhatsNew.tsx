import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SAMPLE_WHATS_NEW, WhatsNewSheet } from '@/features/whats-new/WhatsNewSheet';
import { env } from '@/shared/config/env';

const VERSION = '1.4.0';
const SEEN_KEY = 'nook.prototype.whats-new.seen';

/** 새 버전은 한 번 자동 안내하고, QA 리모컨은 언제든 다시 열 수 있다. */
export function PrototypeWhatsNew() {
  const [params, setParams] = useSearchParams();
  const [unseen, setUnseen] = useState(() => {
    if (!env.localPrototype) return false;
    try {
      return localStorage.getItem(SEEN_KEY) !== VERSION;
    } catch {
      return true;
    }
  });
  if (!env.localPrototype || (!unseen && params.get('whatsNew') !== '1')) return null;
  return (
    <WhatsNewSheet
      open
      onOpenChange={(open) => {
        if (open) return;
        setUnseen(false);
        try {
          localStorage.setItem(SEEN_KEY, VERSION);
        } catch {
          /* This session still dismisses. */
        }
        const next = new URLSearchParams(params);
        next.delete('whatsNew');
        setParams(next, { replace: true });
      }}
      version={VERSION}
      items={SAMPLE_WHATS_NEW}
    />
  );
}
