// 달력에서 날짜를 눌렀을 때 오른쪽에서 들어오는 요약 패널입니다.
// /daily 의 주간 달력과 /daily/history 의 월 달력이 같은 것을 씁니다.
//
// 전문은 여기 넣지 않습니다. 하단 "전체 보기" 로 /daily/:id 로 넘깁니다.
import { useEffect, useId, useRef } from 'react'
import { Link } from 'react-router'

import { ChevronRightIcon, CloseIcon } from '@/components/icons'
import { dailyComposePath, dailyReportPath } from '@/constants/routes'
import { agendaFor } from '@/content/agenda'
import { templateFor } from '@/content/reports'
import type { DailyReport, ReportKind } from '@/content/types'
import { fmtDot, parseISO, TODAY_ISO } from '@/utils/date'

import ReportStatusBadge from '../ReportStatusBadge'
import { reportTitle } from '../../periods'

import styles from './ReportDrawer.module.scss'

interface Props {
  dateISO: string
  /** 그날 제출된 보고서. 하루에 일일과 주간이 겹칠 수 있어 배열입니다. */
  reports: DailyReport[]
  /** 지금 보고 있는 기간 탭의 종류. 작성 화면을 그 양식으로 열어야 합니다. */
  kind: ReportKind
  onClose: () => void
}

/** 요약으로 보여 줄 대표 필드. 양식의 첫 필드가 언제나 그 보고서의 본문입니다. */
function summaryOf(report: DailyReport): string {
  const [first] = templateFor(report.kind).fields
  return report.values[first.id]?.trim() ?? ''
}

export default function ReportDrawer({ dateISO, reports, kind, onClose }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  // Modal 과 같은 처리입니다. Escape 로 닫고 배경은 스크롤을 멈추며,
  // 닫으면 눌렀던 날짜 칸으로 포커스가 돌아갑니다.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)

    const previousOverflow = document.body.style.overflow
    const previouslyFocused = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [onClose])

  useEffect(() => {
    bodyRef.current
      ?.querySelector<HTMLElement>('a, button, [tabindex]:not([tabindex="-1"])')
      ?.focus()
  }, [])

  const isFuture = dateISO > TODAY_ISO
  const schedule = agendaFor(dateISO).length

  return (
    <div className={styles.scrim} onPointerDown={onClose}>
      <aside
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className={styles.head}>
          <h2 id={titleId} className="tnum">
            {fmtDot(parseISO(dateISO))}
          </h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
            <CloseIcon />
          </button>
        </header>

        <div className={styles.body} ref={bodyRef}>
          {reports.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>제출된 보고서가 없습니다.</p>
              <p className={styles.emptyDesc}>
                {isFuture
                  ? '아직 오지 않은 날짜입니다.'
                  : schedule > 0
                    ? `이 날 캘린더 일정 ${schedule}건이 남아 있습니다. 그대로 초안을 만들 수 있습니다.`
                    : '이 날은 캘린더 일정도 없습니다.'}
              </p>

              {!isFuture && (
                <Link className={styles.cta} to={dailyComposePath(dateISO, kind)}>
                  이 날짜로 {kind}보고서 작성하기
                  <ChevronRightIcon />
                </Link>
              )}
            </div>
          ) : (
            reports.map((report) => {
              const summary = summaryOf(report)
              const files = report.attachments.length
              const acts = report.activities.filter((a) => a.included).length

              return (
                <article key={report.id} className={styles.item}>
                  <div className={styles.tags}>
                    <span className={styles.kind}>{report.kind}</span>
                    <ReportStatusBadge status={report.status} />
                    <span className={styles.approver}>{report.approver}</span>
                  </div>

                  <h3 className={styles.title}>{reportTitle(report)}</h3>

                  {summary ? (
                    <p className={styles.summary}>{summary}</p>
                  ) : (
                    <p className={styles.summaryEmpty}>내용이 비어 있습니다.</p>
                  )}

                  <p className={styles.counts}>
                    {acts > 0 || files > 0
                      ? `활동 ${acts}건${files > 0 ? ` · 첨부 ${files}건` : ''}`
                      : report.note}
                  </p>

                  <Link className={styles.cta} to={dailyReportPath(report.id)}>
                    전체 보기
                    <ChevronRightIcon />
                  </Link>
                </article>
              )
            })
          )}
        </div>
      </aside>
    </div>
  )
}
