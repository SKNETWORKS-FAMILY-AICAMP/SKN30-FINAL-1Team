// demo/layout_v3.html 의 #recordDrawer 입니다.
// 일정 하나에 대해 알아야 할 것을 한 장에 모읍니다. 세부 정보는 왼쪽,
// 지난 접촉은 오른쪽이고 브리핑은 아래에 한 줄로 넓게 깝니다.
//
// 보고서 작성 폼은 여기 넣지 않습니다. 미팅 기록은 첨부와 AI 구조화가 붙어
// 드로어 한 장에 담기지 않으므로 하단 버튼으로 작성 화면으로 넘깁니다.
import { Link } from 'react-router'

import Drawer from '@/components/Drawer'
import { statusScope } from '@/content/agenda'
import type { AgendaItem } from '@/content/types'
import { meetingComposePath, meetingReportPath } from '@/constants/routes'
import useMeetingReports from '@/pages/Meetings/useMeetingReports'
import { fmtDay, parseISO } from '@/utils/date'

import styles from './RecordDrawer.module.scss'

interface Props {
  item: AgendaItem
  done: boolean
  onClose: () => void
}

export default function RecordDrawer({ item, done, onClose }: Props) {
  const { findByAgenda } = useMeetingReports()
  // 이 자리에서 쓴 기록이 있으면 새로 쓰지 않고 그것을 엽니다.
  const saved = findByAgenda(item.id)

  const facts: [string, string][] = [
    ['부서', item.dept],
    ['담당자', item.contact],
    ['제품', item.product],
    ['장소', item.place],
  ]

  return (
    <Drawer
      wide
      title={item.hospital}
      sub={
        <>
          {item.title}
          <span className={styles.when}>
            · {fmtDay(parseISO(item.date))} {item.time}
          </span>
        </>
      }
      onClose={onClose}
      meta={
        <>
          {/* 태그는 DayAgenda 목록과 같습니다. 상태 하나, 그리고 끝냈는데
              보고를 안 썼을 때만 그 사실을 덧붙입니다. */}
          <i
            className={`${styles.pill} ${statusScope(item.stage) === '외부' ? styles.scopeExternal : ''}`}
          >
            {item.stage}
          </i>
          {done && !saved && (
            <i className={`${styles.pill} ${styles.needsReport}`}>보고서 미작성</i>
          )}
        </>
      }
      footer={
        <Link
          className={styles.cta}
          to={saved ? meetingReportPath(saved.id) : meetingComposePath(item.id)}
        >
          {saved ? '미팅보고서 열기' : '미팅보고서 작성'}
        </Link>
      }
    >
      <div className={styles.grid}>
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
          <h3>고객 히스토리</h3>
          {item.history.map((h) => (
            <div key={`${h.when}-${h.what}`} className={styles.history}>
              <time>{h.when}</time>
              <p>{h.what}</p>
            </div>
          ))}
        </section>

        {/* 브리핑은 문장이 길어 두 열을 가로질러 한 줄로 깝니다. */}
        <section className={`${styles.block} ${styles.full}`}>
          <h3>AI 미팅 브리핑</h3>
          <p className={styles.note}>{item.brief}</p>
        </section>
      </div>
    </Drawer>
  )
}
