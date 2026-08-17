import { useState, type ReactNode } from 'react'

import { CheckIcon, PlusIcon, TrashIcon } from '@/components/icons'
import type { ReportActivity } from '@/types'

import styles from './ActivityList.module.scss'

interface Props {
  activities: ReportActivity[]
  /** 읽기 모드면 체크·삭제·추가가 사라지고 포함된 항목만 보입니다. */
  readOnly?: boolean
  /**
   * 캘린더에 없는 업무를 직접 적는 칸. 주간·월간은 제출된 보고서만 자료로 쓰므로
   * 직접 적을 것이 없습니다.
   */
  canAdd?: boolean
  /** 항목 오른쪽에 붙는 상태·바로가기. 원본 보고서가 있는 자료에서 씁니다. */
  renderAside?: (item: ReportActivity) => ReactNode
  onToggle?: (id: string) => void
  onRemove?: (id: string) => void
  onAdd?: (title: string) => void
}

export default function ActivityList({
  activities,
  readOnly = false,
  canAdd = true,
  renderAside,
  onToggle,
  onRemove,
  onAdd,
}: Props) {
  const [draft, setDraft] = useState('')

  const rows = readOnly ? activities.filter((a) => a.included) : activities

  const submitManual = () => {
    const title = draft.trim()
    if (title === '') return
    onAdd?.(title)
    setDraft('')
  }

  return (
    <div>
      {rows.length === 0 ? (
        <p className={styles.empty}>
          {readOnly ? '보고서에 포함된 활동이 없습니다.' : '이 날짜에 기록된 일정이 없습니다.'}
        </p>
      ) : (
        <ul className={styles.list}>
          {rows.map((item) => (
            <li
              key={item.id}
              className={`${styles.item} ${!readOnly && !item.included ? styles.isOff : ''}`}
            >
              {readOnly ? (
                <span className={styles.mark} aria-hidden="true">
                  <CheckIcon />
                </span>
              ) : (
                <button
                  type="button"
                  className={styles.check}
                  aria-pressed={item.included}
                  aria-label={`${item.title} 보고서에 포함`}
                  onClick={() => onToggle?.(item.id)}
                >
                  <CheckIcon />
                </button>
              )}

              <div className={styles.body}>
                <strong className={styles.title}>{item.title}</strong>
                <span className={styles.desc}>{item.desc}</span>
              </div>

              <span className={styles.source}>{item.source}</span>

              {renderAside && <span className={styles.aside}>{renderAside(item)}</span>}

              {!readOnly && item.source === '수기' && (
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={`${item.title} 삭제`}
                  onClick={() => onRemove?.(item.id)}
                >
                  <TrashIcon />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && canAdd && (
        <div className={styles.add}>
          <input
            value={draft}
            placeholder="캘린더에 없는 업무를 직접 적습니다"
            onChange={(event) => setDraft(event.target.value)}
            // 폼 안에 있으므로 Enter 가 제출로 새지 않게 여기서 가로챕니다.
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              submitManual()
            }}
          />
          <button type="button" onClick={submitManual} disabled={draft.trim() === ''}>
            <PlusIcon />
            항목 추가
          </button>
        </div>
      )}
    </div>
  )
}
