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

  // Collapse after user scrolls down a bit (works even if scrolling happens in a nested container)
  useEffect(() => {
    const getScrollY = () =>
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    const handler = () => {
      setCollapsed(getScrollY() > 80);
    };

    handler();

    // window scroll (normal)
    window.addEventListener("scroll", handler, { passive: true });

    // capture scroll events from nested scroll containers (PWA/mobile layouts)
    document.addEventListener("scroll", handler, { passive: true, capture: true });

    return () => {
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

  // Put the stack ABOVE your bottom nav
  // (adjust 84px if your nav is taller/shorter)
  const basePos =
    "fixed right-4 z-50 flex flex-col gap-3 " +
    "bottom-[calc(env(safe-area-inset-bottom)+84px)]";

  const pillBase =
    "shadow-lg transition-all duration-200 active:scale-[0.98]";

  const sizeClass = collapsed
    ? "h-12 w-12 rounded-full px-0"
    : "h-12 rounded-2xl px-4";

  return (
    <div className={basePos}>
      {/* Save Draft (TOP) */}
      <Button
        type="button"
        onClick={onSaveDraft}
        className={cx(
          pillBase,
          sizeClass,
          // Force colours (override shadcn variant styles)
          draftTone === "normal" &&
            "!bg-foreground !text-background hover:!bg-foreground/90",
          draftTone === "saved" &&
            "!bg-sky-500 !text-white hover:!bg-sky-500/90"
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
          finishTone === "normal" &&
            "!bg-foreground !text-background hover:!bg-foreground/90",
          // Optional: green when "saved and not dirty"
          finishTone === "saved" &&
            "!bg-emerald-600 !text-white hover:!bg-emerald-600/90",
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