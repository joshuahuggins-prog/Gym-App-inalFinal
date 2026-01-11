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

  // Collapse after user scrolls down a bit
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
    <div className="fixed left-0 right-0 bottom-0 z-50 pointer-events-none">
      {/* Safe area padding for iOS + spacing */}
      <div className="pb-[calc(env(safe-area-inset-bottom)+16px)] px-4">
        <div className="max-w-2xl mx-auto">
          <div
            className={cx(
              "pointer-events-auto",
              "bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60",
              "border border-border shadow-lg",
              "rounded-2xl",
              "p-3"
            )}
          >
            <div className="flex items-center justify-end gap-3">
              {/* Save Draft */}
              <Button
                type="button"
                onClick={onSaveDraft}
                className={cx(
                  "transition-all duration-200 shadow-sm",
                  collapsed ? "h-12 w-12 rounded-full px-0" : "h-12 rounded-xl px-4",
                  // dark by default
                  draftTone === "normal" &&
                    "bg-foreground text-background hover:bg-foreground/90",
                  // light blue when saved and not dirty
                  draftTone === "saved" &&
                    "bg-sky-500 text-white hover:bg-sky-500/90"
                )}
              >
                <Save className={cx("h-5 w-5", collapsed ? "" : "mr-2")} />
                {!collapsed && <span className="font-semibold">Save draft</span>}
              </Button>

              {/* Save & Finish */}
              <Button
                type="button"
                onClick={onSaveFinish}
                disabled={disableFinish}
                className={cx(
                  "transition-all duration-200 shadow-sm",
                  collapsed ? "h-12 w-12 rounded-full px-0" : "h-12 rounded-xl px-4",
                  finishTone === "normal" &&
                    "bg-foreground text-background hover:bg-foreground/90",
                  // optional "saved" state color
                  finishTone === "saved" &&
                    "bg-emerald-600 text-white hover:bg-emerald-600/90",
                  disableFinish && "opacity-60"
                )}
              >
                <Zap className={cx("h-5 w-5", collapsed ? "" : "mr-2")} />
                {!collapsed && <span className="font-semibold">Save &amp; finish</span>}
              </Button>
            </div>

            {!collapsed && (
              <div className="mt-2 text-[11px] text-muted-foreground">
                Buttons collapse as you scroll so they’re always reachable.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}