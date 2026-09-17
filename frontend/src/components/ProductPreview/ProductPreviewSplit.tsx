// 왼쪽 폼, 오른쪽 제품 정보로 나눈 모달 본문입니다.
//
// 견적·발주·영업 딜이 같은 자리에서 같은 패널을 씁니다. 부르는 쪽은 Modal 에
// flushBody 를 켜고, 펼친 동안 size 를 'xl' 로 넓혀 줍니다.
import type { ReactNode } from 'react'

import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'

import ProductPreview from './ProductPreview'
import type { Picked } from './picked'

import styles from './ProductPreviewSplit.module.scss'

export default function ProductPreviewSplit({
  products,
  open,
  onOpenChange,
  children,
}: {
  /** 고른 제품. 비어 있으면 패널 없이 폼만 남습니다. */
  products: Picked[]
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  const previewing = products.length > 0

  return (
    // 패널이 생겨도 폼 줄기는 같은 자리에 둡니다. 감싸는 요소가 바뀌면 입력 중인 칸이 포커스를 잃습니다.
    <div className={styles.split} data-open={previewing} data-collapsed={!open}>
      <div className={styles.formPane}>{children}</div>
      {previewing && (
        <aside className={styles.previewPane} aria-label="고른 제품 정보">
          {open ? (
            <ProductPreview
              products={products}
              action={
                <button
                  type="button"
                  className={styles.previewToggle}
                  aria-expanded
                  aria-label="제품 정보 접기"
                  title="제품 정보 접기"
                  onClick={() => onOpenChange(false)}
                >
                  <ChevronRightIcon width={16} height={16} />
                </button>
              }
            />
          ) : (
            // 접힌 줄 전체가 펼치기 버튼입니다. 무엇이 접혀 있는지 글자로 남깁니다.
            <button
              type="button"
              className={styles.previewRail}
              aria-expanded={false}
              title="제품 정보 펼치기"
              onClick={() => onOpenChange(true)}
            >
              <ChevronLeftIcon width={16} height={16} />
              <span>제품 정보</span>
            </button>
          )}
        </aside>
      )}
    </div>
  )
}
