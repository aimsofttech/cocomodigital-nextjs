// @ts-nocheck
"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";

type ModalProps = {
  show: boolean;
  onHide: () => void;
  children: ReactNode;
  className?: string;
  size?: "sm" | "lg" | "xl" | string;
  style?: React.CSSProperties;
};

type HeaderProps = {
  children?: ReactNode;
  closeButton?: boolean;
  onHide?: () => void;
  style?: React.CSSProperties;
};

const ModalContext = createContext<{ onHide: () => void } | null>(null);

const sizeClass = (size?: string) => {
  if (size === "sm") return "max-w-sm";
  if (size === "xl") return "max-w-6xl";
  return "max-w-4xl";
};

function TailwindModal({ show, onHide, children, className = "", size = "lg", style }: ModalProps) {
  useEffect(() => {
    if (!show) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onHide();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [show, onHide]);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-4 ${className}`}
      style={style}
      role="dialog"
      aria-modal="true"
      onMouseDown={onHide}
    >
      <div
        className={`max-h-[calc(100vh-2rem)] w-full ${sizeClass(size)} overflow-hidden rounded-md bg-white shadow-2xl`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <ModalContext.Provider value={{ onHide }}>{children}</ModalContext.Provider>
      </div>
    </div>
  );
}

function Header({ children, closeButton, onHide, style }: HeaderProps) {
  const context = useContext(ModalContext);
  const close = onHide || context?.onHide;

  return (
    <div
      className="flex items-center justify-between gap-4 border-b border-neutral-200 bg-white px-4 py-3"
      style={style}
    >
      <div>{children}</div>
      {closeButton && (
        <button
          type="button"
          className="grid size-8 place-items-center rounded text-2xl leading-none text-neutral-700 transition hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          aria-label="Close"
          onClick={close}
        >
          &times;
        </button>
      )}
    </div>
  );
}

function Body({ children, className = "", style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`bg-white ${className}`} style={style}>
      {children}
    </div>
  );
}

function Title({ children }: { children: ReactNode }) {
  return <h2 className="m-0 text-lg font-semibold leading-snug text-neutral-950">{children}</h2>;
}

TailwindModal.Header = Header;
TailwindModal.Body = Body;
TailwindModal.Title = Title;

export default TailwindModal;
