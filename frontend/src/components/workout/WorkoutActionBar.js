// src/components/workout/WorkoutActionBar.js
import React, { useEffect, useState } from "react";
import { ThumbsUp } from "lucide-react";
import { Button } from "../ui/button";

const cx = (...classes) => classes.filter(Boolean).join(" ");

export default function WorkoutActionBar({
  onSaveFinish,
  disableFinish = false,
}) {
  const [collapsed, setCollapsed] = useState(false);

  // Collapse after user scrolls down a bit
  useEffect(() => {
    let raf = 0;

    const getAnyScrollTop = (evtTarget) => {
      if (evtTarget && typeof evtTarget.scrollTop === "number")
        return evtTarget.scrollTop;

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
    document.addEventListener("scroll", handler, {
      passive: true,
      capture: true,
    });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", handler);
      document.removeEventListener("scroll", handler, { capture: true });
    };
  }, []);

  // Positioning
  const basePos =
    "fixed right-4 z-50 flex flex-col gap-4 " +
    "bottom-[calc(env(safe-area-inset-bottom)+92px)]";

  const transition =
    "transition-all duration-300 ease-out will-change-transform will-change-width will-change-border-radius";

  // Extra horizontal padding so border doesn’t hug the text
  const sizeClass = collapsed
    ? "h-16 w-16 rounded-full px-0"
    : "h-16 w-[240px] rounded-3xl px-8";

  const baseBtn =
    "shadow-xl active:scale-[0.97] select-none flex items-center justify-center " +
    transition;

  const iconClass = "h-7 w-7";

  return (
    <div className={basePos}>
      <Button
        type="button"
        onClick={onSaveFinish}
        disabled={disableFinish}
        className={cx(
          baseBtn,
          sizeClass,

          // ✅ SOLID colours (no alpha)
          "bg-primary text-white hover:bg-primary",

          // ✅ Solid border + more breathing room
          "border-2 border-primary",

          // Disabled styling (still solid, just muted)
          disableFinish && "cursor-not-allowed bg-primary/40 border-primary/40"
        )}
        title="Save & finish"
        aria-label="Save & finish"
      >
        <ThumbsUp className={cx(iconClass, collapsed ? "" : "mr-3")} />

        {!collapsed && (
          <span className="text-base font-semibold whitespace-nowrap">
            Save &amp; Finish Workout
          </span>
        )}
      </Button>
    </div>
  );
}