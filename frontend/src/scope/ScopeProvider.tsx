import { type ReactNode, useCallback, useMemo, useState } from 'react'

import { useCurrentUser } from '@/auth/sessionContext'

import { type Scope, SCOPE_ME, SCOPE_TEAM, ScopeContext } from './scopeContext'
import { readScope, writeScope } from './scopeStorage'

/** 팀원은 스코프를 바꿀 수 없으므로 아무것도 하지 않는 setter 를 씁니다. */
const noop = () => {}

/** 팀원에게 고정되는 범위. 매번 새 배열을 만들면 목록 계산이 다시 돕니다. */
const ONLY_ME: Scope = [SCOPE_ME]

export default function ScopeProvider({ children }: { children: ReactNode }) {
  const { isManager } = useCurrentUser()

  // 초기화 함수는 첫 페인트 전에 실행되므로 새로고침해도 스코프가 깜빡이지 않습니다.
  const [saved, setSaved] = useState<Scope | null>(readScope)

  const setScope = useCallback((next: Scope) => {
    writeScope(next)
    setSaved(next)
  }, [])

  // 팀원은 저장된 값과 무관하게 늘 자기 자신입니다. 권한이 UI 상태에 기대지 않도록
  // 여기서 잠급니다. 팀장의 기본값은 팀 전체입니다.
  const value = useMemo(
    () =>
      isManager ? { scope: saved ?? SCOPE_TEAM, setScope } : { scope: ONLY_ME, setScope: noop },
    [isManager, saved, setScope],
  )

  return <ScopeContext value={value}>{children}</ScopeContext>
}
