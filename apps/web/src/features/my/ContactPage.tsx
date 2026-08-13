import { useHideBottomMenu } from '@/app/bottom-menu-visibility';
import { Icon16ArrowDiagonal, Icon16Mail } from '@/shared/icons/NookIcons';
import { BackButton, Header } from '@/shared/ui';

const CONTACT_EMAIL = 'everynook123@gmail.com';

/** 메일에 함께 담아주면 재현이 빨라지는 항목들. */
const REPORT_ITEMS = ['사용 중인 기기', '앱 버전', '문제가 발생한 상황', '스크린샷'];

const FAQS = [
  {
    question: '게시물이 저장되지 않아요',
    answer: `비공개 게시물이나 삭제된 게시물은 저장할 수 없어요. 문제가 계속된다면 누크 공식 이메일(${CONTACT_EMAIL})로 문의해 주세요.`,
  },
  {
    question: '장소가 지도에 표시되지 않아요',
    answer:
      '게시물에 장소 정보가 없거나 위치 정보를 불러오지 못한 경우에는 지도에 표시되지 않을 수 있어요.',
  },
  {
    question: '로그인이 안 돼요',
    answer: `앱을 다시 실행하거나 잠시 후 다시 시도해 주세요. 계속 문제가 발생하면 로그인 방식과 함께 누크 공식 이메일(${CONTACT_EMAIL})로 문의해 주세요.`,
  },
  {
    question: '계정을 삭제하고 싶어요',
    answer:
      '마이페이지 > 회원탈퇴에서 직접 탈퇴할 수 있어요. 탈퇴 후에는 저장한 데이터는 복구되지 않아요.',
  },
];

/**
 * Figma `마이페이지 > 문의하기`.
 * 문의 접수는 별도 폼 없이 mailto 로 넘긴다 — 답변 채널이 공식 메일 하나라서다.
 * 메일까지 가지 않아도 풀리는 문의는 아래 FAQ 가 먼저 받아낸다.
 */
export function ContactPage() {
  useHideBottomMenu();

  return (
    <main
      className="flex min-h-dvh flex-col bg-gray-0"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <Header title="문의하기" left={<BackButton />} />

      <div
        className="flex-1 overflow-y-auto px-4 pt-6"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <h1 className="text-h1 text-gray-100">누크에 무엇이든 물어보세요!</h1>
        <p className="mt-3 text-b1 text-gray-80">
          누크를 이용하다 궁금한 점이나 불편한 점이 있다면 아래 링크로 문의를 남겨주세요.
        </p>

        <section className="mt-6 rounded-xl bg-gray-10 p-4">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="flex items-center gap-1.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100"
          >
            <Icon16Mail className="shrink-0" />
            <span className="text-b1 font-semibold text-gray-100 underline underline-offset-2">
              이메일 문의하기
            </span>
            <Icon16ArrowDiagonal className="ml-auto shrink-0" />
          </a>

          <p className="mt-3 text-b2 text-gray-80">
            문의 시 아래 내용을 함께 보내주시면 더 빠르게 확인할 수 있으며, 보통 영업일 기준 2~3일
            내에 답변 드려요.
          </p>
          <ul className="mt-2 flex flex-col gap-1 pl-5">
            {REPORT_ITEMS.map((item) => (
              <li key={item} className="list-disc text-b2 text-gray-80">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <h2 className="mt-10 text-h1 text-gray-100">자주 묻는 질문</h2>
        {FAQS.map((faq) => (
          <section key={faq.question} className="mt-6">
            <h3 className="text-b1 font-semibold text-gray-100">{faq.question}</h3>
            <p className="mt-2 text-b1 text-gray-80">{faq.answer}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
