import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { buttonClass, type ButtonSize, type ButtonVariant } from './buttonClass'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: ButtonProps) {
  // className 을 뒤에 붙여 호출부가 여백·폭 정도는 조정할 수 있게 합니다.
  return (
    <button className={buttonClass({ variant, size }, className)} {...rest}>
      {children}
    </button>
  )
}
