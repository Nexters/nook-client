import { useNavigate } from 'react-router-dom';
import { Icon24Back, Icon24Share } from '@/shared/icons/NookIcons';
import { cn } from '@/shared/lib/utils';

/**
 * `Header` 의 좌/우 슬롯에 넣는 아이콘 버튼들 (Figma `icon/24_back`, `icon/24_share`).
 *
 * 라우터를 쓰지만 특정 라우트를 알지는 않는다(히스토리 뒤로가기뿐) — 같은 이유로
 * 이미 `BottomMenu` 도 shared/ui 에서 NavLink 를 쓴다. archive·post 양쪽이 같은
 * 버튼을 쓰므로 여기 둔다. `onClick` 을 주면 뒤로가기 대신 그 동작을 한다.
 */
const iconButtonClass =
  'shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100';

function BackButton({ className, onClick }: { className?: string; onClick?: () => void }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      aria-label="뒤로 가기"
      onClick={onClick ?? (() => navigate(-1))}
      className={cn(iconButtonClass, className)}
    >
      <Icon24Back />
    </button>
  );
}

function ShareButton({ onClick, className }: { onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-label="공유하기"
      onClick={onClick}
      className={cn(iconButtonClass, className)}
    >
      <Icon24Share />
    </button>
  );
}

export { BackButton, ShareButton };
