// src/components/library/ExerciseLibraryCard.js
import React, { useMemo, useState } from "react";
import { RotateCcw, Edit2, Trash2, Video, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";

const cx = (...c) => c.filter(Boolean).join(" ");

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const makeChallenge = () => {
  const ops = ["+", "-", "*"];
  const op = ops[randInt(0, ops.length - 1)];

  let a = randInt(1, 99);
  let b = randInt(1, 99);

  if (op === "*") {
    a = randInt(1, 12);
    b = randInt(1, 12);
  }

  if (op === "-" && b > a) [a, b] = [b, a];

  let result = 0;
  if (op === "+") result = a + b;
  if (op === "-") result = a - b;
  if (op === "*") result = a * b;

  return { text: `${a} ${op} ${b}`, result };
};

/**
 * ExerciseLibraryCard
 * - For ExercisesPage (library/definition editor)
 * - Shows exercise definition details (sets, goal reps, rest, scheme, notes)
 * - Shows programme usage badges
 * - Optional: reset-to-default with math challenge
 *
 * This component does NOT manage saving; it just calls handlers passed in.
 */
export default function ExerciseLibraryCard({
  exercise,
  usedBy = [], // array of programme objects
  userMade = false, // boolean: custom exercises (exercise_*)
  canReset = false, // boolean: exists in app defaults
  effectiveVideoUrl = "", // string: user link OR default link
  onEdit,
  onDelete,
  onOpenVideo,
  onResetToDefault, // called after math confirmed
  className = "",
}) {
  const [expanded, setExpanded] = useState(false);

  // inline reset UI
  const [resetOpen, setResetOpen] = useState(false);
  const [challenge, setChallenge] = useState(() => makeChallenge());
  const [answer, setAnswer] = useState("");

  const setsLabel = useMemo(() => {
    const s = Number(exercise?.sets);
    return Number.isFinite(s) && s > 0 ? s : "";
  }, [exercise?.sets]);

  const repsLabel = useMemo(() => {
    const arr = Array.isArray(exercise?.goalReps) ? exercise.goalReps : [];
    return arr.length ? arr.join(", ") : "";
  }, [exercise?.goalReps]);

  const restLabel = useMemo(() => {
    const r = Number(exercise?.restTime);
    return Number.isFinite(r) && r > 0 ? `${r}s` : "";
  }, [exercise?.restTime]);

  const schemeLabel = useMemo(() => String(exercise?.repScheme || ""), [exercise?.repScheme]);

  const notes = useMemo(() => String(exercise?.notes || ""), [exercise?.notes]);

  const hasVideo = !!(effectiveVideoUrl && String(effectiveVideoUrl).trim());

  const closeReset = () => {
    setResetOpen(false);
    setAnswer("");
    setChallenge(makeChallenge());
  };

  const openReset = () => {
    setResetOpen(true);
    setAnswer("");
    setChallenge(makeChallenge());
  };

  const runReset = () => {
    const userAnswer = Number(String(answer).trim());
    if (!Number.isFinite(userAnswer) || userAnswer !== challenge.result) {
      // Let parent decide toast style if they want; here we just close.
      closeReset();
      return { ok: false, reason: "wrong" };
    }

    closeReset();
    onResetToDefault?.(exercise);
    return { ok: true };
  };

  return (
    <div
      className={cx(
        "bg-card border border-border rounded-xl overflow-hidden",
        "hover:border-primary/30 transition-colors",
        className
      )}
    >
      {/* Header */}
      <button
        type="button"
        className="w-full text-left p-4"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div
              className="text-lg font-bold text-foreground leading-snug break-words whitespace-normal"
              style={{ overflowWrap: "anywhere" }}
            >
              {exercise?.name || "Exercise"}
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {usedBy?.length > 0 ? (
                usedBy.map((p) => (
                  <Badge key={p.type} variant="outline" className="text-xs">
                    {p?.name || p?.type || "Programme"}
                  </Badge>
                ))
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Not in any programme
                </Badge>
              )}

              {userMade ? (
                <Badge variant="secondary" className="text-xs">
                  Custom
                </Badge>
              ) : null}

              {hasVideo ? (
                <Badge className="bg-primary/15 text-primary border border-primary/30 text-xs">
                  Video
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  No video
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {/* Actions row (kept separate so header toggle doesn’t interfere) */}
      <div className="px-4 pb-4 -mt-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {setsLabel ? `${setsLabel} sets` : ""}
            {setsLabel && repsLabel ? " • " : ""}
            {repsLabel ? `Reps: ${repsLabel}` : ""}
            {(setsLabel || repsLabel) && (restLabel || schemeLabel) ? " • " : ""}
            {restLabel ? `Rest: ${restLabel}` : ""}
            {restLabel && schemeLabel ? " • " : ""}
            {schemeLabel ? schemeLabel : ""}
          </div>

          <div className="flex gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!hasVideo}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!hasVideo) return;
                if (typeof onOpenVideo === "function") onOpenVideo(exercise, effectiveVideoUrl);
                else window.open(effectiveVideoUrl, "_blank");
              }}
              title={hasVideo ? "Watch video" : "No video link"}
              className={hasVideo ? "" : "opacity-40 cursor-not-allowed"}
            >
              <Video className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!canReset || userMade}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!canReset || userMade) return;
                if (resetOpen) closeReset();
                else openReset();
              }}
              title={
                userMade
                  ? "Custom exercises can’t be reset to app defaults."
                  : !canReset
                  ? "No app default exists for this exercise."
                  : "Reset to app default"
              }
              className={!canReset || userMade ? "opacity-40 cursor-not-allowed" : ""}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit?.(exercise);
              }}
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete?.(exercise);
              }}
              title="Delete"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Reset confirm */}
        {resetOpen && (
          <div className="mt-3 rounded-lg border border-border bg-background/40 p-3 space-y-2">
            <div className="text-sm font-medium text-foreground">Reset to app default</div>

            <div className="text-xs text-muted-foreground">
              Solve to confirm:{" "}
              <span className="font-semibold text-foreground">{challenge.text}</span>
            </div>

            <div className="flex gap-2 items-center">
              <Input
                type="number"
                inputMode="numeric"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Answer"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setChallenge(makeChallenge());
                  setAnswer("");
                }}
              >
                New
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => {
                  const res = runReset();
                  // If wrong answer, let parent toast if desired:
                  // we return res for tests, but UI doesn’t need it.
                  return res;
                }}
              >
                Reset
              </Button>
              <Button type="button" variant="outline" onClick={closeReset}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Expanded body */}
        {expanded && (
          <div className="mt-3 space-y-3">
            {/* Definition details */}
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Sets</span>
                  <span className="font-semibold text-foreground">{setsLabel || "-"}</span>
                </div>

                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Rest</span>
                  <span className="font-semibold text-foreground">{restLabel || "-"}</span>
                </div>

                <div className="col-span-2 flex justify-between gap-2">
                  <span className="text-muted-foreground">Goal reps</span>
                  <span
                    className="font-semibold text-foreground text-right break-words whitespace-normal"
                    style={{ overflowWrap: "anywhere" }}
                  >
                    {repsLabel || "-"}
                  </span>
                </div>

                <div className="col-span-2 flex justify-between gap-2 items-center">
                  <span className="text-muted-foreground">Scheme</span>
                  <Badge variant="secondary" className="text-xs">
                    {schemeLabel || "-"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Notes */}
            {notes?.trim() ? (
              <div
                className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg border border-border break-words whitespace-pre-wrap"
                style={{ overflowWrap: "anywhere" }}
              >
                {notes}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                No notes / instructions saved.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}