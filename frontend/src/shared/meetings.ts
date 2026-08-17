// 미팅보고서 도메인. 양식과 시드는 mocks/ 에서 받습니다.
import { meetingReportSeed, meetingTemplate } from '@/mocks'
import type { MeetingReport } from '@/types'
import { addDays, iso, TODAY } from '@/utils/date'

export { meetingTemplate }

export const meetingReportHistory: MeetingReport[] = meetingReportSeed
  .map((seed) => ({ ...seed, date: iso(addDays(TODAY, seed.off)) }))
  .sort((a, b) => b.date.localeCompare(a.date))

// 확정한 미팅 기록을 일일보고의 자료 한 줄로 바꾸는 일은
// pages/Daily/sources.ts 가 일정과 함께 다룹니다. 둘을 같이 봐야 중복을 걸러 낼 수 있습니다.
