// 캘린더가 끌고 다니는 것과 놓을 자리의 표식입니다.
// 드래그 동작 자체는 @/hooks/usePointerDrag 가 갖고, 여기서는 이 화면의 어휘만 정합니다.

export interface Dragging {
  kind: 'event' | 'suggestion'
  id: string
  /** 끌고 다니는 동안 손끝에 붙어 보일 글자 */
  label: string
}

/** 놓을 자리를 찾을 때 쓰는 표식. 날짜 칸이 이 속성을 답니다. */
export const CELL_ATTR = 'data-cell-iso'
