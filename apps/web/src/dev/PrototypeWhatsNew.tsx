import { useSearchParams } from 'react-router-dom';
import { SAMPLE_WHATS_NEW, WhatsNewSheet } from '@/features/whats-new/WhatsNewSheet';
import { env } from '@/shared/config/env';

/** 로컬 프로토타입 전용 — `?whatsNew=1` 이면 업데이트 안내 시트를 띄운다(QA 리모컨). */
export function PrototypeWhatsNew() {
  const [params, setParams] = useSearchParams();
  if (!env.localPrototype) return null;
  return (
    <WhatsNewSheet
      open={params.get('whatsNew') === '1'}
      onOpenChange={(open) => {
        if (open) return;
        const next = new URLSearchParams(params);
        next.delete('whatsNew');
        setParams(next, { replace: true });
      }}
      version="1.4.0"
      items={SAMPLE_WHATS_NEW}
    />
  );
}
