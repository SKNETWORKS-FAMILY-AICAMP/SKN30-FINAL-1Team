// 기간 탭과 앞뒤 이동. 업무 보고 화면의 기간 줄과 같은 형태를 씁니다.
import Button from '@/components/Button'
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from '@/components/icons'
import Tabs from '@/components/Tabs'

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
        <Tabs
          variant="segmented"
          items={PERIODS.map((item) => ({ value: item, label: PERIOD_LABEL[item] }))}
          value={type}
          label="매출 집계 기간"
          onChange={onTypeChange}
        />

        <Button variant="outline" onClick={onExport}>
          <DownloadIcon width={15} height={15} />
          CSV 내보내기
        </Button>
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

        <Button
          variant="outline"
          className={styles.reset}
          onClick={() => onOffsetChange(0)}
          disabled={offset === 0}
        >
          {PERIOD_RESET[type]}
        </Button>
      </div>
    </div>
  )
}
