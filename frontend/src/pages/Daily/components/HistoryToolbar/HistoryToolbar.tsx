// 작성 리스트의 찾기 줄입니다. 유형은 기간 탭이 정하므로 여기에는 없고,
// 상태·보고 대상·기간은 Popover 안에 접어 둡니다. (Customers 의 도구 줄과 같은 방식)
import { useState } from 'react'

import { FilterIcon, SearchIcon } from '@/components/icons'
import Popover from '@/components/Popover'

import {
  countFilters,
  FILTER_RANGES,
  FILTER_STATUSES,
  NO_FILTERS,
  type HistoryFilters,
} from '../../historyFilters'

import styles from './HistoryToolbar.module.scss'

interface Props {
  query: string
  onQueryChange: (next: string) => void
  filters: HistoryFilters
  onFiltersChange: (next: HistoryFilters) => void
  approvers: string[]
}

export default function HistoryToolbar({
  query,
  onQueryChange,
  filters,
  onFiltersChange,
  approvers,
}: Props) {
  const [open, setOpen] = useState(false)
  const filterCount = countFilters(filters)

  const toggle = (key: 'status' | 'approver', value: string) => {
    const current: string[] = filters[key]
    onFiltersChange({
      ...filters,
      [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    })
  }

  return (
    <div className={styles.root}>
      <div className={styles.search}>
        <SearchIcon width={16} height={16} />
        <input
          type="search"
          value={query}
          placeholder="보고서 검색"
          aria-label="보고서 검색"
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        align="end"
        label="이력 필터"
        trigger={
          <button
            type="button"
            className={`${styles.tool} ${filterCount > 0 ? styles.isOn : ''}`}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <FilterIcon width={15} height={15} />
            필터
            {filterCount > 0 && <span className={styles.badge}>{filterCount}</span>}
          </button>
        }
      >
        <div className={styles.panel}>
          <fieldset className={styles.group}>
            <legend className={styles.legend}>상태</legend>
            <div className={styles.chips}>
              {FILTER_STATUSES.map((value) => {
                const on = filters.status.includes(value)
                return (
                  <button
                    key={value}
                    type="button"
                    className={`${styles.chip} ${on ? styles.isChipOn : ''}`}
                    aria-pressed={on}
                    onClick={() => toggle('status', value)}
                  >
                    {value}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <fieldset className={styles.group}>
            <legend className={styles.legend}>보고 대상</legend>
            <div className={styles.chips}>
              {approvers.map((value) => {
                const on = filters.approver.includes(value)
                return (
                  <button
                    key={value}
                    type="button"
                    className={`${styles.chip} ${on ? styles.isChipOn : ''}`}
                    aria-pressed={on}
                    onClick={() => toggle('approver', value)}
                  >
                    {value}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <fieldset className={styles.group}>
            <legend className={styles.legend}>기간</legend>
            <div className={styles.chips}>
              {FILTER_RANGES.map((item) => {
                const on = filters.range === item.value
                return (
                  <button
                    key={item.value}
                    type="button"
                    className={`${styles.chip} ${on ? styles.isChipOn : ''}`}
                    aria-pressed={on}
                    onClick={() => onFiltersChange({ ...filters, range: item.value })}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <button
            type="button"
            className={styles.clear}
            disabled={filterCount === 0}
            onClick={() => onFiltersChange(NO_FILTERS)}
          >
            필터 초기화
          </button>
        </div>
      </Popover>
    </div>
  )
}
