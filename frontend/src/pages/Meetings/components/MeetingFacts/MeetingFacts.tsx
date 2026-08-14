// 미팅 상대와 자리에 대한 사실입니다. 작성 화면과 상세가 같은 것을 봅니다.
// 값은 일정에서 왔고 여기서 고치지 않습니다. 일정이 틀렸다면 캘린더에서 고칠 일입니다.
import styles from './MeetingFacts.module.scss'

interface Props {
  dept: string
  contact: string
  product: string
  place: string
}

export default function MeetingFacts({ dept, contact, product, place }: Props) {
  const facts: [string, string][] = [
    ['부서', dept],
    ['담당자', contact],
    ['제품', product],
    ['장소', place],
  ]

  return (
    <dl className={styles.facts}>
      {facts.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}
