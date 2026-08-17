// 목록 화면의 검색창. 여섯 화면이 같은 것을 씁니다.
//
// 폭은 화면마다 달라 className 으로 받습니다. 높이·모서리·포커스 링은 여기서 정합니다.
import { SearchIcon } from '@/components/icons'

import styles from './SearchInput.module.scss'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder: string
  /** 화면 낭독기가 읽을 이름. 화면마다 '견적 검색'·'고객 검색' 처럼 다릅니다. */
  label: string
  className?: string
}

export default function SearchInput({ value, onChange, placeholder, label, className }: Props) {
  return (
    <label className={[styles.root, className].filter(Boolean).join(' ')}>
      <SearchIcon width={16} height={16} />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
