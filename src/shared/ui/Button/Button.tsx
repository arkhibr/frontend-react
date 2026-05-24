import type { ButtonHTMLAttributes } from 'react'

const variants = {
  primary:
    'bg-primary text-white hover:bg-primary/90 focus-visible:ring-primary',
  secondary:
    'bg-surface text-primary border border-primary hover:bg-primary/10 focus-visible:ring-primary',
  danger:
    'bg-danger text-white hover:bg-danger/90 focus-visible:ring-danger',
  ghost:
    'bg-transparent text-primary hover:bg-primary/10 focus-visible:ring-primary',
} as const

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
} as const

type ButtonProps = {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  loading?: boolean
} & ButtonHTMLAttributes<HTMLButtonElement>

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        'rounded font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      ].join(' ')}
      disabled={loading || props.disabled}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <span
          role="progressbar"
          aria-label="Carregando"
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        children
      )}
    </button>
  )
}
