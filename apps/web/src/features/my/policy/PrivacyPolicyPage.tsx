import { PolicyPage, type PolicySection } from './PolicyPage';

// 시안 기준 임시 본문 — 확정 텍스트가 오면 이 배열만 교체한다.
const SECTIONS: PolicySection[] = [
  {
    heading: '1. 수집하는 개인정보 항목',
    blocks: [
      { type: 'paragraph', text: 'Nook은 서비스 제공을 위해 다음 정보를 수집할 수 있습니다.' },
      {
        type: 'bullets',
        items: [
          '이메일 주소',
          '닉네임',
          '프로필 이미지',
          '소셜 로그인 식별 정보',
          '저장한 링크, 장소, 게시물, 컬렉션, 그룹, 태그, 메모',
          '업로드한 이미지 또는 콘텐츠',
          '공개/비공개 설정 정보',
          '서비스 이용 기록',
          '접속 로그, 기기 정보, 브라우저 정보, IP 주소',
          '현재 위치 정보',
          '사용자가 저장하거나 선택한 장소 정보',
        ],
      },
      {
        type: 'paragraph',
        text: '단, 현재 위치 정보는 이용자가 기기 또는 브라우저에서 위치 권한을 허용한 경우에만 사용됩니다.',
      },
    ],
  },
  {
    heading: '2. 개인정보의 수집 및 이용 목적',
    blocks: [
      { type: 'paragraph', text: 'Nook은 수집한 개인정보를 다음 목적으로 이용합니다.' },
      {
        type: 'bullets',
        items: [
          '회원가입, 로그인 및 계정 관리',
          '이용자 식별 및 본인 확인',
          '저장한 링크, 장소, 메모, 컬렉션 등 서비스 기능 제공',
          '지도 기반 장소 저장 및 탐색 기능 제공',
          '서비스 이용 문의 및 신고 처리',
          '권리 침해 신고, 삭제 요청, 분쟁 대응',
          '서비스 오류 확인 및 안정성 개선',
          '부정 이용 방지 및 서비스 운영 관리',
          '서비스 개선을 위한 이용 패턴 분석',
        ],
      },
    ],
  },
];

export function PrivacyPolicyPage() {
  return <PolicyPage title="개인정보처리방침" sections={SECTIONS} />;
}
