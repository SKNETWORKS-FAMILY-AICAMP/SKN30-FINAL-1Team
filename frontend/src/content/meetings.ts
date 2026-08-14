// 시연용 합성 데이터입니다. demo/layout_v2.html 의 #meetingDialog 에서 옮겼습니다.
// 실제 병원·담당자·제품이 아닙니다.
import { addDays, iso, TODAY } from '@/utils/date'

import type { MeetingReport, MeetingReportSeed, ReportActivity, ReportTemplate } from './types'

/**
 * 미팅 기록 양식. 일일보고와 같은 ReportTemplate 을 써서 화면이 필드를 그대로 그립니다.
 *
 * 앞의 네 항목은 녹취·메모에서 AI 가 뽑아 냅니다. 특이사항만 사람이 직접 씁니다.
 * 들은 것과 판단한 것을 섞지 않기 위해서입니다.
 */
export const meetingTemplate: ReportTemplate = {
  id: 'tpl-meeting-1',
  name: '미팅 기록 양식',
  owner: '김서현 영업팀장',
  updated: iso(addDays(TODAY, -11)),
  fields: [
    {
      id: 'attendees',
      label: '참석자',
      type: 'text',
      required: true,
      aiFilled: true,
      placeholder: '예: 박서준 교수 · 이민호 구매팀 과장',
    },
    {
      id: 'reaction',
      label: '고객 반응',
      type: 'textarea',
      required: true,
      aiFilled: true,
      placeholder: '제품·조건에 대한 반응을 그대로 옮깁니다.',
    },
    {
      id: 'decision',
      label: '결정사항',
      type: 'textarea',
      required: true,
      aiFilled: true,
      placeholder: '이 자리에서 합의한 것',
      hint: '합의하지 않은 것은 다음 행동에 적으세요.',
    },
    {
      id: 'next',
      label: '다음 행동 · 기한',
      type: 'textarea',
      required: true,
      aiFilled: true,
      placeholder: '누가 언제까지 무엇을 하는지',
    },
    {
      id: 'note',
      label: '특이사항',
      type: 'text',
      required: false,
      aiFilled: false,
      placeholder: '경쟁사 언급, 조직 변화 등 직접 확인한 것만',
    },
  ],
}

const meetingReportSeed: MeetingReportSeed[] = [
  {
    id: 'mt-a10',
    agendaId: 'a10',
    off: -6,
    time: '14:00',
    hospital: '한빛대학교병원',
    dept: '순환기내과',
    contact: '박서준 교수',
    product: 'CardioView X7',
    place: '본관 3층',
    title: 'CardioView X7 제품 테스트',
    status: '확정',
    transcript:
      '박서준 교수님과 CardioView X7 테스트 결과를 확인했다. 화면 가독성은 좋았지만 유지보수 비용이 기존 장비보다 높다는 의견이 있었다. 구매팀 이민호 과장에게 다음 주 화요일까지 비교 견적과 유지보수 범위표를 보내기로 했다.',
    values: {
      attendees: '박서준 교수 · 이민호 구매팀 과장',
      reaction: '화면 가독성은 긍정적 · 유지보수 비용이 기존 장비보다 높다는 우려',
      decision: '비교 견적과 유지보수 범위표를 전달하기로 했습니다.',
      next: '다음 주 화요일까지 자료 전달 · 이후 후속 미팅 일정 조율',
      note: '',
    },
    attachments: [],
    evidence: '원문 근거: “이민호 과장에게”, “다음 주 화요일까지”, “유지보수 비용이 높다”.',
  },
  {
    id: 'mt-a6',
    agendaId: 'a6',
    off: -2,
    time: '16:00',
    hospital: '정우병원',
    dept: '구매팀',
    contact: '최수아 책임',
    product: 'OrthoScan Mini',
    place: '학회장 미팅룸',
    title: '학회 현장 구매 담당자 면담',
    status: '확정',
    transcript:
      '최수아 책임과 학회장에서 짧게 면담했다. 기존 시스템 연동 범위를 확인했고 도입 승인은 하반기 예산 확정 이후에 진행된다고 했다.',
    values: {
      attendees: '최수아 구매팀 책임',
      reaction: '기존 시스템 연동 범위에 관심 · 도입 시점은 유보',
      decision: '본원 데모를 진행하기로 했습니다.',
      next: '보안 요구사항과 데이터 접근 권한을 확인한 뒤 본원 데모 일정 확정',
      note: '하반기 예산 확정 전까지 승인 절차는 시작되지 않습니다.',
    },
    attachments: [],
    evidence: '원문 근거: “하반기 예산 확정 이후”, “기존 시스템 연동 범위”.',
  },
]

/** offset 을 실제 날짜로 편 미팅 기록. 최근 것이 앞에 옵니다. */
export const meetingReportHistory: MeetingReport[] = meetingReportSeed
  .map((seed) => ({ ...seed, date: iso(addDays(TODAY, seed.off)) }))
  .sort((a, b) => b.date.localeCompare(a.date))

/**
 * 확정된 미팅 기록을 일일보고의 활동 한 줄로 바꿉니다.
 * 작성 중인 기록은 아직 일어난 일로 볼 수 없어 빼고 넘깁니다.
 */
export function meetingActivitiesFor(reports: MeetingReport[]): ReportActivity[] {
  return reports
    .filter((report) => report.status === '확정')
    .map((report) => ({
      id: `meet-${report.id}`,
      source: '미팅보고서',
      title: `${report.hospital} ${report.title}`,
      desc: report.values.decision?.split('\n')[0] || '미팅 기록 확정',
      included: true,
    }))
}
