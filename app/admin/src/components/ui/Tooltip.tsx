import { type ReactNode } from 'react';

interface TooltipProps {
  /** Text shown inside the tooltip. */
  content: string;
  children: ReactNode;
  className?: string;
}

/**
 * Hover tooltip for action buttons/icons. Always renders above the trigger
 * (placement="top") and uses the app's primary theme color as background.
 */
export default function Tooltip({ content, children, className = '' }: TooltipProps) {
  return (
    <span className={`relative inline-flex group ${className}`}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-md bg-primary-600 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 z-50"
      >
        {content}
        <span className="absolute left-1/2 top-full -translate-x-1/2 -mt-px h-0 w-0 border-4 border-transparent border-t-primary-600" />
      </span>
    </span>
  );
}
