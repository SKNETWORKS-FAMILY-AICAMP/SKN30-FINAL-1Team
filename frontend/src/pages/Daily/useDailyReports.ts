// 백엔드가 붙는 지점은 이 파일 하나입니다. 화면은 아래 반환값만 알면 되므로
// seed 를 API 응답으로, 각 mutator 를 요청으로 바꾸면 나머지는 그대로 둘 수 있습니다.
//
// 상태를 모듈 수준에 두는 이유: 목록(/daily)·작성(/daily/new)·상세(/daily/:id)가
// 서로 다른 페이지라 훅 인스턴스가 따로 생깁니다. useState 로 두면 작성 화면에서
// 제출한 보고서가 목록에 나타나지 않습니다.
import { useCallback, useMemo, useSyncExternalStore } from 'react'

import { useCurrentUser } from '@/auth/sessionContext'
import { reportHistory } from '@/shared/reports'
import type { DailyReport, ReportKind, ReportStatus } from '@/types'
import { parseISO, TODAY } from '@/utils/date'

import { periodLabelFor, periodStart } from './periods'

let reports: DailyReport[] = reportHistory
const listeners = new Set<() => void>()

function publish(next: DailyReport[]) {
  reports = next
  listeners.forEach((notify) => notify())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * 같은 기간·같은 종류의 보고는 하나뿐입니다. 새로 쓰면 그 자리를 덮어씁니다.
 * 같은 기간에 제출된 다른 종류는 그대로 둡니다.
 *
 * 날짜가 아니라 정규화한 기간 키로 봅니다. 주간보고를 주 중 어느 날에 열든
 * 그 주의 보고서는 하나여야 합니다.
 */
function upsert(report: DailyReport) {
  const key = periodStart(report.kind, report.date)
  const rest = reports.filter((r) => r.kind !== report.kind || periodStart(r.kind, r.date) !== key)
  publish([report, ...rest].sort((a, b) => b.date.localeCompare(a.date)))
}

export interface DraftPayload {
  date: string
  kind: ReportKind
  approver: string
  values: Record<string, string>
  activities: DailyReport['activities']
  attachments: DailyReport['attachments']
}

/** 시드 id 와 같은 접두사를 씁니다. */
const ID_PREFIX: Record<ReportKind, string> = { 일일: 'dr', 주간: 'wr', 월간: 'mr' }

function toReport(draft: DraftPayload, status: ReportStatus, owner: string): DailyReport {
  const included = draft.activities.filter((a) => a.included).length
  const files = draft.attachments.length
  // 기간의 첫날로 맞춰 둡니다. 같은 주를 다른 날에 열어도 id 와 date 가 같아야
  // 이어서 쓰는 것이 되고 새 보고서가 생기지 않습니다.
  const date = periodStart(draft.kind, draft.date)
  return {
    id: `${ID_PREFIX[draft.kind]}-${date}`,
    owner,
    // 이력은 실제 날짜로 다루지만 타입은 시드와 공유하므로 off 도 채워 둡니다.
    off: Math.round((parseISO(date).getTime() - TODAY.getTime()) / 86_400_000),
    date,
    kind: draft.kind,
    period: periodLabelFor(draft.kind, date),
    approver: draft.approver,
    status,
    values: draft.values,
    activities: draft.activities,
    attachments: draft.attachments,
    note: files > 0 ? `활동 ${included}건 · 첨부 ${files}건` : `활동 ${included}건`,
  }
}

export default function useDailyReports() {
  const { profile } = useCurrentUser()
  const list = useSyncExternalStore(
    subscribe,
    () => reports,
    () => reports,
  )

  const findReport = useCallback((id: string) => list.find((r) => r.id === id), [list])

  // 날짜 → 그날 제출된 보고서 전부. 달력과 drawer 가 같은 지도를 봅니다.
  const byDate = useMemo(() => {
    const map = new Map<string, DailyReport[]>()
    for (const report of list) {
      const found = map.get(report.date)
      if (found) found.push(report)
      else map.set(report.date, [report])
    }
    return map
  }, [list])

  // 같은 날 주간보고가 있다고 해서 그날 일일보고를 낸 것으로 보면 안 됩니다.
  const findByDate = useCallback(
    (dateISO: string, kind: ReportKind) => byDate.get(dateISO)?.find((r) => r.kind === kind),
    [byDate],
  )

  /**
   * 그 기간의 보고서. 주·월은 아무 날짜나 주어도 같은 하나를 찾습니다.
   * 작성 화면이 "이미 있는가"를 묻는 자리라 날짜가 아니라 기간으로 봅니다.
   */
  const findByPeriod = useCallback(
    (kind: ReportKind, dateISO: string) => {
      const key = periodStart(kind, dateISO)
      return list.find((r) => r.kind === kind && periodStart(r.kind, r.date) === key)
    },
    [list],
  )

  const submitReport = useCallback(
    (draft: DraftPayload) => {
      const report = toReport(draft, '검토 대기', profile.name)
      upsert(report)
      return report
    },
    [profile.name],
  )

  const saveDraft = useCallback(
    (draft: DraftPayload) => {
      upsert(toReport(draft, '작성중', profile.name))
    },
    [profile.name],
  )

  return {
    reports: list,
    /** 날짜 → 그날 보고서 목록. 달력이 칸마다 상태를 찾는 데 씁니다. */
    byDate,
    findReport,
    findByDate,
    findByPeriod,
    submitReport,
    saveDraft,
  }
}
