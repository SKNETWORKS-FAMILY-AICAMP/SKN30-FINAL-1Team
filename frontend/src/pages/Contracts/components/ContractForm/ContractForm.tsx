// 계약 추가·수정 폼입니다. 두 경우가 항목이 같아 한 컴포넌트로 둡니다.
// contract 를 주면 수정, 주지 않으면 추가입니다.
import { useState, type ReactNode } from 'react'

import Button from '@/components/Button'
import Modal from '@/components/Modal'
import type { ContractKind } from '@/content/types'
import { TODAY_ISO } from '@/utils/date'

import { KINDS, ORGS, OWNERS, PRODUCTS, type BoardContract } from '../../board'
import type { ContractDraft } from '../../useContractBoard'

import styles from './ContractForm.module.scss'

interface Props {
  /** 수정할 계약. 없으면 새로 만듭니다. */
  contract?: BoardContract
  /** 추가할 컬럼 이름. 새로 만들 때 어디에 들어가는지 알려 줍니다. */
  columnName?: string
  onClose: () => void
  onSubmit: (draft: ContractDraft) => void
}

// 입력값은 전부 문자열로 다룹니다. 선택지는 제출할 때 원래 타입으로 돌립니다.
interface FormState {
  org: string
  product: string
  amount: string
  kind: string
  owner: string
  date: string
  memo: string
}

type Errors = Partial<Record<keyof FormState, string>>

function initialState(contract?: BoardContract): FormState {
  return {
    org: contract?.org ?? '',
    product: contract?.product ?? '',
    // 금액은 입력 중에 숫자로 바꾸지 않습니다. 지우는 도중 0 이 되어 버립니다.
    amount: contract ? String(contract.amount) : '',
    kind: contract?.kind ?? KINDS[0],
    owner: contract?.owner ?? OWNERS[0],
    date: contract?.date ?? TODAY_ISO,
    memo: contract?.memo ?? '',
  }
}

function validate(form: FormState): Errors {
  const errors: Errors = {}
  if (form.org.trim() === '') errors.org = '고객사를 입력하세요.'
  if (form.product.trim() === '') errors.product = '제품을 입력하세요.'

  const amount = Number(form.amount.replace(/,/g, ''))
  if (form.amount.trim() === '') errors.amount = '금액을 입력하세요.'
  else if (Number.isNaN(amount) || amount <= 0) errors.amount = '0보다 큰 숫자로 입력하세요.'

  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) errors.date = '날짜를 선택하세요.'
  return errors
}

export default function ContractForm({ contract, columnName, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<FormState>(() => initialState(contract))
  const [errors, setErrors] = useState<Errors>({})

  const set = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const submit = () => {
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    onSubmit({
      org: form.org.trim(),
      product: form.product.trim(),
      amount: Number(form.amount.replace(/,/g, '')),
      kind: form.kind as ContractKind,
      owner: form.owner,
      date: form.date,
      memo: form.memo.trim(),
    })
  }

  const editing = contract !== undefined

  return (
    <Modal
      title={editing ? '계약 수정' : '계약 추가'}
      description={
        editing
          ? `${contract.no} · 단계는 보드에서 카드를 옮겨 바꿉니다.`
          : `${columnName ?? ''} 컬럼 맨 위에 추가됩니다. 계약번호는 자동으로 매깁니다.`
      }
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button type="submit">{editing ? '저장' : '계약 추가'}</Button>
        </>
      }
    >
      <div className={styles.grid}>
        <Field label="고객사" required error={errors.org}>
          {/* 목록에 없는 곳도 새로 적을 수 있어야 해서 select 가 아니라 datalist 입니다. */}
          <input
            list="contract-orgs"
            value={form.org}
            placeholder="한빛대학교병원"
            onChange={(e) => set('org', e.target.value)}
          />
          <datalist id="contract-orgs">
            {ORGS.map((org) => (
              <option key={org} value={org} />
            ))}
          </datalist>
        </Field>

        <Field label="제품" required error={errors.product}>
          <input
            list="contract-products"
            value={form.product}
            placeholder="SonoFlex Pro"
            onChange={(e) => set('product', e.target.value)}
          />
          <datalist id="contract-products">
            {PRODUCTS.map((product) => (
              <option key={product} value={product} />
            ))}
          </datalist>
        </Field>

        <Field label="금액 (원)" required error={errors.amount}>
          <input
            inputMode="numeric"
            value={form.amount}
            placeholder="28400000"
            onChange={(e) => set('amount', e.target.value)}
          />
        </Field>

        <Field label="유형">
          <select value={form.kind} onChange={(e) => set('kind', e.target.value)}>
            {KINDS.map((kind) => (
              <option key={kind}>{kind}</option>
            ))}
          </select>
        </Field>

        <Field label="담당 영업">
          <select value={form.owner} onChange={(e) => set('owner', e.target.value)}>
            {OWNERS.map((owner) => (
              <option key={owner}>{owner}</option>
            ))}
          </select>
        </Field>

        <Field label="계약일" error={errors.date}>
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
        </Field>

        <Field label="메모" wide>
          <textarea
            rows={3}
            value={form.memo}
            placeholder="다음에 확인할 것"
            onChange={(e) => set('memo', e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  )
}

interface FieldProps {
  label: string
  required?: boolean
  error?: string
  wide?: boolean
  children: ReactNode
}

function Field({ label, required, error, wide, children }: FieldProps) {
  return (
    <label className={`${styles.field} ${wide ? styles.isWide : ''}`}>
      <span className={styles.label}>
        {label}
        {required && <b aria-hidden="true">*</b>}
      </span>
      {children}
      {error && <span className={styles.error}>{error}</span>}
    </label>
  )
}
