// 분류를 직접 적게 되기 전의 코드입니다. 그 행들을 이름으로 보이고 찾는 데만 씁니다.
export const CATEGORIES = [
  { code: 'system', label: '시스템' },
  { code: 'probe', label: '프로브' },
  { code: 'consumable', label: '소모품' },
]

const LABEL_BY_CODE = new Map<string, string>(CATEGORIES.map(({ code, label }) => [code, label]))

/** 직접 적은 분류는 표에 없으므로 그대로 씁니다. */
export function categoryLabel(code: string): string {
  return LABEL_BY_CODE.get(code) ?? code
}

/**
 * 검색어가 가리키는 분류 코드. 분류 이름은 화면만 알고 DB 에는 코드만 있어서, 이름으로
 * 찾으려면 화면이 코드로 풀어 보내야 합니다.
 */
export function categoryCodesMatching(needle: string): string[] {
  const lowered = needle.trim().toLowerCase()
  if (lowered === '') return []
  return CATEGORIES.filter(({ label }) => label.toLowerCase().includes(lowered)).map(
    ({ code }) => code,
  )
}

export function shelfLifeLabel(months: number | null): string {
  return months === null ? '-' : `${months}개월`
}
