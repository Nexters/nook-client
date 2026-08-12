import { Link } from 'react-router-dom';
import { useHideBottomMenu } from '@/app/bottom-menu-visibility';
import { BackButton, Header } from '@/shared/ui';

const CONTACT_EMAIL = 'everynook123@gmail.com';

export function ContactPage() {
  useHideBottomMenu();

  return (
    <main
      className="flex min-h-dvh flex-col bg-gray-0"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <Header title="문의하기" left={<BackButton />} />

      <article
        className="flex flex-1 flex-col px-4 pt-6"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <h1 className="text-h2 text-gray-100">Nook 문의하기</h1>
        <p className="mt-4 text-b1 text-gray-80">
          Nook 이용 중 문의사항이나 불편사항이 있으시면 아래 이메일로 연락해주세요.
        </p>
        <p className="mt-6 text-b1 text-gray-80">
          이메일:{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-gray-100 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
          >
            {CONTACT_EMAIL}
          </a>
        </p>

        <nav aria-label="정책 링크" className="mt-auto flex justify-center gap-3 pt-8 text-b3">
          <Link
            to="/terms"
            className="text-gray-60 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
          >
            이용약관
          </Link>
          <span aria-hidden="true" className="text-gray-30">
            |
          </span>
          <Link
            to="/privacy"
            className="text-gray-60 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
          >
            개인정보처리방침
          </Link>
        </nav>
      </article>
    </main>
  );
}
