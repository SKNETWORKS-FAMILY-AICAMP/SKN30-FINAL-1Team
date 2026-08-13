// 목록 표의 열입니다. 무엇을 보여 주고 무엇으로 정렬하는지를 한 곳에 모읍니다.
//
// 단계 열만 보이는 값과 정렬 기준이 다릅니다. 이름순으로 세우면 '검토 → 확정'
// 같은 진행 순서가 흐트러져 보드 컬럼 순서를 그대로 씁니다.
import { fmtDot, parseISO } from '@/utils/date'
import { won } from '@/utils/format'

import type { BoardColumn, BoardContract } from './board'

export interface ContractColumn {
  id: string
  header: string
  width: number
  /** 금액처럼 오른쪽에 붙는 열 */
  align?: 'right'
  /** 자릿수를 맞출 열(tnum) */
  numeric?: boolean
  sortable?: boolean
  /** 셀에 찍을 글자. 단계는 표에서 배지로 그립니다. */
  text: (card: BoardContract) => string
  /** 정렬 기준. 없으면 text 를 씁니다. */
  sortValue?: (card: BoardContract, stages: BoardColumn[]) => string | number
}

export const CONTRACT_COLUMNS: ContractColumn[] = [
  { id: 'no', header: '계약번호', width: 132, numeric: true, sortable: true, text: (c) => c.no },
  { id: 'org', header: '고객사', width: 180, sortable: true, text: (c) => c.org },
  { id: 'product', header: '제품', width: 160, sortable: true, text: (c) => c.product },
  { id: 'kind', header: '유형', width: 96, sortable: true, text: (c) => c.kind },
  {
    id: 'amount',
    header: '금액',
    width: 116,
    align: 'right',
    numeric: true,
    sortable: true,
    text: (c) => won(c.amount),
    sortValue: (c) => c.amount,
  },
  { id: 'owner', header: '담당 영업', width: 96, sortable: true, text: (c) => c.owner },
  {
    id: 'date',
    header: '계약일',
    width: 108,
    numeric: true,
    sortable: true,
    // 정렬은 ISO 문자열 그대로가 곧 날짜순입니다.
    text: (c) => fmtDot(parseISO(c.date)),
    sortValue: (c) => c.date,
  },
  {
    id: 'stage',
    header: '단계',
    width: 104,
    sortable: true,
    text: () => '',
    sortValue: (c, stages) => stages.findIndex((col) => col.id === c.stageId),
  },
]

export const CONTRACT_COLUMN_BY_ID = new Map(CONTRACT_COLUMNS.map((col) => [col.id, col]))

/** 지금 어느 열로 세워 두었는지. null 이면 원래 순서입니다. */
export type SortState = { id: string; dir: 'asc' | 'desc' } | null

/** 한 열을 기준으로 세우는 비교 함수. 숫자는 크기로, 글자는 한국어 순서로 봅니다. */
export function compareBy(columnId: string, stages: BoardColumn[]) {
  const column = CONTRACT_COLUMN_BY_ID.get(columnId)
  const of = (card: BoardContract) =>
    column?.sortValue ? column.sortValue(card, stages) : (column?.text(card) ?? '')

  return (a: BoardContract, b: BoardContract) => {
    const left = of(a)
    const right = of(b)
    if (typeof left === 'number' && typeof right === 'number') return left - right
    return String(left).localeCompare(String(right), 'ko')
  }
}
