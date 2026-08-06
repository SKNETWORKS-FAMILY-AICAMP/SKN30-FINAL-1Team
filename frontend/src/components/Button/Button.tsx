import type { ButtonHTMLAttributes, ReactNode } from 'react'

import styles from './Button.module.scss'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'ghost'
}

export default function Button({ children, variant = 'primary', ...rest }: ButtonProps) {
  return (
    <button className={`${styles.root} ${styles[variant]}`} {...rest}>
      {children}
    </button>
  )
}
