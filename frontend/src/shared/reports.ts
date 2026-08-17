// 업무보고 도메인. 양식·시드는 mocks/ 에서 받고 여기서는 로직·파생만 둡니다.
import { APPROVERS, dailyTemplate, monthlyTemplate, reportSeed, weeklyTemplate } from '@/mocks'
import type { DailyReport, ReportKind, ReportTemplate } from '@/types'
import { addDays, iso, TODAY } from '@/utils/date'

export { APPROVERS, dailyTemplate, monthlyTemplate, weeklyTemplate }

export function templateFor(kind: ReportKind): ReportTemplate {
  if (kind === '주간') return weeklyTemplate
  if (kind === '월간') return monthlyTemplate
  return dailyTemplate
}

// 보고서에 넣을 후보 자료를 모으는 일은 종류마다 다릅니다.
// pages/Daily/sources.ts 가 종류별로 갈라 갖고 있습니다.

export const reportHistory: DailyReport[] = reportSeed
  .map((seed) => ({ ...seed, date: iso(addDays(TODAY, seed.off)) }))
  .sort((a, b) => b.date.localeCompare(a.date))

/**
 * 최근 days 일 중 보고서가 없는 평일. 오늘은 아직 마감 전이라 빼고 셉니다.
 * 화면의 "밀린 보고" 줄이 이 값을 그대로 씁니다.
 */
export function missingReportDates(reports: DailyReport[], days = 7): string[] {
  // 주간·월간이 같은 날에 제출돼 있어도 일일보고를 낸 것은 아닙니다.
  const written = new Set(reports.filter((r) => r.kind === '일일').map((r) => r.date))
  const missing: string[] = []

  for (let back = 1; back <= days; back += 1) {
    const day = addDays(TODAY, -back)
    const weekday = day.getDay()
    if (weekday === 0 || weekday === 6) continue
    const key = iso(day)
    if (!written.has(key)) missing.push(key)
  }

  return missing
}
