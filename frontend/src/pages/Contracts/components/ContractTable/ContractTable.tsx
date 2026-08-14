// 계약 목록 표입니다. 줄 하나가 계약 한 건이고, 누르면 오른쪽 드로어가 섭니다.
//
// 열 폭 조절·선택 체크박스는 두지 않습니다. 여기서 하는 일은 훑어보고 여는 것뿐이라
// 고객 목록만큼의 도구가 필요하지 않습니다.
import { useMemo } from 'react'

import Button from '@/components/Button'
import { ArrowUpIcon, ContractIcon, SearchIcon, SortIcon } from '@/components/icons'
import { BP_DESKTOP } from '@/constants/breakpoints'
import useMediaQuery from '@/hooks/useMediaQuery'
import { useOwnerScope } from '@/scope/scopeContext'
import { fmtDot, parseISO } from '@/utils/date'
import { won } from '@/utils/format'

import type { BoardColumn, BoardContract } from '../../board'
import { CONTRACT_COLUMNS, type SortState } from '../../columns'

import styles from './ContractTable.module.scss'

interface Props {
  rows: BoardContract[]
  /** 단계 배지에 쓸 보드 컬럼 */
  stages: BoardColumn[]
  sort: SortState
  onSort: (id: string) => void
  onOpen: (no: string) => void
  isFiltered: boolean
  onClearFilters: () => void
  onCreate: () => void
}

export default function ContractTable({
  rows,
  stages,
  sort,
  onSort,
  onOpen,
  isFiltered,
  onClearFilters,
  onCreate,
}: Props) {
  // 한 사람만 보고 있으면 담당 영업 열은 모든 줄이 같은 값이라 자리만 차지합니다.
  const { showOwner } = useOwnerScope()
  const columns = useMemo(
    () => CONTRACT_COLUMNS.filter((col) => col.id !== 'owner' || showOwner),
    [showOwner],
  )

  // 표와 카드는 마크업 자체가 다릅니다. CSS 로는 한쪽을 숨기는 것밖에 못 해
  // 폰에서도 여덟 열짜리 DOM 을 그대로 들고 있게 됩니다.
  const isDesktop = useMediaQuery(`(min-width: ${BP_DESKTOP}px)`)

  const stageOf = (card: BoardContract) => stages.find((col) => col.id === card.stageId)

  if (rows.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.empty}>
          {isFiltered ? (
            <>
              <SearchIcon width={34} height={34} strokeWidth={1.5} />
              <p>조건에 맞는 계약이 없습니다.</p>
              <Button variant="outline" onClick={onClearFilters}>
                검색·필터 초기화
              </Button>
            </>
          ) : (
            <>
              <ContractIcon width={34} height={34} strokeWidth={1.5} />
              <p>아직 등록한 계약이 없습니다.</p>
              <Button onClick={onCreate}>계약 추가</Button>
            </>
          )}
        </div>
      </div>
    )
  }

  if (!isDesktop) {
    return (
      <ul className={styles.cardList}>
        {rows.map((card) => {
          const stage = stageOf(card)
          return (
            <li key={card.no} className={styles.miniCard} onClick={() => onOpen(card.no)}>
              <div className={styles.miniHead}>
                <button type="button" className={styles.openButton} onClick={() => onOpen(card.no)}>
                  {card.org}
                </button>
                {stage && (
                  <span className={[styles.stage, styles[stage.tone]].join(' ')}>{stage.name}</span>
                )}
              </div>
              <p className={styles.miniProduct}>
                {card.product} · {card.kind}
              </p>
              <div className={styles.miniMeta}>
                <span className={`${styles.miniAmount} tnum`}>{won(card.amount)}</span>
                <span className="tnum">{fmtDot(parseISO(card.date))}</span>
                {showOwner && <span>{card.owner}</span>}
              </div>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className={styles.card}>
      <div className={styles.scroller}>
        <table
          className={styles.table}
          style={{ width: columns.reduce((sum, col) => sum + col.width, 0) }}
        >
          <caption className="sr-only">계약 목록. 헤더를 눌러 정렬할 수 있습니다.</caption>

          <colgroup>
            {columns.map((col) => (
              <col key={col.id} style={{ width: col.width }} />
            ))}
          </colgroup>

          <thead>
            <tr>
              {columns.map((col) => {
                const active = sort?.id === col.id
                return (
                  <th
                    key={col.id}
                    scope="col"
                    className={col.align === 'right' ? styles.right : undefined}
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        className={[styles.sortButton, active ? styles.isSorted : '']
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => onSort(col.id)}
                      >
                        {col.header}
                        {active ? (
                          <ArrowUpIcon
                            width={13}
                            height={13}
                            className={sort.dir === 'desc' ? styles.flip : undefined}
                          />
                        ) : (
                          <SortIcon width={13} height={13} className={styles.sortHint} />
                        )}
                      </button>
                    ) : (
                      <span className={styles.headLabel}>{col.header}</span>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {rows.map((card) => {
              const stage = stageOf(card)
              return (
                <tr key={card.no} className={styles.clickable} onClick={() => onOpen(card.no)}>
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={[
                        col.align === 'right' ? styles.right : '',
                        col.numeric ? 'tnum' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      title={col.id === 'stage' ? (stage?.name ?? '') : col.text(card)}
                    >
                      {/* 줄 전체를 누르지만 tr 은 키보드로 못 잡습니다. 고객사 칸이
                          그 손잡이이고, 하는 일은 줄을 누른 것과 같습니다. */}
                      {col.id === 'org' ? (
                        <button
                          type="button"
                          className={styles.openButton}
                          onClick={(event) => {
                            event.stopPropagation()
                            onOpen(card.no)
                          }}
                        >
                          {card.org}
                        </button>
                      ) : col.id === 'stage' ? (
                        stage && (
                          <span className={[styles.stage, styles[stage.tone]].join(' ')}>
                            {stage.name}
                          </span>
                        )
                      ) : (
                        col.text(card)
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
