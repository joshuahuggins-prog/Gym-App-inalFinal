// src/components/workout/WorkoutActionBar.js
import React, { useEffect, useState } from "react";
import { ThumbsUp } from "lucide-react";
import { Button } from "../ui/button";

const cx = (...classes) => classes.filter(Boolean).join(" ");

export default function WorkoutActionBar({ onSaveFinish, disableFinish = false }) {
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

    // initialise based on current scroll
    handler({ target: document.scrollingElement });

    window.addEventListener("scroll", handler, { passive: true });
    document.addEventListener("scroll", handler, { passive: true, capture: true });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", handler);
      document.removeEventListener("scroll", handler, { capture: true });
    };
  }, []);

  // Bottom-right, stacked. Adjust 92px if your bottom nav differs.
  const basePos =
    "fixed right-4 z-50 flex flex-col gap-4 " +
    "bottom-[calc(env(safe-area-inset-bottom)+92px)]";

  const transition =
    "transition-all duration-300 ease-out will-change-transform will-change-width will-change-border-radius";

  // More padding so border isn’t tight to text
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
          "border-2",
          baseBtn,
          sizeClass,

          // ✅ Use your new strong accent token
          "bg-[hsl(var(--accent-strong))] text-[hsl(var(--accent-strong-foreground))] border-[hsl(var(--accent-strong))]",
          "hover:bg-[hsl(var(--accent-strong)/0.92)]",

          // ✅ Accessible focus ring
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-strong))] focus-visible:ring-offset-2 focus-visible:ring-offset-background",

          // ✅ Keep it solid even when disabled
          "disabled:opacity-100",
          "disabled:brightness-90 disabled:saturate-75 disabled:cursor-not-allowed"
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