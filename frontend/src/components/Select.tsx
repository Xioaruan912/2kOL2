import { CaretDown } from "@phosphor-icons/react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
  title?: string;
  disabled?: boolean;
}

export function Select({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  title,
  disabled,
}: SelectProps) {
  return (
    <div
      className={className ? `select ${className}` : "select"}
      title={title}
      style={disabled ? { opacity: 0.5 } : undefined}
    >
      <select
        aria-label={ariaLabel}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <CaretDown className="select__chevron" size={11} weight="bold" aria-hidden="true" />
    </div>
  );
}
