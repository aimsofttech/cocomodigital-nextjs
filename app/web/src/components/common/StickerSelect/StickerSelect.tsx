// @ts-nocheck
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { FaChevronDown, FaCheck } from "react-icons/fa";
export default function StickerSelect({
  label,
  value,
  onChange,
  options = [],
  allLabel = "All",
  ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const id = useId();

  // Always include the "All" option at the top.

const items = useMemo(() => {
  return [{ value: "", label: allLabel }, ...options];
}, [allLabel, options]); 

  const currentItem =
    items.find((it) => String(it.value) === String(value)) || items[0];

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
    };
  }, [open]);

  // Sync highlight to current value when opening.
  useEffect(() => {
    if (open) {
      const idx = items.findIndex(
        (it) => String(it.value) === String(value)
      );
      setHighlightIdx(idx >= 0 ? idx : 0);
      // Focus the listbox so arrow keys work without a second click.
      requestAnimationFrame(() => listRef.current?.focus());
    }
  }, [open, value, items]);

  const selectAt = useCallback((idx) => {
    const item = items[idx];
    if (!item) return;
    onChange(item.value);
    setOpen(false);
    requestAnimationFrame(() => buttonRef.current?.focus());
  }, [items, onChange]);

  const onListKeyDown = useCallback((e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      requestAnimationFrame(() => buttonRef.current?.focus());
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(items.length - 1, i + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setHighlightIdx(0);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      setHighlightIdx(items.length - 1);
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectAt(highlightIdx);
      return;
    }
  }, [items, highlightIdx, selectAt]);

  return (
    <div
      className={`sticker-select ${open ? "is-open" : ""}`}
      ref={containerRef}
    >
      {label && (
        <label
          htmlFor={`${id}-button`}
          className="sticker-select-label"
        >
          {label}
        </label>
      )}
      <button
        id={`${id}-button`}
        ref={buttonRef}
        type="button"
        className="sticker-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel || label}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="sticker-select-trigger-text">
          {currentItem.label}
        </span>
        <FaChevronDown
          className={`sticker-select-chevron ${open ? "is-open" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          className="sticker-select-panel"
          role="listbox"
          tabIndex={-1}
          onKeyDown={onListKeyDown}
        >
          {items.map((item, idx) => {
            const selected = String(item.value) === String(value);
            const highlighted = idx === highlightIdx;
            return (
              <li
                key={item.value || `__all-${idx}`}
                role="option"
                aria-selected={selected}
                className={`sticker-select-option ${selected ? "is-selected" : ""} ${highlighted ? "is-highlighted" : ""}`}
                onMouseEnter={() => setHighlightIdx(idx)}
                onClick={() => selectAt(idx)}
              >
                <span className="sticker-select-option-text">
                  {item.label}
                </span>
                {selected && (
                  <FaCheck
                    className="sticker-select-option-check"
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
