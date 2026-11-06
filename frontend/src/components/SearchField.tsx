import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { classNames } from "../lib/format";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  variant?: "default" | "nav";
  className?: string;
  ariaLabel?: string;
  onEnter?: (value: string) => void;
}

export function SearchField({
  value,
  onChange,
  placeholder = "搜索球员名称",
  variant = "default",
  className,
  ariaLabel = "搜索球员名称",
  onEnter,
}: SearchFieldProps) {
  return (
    <div className={classNames("search-field", variant === "nav" && "search-field--nav", className)}>
      <span className="search-field__icon" aria-hidden="true">
        <MagnifyingGlass size={variant === "nav" ? 13 : 15} weight="bold" />
      </span>
      <input
        type="search"
        value={value}
        aria-label={ariaLabel}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && onEnter) {
            event.preventDefault();
            onEnter(value);
          }
        }}
        spellCheck={false}
        autoComplete="off"
      />
      {value ? (
        <button
          type="button"
          className="icon-btn"
          style={{ width: 26, height: 26, marginRight: 4 }}
          aria-label="清空搜索"
          onClick={() => onChange("")}
        >
          <X size={12} weight="bold" />
        </button>
      ) : null}
    </div>
  );
}
