import React, { useEffect, useMemo, useState } from "react";
import { Save, Zap } from "lucide-react";
import { Button } from "../ui/button";

// Small helper to join classNames
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

  // Collapse when the user scrolls down a bit
  useEffect(() => {
    const onScroll = () => {
      setCollapsed(window.scrollY > 80);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Draft button style:
  // - light blue ONLY when saved AND not dirty
  const draftTone = useMemo(() => {
    if (!isDirty && isDraftSaved) return "saved";
    return "normal";
  }, [isDirty, isDraftSaved]);

  // Finish button style:
  // - can show “saved” when finished AND not dirty (optional)
  const finishTone = useMemo(() => {
    if (!isDirty && isFinishedSaved) return "saved";
    return "normal";
  }, [isDirty, isFinishedSaved]);

  return (
    <div
      className={cx(
        "sticky top-0 z-40",
        "bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "border-b border-border"
      )}
    >
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div
          className={cx(
            "flex items-center gap-3 justify-end",
            "transition-all duration-200"
          )}
        >
          {/* SAVE DRAFT */}
          <Button
            type="button"
            onClick={onSaveDraft}
            className={cx(
              "shadow-sm transition-all duration-200",
              collapsed ? "h-11 w-11 rounded-full px-0" : "h-11 rounded-xl px-4",
              // base dark look
              draftTone === "normal" && "bg-foreground text-background hover:bg-foreground/90",
              // saved light-blue look
              draftTone === "saved" && "bg-sky-500 text-white hover:bg-sky-500/90"
            )}
          >
            <Save className={cx("h-4 w-4", collapsed ? "" : "mr-2")} />
            {!collapsed && <span className="font-semibold">Save draft</span>}
          </Button>

          {/* SAVE & FINISH */}
          <Button
            type="button"
            onClick={onSaveFinish}
            disabled={disableFinish}
            className={cx(
              "shadow-sm transition-all duration-200",
              collapsed ? "h-11 w-11 rounded-full px-0" : "h-11 rounded-xl px-4",
              finishTone === "normal" && "bg-foreground text-background hover:bg-foreground/90",
              // You can pick a “win” color for completed state:
              finishTone === "saved" && "bg-emerald-600 text-white hover:bg-emerald-600/90",
              disableFinish && "opacity-60"
            )}
          >
            <Zap className={cx("h-4 w-4", collapsed ? "" : "mr-2")} />
            {!collapsed && <span className="font-semibold">Save & finish</span>}
          </Button>
        </div>
      </div>
    </div>
  );
}