// src/components/workout/WorkoutActionBar.js
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

  // Expand near top, collapse to circles after scroll
  useEffect(() => {
    const onScroll = () => setCollapsed(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const draftTone = useMemo(() => {
    if (!isDirty && isDraftSaved) return "saved";
    return "normal";
  }, [isDirty, isDraftSaved]);

  const finishTone = useMemo(() => {
    if (!isDirty && isFinishedSaved) return "saved";
    return "normal";
  }, [isDirty, isFinishedSaved]);

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-3 pb-[env(safe-area-inset-bottom)]">
      {/* Save & Finish (top) */}
      <Button
        type="button"
        onClick={onSaveFinish}
        disabled={disableFinish}
        className={cx(
          "shadow-lg transition-all duration-200",
          collapsed ? "h-12 w-12 rounded-full px-0" : "h-12 rounded-xl px-4",
          finishTone === "normal" && "bg-foreground text-background hover:bg-foreground/90",
          finishTone === "saved" && "bg-emerald-600 text-white hover:bg-emerald-600/90",
          disableFinish && "opacity-60"
        )}
        title="Save & finish"
        aria-label="Save & finish"
      >
        <Zap className={cx("h-5 w-5", collapsed ? "" : "mr-2")} />
        {!collapsed && <span className="font-semibold">Save &amp; finish</span>}
      </Button>

      {/* Save Draft (bottom) */}
      <Button
        type="button"
        onClick={onSaveDraft}
        className={cx(
          "shadow-lg transition-all duration-200",
          collapsed ? "h-12 w-12 rounded-full px-0" : "h-12 rounded-xl px-4",
          draftTone === "normal" && "bg-foreground text-background hover:bg-foreground/90",
          draftTone === "saved" && "bg-sky-500 text-white hover:bg-sky-500/90"
        )}
        title="Save draft"
        aria-label="Save draft"
      >
        <Save className={cx("h-5 w-5", collapsed ? "" : "mr-2")} />
        {!collapsed && <span className="font-semibold">Save draft</span>}
      </Button>
    </div>
  );
}