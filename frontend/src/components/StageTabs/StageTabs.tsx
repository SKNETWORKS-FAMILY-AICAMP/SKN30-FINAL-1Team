// 단계 탭. 영업·견적·계약·발주 네 목록이 같은 탭을 씁니다.
//
// 옆의 건수는 단계를 뺀 나머지 조건까지만 적용한 수입니다. 단계까지 적용하면 고른 탭만
// 숫자가 남고 나머지가 0 이 되어 어디에 몇 건이 있는지 알 수 없습니다.
import Tabs, { type TabItem } from '@/components/Tabs'
import type { Stage } from '@/types'

interface Props {
  stages: Stage[]
  /** 탭 묶음의 이름. 화면마다 '계약 단계'·'발주 상태' 처럼 다릅니다. */
  label: string
  /** 고른 단계. 빈 문자열이면 전체입니다. */
  value: string
  countOf: (stageId: string) => number
  total: number
  onChange: (stageId: string) => void
}

export default function StageTabs({ stages, label, value, countOf, total, onChange }: Props) {
  const items: TabItem[] = [
    { value: '', label: '전체', count: total },
    ...stages.map((stage) => ({
      value: stage.id,
      label: stage.name,
      count: countOf(stage.id),
      tone: stage.tone,
    })),
  ]

  return <Tabs items={items} value={value} label={label} onChange={onChange} />
}
