// demo/layout_v3.html 의 #poDrawer 입니다.
// 발주 한 건의 값을 그대로 보여 줍니다. 목록에서 들어왔으면 하단에서 목록으로
// 돌아갈 수 있고, 일정 드로어에서 바로 들어왔으면 돌아갈 목록이 없습니다.
import Button from '@/components/Button'
import Drawer from '@/components/Drawer'
import { isLate, orderItemLabel, orderTotal } from '@/content/orders'
import type { PurchaseOrder } from '@/content/types'
import { fmtDay, parseISO } from '@/utils/date'
import { wonFull } from '@/utils/format'

import styles from './OrderDrawer.module.scss'

interface Props {
  order: PurchaseOrder
  /** 목록에서 들어왔을 때만 있습니다. */
  onBack?: () => void
  onClose: () => void
}

export default function OrderDrawer({ order, onBack, onClose }: Props) {
  const late = isLate(order)

  const rows: [string, string][] = [
    ['품목', orderItemLabel(order)],
    ['금액', wonFull(orderTotal(order))],
    ['공급처', order.supplier],
    ['계약', order.contract || '계약 없는 선발주'],
    ['발주일', fmtDay(parseISO(order.ordered))],
    ['납기', fmtDay(parseISO(order.due))],
    ['예상 입고', fmtDay(parseISO(order.expect))],
    ['메모', order.memo || '—'],
  ]

  return (
    <Drawer
      title={order.hospital}
      sub={order.no}
      onClose={onClose}
      meta={
        <>
          <i className={styles.pill}>{order.status}</i>
          {late && (
            <i className={`${styles.pill} ${styles.risk}`}>
              납기 {order.expectOff - order.dueOff}일 초과
            </i>
          )}
        </>
      }
      footer={
        onBack && (
          <Button variant="outline" onClick={onBack}>
            ← 목록으로
          </Button>
        )
      }
    >
      <dl className={styles.rows}>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </Drawer>
  )
}
