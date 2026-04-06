import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export function Input({
  label,
  error,
  helper,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-300"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:border-kingshot-gold-500 focus:ring-1 focus:ring-kingshot-gold-500/30 outline-none transition-colors ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
      {helper && !error && (
        <p className="mt-1 text-xs text-gray-500">
          {helper}
        </p>
      )}
    </div>
  );
}
