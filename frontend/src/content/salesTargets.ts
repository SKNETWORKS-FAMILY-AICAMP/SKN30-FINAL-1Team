// 고객사별 월 매출 목표. 합계는 counters.ts 의 salesGoal.target(팀 월 목표 3억)과 같습니다.
//
// 기간 목표는 기간이 걸치는 달마다 목표를 더해서 만듭니다. 한 달을 통째로 덮지 않는
// 달은 (덮은 일수 / 그 달의 일수)로 안분합니다. 주간 탭이 월 목표를 그대로 쓰면
// 달성률이 항상 20% 근처로 나와 아무 의미가 없기 때문입니다.
import { endOfMonth, iso, parseISO, startOfMonth } from '@/utils/date'

import { regionOf } from './regions'

export const monthlyTargetByOrg: Record<string, number> = {
  한빛대학교병원: 90_000_000,
  서림메디컬센터: 70_000_000,
  새봄정형외과: 45_000_000,
  정우병원: 40_000_000,
  도담재활병원: 30_000_000,
  미래아동병원: 25_000_000,
}

const ORGS = Object.keys(monthlyTargetByOrg)

/** 기간이 덮는 달마다 (덮은 일수 / 그 달의 일수)를 더한 값. 한 달을 다 덮으면 1 입니다. */
function monthsCovered(fromISO: string, toISO: string): number {
  const from = parseISO(fromISO)
  const to = parseISO(toISO)
  let cursor = startOfMonth(from)
  let sum = 0

  while (iso(cursor) <= toISO) {
    const last = endOfMonth(cursor)
    const days = last.getDate()
    // 기간과 이 달이 겹치는 구간의 일수
    const start = Math.max(from.getTime(), cursor.getTime())
    const end = Math.min(to.getTime(), last.getTime())
    if (end >= start) sum += (Math.round((end - start) / 86_400_000) + 1) / days
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }

  return sum
}

/** 만 원 단위로 끊습니다. 목표 금액에 1원 단위가 붙으면 표에서 읽기 어렵습니다. */
const round = (n: number) => Math.round(n / 10_000) * 10_000

export function targetFor(org: string, fromISO: string, toISO: string): number {
  const monthly = monthlyTargetByOrg[org]
  if (!monthly) return 0
  return round(monthly * monthsCovered(fromISO, toISO))
}

export function targetForRegion(region: string, fromISO: string, toISO: string): number {
  const monthly = ORGS.filter((org) => regionOf(org) === region).reduce(
    (sum, org) => sum + monthlyTargetByOrg[org],
    0,
  )
  return round(monthly * monthsCovered(fromISO, toISO))
}

export function totalTarget(fromISO: string, toISO: string): number {
  const monthly = ORGS.reduce((sum, org) => sum + monthlyTargetByOrg[org], 0)
  return round(monthly * monthsCovered(fromISO, toISO))
}
