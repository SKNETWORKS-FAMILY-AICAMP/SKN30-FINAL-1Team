// 시연용 합성 데이터의 타입입니다. 실제 고객·의료 데이터가 아닙니다.
//
// 날짜는 전부 오늘 기준 offset(일) 으로 두어 시연이 낡지 않게 합니다.
// 화면에서 쓸 실제 날짜는 각 모듈이 TODAY 를 기준으로 만들어 냅니다.

export interface Notice {
  tag: string
  author: string
  time: string
  text: string
}

/** 일정 종류. 배지 색이 여기에 묶여 있습니다. */
export type AgendaKind = 'visit' | 'demo' | 'edu' | 'call' | 'delivery' | 'booth' | 'internal'

export interface AgendaHistory {
  when: string
  what: string
}

export interface AgendaSeed {
  id: string
  /** 오늘로부터 며칠 */
  off: number
  time: string
  dur: string
  kind: AgendaKind
  hospital: string
  dept: string
  contact: string
  product: string
  stage: string
  place: string
  title: string
  brief: string
  history: AgendaHistory[]
  tags: string[]
  done: boolean
}

/** 실제 날짜 키가 붙은 일정 */
export interface AgendaItem extends AgendaSeed {
  date: string
}

/**
 * 캘린더가 다루는 일정. AgendaItem 보다 느슨해서 화면에서 새로 만든 일정도 담습니다.
 * AgendaItem 은 이 형태를 그대로 만족하므로 캘린더의 초기 데이터로 바로 씁니다.
 */
export interface CalendarEvent {
  id: string
  /** YYYY-MM-DD */
  date: string
  /** HH:MM */
  time: string
  /** '40분' 처럼 표시용 라벨입니다. 계산에 쓰지 않습니다. */
  dur: string
  kind: AgendaKind
  title: string
  hospital?: string
  dept?: string
  contact?: string
  place?: string
  brief?: string
  done: boolean
}

export interface AiSuggestionSeed {
  id: string
  /** 오늘로부터 며칠 */
  off: number
  time: string
  dur: string
  kind: AgendaKind
  title: string
  hospital: string
  dept: string
  contact: string
  place: string
  /** 왜 지금 이 일정을 잡아야 하는지 한 줄 */
  reason: string
  /** 추천 근거. 배지로 나옵니다. 예: ['12일 미접촉', '계약 협의'] */
  basis: string[]
}

/** 실제 날짜가 붙은 추천 */
export interface AiSuggestion extends AiSuggestionSeed {
  date: string
}

export interface OrderLine {
  product: string
  qty: number
  price: number
}

export type OrderStatus =
  '승인대기' | '승인' | '출고의뢰서 작성완료' | '생산중' | '출고' | '입고완료' | '취소'

export interface PurchaseOrderSeed {
  no: string
  contract: string
  hospital: string
  supplier: string
  orderedOff: number
  dueOff: number
  expectOff: number
  status: OrderStatus
  memo: string
  items: OrderLine[]
}

/** 실제 날짜가 붙은 발주 */
export interface PurchaseOrder extends PurchaseOrderSeed {
  ordered: string
  due: string
  expect: string
}

export interface FollowUp {
  task: string
  org: string
  who: string
  note: string
  dueOff: number
}

export interface CsRequest {
  issue: string
  org: string
  who: string
  product: string
  state: '미응답' | '처리중'
  urgent: boolean
  agoOff: number
  ago: string
  note: string
}

/** 영업 진행 단계. 목록의 상태 배지가 여기에 묶여 있습니다. */
export type CustomerStatus = '신규' | '제안' | '협의' | '계약' | '보류'

/** 고객을 처음 만난 경로 */
export type CustomerSource = '소개' | '박람회' | '홈페이지' | '콜드콜' | '기존 거래'

export interface CustomerSeed {
  id: string
  name: string
  /** 소속 병원·기관 */
  org: string
  dept: string
  /** 직함 */
  title: string
  email: string
  phone: string
  /** 담당 영업 */
  owner: string
  source: CustomerSource
  status: CustomerStatus
  /** 최근 접촉. 과거이므로 음수입니다. */
  lastOff: number
  /** 다음 일정. null 이면 아직 잡지 않았다는 뜻입니다. */
  nextOff: number | null
  createdOff: number
  memo: string
}

/** 실제 날짜와 지연 여부가 붙은 고객 */
export interface Customer extends CustomerSeed {
  last: string
  next: string | null
  created: string
  /** 다음 일정이 없거나 이미 지났으면 후속이 늦은 것입니다. */
  overdue: boolean
}

export interface Renewal {
  org: string
  who: string
  contract: string
  kind: string
  amount: number
  expireOff: number
  note: string
}

/** 팀장이 정한 보고 양식의 항목 하나. 화면은 이 배열을 그대로 그립니다. */
export interface ReportFieldDef {
  id: string
  label: string
  type: 'text' | 'textarea' | 'select'
  required: boolean
  placeholder?: string
  /** select 전용 */
  options?: string[]
  /** AI 초안이 채울 수 있는 항목인지. false 면 사람이 직접 씁니다. */
  aiFilled: boolean
  /** 팀장이 붙인 안내문 */
  hint?: string
}

/**
 * 팀장이 관리하는 보고 양식. 이번 범위에서는 읽기만 합니다.
 * 필드를 코드에 박지 않고 여기서 받아 와야 팀마다 다른 양식을 받을 수 있습니다.
 */
export interface ReportTemplate {
  id: string
  name: string
  owner: string
  updated: string
  fields: ReportFieldDef[]
}

/** 활동을 어디서 주워 왔는지. 배지로 나옵니다. */
export type ActivitySource = '캘린더' | '미팅보고서' | '문서' | '후속' | '수기'

/** 보고서에 넣을 후보 활동 한 건 */
export interface ReportActivity {
  id: string
  source: ActivitySource
  title: string
  desc: string
  /** 체크를 풀면 보고서와 AI 입력에서 함께 빠집니다. */
  included: boolean
}

export type AttachmentKind = 'audio' | 'image' | 'pdf'
export type AttachmentState = 'analyzing' | 'done' | 'failed'

/** 음성·사진·PDF 첨부. 어디까지나 선택 사항입니다. */
export interface ReportAttachment {
  id: string
  kind: AttachmentKind
  name: string
  /** '2.4MB' 처럼 표시용입니다. */
  size: string
  state: AttachmentState
  /** 분석이 끝나면 채워집니다. 초안 생성의 입력이자 근거입니다. */
  extract?: string
}

export type ReportStatus = '작성중' | '검토 대기' | '확정' | '반려'

/** 보고서 종류. 작성 흐름은 아직 일일만 있고 주간·월간은 이력에서 읽기만 합니다. */
export type ReportKind = '일일' | '주간' | '월간'

export interface DailyReportSeed {
  id: string
  /** 오늘로부터 며칠. 과거이므로 음수입니다. */
  off: number
  kind: ReportKind
  approver: string
  status: ReportStatus
  /** ReportFieldDef.id → 입력값 */
  values: Record<string, string>
  activities: ReportActivity[]
  attachments: ReportAttachment[]
  /** 이력 목록에 한 줄로 붙는 설명 */
  note: string
  /** 주간·월간이 덮는 기간. 목록 제목에 붙습니다. 일일은 date 로 충분해 비어 있습니다. */
  period?: string
}

/** 실제 날짜가 붙은 업무보고. date 는 제출일입니다. */
export interface DailyReport extends DailyReportSeed {
  /** YYYY-MM-DD */
  date: string
}
