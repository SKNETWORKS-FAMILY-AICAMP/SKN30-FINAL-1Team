import Button from '@/components/Button'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import WeekStrip from '@/components/WeekStrip'
import { agendaFor, useAgenda } from '@/shared/agenda'
import { addDays, iso, TODAY, weekRangeLabel } from '@/utils/date'

import styles from './WeekCalendar.module.scss'

interface Props {
  weekOffset: number
  selectedISO: string
  onSelect: (dateISO: string) => void
  onWeekChange: (offset: number) => void
  onToday: () => void
}

/**
 * 한 칸에 세우는 표식의 최대 개수. 일곱 칸으로 나눈 폭이라 이보다 늘리면
 * 점이 붙어 몇 개인지 세지지 않습니다.
 *
 * 넘치는 날은 표식 하나를 덜어 그 자리에 '+N' 을 세웁니다. 다섯 개에서 잘라
 * 두면 여섯 개인 날과 열 개인 날이 똑같이 보여, 바쁜 날을 알아볼 수 없습니다.
 */
const MAX_MARKS = 5

// 오늘을 왼쪽에서 셋째 칸에 두어 지난 이틀과 앞으로의 나흘이 함께 보이게 합니다.
const rangeStart = (offset: number) => addDays(TODAY, -2 + offset * 7)
const rangeDays = (offset: number) =>
  Array.from({ length: 7 }, (_, i) => addDays(rangeStart(offset), i))

export default function WeekCalendar({
  weekOffset,
  selectedISO,
  onSelect,
  onWeekChange,
  onToday,
}: Props) {
  // 일정이 늘거나 줄면 날짜 아래 점이 따라 움직여야 합니다.
  useAgenda()
  const days = rangeDays(weekOffset)

  // 선택 칸은 배경이 파랗게 차므로 점 색을 뒤집습니다.
  const renderMarks = (dateISO: string, isSelected: boolean) => {
    // 점은 아래 하루 목록과 같은 것을 셉니다. 사내 일정이 업무, 나머지가 미팅입니다.
    const day = agendaFor(dateISO)
    const meetings = day.filter((it) => it.kind !== 'internal').length
    const deliveries = day.length - meetings
    const meetingCls = `${styles.dotMeeting} ${isSelected ? styles.isOnBlue : ''}`
    const deliveryCls = `${styles.dotDelivery} ${isSelected ? styles.isOnBlue : ''}`

    // 넘치는 날은 '+N' 이 한 자리를 가져갑니다.
    const slots = day.length > MAX_MARKS ? MAX_MARKS - 1 : MAX_MARKS
    // 업무가 있는 날은 마지막 한 자리를 업무에 남깁니다. 미팅으로만 채우면
    // 그날 사내 일이 있다는 사실이 통째로 사라집니다. 반대로 한쪽이 없는 날은
    // 남은 자리를 다른 쪽이 모두 씁니다.
    const shownMeetings = Math.min(meetings, deliveries > 0 ? slots - 1 : slots)
    const shownDeliveries = Math.min(deliveries, slots - shownMeetings)
    const hidden = day.length - shownMeetings - shownDeliveries

    return (
      <>
        {Array.from({ length: shownMeetings }, (_, i) => (
          <i key={`m${i}`} className={meetingCls} />
        ))}
        {Array.from({ length: shownDeliveries }, (_, i) => (
          <i key={`d${i}`} className={deliveryCls} />
        ))}
        {hidden > 0 && (
          <span className={`${styles.more} ${isSelected ? styles.isOnBlue : ''} tnum`}>
            +{hidden}
          </span>
        )}
      </>
    )
  }

  return (
    <article className={styles.weekcal}>
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>주간업무</p>
          <p className={`${styles.range} tnum`}>{weekRangeLabel(days)}</p>
        </div>

        <div className={styles.tools}>
          <span className={styles.legend}>
            <span>
              <i className={styles.dotMeeting} /> 미팅
            </span>
            <span>
              <i className={styles.dotDelivery} /> 업무
            </span>
          </span>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => onWeekChange(weekOffset - 1)}
            aria-label="이전 주"
          >
            <ChevronLeftIcon width={15} height={15} />
          </button>
          <Button variant="ghost" onClick={onToday}>
            오늘
          </Button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => onWeekChange(weekOffset + 1)}
            aria-label="다음 주"
          >
            <ChevronRightIcon width={15} height={15} />
          </button>
        </div>
      </div>

      <div className={styles.strip}>
        <WeekStrip
          days={days}
          selectedISO={selectedISO}
          onSelect={onSelect}
          // 화살표로 보이는 주를 벗어나면 주를 따라 넘깁니다.
          onOutOfRange={(next) => onWeekChange(weekOffset + (iso(days[0]) > next ? -1 : 1))}
          renderMarks={renderMarks}
          label="주간 일정"
          notch
        />
      </div>
    </article>
  )
}
