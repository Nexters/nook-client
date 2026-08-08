import { PolicyPage, type PolicySection } from './PolicyPage';

// 시안 기준 임시 본문 — 확정 텍스트가 오면 이 배열만 교체한다.
const SECTIONS: PolicySection[] = [
  {
    heading: '서비스 이용약관',
    blocks: [
      {
        type: 'paragraph',
        text: '본 약관은 Nook 서비스 운영자(이하 "운영자")가 제공하는 웹사이트, 모바일 앱 및 관련 서비스의 이용과 관련하여 운영자와 이용자 간의 권리, 의무 및 책임사항을 정합니다. 이용자는 서비스를 이용함으로써 본 약관에 동의한 것으로 봅니다.',
      },
      {
        type: 'paragraph',
        text: '본 약관은 법률 검토가 완료된 최종 문서가 아니며, 서비스 출시 전 실제 운영 방식과 관련 법령에 따라 추가 검토가 필요할 수 있습니다.',
      },
    ],
  },
  {
    heading: '1. 서비스의 범위',
    blocks: [
      {
        type: 'paragraph',
        text: 'Nook은 사용자가 웹페이지, 장소, 이미지, 게시물 링크 등을 저장하고, 그룹, 태그, 메모를 통해 정리하며, 필요에 따라 다른 사용자와 공유할 수 있는 아카이빙 서비스입니다.',
      },
      { type: 'paragraph', text: '서비스는 다음 기능을 포함할 수 있습니다.' },
      {
        type: 'bullets',
        items: [
          '외부 웹페이지 및 공개 게시물 링크 저장',
          '저장한 장소, 링크, 이미지, 메모, 태그, 그룹 관리',
          '지도 기반 장소 저장 및 탐색',
          '사용자가 직접 작성한 게시물 또는 컬렉션 공개',
          '외부 콘텐츠의 제목, 출처, 썸네일 등 미리보기 정보 표시',
          '사용자가 저장한 콘텐츠의 비공개 및 공개 설정',
        ],
      },
      {
        type: 'paragraph',
        text: '운영자는 서비스 개선, 운영상 필요, 기술 환경의 변화에 따라 서비스의 전부 또는 일부를 변경하거나 종료할 수 있습니다.',
      },
    ],
  },
  {
    heading: '2. 이용 자격',
    blocks: [
      {
        type: 'paragraph',
        text: '이용자는 본 약관에 동의하고 서비스 이용에 필요한 정보를 제공함으로써 서비스를 이용할 수 있습니다.',
      },
    ],
  },
];

export function TermsPage() {
  return <PolicyPage title="이용약관" sections={SECTIONS} />;
}
