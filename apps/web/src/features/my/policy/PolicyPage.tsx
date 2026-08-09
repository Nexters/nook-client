import { useHideBottomMenu } from '@/app/bottom-menu-visibility';
import { BackButton, Header } from '@/shared/ui';

export type PolicyBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'bullets'; items: string[] };

export interface PolicySection {
  /** 섹션 제목 (예: "1. 수집하는 개인정보 항목"). 없으면 본문 블록만 그린다. */
  heading?: string;
  blocks: PolicyBlock[];
}

/**
 * Figma `마이페이지 > 개인정보처리방침 / 이용약관`.
 * 약관류 문서 페이지 공통 레이아웃 — 뒤로가기 헤더 + 섹션(제목·문단·불릿) 목록.
 */
export function PolicyPage({ title, sections }: { title: string; sections: PolicySection[] }) {
  useHideBottomMenu();

  return (
    <main
      className="flex min-h-dvh flex-col bg-gray-0"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <Header title={title} left={<BackButton />} />

      <article className="flex-1 overflow-y-auto px-4 pt-4 pb-16">
        {sections.map((section) => (
          <section key={section.heading ?? blockKey(section.blocks[0])} className="mt-6 first:mt-2">
            {section.heading ? <h2 className="text-h2 text-gray-100">{section.heading}</h2> : null}
            {section.blocks.map((block) =>
              block.type === 'paragraph' ? (
                <p key={blockKey(block)} className="mt-4 text-b1 text-gray-80">
                  {block.text}
                </p>
              ) : (
                <ul key={blockKey(block)} className="mt-4 flex flex-col gap-1 pl-5">
                  {block.items.map((item) => (
                    <li key={item} className="list-disc text-b1 text-gray-80">
                      {item}
                    </li>
                  ))}
                </ul>
              ),
            )}
          </section>
        ))}
      </article>
    </main>
  );
}

function blockKey(block: PolicyBlock | undefined) {
  if (!block) return '';
  return block.type === 'paragraph' ? block.text : block.items.join('|');
}
