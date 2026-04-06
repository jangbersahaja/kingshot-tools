import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
}

export function Card({
  title,
  subtitle,
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 shadow-xl ${className}`}
      {...props}
    >
      {title && (
        <div className="mb-4 border-b border-white/10 pb-3">
          <h3 className="text-lg font-bold text-kingshot-gold-400 dark:text-kingshot-gold-400">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-300 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div className="text-gray-200">{children}</div>
    </div>
  );
}
