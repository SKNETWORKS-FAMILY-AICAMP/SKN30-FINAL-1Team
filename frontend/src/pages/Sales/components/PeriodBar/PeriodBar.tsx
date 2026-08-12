// 기간 탭과 앞뒤 이동. 업무 보고 화면의 기간 줄과 같은 형태를 씁니다.
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from '@/components/icons'

import { PERIOD_LABEL, PERIOD_RESET, PERIODS, type PeriodType, type Range } from '../../periods'

import styles from './PeriodBar.module.scss'

interface PeriodBarProps {
  type: PeriodType
  offset: number
  range: Range
  onTypeChange: (next: PeriodType) => void
  onOffsetChange: (next: number) => void
  onExport: () => void
}

export default function PeriodBar({
  type,
  offset,
  range,
  onTypeChange,
  onOffsetChange,
  onExport,
}: PeriodBarProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.top}>
        <div className={styles.tabs} role="tablist" aria-label="매출 집계 기간">
          {PERIODS.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={type === item}
              className={`${styles.tab} ${type === item ? styles.isActive : ''}`}
              onClick={() => onTypeChange(item)}
            >
              {PERIOD_LABEL[item]}
            </button>
          ))}
        </div>

        <button type="button" className={styles.export} onClick={onExport}>
          <DownloadIcon width={15} height={15} />
          CSV 내보내기
        </button>
      </div>

      <div className={styles.nav}>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => onOffsetChange(offset - 1)}
          aria-label="이전 기간"
        >
          <ChevronLeftIcon width={15} height={15} />
        </button>

        <p className={styles.label}>
          <strong className="tnum">{range.label}</strong>
          {range.sub && <span className="tnum">{range.sub}</span>}
        </p>

        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => onOffsetChange(offset + 1)}
          aria-label="다음 기간"
        >
          <ChevronRightIcon width={15} height={15} />
        </button>

        <button
          type="button"
          className={styles.reset}
          onClick={() => onOffsetChange(0)}
          disabled={offset === 0}
        >
          {PERIOD_RESET[type]}
        </button>
      </div>
    </div>
  )
}
