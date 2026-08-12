import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

// 포인터 이벤트로 직접 만든 드래그입니다. HTML5 의 draggable 은 쓰지 않습니다.
//
// 네이티브 드래그는 마우스 제스처 계열 브라우저 확장이 가로채면 dragstart 조차
// 오지 않아 아무 일도 일어나지 않고, 터치 기기에서는 아예 동작하지 않습니다.
// pointerdown/move/up 은 그런 사정이 없어 마우스·터치·펜에서 모두 같게 동작합니다.
//
// 캘린더(날짜 칸)와 계약 보드(컬럼 슬롯)가 같이 씁니다. 그래서 "무엇을 끄는지"와
// "어디에 놓는지"는 호출부가 정합니다. 이 훅은 놓인 자리의 표식 값을 문자열로
// 돌려줄 뿐이고, 그 값을 어떻게 읽을지는 호출부가 압니다.

/** 끌고 다니는 값이 최소한 갖춰야 하는 것. label 은 손끝에 붙어 보일 글자입니다. */
export interface DragPayload {
  label: string
}

/** 이만큼 움직이기 전에는 드래그로 보지 않습니다. 클릭이 드래그로 오해받지 않게 합니다. */
const THRESHOLD = 4

function targetAt(attr: string, x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null
  return el?.closest(`[${attr}]`)?.getAttribute(attr) ?? null
}

interface Pending<T> {
  dragging: T
  x: number
  y: number
}

/**
 * @param attr 놓을 자리를 찾을 때 볼 속성 이름. 예: `data-cell-iso`
 * @param onDrop 놓았을 때. 두 번째 인자는 그 자리의 attr 값입니다.
 */
export default function usePointerDrag<T extends DragPayload>(
  attr: string,
  onDrop: (dragging: T, key: string) => void,
) {
  const [dragging, setDragging] = useState<T | null>(null)
  const [dropKey, setDropKey] = useState<string | null>(null)
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null)

  // 누르기만 하고 아직 움직이지 않은 상태. 문턱을 넘으면 dragging 으로 승격합니다.
  const pending = useRef<Pending<T> | null>(null)
  const active = useRef(false)

  const start = useCallback((event: ReactPointerEvent, target: T) => {
    // 왼쪽 버튼(또는 터치)만 받습니다. 오른쪽 클릭으로 끌리면 곤란합니다.
    if (event.button !== 0) return
    pending.current = { dragging: target, x: event.clientX, y: event.clientY }
  }, [])

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const held = pending.current
      if (!held) return

      if (!active.current) {
        const far =
          Math.abs(event.clientX - held.x) >= THRESHOLD ||
          Math.abs(event.clientY - held.y) >= THRESHOLD
        if (!far) return
        active.current = true
        setDragging(held.dragging)
      }

      // 터치에서 스크롤로 넘어가지 않게 막습니다. (passive: false 로 등록해야 먹힙니다.)
      event.preventDefault()
      setPoint({ x: event.clientX, y: event.clientY })
      setDropKey(targetAt(attr, event.clientX, event.clientY))
    }

    const finish = (commit: boolean, event?: PointerEvent) => {
      const held = pending.current
      pending.current = null

      if (active.current) {
        // 끌고 나면 곧바로 click 이 따라옵니다. 그대로 두면 놓자마자 상세가 열립니다.
        //
        // 다만 시작점과 끝점이 다른 요소면 click 이 아예 오지 않기도 합니다.
        // once 만 걸어 두면 그 리스너가 남아 다음에 오는 진짜 클릭을 삼켜 버리므로,
        // 오든 안 오든 이번 차례가 끝나면 반드시 걷어냅니다.
        document.addEventListener('click', swallowClick, { capture: true, once: true })
        setTimeout(() => document.removeEventListener('click', swallowClick, true), 0)

        if (commit && held && event) {
          const key = targetAt(attr, event.clientX, event.clientY)
          if (key) onDrop(held.dragging, key)
        }
      }

      active.current = false
      setDragging(null)
      setDropKey(null)
      setPoint(null)
    }

    const swallowClick = (event: MouseEvent) => {
      event.stopPropagation()
      event.preventDefault()
    }

    const onUp = (event: PointerEvent) => finish(true, event)
    const onCancel = () => finish(false)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish(false)
    }

    document.addEventListener('pointermove', onMove, { passive: false })
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onCancel)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onCancel)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [attr, onDrop])

  return { dragging, dropKey, point, start }
}
