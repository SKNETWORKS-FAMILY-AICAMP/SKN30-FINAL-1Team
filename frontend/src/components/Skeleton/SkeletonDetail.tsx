// 상세 화면·드로어가 데이터를 기다리는 동안 세우는 자리표시자입니다.
//
// 항목 하나하나를 따라 그리지 않습니다. 제목 한 덩어리와 본문 한 덩어리면
// "여기에 무엇이 들어온다" 가 충분히 읽히고, 도착했을 때 눈이 옮겨 갈 곳도 둘뿐입니다.
import Skeleton from './Skeleton'

import styles from './SkeletonDetail.module.scss'

interface Props {
  /** 스크린리더에게 무엇을 기다리는지 한 번만 알립니다. */
  label: string
  /** 제목 줄. 드로어는 머리글이 따로 있어 끕니다. */
  title?: boolean
  /** 본문 덩어리 높이. 실제 상세의 대략적인 높이를 넘깁니다. */
  height?: number
  /** 아래쪽 버튼 자리 */
  actions?: number
  className?: string
}

export default function SkeletonDetail({
  label,
  title = false,
  height = 260,
  actions = 0,
  className,
}: Props) {
  return (
    <div className={[styles.detail, className].filter(Boolean).join(' ')} role="status">
      <span className="sr-only">{label}</span>

      {title && <Skeleton width="38%" height={26} radius="var(--r-sm)" />}

      <Skeleton height={height} radius="var(--r-md)" />

      {actions > 0 && (
        <div className={styles.actions}>
          {Array.from({ length: actions }, (_, at) => (
            <Skeleton key={at} width={84} height={36} radius="var(--r-sm)" />
          ))}
        </div>
      )}
    </div>
  )
}
