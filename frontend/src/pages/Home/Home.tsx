import { useCallback, useEffect, useState } from 'react'

import { fetchHealth } from '@/api/health'
import Button from '@/components/Button'
import { env } from '@/config/env'

import styles from './Home.module.scss'

type Status = 'loading' | 'ok' | 'error'

export default function Home() {
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('')

  const check = useCallback(async () => {
    setStatus('loading')
    try {
      const data = await fetchHealth()
      setStatus('ok')
      setMessage(`status: ${data.status}`)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : '알 수 없는 오류')
    }
  }, [])

  useEffect(() => {
    void check()
  }, [check])

  return (
    <main className={styles.root}>
      <h1 className={styles.title}>필드메드 (FieldMed)</h1>
      <p className={styles.subtitle}>다중 에이전트 협업 기반 업무 자동화 시스템</p>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>백엔드 연결 상태</h2>

        <p className={`${styles.status} ${styles[status]}`}>
          {status === 'loading' && '확인 중...'}
          {status === 'ok' && `연결됨 — ${message}`}
          {status === 'error' && `연결 실패 — ${message}`}
        </p>

        <p className={styles.meta}>API: {env.apiBaseUrl}/api/health</p>

        <Button onClick={() => void check()} disabled={status === 'loading'}>
          다시 확인
        </Button>
      </section>
    </main>
  )
}
