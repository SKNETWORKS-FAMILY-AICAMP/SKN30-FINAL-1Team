import type { PointerEvent as ReactPointerEvent } from 'react'

import type { BoardContract } from '../../board'
import { fmtDotShort, parseISO } from '@/utils/date'
import { won } from '@/utils/format'

import styles from './ContractCard.module.scss'

interface Props {
  contract: BoardContract
  isDragging: boolean
  onOpen: (no: string) => void
  onGrab: (event: ReactPointerEvent, contract: BoardContract) => void
  /** 키보드로 앞뒤 컬럼에 옮기기. 드래그를 못 쓰는 경우의 길입니다. */
  onNudge: (no: string, delta: -1 | 1) => void
}

export default function ContractCard({ contract, isDragging, onOpen, onGrab, onNudge }: Props) {
  return (
    <button
      type="button"
      className={[styles.card, isDragging && styles.isDragging].filter(Boolean).join(' ')}
      aria-keyshortcuts="[ ]"
      onPointerDown={(event) => onGrab(event, contract)}
      onClick={() => onOpen(contract.no)}
      onKeyDown={(event) => {
        if (event.key !== '[' && event.key !== ']') return
        event.preventDefault()
        onNudge(contract.no, event.key === '[' ? -1 : 1)
      }}
    >
      <span className={styles.org}>{contract.org}</span>
      <span className={styles.product}>{contract.product}</span>

      <span className={styles.amount}>
        <span className="tnum">{won(contract.amount)}</span>
        <span className={styles.kind}>{contract.kind}</span>
      </span>

      <span className={styles.meta}>
        <span>{contract.owner}</span>
        <span className="tnum">{fmtDotShort(parseISO(contract.date))}</span>
      </span>
    </button>
  )
}
