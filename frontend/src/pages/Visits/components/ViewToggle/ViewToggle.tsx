// 같은 영업 건을 목록으로 볼지 보드로 볼지 고르는 자리입니다.
// 두 화면이 같은 상태를 보므로 조건은 그대로 두고 보는 방식만 바꿉니다.
//
// 보는 방식이 주소에 들어 있어(/visits · /visits/board) 버튼이 아니라 링크입니다.
import { ColumnsIcon, ListIcon } from '@/components/icons'
import Tabs, { type TabItem } from '@/components/Tabs'
import { ROUTES, visitBoardPath } from '@/constants/routes'

interface Props {
  view: 'list' | 'board'
}

const VIEWS: TabItem[] = [
  {
    value: 'list',
    label: '리스트',
    to: ROUTES.VISITS,
    icon: <ListIcon width={14} height={14} />,
  },
  {
    value: 'board',
    label: '보드',
    to: visitBoardPath(),
    icon: <ColumnsIcon width={14} height={14} />,
  },
]

export default function ViewToggle({ view }: Props) {
  return <Tabs variant="segmented" items={VIEWS} value={view} label="보기 방식" />
}
