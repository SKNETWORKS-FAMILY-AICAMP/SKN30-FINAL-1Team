// 재조회 표시. 이미 보이는 내용은 건드리지 않고 아이콘 하나만 돕니다.
//
// 첫 진입은 페이지 통째로 자리표시자가 서므로 여기 오지 않습니다. 여기는 목록이 이미
// 서 있는데 조건이 바뀌어 다시 받아 오는 경우입니다. 그때 목록을 자리표시자로 갈아
// 끼우면 읽고 있던 내용이 사라져 깜빡임이 됩니다.
import { RefreshIcon } from '@/components/icons'

import styles from './InlineLoader.module.scss'

interface Props {
  /** 화면 낭독기가 읽을 말. 눈에는 아이콘만 보입니다. */
  label: string
  className?: string
}

export default function InlineLoader({ label, className }: Props) {
  return (
    <p className={[styles.loader, className].filter(Boolean).join(' ')} role="status">
      <RefreshIcon className={styles.spin} width={15} height={15} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </p>
  )
}
