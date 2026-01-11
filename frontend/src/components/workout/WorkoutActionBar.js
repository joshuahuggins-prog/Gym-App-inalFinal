import React, { useEffect, useMemo, useState } from "react";
import { Save, Zap } from "lucide-react";
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
      // 1) If scroll event came from a scrollable element, use that
      if (evtTarget && typeof evtTarget.scrollTop === "number") {
        return evtTarget.scrollTop;
      }

      // 2) Otherwise fall back to document/window
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

    // run once
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
    if (!isDirty && isDraftSaved) return "saved";
    return "normal";
  }, [isDirty, isDraftSaved]);

  const finishTone = useMemo(() => {
    if (!isDirty && isFinishedSaved) return "saved";
    return "normal";
  }, [isDirty, isFinishedSaved]);

  // Above bottom nav (adjust if needed)
  const basePos =
    "fixed right-4 z-50 flex flex-col gap-3 " +
    "bottom-[calc(env(safe-area-inset-bottom)+84px)]";

  const pillBase =
    "shadow-lg transition-all duration-200 active:scale-[0.98]";

  const sizeClass = collapsed
    ? "h-12 w-12 rounded-full px-0"
    : "h-12 rounded-2xl px-4";

  // Explicit dark backgrounds (NOT using theme tokens like bg-foreground)
  const DARK_BG = "!bg-slate-900 !text-white hover:!bg-slate-800";
  const SAVED_BLUE = "!bg-sky-500 !text-white hover:!bg-sky-400";
  const SAVED_GREEN = "!bg-emerald-600 !text-white hover:!bg-emerald-500";

  return (
    <div className={basePos}>
      {/* Save Draft (TOP) */}
      <Button
        type="button"
        onClick={onSaveDraft}
        className={cx(
          pillBase,
          sizeClass,
          draftTone === "saved" ? SAVED_BLUE : DARK_BG
        )}
        title="Save draft"
        aria-label="Save draft"
      >
        <Save className={cx("h-5 w-5", collapsed ? "" : "mr-2")} />
        {!collapsed && <span className="font-semibold">Save draft</span>}
      </Button>

      {/* Save & Finish (BOTTOM) */}
      <Button
        type="button"
        onClick={onSaveFinish}
        disabled={disableFinish}
        className={cx(
          pillBase,
          sizeClass,
          finishTone === "saved" ? SAVED_GREEN : DARK_BG,
          disableFinish && "!opacity-60"
        )}
        title="Save & finish"
        aria-label="Save & finish"
      >
        <Zap className={cx("h-5 w-5", collapsed ? "" : "mr-2")} />
        {!collapsed && <span className="font-semibold">Save &amp; finish</span>}
      </Button>
    </div>
  );
}