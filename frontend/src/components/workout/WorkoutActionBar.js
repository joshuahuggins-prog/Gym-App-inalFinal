import React, { useEffect, useMemo, useState } from "react";
import { Save, ThumbsUp } from "lucide-react";
import { Button } from "../ui/button";

const cx = (...classes) => classes.filter(Boolean).join(" ");

export default function WorkoutActionBar({
  isDirty,
  isDraftSaved,
  isFinishedSaved,
  onSaveDraft,
  onSaveFinish,
  disableFinish = false,
}) {
  const [collapsed, setCollapsed] = useState(false);

  // Collapse after user scrolls down a bit — works for window + nested scroll containers
  useEffect(() => {
    let raf = 0;

    const getAnyScrollTop = (evtTarget) => {
      if (evtTarget && typeof evtTarget.scrollTop === "number") return evtTarget.scrollTop;

      const se = document.scrollingElement;
      return (
        (se && se.scrollTop) ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        window.scrollY ||
        0
      );
    };

    const handler = (e) => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = getAnyScrollTop(e?.target);
        setCollapsed(y > 80);
      });
    };

    handler({ target: document.scrollingElement });

    window.addEventListener("scroll", handler, { passive: true });
    document.addEventListener("scroll", handler, { passive: true, capture: true });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", handler);
      document.removeEventListener("scroll", handler, { capture: true });
    };
  }, []);

  const draftTone = useMemo(() => {
    // Blue only when you explicitly saved and nothing has changed since
    if (!isDirty && isDraftSaved) return "saved";
    return "normal";
  }, [isDirty, isDraftSaved]);

  const finishTone = useMemo(() => {
    if (!isDirty && isFinishedSaved) return "saved";
    return "normal";
  }, [isDirty, isFinishedSaved]);

  // Bottom-right, stacked. Adjust 92px if your bottom nav differs.
  const basePos =
    "fixed right-4 z-50 flex flex-col gap-4 " +
    "bottom-[calc(env(safe-area-inset-bottom)+92px)]";

  // Slower, smoother transitions (more “pro”)
  const transition =
    "transition-all duration-350 ease-out will-change-transform will-change-width will-change-border-radius";

  // ~2x bigger
  // Pill: tall + wide
  // Circle: big tap target
  const sizeClass = collapsed
    ? "h-16 w-16 rounded-full px-0"
    : "h-16 w-[220px] rounded-3xl px-6";

  const baseBtn =
    "shadow-xl active:scale-[0.98] select-none " +
    transition;

  // Colour system:
  // - Default = dark navy button with LIGHT border
  // - Saved = light blue button with DARK border
  const DARK_BG = "!bg-slate-900 !text-white hover:!bg-slate-800";
  const DARK_BORDER = "!border-slate-950/80";

  const LIGHT_BG = "!bg-sky-500 !text-white hover:!bg-sky-400";
  const LIGHT_BORDER = "!border-sky-200/80";

  const draftClass =
    draftTone === "saved"
      ? `${LIGHT_BG} ${DARK_BORDER}`
      : `${DARK_BG} ${LIGHT_BORDER}`;

  const finishClass =
    finishTone === "saved"
      ? `!bg-emerald-600 !text-white hover:!bg-emerald-500 ${DARK_BORDER}`
      : `${DARK_BG} ${LIGHT_BORDER}`;

  // Icon sizing doubled-ish
  const iconClass = "h-7 w-7";

  return (
    <div className={basePos}>
      {/* Save Draft (TOP) */}
      <Button
        type="button"
        onClick={onSaveDraft}
        className={cx(
          "border-2",
          baseBtn,
          sizeClass,
          draftClass
        )}
        title="Save draft"
        aria-label="Save draft"
      >
        <Save className={cx(iconClass, collapsed ? "" : "mr-3")} />
        {!collapsed && <span className="text-base font-semibold">Save draft</span>}
      </Button>

      {/* Save & Finish (BOTTOM) */}
      <Button
        type="button"
        onClick={onSaveFinish}
        disabled={disableFinish}
        className={cx(
          "border-2",
          baseBtn,
          sizeClass,
          finishClass,
          disableFinish && "!opacity-60"
        )}
        title="Save & finish"
        aria-label="Save & finish"
      >
        <ThumbsUp className={cx(iconClass, collapsed ? "" : "mr-3")} />
        {!collapsed && <span className="text-base font-semibold">Save &amp; finish</span>}
      </Button>
    </div>
  );
}