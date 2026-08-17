// 작성 화면의 상태를 전부 담습니다. 화면은 배치만 하고 규칙은 여기 있습니다.
//
// 자료를 어디서 모으는지는 종류마다 다릅니다(sources.ts). 일일은 그날 일정과
// 미팅보고서를, 주간은 그 주의 일일보고서를, 월간은 그 달의 주간보고서를 씁니다.
//
// AI 초안은 generate() 안에서만 만들어집니다. 나중에 이 함수 본문 하나를
// api/client.ts 호출로 바꾸면 화면은 그대로 둘 수 있습니다.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { APPROVERS, templateFor } from '@/shared/reports'
import type {
  DailyReport,
  ReportActivity,
  ReportAttachment,
  ReportKind,
  ReportTemplate,
} from '@/types'
import useMeetingReports from '@/pages/Meetings/useMeetingReports'
import { fakeExtract, kindOf, sizeLabel } from '@/utils/attachment'

import { sourcesFor } from './sources'
import useDailyReports from './useDailyReports'

export type DraftPhase = 'idle' | 'generating' | 'ready' | 'submitted'

/** 초안 생성과 첨부 분석에 거는 흉내용 지연입니다. */
const GENERATE_MS = 900
const ANALYZE_MS = 1400

/**
 * 상위 보고서가 하위 보고서의 어느 항목을 옮겨 담는지. 여기 없는 항목은
 * 원본에 대응하는 값이 없다는 뜻이라 사람이 직접 씁니다.
 */
const ROLLUP_FIELDS: Partial<Record<ReportKind, Record<string, string>>> = {
  주간: { result: 'summary', plan: 'next', risk: 'issue' },
  월간: { perf: 'result', focus: 'plan' },
}

const emptyValues = (template: ReportTemplate) =>
  Object.fromEntries(template.fields.map((f) => [f.id, '']))

interface DraftOptions {
  /** 미리 켜 둘 자료의 원본 id. 사내 업무 일정에서 넘어올 때 씁니다. */
  pickId?: string
}

export default function useDailyDraft(
  dateISO: string,
  kind: ReportKind,
  options: DraftOptions = {},
) {
  const { pickId } = options
  const template = templateFor(kind)

  const { byDate } = useMeetingReports()
  const { reports, findByPeriod } = useDailyReports()

  const meetings = byDate.get(dateISO)
  const sources = useMemo(
    () => sourcesFor(kind, dateISO, meetings ?? [], reports),
    [kind, dateISO, meetings, reports],
  )

  /**
   * 자료를 다시 모으는 것은 기간·종류가 바뀔 때와 사람이 "초안 다시 불러오기"를
   * 누를 때뿐입니다. 임시저장이 스토어를 건드릴 때마다 목록을 새로 깔면 쓰던 선택이
   * 사라집니다. 그래서 원본 목록은 ref 로만 들고 갑니다.
   */
  const live = useRef({ meetings, reports })
  live.current = { meetings, reports }

  // 이 기간에 쓰다 만 보고서가 있으면 새로 만들지 않고 이어서 씁니다.
  const existing = findByPeriod(kind, dateISO)

  /**
   * 이어 쓸 원본은 기간이 바뀔 때만 다시 읽습니다. 임시저장이 스토어를 건드릴 때마다
   * 다시 읽으면 방금 쓰던 내용이 저장 시점으로 되감깁니다.
   */
  const seedKey = `${kind}:${dateISO}`
  const seed = useRef<{ key: string; report?: DailyReport }>({ key: seedKey, report: existing })
  if (seed.current.key !== seedKey) seed.current = { key: seedKey, report: existing }

  const [phase, setPhase] = useState<DraftPhase>('idle')
  const [activities, setActivities] = useState<ReportActivity[]>(() => sources.activities)
  const [attachments, setAttachments] = useState<ReportAttachment[]>([])
  const [values, setValues] = useState<Record<string, string>>(() => emptyValues(template))
  const [approver, setApprover] = useState<string>(APPROVERS[0])
  const [aiFilledIds, setAiFilledIds] = useState<ReadonlySet<string>>(new Set())
  const [dirtyIds, setDirtyIds] = useState<ReadonlySet<string>>(new Set())
  /** 마지막 생성 이후 분석이 끝난 첨부가 있는지. "다시 작성" 안내를 띄웁니다. */
  const [staleAttachments, setStaleAttachments] = useState(false)

  // 지연 타이머가 살아 있는 동안 화면을 떠나면 없는 상태를 건드리게 됩니다.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms))
  }, [])

  // 기간이나 종류가 바뀌면 자료를 다시 모으고 처음 상태로 돌아갑니다.
  // 쓰던 내용을 지워도 되는지는 화면이 먼저 묻습니다.
  const reset = useCallback(() => {
    // 쓰다 만 보고서의 선택을 그대로 살립니다. 자료 목록은 지금 것을 쓰되
    // 무엇을 골랐는지만 이어받습니다. 그 사이 새로 생긴 자료도 함께 보여야 합니다.
    const saved = seed.current.report
    const collected = sourcesFor(kind, dateISO, live.current.meetings ?? [], live.current.reports)
    const picked = saved && new Map(saved.activities.map((a) => [a.id, a.included]))
    setActivities(
      collected.activities.map((activity) => ({
        ...activity,
        included:
          picked?.get(activity.id) ??
          (pickId && activity.refId === pickId ? true : activity.included),
      })),
    )
    setAttachments(saved?.attachments ?? [])
    setValues(saved ? { ...emptyValues(template), ...saved.values } : emptyValues(template))
    setApprover(saved?.approver ?? APPROVERS[0])
    setAiFilledIds(new Set())
    setDirtyIds(new Set())
    setStaleAttachments(false)
    // 이어 쓰는 보고서는 이미 쓴 내용이 있으므로 입력칸을 바로 펴 줍니다.
    setPhase(saved ? 'ready' : 'idle')
  }, [kind, dateISO, template, pickId])

  useEffect(() => {
    reset()
  }, [reset])

  const toggleActivity = useCallback((id: string) => {
    setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, included: !a.included } : a)))
  }, [])

  const addManual = useCallback((title: string) => {
    setActivities((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}`,
        source: '수기',
        title,
        desc: '직접 입력한 항목',
        included: true,
      },
    ])
  }, [])

  const removeActivity = useCallback((id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const attach = useCallback(
    (files: FileList | File[]) => {
      const added: ReportAttachment[] = Array.from(files).map((file, index) => ({
        id: `att-${Date.now()}-${index}`,
        kind: kindOf(file),
        name: file.name,
        size: sizeLabel(file.size),
        state: 'analyzing',
      }))
      if (added.length === 0) return
      setAttachments((prev) => [...prev, ...added])

      // 분석이 끝나야 초안에 쓸 수 있습니다. 그동안에도 작성 버튼은 막지 않습니다.
      added.forEach((item) => {
        later(() => {
          setAttachments((prev) =>
            prev.map((a) =>
              a.id === item.id ? { ...a, state: 'done', extract: fakeExtract(a.kind, a.name) } : a,
            ),
          )
          setStaleAttachments(true)
        }, ANALYZE_MS)
      })
    },
    [later],
  )

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const setValue = useCallback((id: string, value: string) => {
    setValues((prev) => ({ ...prev, [id]: value }))
    setDirtyIds((prev) => new Set(prev).add(id))
  }, [])

  const included = useMemo(() => activities.filter((a) => a.included), [activities])
  const analyzing = attachments.filter((a) => a.state === 'analyzing').length
  const ready = attachments.filter((a) => a.state === 'done')

  /** AI 가 채우는 항목이 있는 양식에서만 초안 생성이 의미가 있습니다. */
  const hasAiFields = useMemo(() => template.fields.some((f) => f.aiFilled), [template])

  /** 자료를 1건이라도 골라야 합니다. 첨부는 조건이 아닙니다. */
  const canGenerate = hasAiFields && included.length > 0

  const generate = useCallback(() => {
    if (!canGenerate) return
    setPhase('generating')

    const rollup = ROLLUP_FIELDS[kind]

    later(() => {
      const drafted: Record<string, string> = {}

      if (rollup) {
        // 고른 보고서에 실제로 적힌 값만 옮깁니다. 없는 내용을 지어내지 않습니다.
        for (const [target, from] of Object.entries(rollup)) {
          drafted[target] = included
            .map((activity) => {
              const text = sources.values.get(activity.id)?.[from]?.trim()
              return text ? `[${activity.title}]\n${text}` : ''
            })
            .filter(Boolean)
            .join('\n\n')
        }
      } else {
        const summary = included.map((a) => `· ${a.title}`).join('\n')
        const fromFiles = ready.map((a) => `· ${a.extract}`).join('\n')
        const issues = included.filter((a) => a.source === '후속').map((a) => `· ${a.desc}`)

        drafted.summary = fromFiles ? `${summary}\n${fromFiles}` : summary
        drafted.issue = issues.join('\n')
        drafted.next = '후속이 밀린 건의 방문 일정을 등록하고, 요청받은 자료를 회신합니다.'
      }

      // 사람이 손댄 항목은 덮지 않습니다. 덮어도 되는지는 화면이 먼저 묻습니다.
      setValues((prev) => {
        const next = { ...prev }
        for (const field of template.fields) {
          if (!field.aiFilled) continue
          if (dirtyIds.has(field.id)) continue
          next[field.id] = drafted[field.id] ?? ''
        }
        return next
      })
      setAiFilledIds(
        new Set(
          template.fields
            .filter((f) => f.aiFilled && !dirtyIds.has(f.id) && drafted[f.id])
            .map((f) => f.id),
        ),
      )
      setStaleAttachments(false)
      setPhase('ready')
    }, GENERATE_MS)
  }, [canGenerate, included, ready, dirtyIds, later, template, kind, sources])

  /** 제출을 막는 이유들. 버튼 비활성과 안내 문구가 같은 값을 씁니다. */
  const missing = useMemo(() => {
    const reasons: string[] = []
    if (included.length === 0) reasons.push('자료 1건 이상')
    for (const field of template.fields) {
      if (field.required && !values[field.id]?.trim()) reasons.push(field.label)
    }
    return reasons
  }, [included, values, template])

  return {
    phase,
    setPhase,
    template,
    hasAiFields,
    activities,
    /** activity.id → 원본 상태와 바로가기 */
    meta: sources.meta,
    /** 아직 고를 수 없는 자료들. 목록 아래에 상태로 보여 줍니다. */
    pending: sources.pending,
    includedCount: included.length,
    toggleActivity,
    addManual,
    removeActivity,
    attachments,
    analyzingCount: analyzing,
    staleAttachments,
    attach,
    removeAttachment,
    values,
    setValue,
    approver,
    setApprover,
    aiFilledIds,
    dirtyIds,
    canGenerate,
    generate,
    missing,
    reset,
    /** 이 기간에 이미 있는 보고서. 이어 쓰는 중인지 화면이 이 값으로 안내합니다. */
    existing,
  }
}
