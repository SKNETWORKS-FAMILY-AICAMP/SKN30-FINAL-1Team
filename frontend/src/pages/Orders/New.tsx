// 발주 추가 화면입니다. 목록에서 "발주 추가"로 들어옵니다.
//
// 품목 줄이 몇 개까지 늘어날지 모르므로 모달이 아니라 화면 하나를 씁니다.
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import Button from '@/components/Button'
import { ChevronLeftIcon } from '@/components/icons'
import { ROUTES } from '@/constants/routes'

import OrderFields from './components/OrderFields'
import {
  initialState,
  toDraft,
  validate,
  type FormErrors,
  type FormState,
  type ItemState,
} from './orderForm'
import { ORDER_STATUSES } from './pipeline'
import useOrderList from './useOrderList'

import styles from './New.module.scss'

export default function New() {
  const { addOrder } = useOrderList()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [form, setForm] = useState<FormState>(() => {
    const base = initialState()
    // 목록에서 상태 탭을 고른 채로 들어오면 그 상태로 시작합니다.
    const wanted = params.get('status') ?? ''
    return (ORDER_STATUSES as string[]).includes(wanted) ? { ...base, status: wanted } : base
  })
  const [errors, setErrors] = useState<FormErrors>({})

  const set = (key: Exclude<keyof FormState, 'items'>, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const setItems = (items: ItemState[]) => setForm((prev) => ({ ...prev, items }))

  const submit = () => {
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    addOrder(toDraft(form))
    // 새 발주는 맨 위에 들어갑니다. 목록으로 돌아가면 바로 보입니다.
    navigate(ROUTES.ORDERS)
  }

  return (
    <section>
      <h1 className="sr-only">발주 추가</h1>

      <header className={styles.head}>
        <Link className={styles.back} to={ROUTES.ORDERS}>
          <ChevronLeftIcon />
          발주 관리
        </Link>
      </header>

      <form
        className={styles.panel}
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <div className={styles.panelHead}>
          <h2>새 발주</h2>
          <p>발주번호는 저장할 때 자동으로 매깁니다.</p>
        </div>

        <OrderFields form={form} errors={errors} onChange={set} onItemsChange={setItems} />

        <div className={styles.actions}>
          <Button type="button" variant="outline" onClick={() => navigate(ROUTES.ORDERS)}>
            취소
          </Button>
          <Button type="submit">발주 추가</Button>
        </div>
      </form>
    </section>
  )
}
