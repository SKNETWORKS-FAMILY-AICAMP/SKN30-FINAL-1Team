import type { AgendaKind } from './agenda'

/** 카드 하나가 딜 또는 고객사 범위의 추천이며, 날짜는 계약관리 Agent가 정한다. */
export interface AiSuggestion {
  /** contract_next_meeting_suggestion.id */
  id: string
  customerCompanyId: string
  customerContactId: string | null
  owner: string
  hospital: string
  title: string
  contact: string
  dept: string
  kind: AgendaKind
  date: string
  /** 계약에서 시각이 명시됐거나 사용자가 직접 입력했을 때만 있다. */
  time: string | null
  selectedDurationMinutes: 30 | 60 | 90 | null
  durationOptions: readonly [30, 60, 90]
  place: string
  activityTitle: string
  proposalReason: string
  basis: string[]
  scheduleRunId: string
  refreshReason: string | null
}
