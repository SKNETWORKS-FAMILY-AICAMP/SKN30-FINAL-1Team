import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

import { CheckIcon, ChevronDownIcon } from '@/components/icons'

import styles from './FilterSelect.module.scss'

export interface FilterOption {
  value: string
  label: string
}

interface FilterSelectProps {
  label: string
  value: string
  options: readonly FilterOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onChange: (value: string) => void
}

export default function FilterSelect({
  label,
  value,
  options,
  open,
  onOpenChange,
  onChange,
}: FilterSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const listboxId = `filter-${useId().replaceAll(':', '')}`
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )
  const [activeIndex, setActiveIndex] = useState(selectedIndex)

  useEffect(() => {
    if (!open) return

    setActiveIndex(selectedIndex)
    const frame = requestAnimationFrame(() => optionRefs.current[selectedIndex]?.focus())

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onOpenChange(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open, onOpenChange, selectedIndex])

  const focusOption = (index: number) => {
    setActiveIndex(index)
    optionRefs.current[index]?.focus()
  }

  const closeAndFocusTrigger = () => {
    onOpenChange(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const choose = (index: number) => {
    const option = options[index]
    if (!option) return
    onChange(option.value)
    closeAndFocusTrigger()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab' && open) {
      onOpenChange(false)
      return
    }

    if (event.key === 'Escape' && open) {
      event.preventDefault()
      closeAndFocusTrigger()
      return
    }

    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        onOpenChange(true)
      }
      return
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const delta = event.key === 'ArrowDown' ? 1 : -1
      focusOption((activeIndex + delta + options.length) % options.length)
      return
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      focusOption(event.key === 'Home' ? 0 : options.length - 1)
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(activeIndex)
    }
  }

  const selected = options[selectedIndex]

  return (
    <div className={styles.root} ref={rootRef} onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${open ? styles.isOpen : ''}`}
        aria-label={`${label}: ${selected?.label ?? ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => onOpenChange(!open)}
      >
        <span>{selected?.label}</span>
        <ChevronDownIcon className={styles.chevron} width={14} height={14} />
      </button>

      {open && (
        <div id={listboxId} className={styles.menu} role="listbox" aria-label={label}>
          {options.map((option, index) => {
            const isSelected = option.value === value
            const isActive = index === activeIndex

            return (
              <button
                key={option.value}
                ref={(node) => {
                  optionRefs.current[index] = node
                }}
                type="button"
                role="option"
                aria-selected={isSelected}
                tabIndex={isActive ? 0 : -1}
                className={`${styles.option} ${isActive ? styles.isActive : ''} ${isSelected ? styles.isSelected : ''}`}
                onFocus={() => setActiveIndex(index)}
                onPointerMove={() => setActiveIndex(index)}
                onClick={() => choose(index)}
              >
                <span>{option.label}</span>
                <CheckIcon
                  className={`${styles.check} ${isSelected ? '' : styles.isHidden}`}
                  width={14}
                  height={14}
                />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
