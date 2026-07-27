import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import { Button, type ButtonProps } from '@/shared/ui';

interface SocialLoginButtonProps
  extends Omit<ButtonProps, 'asChild' | 'children' | 'fullWidth' | 'size' | 'variant'> {
  icon: ReactNode;
  label: string;
  provider: 'kakao' | 'apple';
}

export function SocialLoginButton({
  className,
  icon,
  label,
  provider,
  ...props
}: SocialLoginButtonProps) {
  return (
    <Button
      variant={null}
      size="lg"
      fullWidth
      className={cn(
        'font-medium transition-[filter,transform] duration-150',
        'active:scale-[0.99] disabled:opacity-50 motion-reduce:transition-none',
        provider === 'kakao'
          ? 'bg-[#fae100] text-gray-100 hover:brightness-[0.98] disabled:bg-[#fae100] disabled:text-gray-100'
          : 'bg-black text-gray-0 hover:brightness-110 disabled:bg-black disabled:text-gray-0',
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="flex size-5 items-center justify-center">
        {icon}
      </span>
      {label}
    </Button>
  );
}

export function KakaoIcon() {
  return (
    <svg viewBox="0 0 20 20" style={{ width: 20, height: 20 }} aria-hidden="true">
      <path
        fill="currentColor"
        d="M10 2C4.48 2 0 5.71 0 10.28c0 2.84 1.73 5.35 4.37 6.84l-1.11 4.34c-.1.38.31.69.63.47l4.86-3.44c.41.04.83.06 1.25.06 5.52 0 10-3.7 10-8.27C20 5.71 15.52 2 10 2Z"
        transform="scale(.91) translate(1 0)"
      />
    </svg>
  );
}

export function AppleIcon() {
  return (
    <svg viewBox="0 0 18 21" style={{ width: 18, height: 20 }} aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.64 15.59c-.31.7-.67 1.34-1.09 1.93-.57.81-1.04 1.37-1.4 1.68-.56.5-1.16.77-1.8.78-.46 0-1.01-.13-1.66-.39-.65-.27-1.24-.4-1.79-.4-.57 0-1.18.13-1.84.4-.65.26-1.18.4-1.58.41-.62.03-1.23-.24-1.84-.8-.39-.34-.88-.92-1.46-1.74-.63-.87-1.14-1.89-1.55-3.04A10.99 10.99 0 0 1 0 10.79c0-1.34.29-2.5.88-3.47a6.1 6.1 0 0 1 1.84-1.84 4.98 4.98 0 0 1 2.48-.69c.49 0 1.13.15 1.92.44.8.3 1.31.45 1.53.45.17 0 .73-.18 1.69-.52.91-.33 1.67-.46 2.3-.41 1.7.14 2.97.8 3.82 2-1.52.91-2.27 2.19-2.26 3.82.02 1.28.48 2.34 1.4 3.18.42.4.88.7 1.4.91-.11.33-.23.63-.36.93ZM12.75.4c0 1-.37 1.93-1.1 2.8-.89 1.03-1.97 1.62-3.13 1.53-.01-.12-.02-.25-.02-.38 0-.96.42-1.99 1.17-2.83A5.7 5.7 0 0 1 11.1.46C11.67.18 12.22.03 12.73 0c.01.14.02.27.02.4Z"
      />
    </svg>
  );
}
