// 막대 위 점의 자리를 세는 곳. 그리는 규칙은 StageBar.module.scss 에 있고,
// 여기서는 그 규칙과 같은 값을 밖에서도 쓸 수 있게 내줍니다.

/** 양 끝 점은 막대 밖으로 삐져나가지 않게 안쪽으로 붙여 세웁니다(.first / .last). */
const EDGE = 5

/**
 * 칸 index 의 점이 막대 위에서 서는 가로 위치.
 *
 * 막대 아래에 붙는 말풍선 꼬리가 누른 점을 정확히 가리켜야 해서 밖으로 엽니다.
 */
export function stageDotX(index: number, count: number): string {
  const last = count - 1
  if (index <= 0) return `${EDGE}px`
  if (index >= last) return `calc(100% - ${EDGE * 2}px)`
  return `${(index / last) * 100}%`
}
