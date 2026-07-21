import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { erpButtonTokens } from './erpButtonTokens';
import './ErpButtons.css';

type ErpButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ErpButtonSize = 'sm' | 'md';

interface ErpButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ErpButtonVariant;
  size?: ErpButtonSize;
  icon?: ReactNode;
  loading?: boolean;
}

export function ErpButton({
  variant = 'secondary',
  size = 'md',
  icon,
  loading,
  children,
  className = '',
  disabled,
  ...props
}: ErpButtonProps) {
  return (
    <button
      {...props}
      type={props.type || 'button'}
      disabled={disabled || loading}
      className={`erp-btn erp-btn--${variant} erp-btn--${size} ${className}`}
    >
      {loading ? <Loader2 size={erpButtonTokens.iconSize} className="erp-btn__spinner" /> : icon}
      {children && <span className="erp-btn__label">{children}</span>}
    </button>
  );
}

type IconButtonTone = 'view' | 'edit' | 'refresh' | 'delete' | 'export' | 'neutral';

interface ErpIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tone?: IconButtonTone;
  icon: ReactNode;
  size?: 'sm' | 'md';
}

export function ErpIconButton({
  label,
  tone = 'neutral',
  icon,
  size = 'sm',
  className = '',
  ...props
}: ErpIconButtonProps) {
  return (
    <button
      {...props}
      type={props.type || 'button'}
      title={label}
      aria-label={label}
      className={`erp-icon-btn erp-icon-btn--${tone} erp-icon-btn--${size} ${className}`}
    >
      {icon}
    </button>
  );
}

export type ErpSegmentOption<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

export function ErpSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: ErpSegmentOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="erp-segmented" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`erp-segment ${value === option.value ? 'erp-segment--active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
