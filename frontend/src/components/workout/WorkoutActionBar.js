import React, { useEffect, useState } from "react";
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

  // ✅ NEW
  finishClassName,
}) {
  const [collapsed, setCollapsed] = useState(false);

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
        const st = getAnyScrollTop(e?.target);
        setCollapsed(st > 40);
      });
    };

    window.addEventListener("scroll", handler, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", handler);
    };
  }, []);

  return (
    <div
      className={cx(
        "fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/90 backdrop-blur",
        "pb-[env(safe-area-inset-bottom)]"
      )}
    >
      <div className={cx("max-w-2xl mx-auto px-4 py-3", collapsed && "py-2")}>
        <div className="flex gap-2">
          {onSaveDraft && (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onSaveDraft}
              disabled={!isDirty}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
          )}

          <Button
            type="button"
            className={cx(
              "flex-1",
              // ✅ default styling if you don't pass anything
              "bg-primary text-primary-foreground hover:bg-primary/90",
              // ✅ override with theme accent if provided
              finishClassName
            )}
            onClick={onSaveFinish}
            disabled={disableFinish}
          >
            <ThumbsUp className="w-4 h-4 mr-2" />
            Finish Workout
          </Button>
        </div>
      </div>
    </div>
  );
}