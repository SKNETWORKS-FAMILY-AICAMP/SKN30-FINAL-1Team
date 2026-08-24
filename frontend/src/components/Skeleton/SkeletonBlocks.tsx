// 같은 크기의 덩어리를 여러 개 늘어놓습니다. 카드 목록·칸반 컬럼처럼 실제 UI 가
// 같은 모양을 반복하는 자리에 씁니다.
//
// 덩어리 하나가 카드 한 장입니다. 카드 안쪽을 다시 잘게 나누지 않습니다.
import Skeleton from './Skeleton'

import styles from './SkeletonBlocks.module.scss'

interface Props {
  /** 스크린리더에게 무엇을 기다리는지 한 번만 알립니다. */
  label: string
  count?: number
  /** 실제 카드 한 장의 높이. 같은 값을 넘겨야 화면이 밀리지 않습니다. */
  height: number | string
  /** 한 덩어리의 폭. 없으면 가득 채웁니다. */
  width?: number | string
  gap?: number
  radius?: string
  /** 칸반처럼 가로로 늘어서는 자리 */
  row?: boolean
  className?: string
}

export default function SkeletonBlocks({
  label,
  count = 5,
  height,
  width,
  gap = 8,
  radius = 'var(--r-lg)',
  row = false,
  className,
}: Props) {
  return (
    <div
      role="status"
      className={[row ? styles.row : styles.stack, className].filter(Boolean).join(' ')}
      style={{ gap }}
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, at) => (
        <Skeleton key={at} width={width} height={height} radius={radius} />
      ))}
    </div>
  )
}
