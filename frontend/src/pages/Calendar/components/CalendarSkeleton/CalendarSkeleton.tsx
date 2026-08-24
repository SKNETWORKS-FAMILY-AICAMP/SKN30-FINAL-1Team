// 캘린더 한 장이 자리를 잡는 동안 세우는 자리표시자입니다.
//
// 달력 칸 안에만 자리표시자를 넣으면 달·요일·날짜가 이미 다 그려진 화면 위에서 칩만
// 깜빡여, 무엇을 기다리는지가 오히려 읽히지 않았습니다. 카드 두 장을 통째로 덮고
// 일정과 발주를 다 받은 뒤 한 번에 진짜 달력으로 바꿉니다.
import Skeleton from '@/components/Skeleton'

import styles from './CalendarSkeleton.module.scss'

/** 실제 카드 높이. 달력은 머리줄 + 요일줄 + 6주, 추천 패널은 머리줄 + 안내 두 줄입니다. */
const GRID_H = 620
const PANEL_H = 180

export default function CalendarSkeleton() {
  return (
    <div className={styles.layout} role="status">
      <span className="sr-only">일정과 발주를 불러오는 중입니다.</span>
      <Skeleton height={GRID_H} radius="var(--r-lg)" />
      <Skeleton height={PANEL_H} radius="var(--r-lg)" />
    </div>
  )
}
