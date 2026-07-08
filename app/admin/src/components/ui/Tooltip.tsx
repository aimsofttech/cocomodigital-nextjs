import { useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  /** Text shown inside the tooltip. */
  content: string;
  children: ReactNode;
  className?: string;
}

/**
 * Hover tooltip for action buttons/icons. Always renders above the trigger
 * (placement="top") and uses the app's primary theme color as background.
 *
 * Rendered through a portal on document.body with a fixed position so it can
 * never be clipped by scrolling/overflow containers (e.g. .table-container's
 * overflow-x-auto or .table td's overflow-hidden) and always sits above
 * table rows in the stacking order.
 */
export default function Tooltip({ content, children, className = '' }: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const show = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.top - 6, left: rect.left + rect.width / 2 });
  };
  const hide = () => setPos(null);

  return (
    <span
      ref={triggerRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {pos &&
        createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-primary-600 px-2 py-1 text-xs font-medium text-white shadow-lg animate-tooltip-in"
            style={{ top: pos.top, left: pos.left }}
          >
            {content}
            <span className="absolute left-1/2 top-full -translate-x-1/2 -mt-px h-0 w-0 border-4 border-transparent border-t-primary-600" />
          </span>,
          document.body,
        )}
    </span>
  );
}
