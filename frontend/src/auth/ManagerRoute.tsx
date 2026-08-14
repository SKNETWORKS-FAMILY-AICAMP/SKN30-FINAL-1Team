// 팀장 전용 화면의 문지기. 메뉴에서 감추는 것만으로는 주소를 직접 친 사람을 막지 못합니다.
//
// 실제 인증이 붙으면 서버도 같은 판단을 해야 합니다. 화면단의 이 검사는 잘못 들어온
// 사람을 돌려보내는 것이지 권한을 지키는 수단이 아닙니다.
import { Navigate, Outlet } from 'react-router'

import { ROUTES } from '@/constants/routes'

import { useCurrentUser } from './sessionContext'

export default function ManagerRoute() {
  const { isManager } = useCurrentUser()

  if (!isManager) return <Navigate to={ROUTES.DASHBOARD} replace />

  return <Outlet />
}
