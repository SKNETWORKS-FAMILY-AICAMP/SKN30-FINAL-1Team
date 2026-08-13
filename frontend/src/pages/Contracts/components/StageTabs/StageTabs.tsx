// 단계 탭. 보드의 컬럼을 그대로 탭으로 씁니다. 컬럼을 늘리면 탭도 함께 늘어납니다.
//
// 옆의 건수는 검색·담당·기간까지만 적용한 수입니다. 탭까지 적용하면 고른 탭만
// 숫자가 남고 나머지가 0 이 되어 어디에 몇 건이 있는지 알 수 없습니다.
import type { BoardColumn } from '../../board'

import styles from './StageTabs.module.scss'

interface Props {
  stages: BoardColumn[]
  /** 고른 단계. 빈 문자열이면 전체입니다. */
  value: string
  countOf: (stageId: string) => number
  total: number
  onChange: (stageId: string) => void
}

export default function StageTabs({ stages, value, countOf, total, onChange }: Props) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="계약 단계">
      <Tab label="전체" count={total} on={value === ''} onSelect={() => onChange('')} />
      {stages.map((stage) => (
        <Tab
          key={stage.id}
          label={stage.name}
          count={countOf(stage.id)}
          tone={stage.tone}
          on={value === stage.id}
          onSelect={() => onChange(stage.id)}
        />
      ))}
    </div>
  )
}

interface TabProps {
  label: string
  count: number
  tone?: BoardColumn['tone']
  on: boolean
  onSelect: () => void
}

function Tab({ label, count, tone, on, onSelect }: TabProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      className={[styles.tab, on ? styles.isActive : ''].filter(Boolean).join(' ')}
      onClick={onSelect}
    >
      {tone && <i className={[styles.dot, styles[tone]].join(' ')} aria-hidden="true" />}
      {label}
      <span className={`${styles.count} tnum`}>{count}</span>
    </button>
  )
}
