// 작성 리스트의 찾기 줄입니다. 유형은 기간 탭이 정하므로 여기에는 없고,
// 위에서부터 검색어 → 상태 → 기간 순으로 넓은 조건이 먼저 옵니다.
//
// 조건을 접어 두지 않습니다. 보이지 않는 필터가 목록을 걸러 버리면 왜 비었는지
// 알 길이 없습니다. 검색어만 기존대로 검색 버튼·Enter 로 확정하고, 상태와 기간은
// 고르는 즉시 목록에 걸립니다(딜·계약 화면의 탭·드롭다운과 같은 방식).
import { useMemo } from 'react'

import DayPicker from '@/components/DayPicker'
import SearchInput from '@/components/SearchInput'
import Tabs, { type TabItem } from '@/components/Tabs'
import type { ReportStatus } from '@/types'
import { iso, parseISO } from '@/utils/date'

import {
  activePreset,
  countFilters,
  FILTER_STATUSES,
  presetRange,
  RANGE_PRESETS,
  STATUS_TONE,
  type HistoryFilters,
} from '../../historyFilters'
import type { Period } from '../../periods'

import styles from './HistoryToolbar.module.scss'

type StatusValue = ReportStatus | ''

interface Props {
  query: string
  onSearch: (next: string) => void
  filters: HistoryFilters
  onFiltersChange: (next: HistoryFilters) => void
  /** 지금 보고 있는 탭. 미팅에는 작성중이 없습니다. */
  period: Period
  /** 검색어까지 함께 푸는 전체 해제. */
  onReset: () => void
}

/** 빈 문자열은 조건 없음이라 달력에는 아무것도 고르지 않은 것으로 넘깁니다. */
const toDate = (value: string) => (value === '' ? null : parseISO(value))
const toISO = (date: Date | null) => (date === null ? '' : iso(date))

export default function HistoryToolbar({
  query,
  onSearch,
  filters,
  onFiltersChange,
  period,
  onReset,
}: Props) {
  const statusItems = useMemo<TabItem<StatusValue>[]>(
    () => [
      { value: '', label: '전체' },
      ...FILTER_STATUSES.filter((value) => period !== 'meeting' || value !== '작성중').map(
        (value) => ({ value, label: value, tone: STATUS_TONE[value] }),
      ),
    ],
    [period],
  )

  return (
    <div className={styles.root}>
      <SearchInput
        className={styles.search}
        value={query}
        placeholder="보고서 검색"
        label="보고서 검색"
        onSearch={onSearch}
      />

      <Tabs
        items={statusItems}
        value={filters.status}
        label="보고서 상태"
        onChange={(status) => onFiltersChange({ ...filters, status })}
      />

      <div className={styles.range}>
        <DayPicker
          className={styles.day}
          selected={toDate(filters.start)}
          maxDate={toDate(filters.end) ?? undefined}
          label="조회 시작일"
          placeholderText="시작일"
          isClearable
          onChange={(date) => onFiltersChange({ ...filters, start: toISO(date) })}
        />
        <span className={styles.tilde} aria-hidden="true">
          ~
        </span>
        <DayPicker
          className={styles.day}
          selected={toDate(filters.end)}
          minDate={toDate(filters.start) ?? undefined}
          label="조회 종료일"
          placeholderText="종료일"
          isClearable
          onChange={(date) => onFiltersChange({ ...filters, end: toISO(date) })}
        />

        {/* 자주 보는 구간을 한 번에. 누르면 시작·끝을 함께 갈아 끼웁니다.
            날짜를 직접 고치면 어느 칸과도 맞지 않게 되어 모두 꺼집니다. */}
        <Tabs
          variant="segmented"
          size="sm"
          items={RANGE_PRESETS}
          value={activePreset(filters) ?? ''}
          label="기간 빠른 선택"
          onChange={(value) => onFiltersChange({ ...filters, ...presetRange(value) })}
        />

        {(countFilters(filters) > 0 || query !== '') && (
          <button type="button" className={styles.clear} onClick={onReset}>
            초기화
          </button>
        )}
      </div>
    </div>
  )
}
