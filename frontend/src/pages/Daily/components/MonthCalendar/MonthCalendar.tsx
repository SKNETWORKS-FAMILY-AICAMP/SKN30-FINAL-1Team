// 제출 이력을 한 달 단위로 훑는 달력입니다.
//
// Calendar 의 MonthGrid 는 쓰지 않습니다. 그쪽은 드래그·인라인 추가까지 하는
// 일정 편집기라 프롭이 열 개가 넘습니다. 여기 필요한 건 종류 표시뿐입니다.
import type { DailyReport } from '@/content/types'
import { fmtDotShort, iso, monthMatrix, TODAY_ISO, WD } from '@/utils/date'

import styles from './MonthCalendar.module.scss'

interface Props {
  /** 표시 중인 달. 달 이동 버튼은 카드 머리글이 갖습니다. */
  cursor: Date
  byDate: Map<string, DailyReport[]>
  selectedISO: string
  onSelect: (dateISO: string) => void
}

export default function MonthCalendar({ cursor, byDate, selectedISO, onSelect }: Props) {
  const days = monthMatrix(cursor)
  const month = cursor.getMonth()

  return (
    <div className={styles.grid}>
      {WD.map((label, index) => (
        <span
          key={label}
          className={`${styles.wd} ${index === 0 ? styles.isSun : ''} ${
            index === 6 ? styles.isSat : ''
          }`}
        >
          {label}
        </span>
      ))}

      {days.map((day) => {
        const key = iso(day)
        const list = byDate.get(key) ?? []
        const isOther = day.getMonth() !== month

        return (
          <button
            key={key}
            type="button"
            className={`${styles.cell} ${isOther ? styles.isOther : ''} ${
              key === TODAY_ISO ? styles.isToday : ''
            } ${key === selectedISO ? styles.isSelected : ''}`}
            onClick={() => onSelect(key)}
            aria-label={`${fmtDotShort(day)} 보고서 ${list.length}건`}
          >
            <span className={`${styles.num} tnum`}>{day.getDate()}</span>
            <span className={styles.cellTags}>
              {list.map((report) => (
                <span key={report.id} className={styles.cellTag}>
                  {report.kind}
                </span>
              ))}
            </span>
          </button>
        )
      })}
    </div>
  )
}
