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
      className={`rounded-xl border border-kingshot-primary-900/30 dark:border-kingshot-primary-800/30 bg-kingshot-dark-100/50 dark:bg-gray-900/50 backdrop-blur-sm p-6 shadow-xl shadow-kingshot-primary-950/20 ${className}`}
      {...props}
    >
      {title && (
        <div className="mb-4 border-b border-kingshot-primary-900/20 dark:border-kingshot-primary-800/20 pb-3">
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
      <div className="text-gray-200 dark:text-gray-300">{children}</div>
    </div>
  );
}
