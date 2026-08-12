// demo/layout_v3.html 의 #recordDrawer 입니다.
// 일정 하나에 대해 알아야 할 것을 한 장에 모읍니다. 세부 정보와 브리핑은 왼쪽,
// 지난 접촉과 연결된 발주는 오른쪽입니다.
//
// 보고서 작성 폼은 여기 넣지 않습니다. 앱에 이미 업무보고 작성 화면이 있어
// 하단 버튼으로 그 날짜의 작성 화면으로 넘깁니다.
import { Link } from 'react-router'

import Button from '@/components/Button'
import Drawer from '@/components/Drawer'
import { KIND_LABEL } from '@/content/agenda'
import { findOrderFor, orderItemLabel } from '@/content/orders'
import type { AgendaItem, AgendaKind } from '@/content/types'
import { dailyComposePath } from '@/constants/routes'
import { fmtDay, parseISO } from '@/utils/date'

import styles from './RecordDrawer.module.scss'

interface Props {
  item: AgendaItem
  done: boolean
  onToggleDone: (id: string) => void
  onOpenOrder: (no: string) => void
  onClose: () => void
}

// DayAgenda 의 배지 색과 같습니다. 목록에서 본 색이 드로어에서 바뀌면 안 됩니다.
const KIND_TONE: Partial<Record<AgendaKind, string>> = {
  visit: styles.kindBlue,
  demo: styles.kindPurple,
  booth: styles.kindPurple,
  edu: styles.kindGreen,
  delivery: styles.kindOrange,
}

export default function RecordDrawer({ item, done, onToggleDone, onOpenOrder, onClose }: Props) {
  const order = findOrderFor(item.hospital, item.product)

  const facts: [string, string][] = [
    ['부서', item.dept],
    ['담당자', item.contact],
    ['제품', item.product],
    ['장소', item.place],
    ['소요', item.dur],
  ]

  return (
    <Drawer
      wide
      title={item.hospital}
      sub={item.title}
      onClose={onClose}
      meta={
        <>
          <span className={`${styles.kind} ${KIND_TONE[item.kind] ?? ''}`}>
            {KIND_LABEL[item.kind]}
          </span>
          <i className={styles.pill}>{item.stage}</i>
          <span className={styles.when}>
            {fmtDay(parseISO(item.date))} {item.time}
          </span>
          {done && <i className={`${styles.pill} ${styles.good}`}>업무보고 완료</i>}
        </>
      }
      footer={
        <>
          <Button variant="outline" onClick={() => onToggleDone(item.id)}>
            {done ? '완료 해제' : '완료로 표시'}
          </Button>
          <Link className={styles.cta} to={dailyComposePath(item.date)}>
            일일보고서 작성
          </Link>
        </>
      }
    >
      <div className={styles.grid}>
        <div className={styles.col}>
          <section className={styles.block}>
            <h3>세부 정보</h3>
            <dl className={styles.facts}>
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className={styles.block}>
            <h3>AI 미팅 브리핑</h3>
            <p className={styles.note}>{item.brief}</p>
          </section>
        </div>

        <div className={styles.col}>
          <section className={styles.block}>
            <h3>고객 히스토리</h3>
            {item.history.map((h) => (
              <div key={`${h.when}-${h.what}`} className={styles.history}>
                <time>{h.when}</time>
                <p>{h.what}</p>
              </div>
            ))}
          </section>

          <section className={styles.block}>
            <h3>연결된 발주</h3>
            {order ? (
              <button type="button" className={styles.link} onClick={() => onOpenOrder(order.no)}>
                <span>
                  <strong>{order.no}</strong>
                  <small>
                    {orderItemLabel(order)} · {order.status}
                  </small>
                </span>
                <span aria-hidden="true">→</span>
              </button>
            ) : (
              <p className={`${styles.note} ${styles.muted}`}>
                이 제품으로 등록된 발주가 없습니다.
              </p>
            )}
          </section>
        </div>
      </div>
    </Drawer>
  )
}
