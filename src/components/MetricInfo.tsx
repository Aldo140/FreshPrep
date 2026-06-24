import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface MetricInfoProps {
  text: string;
  /** Where to anchor the tooltip relative to the icon. Defaults to "top". */
  side?: "top" | "bottom";
  /** Extra Tailwind classes on the icon badge. */
  className?: string;
}

export function MetricInfo({ text, side = "top", className = "" }: MetricInfoProps) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const capture = () => setRect(btnRef.current?.getBoundingClientRect() ?? null);

  // Keep tooltip position in sync while open (handles scroll/resize)
  useEffect(() => {
    if (!open) return;
    const update = () => setRect(btnRef.current?.getBoundingClientRect() ?? null);
    window.addEventListener("scroll", update, { passive: true, capture: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
    };
  }, [open]);

  const tooltipStyle: React.CSSProperties = rect
    ? side === "bottom"
      ? { position: "fixed", top: rect.bottom + 8, left: rect.left + rect.width / 2, transform: "translateX(-50%)" }
      : { position: "fixed", top: rect.top - 8, left: rect.left + rect.width / 2, transform: "translate(-50%, -100%)" }
    : { display: "none" };

  const arrowCls =
    side === "bottom"
      ? "bottom-full border-b-[#1a1a1a] border-t-transparent"
      : "top-full border-t-[#1a1a1a] border-b-transparent";

  return (
    <span
      className={`relative inline-flex shrink-0 items-center ${className}`}
      onMouseEnter={() => { capture(); setOpen(true); }}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        ref={btnRef}
        type="button"
        tabIndex={0}
        aria-label={text}
        onClick={e => { e.stopPropagation(); capture(); setOpen(v => !v); }}
        onFocus={() => { capture(); setOpen(true); }}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center justify-center w-[13px] h-[13px] rounded-full text-[7.5px] font-black text-[#bbb] border border-[#ddd] cursor-help select-none hover:text-[#2b5346] hover:border-[#2b5346] transition-colors leading-none focus:outline-none focus-visible:ring-1 focus-visible:ring-[#2b5346]"
      >
        i
      </button>

      {open && rect && createPortal(
        <span
          role="tooltip"
          style={tooltipStyle}
          className="z-[9999] w-56 bg-[#1a1a1a] text-white text-[10px] leading-[1.55] rounded-xl px-3 py-2.5 shadow-2xl pointer-events-none whitespace-normal font-normal not-italic"
        >
          {text}
          <span className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-y-4 ${arrowCls}`} />
        </span>,
        document.body,
      )}
    </span>
  );
}
