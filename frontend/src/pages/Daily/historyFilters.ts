// 작성 리스트의 필터 값과 판정. 화면과 도구 줄이 같은 정의를 봅니다.
// (보고서 종류는 기간 탭이 정하므로 여기서 다루지 않습니다.)
import type { ReportStatus } from '@/content/types'

export type RangeFilter = 'all' | 'week' | 'month' | 'quarter'

export interface HistoryFilters {
  status: ReportStatus[]
  approver: string[]
  range: RangeFilter
}

export const NO_FILTERS: HistoryFilters = { status: [], approver: [], range: 'all' }

export const FILTER_STATUSES: ReportStatus[] = ['작성중', '검토 대기', '확정', '반려']
export const FILTER_RANGES: { value: RangeFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'week', label: '이번 주' },
  { value: 'month', label: '이번 달' },
  { value: 'quarter', label: '최근 3개월' },
]

/** 켜져 있는 필터 개수. 배지와 초기화 버튼이 같은 값을 씁니다. */
export function countFilters(filters: HistoryFilters): number {
  return filters.status.length + filters.approver.length + (filters.range === 'all' ? 0 : 1)
}
