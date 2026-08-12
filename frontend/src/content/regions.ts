// 고객사가 있는 시. 매출을 지역 축으로 묶을 때 씁니다.
//
// customers.ts 시드에는 지역 항목이 없습니다. 고객 목록 화면이 쓰지 않는 항목을
// 시드마다 넣는 대신, 병원은 한 곳에 하나이므로 여기서 회사 이름으로만 매핑합니다.

export const regionByOrg: Record<string, string> = {
  한빛대학교병원: '서울',
  서림메디컬센터: '서울',
  새봄정형외과: '경기',
  도담재활병원: '경기',
  정우병원: '인천',
  미래아동병원: '충남',
}

/** 표와 차트의 지역 순서. 실적이 0인 지역도 자리를 지킵니다. */
export const REGIONS = ['서울', '경기', '인천', '충남'] as const

/** 매핑에 없는 회사는 '기타'로 모읍니다. 계약 한 건이 집계에서 사라지지 않게 합니다. */
export function regionOf(org: string): string {
  return regionByOrg[org] ?? '기타'
}
