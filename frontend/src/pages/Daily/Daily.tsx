// 업무 보고 한 화면. 위에서부터 기간 탭 → 제출 이력 달력 → 작성 리스트입니다.
// 작성만 별도 화면(/daily/new)으로 나갑니다.
import { useDeferredValue, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import WeekStrip from '@/components/WeekStrip'
import { dailyComposePath } from '@/constants/routes'
import { APPROVERS } from '@/content/reports'
import type { DailyReport } from '@/content/types'
import {
  addDays,
  addMonths,
  fmtDotShort,
  fmtMonth,
  iso,
  parseISO,
  startOfMonth,
  startOfWeek,
  TODAY,
  TODAY_ISO,
  weekRangeLabel,
} from '@/utils/date'

import HistoryToolbar from './components/HistoryToolbar'
import MonthCalendar from './components/MonthCalendar'
import ReportDrawer from './components/ReportDrawer'
import ReportStatusBadge from './components/ReportStatusBadge'
import { countFilters, NO_FILTERS, type HistoryFilters } from './historyFilters'
import { PERIOD_KIND, PERIOD_LABEL, PERIODS, reportTitle, toPeriod } from './periods'
import useDailyReports from './useDailyReports'

import styles from './Daily.module.scss'

// 이력은 지나간 걸 보는 것이라 일–토 한 주를 통째로 봅니다.
// (대시보드 주간 달력의 "오늘이 셋째 칸" 롤링 범위와는 성격이 다릅니다.)
const weekDays = (offset: number) => {
  const first = addDays(startOfWeek(TODAY), offset * 7)
  return Array.from({ length: 7 }, (_, i) => addDays(first, i))
}

/**
 * 열려 있는 요약 패널. 여는 길이 둘입니다.
 *
 * 달력은 그날 낸 것을 통째로 펴고, 작성 리스트는 고른 보고서 하나만 폅니다.
 * 어느 쪽이든 그 날짜가 달력에서 선택으로 보입니다.
 */
type OpenPanel = { by: 'date'; dateISO: string } | { by: 'report'; report: DailyReport }

/** 기간 필터의 시작일. 'all' 이면 자르지 않습니다. */
function rangeStartISO(range: HistoryFilters['range']): string | null {
  if (range === 'week') return iso(startOfWeek(TODAY))
  if (range === 'month') return iso(startOfMonth(TODAY))
  if (range === 'quarter') return iso(addMonths(TODAY, -3))
  return null
}

export default function Daily() {
  const [params, setParams] = useSearchParams()
  const period = toPeriod(params.get('tab'))
  const kind = PERIOD_KIND[period]

  const { reports, byDate } = useDailyReports()

  const [weekOffset, setWeekOffset] = useState(0)
  const [showMonth, setShowMonth] = useState(false)
  const [cursor, setCursor] = useState(() => startOfMonth(TODAY))
  // drawer 가 열려 있는 동안에만 값이 있습니다.
  const [open, setOpen] = useState<OpenPanel | null>(null)
  const openISO = open === null ? '' : open.by === 'date' ? open.dateISO : open.report.date

  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<HistoryFilters>(NO_FILTERS)

  // 타이핑이 목록 계산에 막히지 않게 검색어만 뒤로 미룹니다.
  const deferredQuery = useDeferredValue(query)

  const days = weekDays(weekOffset)

  // 달력과 리스트 모두 탭이 고른 종류만 봅니다.
  const inKind = useMemo(() => {
    const map = new Map<string, DailyReport[]>()
    for (const [date, list] of byDate) {
      const picked = kind ? list.filter((r) => r.kind === kind) : list
      if (picked.length > 0) map.set(date, picked)
    }
    return map
  }, [byDate, kind])

  // 리스트는 검색어와 필터까지 겁니다. 달력은 그 달에 무엇이 있었는지가 목적이라 걸지 않습니다.
  const visible = useMemo(() => {
    const from = rangeStartISO(filters.range)
    const needle = deferredQuery.trim().toLowerCase()

    return reports.filter((report) => {
      if (kind && report.kind !== kind) return false
      if (filters.status.length > 0 && !filters.status.includes(report.status)) return false
      if (filters.approver.length > 0 && !filters.approver.includes(report.approver)) return false
      if (from && report.date < from) return false
      if (!needle) return true

      // 보고 본문까지 훑습니다. 제목만으로는 찾을 수 있는 게 거의 없습니다.
      const haystack = [reportTitle(report), report.note, report.approver, report.kind]
        .concat(Object.values(report.values))
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })
  }, [reports, kind, filters, deferredQuery])

  const filterCount = countFilters(filters)
  const narrowed = filterCount > 0 || query.trim().length > 0

  const resetAll = () => {
    setQuery('')
    setFilters(NO_FILTERS)
  }

  // 칸마다 점 하나. 평일인데 지나갔고 일일보고가 비었으면 미작성 표시입니다.
  const renderMark = (dateISO: string, isSelected: boolean) => {
    const report = inKind.get(dateISO)?.[0]
    const dow = parseISO(dateISO).getDay()
    const tone = (() => {
      if (report?.status === '확정') return styles.markDone
      if (report?.status === '검토 대기') return styles.markPending
      if (report?.status === '작성중') return styles.markDraft
      if (report?.status === '반려') return styles.markMissing
      // 주간·월간은 매일 내는 보고가 아니므로 미작성으로 보지 않습니다.
      if (kind && kind !== '일일') return null
      const past = dateISO < TODAY_ISO
      if (past && dow !== 0 && dow !== 6) return styles.markMissing
      return null
    })()

    if (!tone) return null
    return <i className={`${tone} ${isSelected ? styles.isOnBlue : ''}`} />
  }

  return (
    <section>
      {/* Topbar 빵부스러기가 이미 화면 이름을 말하므로 제목은 읽어 주기만 합니다. */}
      <h1 className="sr-only">업무 보고</h1>

      <div className={styles.head}>
        <div className={styles.tabs} role="tablist" aria-label="업무 보고 기간">
          {PERIODS.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={period === item}
              className={`${styles.tab} ${period === item ? styles.isActive : ''}`}
              onClick={() => setParams(item === 'all' ? {} : { tab: item })}
            >
              {PERIOD_LABEL[item]}
            </button>
          ))}
        </div>

        <Link className={styles.cta} to={dailyComposePath(TODAY_ISO, kind ?? '일일')}>
          보고서 작성하기
          <ChevronRightIcon />
        </Link>
      </div>

      <article className={styles.week}>
        <div className={styles.weekHead}>
          <p className={`${styles.range} tnum`}>
            {showMonth ? fmtMonth(cursor) : weekRangeLabel(days)}
          </p>

          <div className={styles.weekTools}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() =>
                showMonth ? setCursor(addMonths(cursor, -1)) : setWeekOffset(weekOffset - 1)
              }
              aria-label={showMonth ? '이전 달' : '이전 주'}
            >
              <ChevronLeftIcon width={15} height={15} />
            </button>
            <button
              type="button"
              className={styles.thisWeek}
              onClick={() => (showMonth ? setCursor(startOfMonth(TODAY)) : setWeekOffset(0))}
              disabled={showMonth ? iso(cursor) === iso(startOfMonth(TODAY)) : weekOffset === 0}
            >
              {showMonth ? '이번 달' : '이번 주'}
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() =>
                showMonth ? setCursor(addMonths(cursor, 1)) : setWeekOffset(weekOffset + 1)
              }
              aria-label={showMonth ? '다음 달' : '다음 주'}
            >
              <ChevronRightIcon width={15} height={15} />
            </button>

            <button
              type="button"
              className={styles.more}
              aria-expanded={showMonth}
              onClick={() => setShowMonth(!showMonth)}
            >
              {showMonth ? '주간으로 보기' : '달력 더보기'}
            </button>
          </div>
        </div>

        {showMonth ? (
          <MonthCalendar
            cursor={cursor}
            byDate={inKind}
            selectedISO={openISO}
            onSelect={(dateISO) => setOpen({ by: 'date', dateISO })}
          />
        ) : (
          <div className={styles.strip}>
            <WeekStrip
              days={days}
              selectedISO={openISO}
              onSelect={(dateISO) => setOpen({ by: 'date', dateISO })}
              onOutOfRange={(next) => setWeekOffset(weekOffset + (next < iso(days[0]) ? -1 : 1))}
              renderMarks={renderMark}
              label="제출 이력 주간 달력"
            />
          </div>
        )}

        {/* 상태 점은 주간 strip 에만 찍힙니다. 한 달 달력은 종류를 칩으로 보여 줍니다. */}
        {!showMonth && (
          <p className={styles.legend}>
            <span>
              <i className={styles.markDone} /> 확정
            </span>
            <span>
              <i className={styles.markPending} /> 검토 대기
            </span>
            <span>
              <i className={styles.markDraft} /> 작성중
            </span>
            <span>
              <i className={styles.markMissing} /> 미작성 · 반려
            </span>
          </p>
        )}
      </article>

      <div className={styles.listHead}>
        <h2 className={styles.listTitle}>작성 리스트</h2>
      </div>

      <HistoryToolbar
        query={query}
        onQueryChange={setQuery}
        filters={filters}
        onFiltersChange={setFilters}
        approvers={[...APPROVERS]}
      />

      {visible.length === 0 ? (
        <div className={styles.empty}>
          <p>조건에 맞는 보고서가 없습니다.</p>
          {narrowed && (
            <button type="button" className={styles.reset} onClick={resetAll}>
              필터 초기화
            </button>
          )}
        </div>
      ) : (
        <ul className={styles.rows}>
          {visible.map((report) => (
            // 줄 어디를 눌러도 요약이 섭니다. 전문으로는 그 안의 '전체 보기' 로 넘어갑니다.
            <li
              key={report.id}
              className={styles.row}
              onClick={() => setOpen({ by: 'report', report })}
            >
              <span className={styles.type}>{report.kind}</span>

              <div className={styles.rowBody}>
                {/* 줄 전체를 누르지만 li 는 키보드로 못 잡습니다. 제목이 그
                    손잡이이고, 하는 일은 줄을 누른 것과 같습니다. */}
                <strong>
                  <button
                    type="button"
                    className={styles.openButton}
                    onClick={(event) => {
                      event.stopPropagation()
                      setOpen({ by: 'report', report })
                    }}
                  >
                    {reportTitle(report)}
                  </button>
                </strong>
                <span>{report.note}</span>
              </div>

              <span className={styles.approver}>{report.approver}</span>
              <span className={`${styles.date} tnum`}>{fmtDotShort(parseISO(report.date))}</span>
              <ReportStatusBadge status={report.status} />
            </li>
          ))}
        </ul>
      )}

      <p className={styles.count}>
        전체 {reports.length}건 중 <b className="tnum">{visible.length}</b>건
      </p>

      {open !== null && (
        <ReportDrawer
          dateISO={openISO}
          reports={open.by === 'report' ? [open.report] : (inKind.get(openISO) ?? [])}
          // '전체' 탭은 종류를 고르지 않았으므로 머리말 CTA 와 같이 일일로 봅니다.
          kind={kind ?? '일일'}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  )
}
