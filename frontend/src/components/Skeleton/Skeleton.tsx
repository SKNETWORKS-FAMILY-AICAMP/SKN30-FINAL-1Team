// 자리표시자 한 조각. 글자 한 줄, 배지 하나, 버튼 하나가 들어설 자리를 잡습니다.
//
// 이 컴포넌트는 자리만 잡습니다. "무엇을 기다리는 중인지" 는 화면 쪽에서
// role="status" 로 한 번만 알립니다. 조각마다 읽어 주면 표 한 장에 수십 번
// 같은 말이 반복됩니다. 그래서 여기는 항상 aria-hidden 입니다.
import type { CSSProperties } from 'react'

import styles from './Skeleton.module.scss'

interface Props {
  /** px 숫자 또는 '60%' 같은 CSS 길이 */
  width?: number | string
  height?: number | string
  /** 기본은 --r-xs. 배지처럼 더 둥근 자리는 --r-pill 을 넘깁니다. */
  radius?: string
  /** 아바타처럼 완전한 원 */
  circle?: boolean
  className?: string
  style?: CSSProperties
}

const length = (value?: number | string) => (typeof value === 'number' ? `${value}px` : value)

export default function Skeleton({
  width,
  height = 12,
  radius,
  circle = false,
  className,
  style,
}: Props) {
  return (
    <span
      aria-hidden="true"
      className={[styles.block, circle ? styles.circle : '', className].filter(Boolean).join(' ')}
      style={{
        width: length(width),
        height: length(height),
        borderRadius: radius,
        ...style,
      }}
    />
  )
}
