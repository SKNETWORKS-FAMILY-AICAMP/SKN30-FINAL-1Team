// 사이드바 메뉴의 단일 출처. Sidebar 렌더링과 Topbar breadcrumb 제목이 모두
// 여기서 나오므로 화면 이름이 여러 곳에 흩어지지 않습니다.
import type { FC } from 'react'

import {
  CalendarIcon,
  ComplaintIcon,
  ContractIcon,
  CustomersIcon,
  DailyReportIcon,
  DashboardIcon,
  DocumentsIcon,
  type IconProps,
  OrdersIcon,
  SalesReportIcon,
  SettingsIcon,
  TeamDashboardIcon,
  TeamIcon,
  VisitIcon,
} from '@/components/icons'
import { ROUTES, type Route } from '@/constants/routes'

export interface NavItem {
  to: Route
  label: string
  icon: FC<IconProps>
}

export interface NavSection {
  id: string
  /** 섹션 캡션. 항목이 하나뿐인 섹션은 캡션 없이 ariaLabel 만 씁니다. */
  title?: string
  ariaLabel?: string
  /** 팀장 역할에게만 보이는 섹션 */
  managerOnly?: boolean
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'dashboard',
    ariaLabel: '대시보드',
    items: [{ to: ROUTES.DASHBOARD, label: '대시보드', icon: DashboardIcon }],
  },
  {
    id: 'manager',
    title: '팀장',
    managerOnly: true,
    items: [
      { to: ROUTES.MANAGER, label: '팀 대시보드', icon: TeamDashboardIcon },
      { to: ROUTES.TEAM, label: '팀 관리', icon: TeamIcon },
    ],
  },
  {
    id: 'account',
    title: '고객',
    items: [
      { to: ROUTES.CUSTOMERS, label: '고객·회사', icon: CustomersIcon },
      { to: ROUTES.COMPLAINTS, label: '고객 불만 관리', icon: ComplaintIcon },
    ],
  },
  {
    id: 'sales',
    title: '영업',
    items: [
      { to: ROUTES.CALENDAR, label: '캘린더', icon: CalendarIcon },
      { to: ROUTES.DAILY, label: '업무 보고', icon: DailyReportIcon },
      { to: ROUTES.VISITS, label: '방문 현황', icon: VisitIcon },
      { to: ROUTES.SALES, label: '매출 분석', icon: SalesReportIcon },
    ],
  },
  {
    id: 'deals',
    title: '계약·발주',
    items: [
      { to: ROUTES.CONTRACTS, label: '계약 현황', icon: ContractIcon },
      { to: ROUTES.ORDERS, label: '발주 관리', icon: OrdersIcon },
    ],
  },
  {
    id: 'documents',
    ariaLabel: '자료실',
    items: [{ to: ROUTES.DOCUMENTS, label: '자료실', icon: DocumentsIcon }],
  },
  {
    id: 'settings',
    ariaLabel: '설정',
    items: [{ to: ROUTES.SETTINGS, label: '설정', icon: SettingsIcon }],
  },
]

const NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items)

/**
 * 사이드바에 없는 화면의 이름. 미팅보고서처럼 다른 화면에서만 들어가는 곳도
 * breadcrumb 에는 제 이름이 나와야 합니다.
 */
const OFF_MENU_LABELS: { to: Route; label: string }[] = [
  { to: ROUTES.MEETINGS, label: '미팅보고서' },
]

/**
 * 경로에 해당하는 화면 이름. 정의되지 않은 경로면 undefined.
 *
 * 하위 경로(예: /daily/new)는 부모 메뉴의 이름을 물려받습니다. 가장 긴 것부터 보므로
 * 나중에 /daily 아래 별도 메뉴가 생겨도 그쪽이 먼저 잡힙니다.
 * '/' 는 모든 경로의 접두사라 완전일치일 때만 씁니다.
 */
export function findNavLabel(pathname: string): string | undefined {
  return [...NAV_ITEMS, ...OFF_MENU_LABELS]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => item.to === pathname || (item.to !== '/' && pathname.startsWith(`${item.to}/`)))
    ?.label
}
