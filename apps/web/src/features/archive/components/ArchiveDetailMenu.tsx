import {
  Icon16CheckCircle,
  Icon16Pen,
  Icon16Share,
  Icon16Trash,
  Icon20Filter,
} from '@/shared/icons/NookIcons';
import { MoreMenu, type MoreMenuItem } from '@/shared/ui';

/** Figma `아카이브 상세 > 더보기 메뉴`(138:5298) — 소유·공유 여부에 따라 항목만 고른다. */
export type ArchiveDetailMenuProps =
  | {
      kind: 'owned';
      /** 보기·정렬 필터 시트(NOOK-376). 넘기지 않으면(빈 아카이브) 항목이 빠진다. */
      onFilter?: () => void;
      onEdit: () => void;
      onShare: () => void;
      /**
       * 선택 삭제 — 게시물 다중 선택 모드로 전환한다.
       * 넘기지 않으면 항목 자체가 빠진다(장소 탭처럼 지울 수 없는 화면).
       */
      onSelectDelete?: () => void;
      onDelete: () => void;
    }
  | {
      /** 공유받은(SHARED) 아카이브 — 읽기 전용이라 제거만 가능하다. */
      kind: 'shared';
      onFilter?: () => void;
      onRemove: () => void;
    };

function ArchiveDetailMenu(props: ArchiveDetailMenuProps) {
  const filterItems: MoreMenuItem[] = props.onFilter
    ? [{ label: '아카이브 필터', icon: <Icon20Filter size={16} />, onSelect: props.onFilter }]
    : [];
  const items: MoreMenuItem[] =
    props.kind === 'owned'
      ? [
          { label: '아카이브 편집', icon: <Icon16Pen />, onSelect: props.onEdit },
          { label: '아카이브 공유', icon: <Icon16Share />, onSelect: props.onShare },
          ...(props.onSelectDelete
            ? [{ label: '선택 삭제', icon: <Icon16CheckCircle />, onSelect: props.onSelectDelete }]
            : []),
          ...filterItems,
          {
            label: '아카이브 삭제',
            icon: <Icon16Trash />,
            onSelect: props.onDelete,
            destructive: true,
          },
        ]
      : [
          ...filterItems,
          {
            label: '내 목록에서 제거',
            icon: <Icon16Trash />,
            onSelect: props.onRemove,
            destructive: true,
          },
        ];

  // 헤더가 아니라 편집·공유 칩 행 오른쪽에 놓여 같은 40px 칩 모양을 입는다(시안).
  return (
    <MoreMenu
      items={items}
      triggerClassName="grid h-10 w-11 place-items-center rounded-lg bg-gray-10 [&_svg]:size-4"
    />
  );
}

export { ArchiveDetailMenu };
