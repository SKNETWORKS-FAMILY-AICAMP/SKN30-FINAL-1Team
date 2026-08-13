import { Link } from 'react-router'

import { activeOrders, isLate, orderItemLabel } from '@/content/orders'
import { ROUTES } from '@/constants/routes'
import { parseISO } from '@/utils/date'

import { ORDER_FILTERS, type OrderFilterKey } from '../../orderFilters'

import styles from './PurchaseOrders.module.scss'

interface Props {
  onOpenList: (key: OrderFilterKey) => void
  onOpenOrder: (no: string) => void
}

export default function PurchaseOrders({ onOpenList, onOpenOrder }: Props) {
  const active = activeOrders()
  const late = active.filter(isLate)

  return (
    <article className={styles.po}>
      <div className={styles.head}>
        <h2>발주 진행 현황</h2>
        <Link className={styles.link} to={ROUTES.ORDERS}>
          발주관리 전체 →
        </Link>
      </div>

      <div className={styles.strip}>
        {ORDER_FILTERS.map((f) => {
          const n = active.filter(f.test).length
          const cls = [styles.stat, n === 0 && styles.isZero, f.alert && n > 0 && styles.isAlert]
            .filter(Boolean)
            .join(' ')
          return (
            <button key={f.key} type="button" className={cls} onClick={() => onOpenList(f.key)}>
              <span className={styles.label}>{f.label}</span>
              <strong className="tnum">{n}</strong>
              <small>{f.note()}</small>
            </button>
          )
        })}
      </div>

      {late.length === 0 ? (
        <div className={styles.clear}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
          납기를 넘긴 발주가 없습니다.
        </div>
      ) : (
        late.map((o) => {
          const over = o.expectOff - o.dueOff
          const due = parseISO(o.due)
          const expect = parseISO(o.expect)
          return (
            <button
              key={o.no}
              type="button"
              className={styles.alert}
              onClick={() => onOpenOrder(o.no)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 9v4M12 17v.01" />
                <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
              </svg>
              <span>
                <strong>
                  {o.hospital} · {orderItemLabel(o)}
                </strong>
                <br />
                예상 입고 {expect.getMonth() + 1}/{expect.getDate()} — 납기 {due.getMonth() + 1}/
                {due.getDate()} 대비 {over}일 초과
              </span>
            </button>
          )
        })
      )}
    </article>
  )
}
