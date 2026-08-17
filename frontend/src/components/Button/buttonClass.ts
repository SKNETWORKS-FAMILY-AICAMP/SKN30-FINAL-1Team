import styles from './Button.module.scss'

export type ButtonVariant = 'primary' | 'outline' | 'ghost'
export type ButtonSize = 'md' | 'sm'

interface ButtonClassOptions {
  variant?: ButtonVariant
  size?: ButtonSize
}

/**
 * 버튼 모양만 필요한 곳을 위한 헬퍼입니다.
 * <Link> 나 <a> 는 <button> 이 아니라 Button 컴포넌트를 쓸 수 없지만,
 * 생김새는 같아야 하므로 클래스 조합을 여기 한 곳에서 만듭니다.
 */
export function buttonClass(
  { variant = 'primary', size = 'md' }: ButtonClassOptions = {},
  extra?: string,
) {
  return [styles.root, styles[variant], size === 'sm' && styles.sm, extra].filter(Boolean).join(' ')
}
