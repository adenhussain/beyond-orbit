import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { sound } from '../../services/sound';

type Variant = 'primary' | 'ghost' | 'amber' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary:
    'border-phosphor text-phosphor hover:bg-phosphor hover:text-void disabled:border-line disabled:text-mute disabled:hover:bg-transparent',
  ghost:
    'border-line text-ink hover:border-cyan hover:text-cyan disabled:text-mute disabled:hover:border-line',
  amber:
    'border-amber text-amber hover:bg-amber hover:text-void disabled:border-line disabled:text-mute disabled:hover:bg-transparent',
  danger:
    'border-alert text-alert hover:bg-alert hover:text-void disabled:border-line disabled:text-mute disabled:hover:bg-transparent',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
  size?: 'md' | 'lg';
}

export function Button({ variant = 'primary', icon, size = 'md', className = '', children, onClick, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      onClick={(event) => {
        sound.click();
        onClick?.(event);
      }}
      className={`inline-flex items-center justify-center gap-2 border bg-transparent uppercase tracking-[0.14em] transition-colors duration-150 ${
        size === 'lg' ? 'px-7 py-3 text-sm' : 'px-4 py-2 text-xs'
      } ${VARIANTS[variant]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}
