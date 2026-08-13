// 계약 추가 화면입니다. 목록에서 "계약 추가"로 들어옵니다.
//
// 보드의 카드 추가 모달과 항목은 같지만, 여기서는 단계를 직접 고릅니다.
// 목록에는 옮길 칸이 없어 어느 단계로 들어가는지 폼에서 정해야 합니다.
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import Button from '@/components/Button'
import { ChevronLeftIcon } from '@/components/icons'
import { ROUTES } from '@/constants/routes'

import ContractFields, { Field } from './components/ContractFields'
import { initialState, toDraft, validate, type FormErrors, type FormState } from './contractForm'
import useContractBoard from './useContractBoard'

import styles from './New.module.scss'

export default function New() {
  const { columns, addContract } = useContractBoard()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [form, setForm] = useState<FormState>(() => initialState())
  const [errors, setErrors] = useState<FormErrors>({})
  // 목록에서 단계 탭을 고른 채로 들어오면 그 단계로 시작합니다.
  const [stageId, setStageId] = useState(() => {
    const wanted = params.get('stage') ?? ''
    return columns.some((col) => col.id === wanted) ? wanted : (columns[0]?.id ?? '')
  })

  const set = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const submit = () => {
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    addContract(toDraft(form), stageId)
    // 새 계약은 맨 위에 들어갑니다. 목록으로 돌아가면 바로 보입니다.
    navigate(ROUTES.CONTRACTS)
  }

  return (
    <section>
      <h1 className="sr-only">계약 추가</h1>

      <header className={styles.head}>
        <Link className={styles.back} to={ROUTES.CONTRACTS}>
          <ChevronLeftIcon />
          계약 현황
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
          <h2>새 계약</h2>
          <p>계약번호는 저장할 때 자동으로 매깁니다.</p>
        </div>

        <ContractFields form={form} errors={errors} onChange={set}>
          <Field label="단계">
            <select value={stageId} onChange={(event) => setStageId(event.target.value)}>
              {columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </select>
          </Field>
        </ContractFields>

        <div className={styles.actions}>
          <Button type="button" variant="outline" onClick={() => navigate(ROUTES.CONTRACTS)}>
            취소
          </Button>
          <Button type="submit">계약 추가</Button>
        </div>
      </form>
    </section>
  )
}
