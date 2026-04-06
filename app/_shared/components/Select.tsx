import React from "react";

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helper?: string;
  options: SelectOption[];
}

export function Select({
  label,
  error,
  helper,
  options,
  className = "",
  id,
  ...props
}: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-300"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-kingshot-gold-500 focus:ring-1 focus:ring-kingshot-gold-500/30 outline-none transition-colors ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""} ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-zinc-900 text-white"
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      {helper && !error && (
        <p className="mt-1 text-xs text-gray-500">{helper}</p>
      )}
    </div>
  );
}
