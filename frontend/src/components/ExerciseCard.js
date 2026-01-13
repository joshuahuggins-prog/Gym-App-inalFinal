// frontend/src/components/ExerciseCard.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Timer, Award, Video } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import {
  getProgressionSettings,
  getVideoLinks,
  getPersonalRecords,
} from "../utils/storage";

const clampInt = (n, min, max) => Math.max(min, Math.min(max, Math.trunc(n)));

const normalizeSets = (setsData, count) => {
  const base = Array.isArray(setsData) ? setsData : [];
  const out = [];
  for (let i = 0; i < count; i++) {
    const s = base[i] || {};
    out.push({
      // ✅ keep blank as blank during editing
      weight: s.weight ?? "",
      reps: s.reps ?? "",
      completed: !!s.completed,
    });
  }
  return out;
};

const toNumberOrBlank = (v) => (v === "" ? "" : Number(v));

const ExerciseCard = ({
  exercise,
  lastWorkoutData,
  onSetComplete,
  onWeightChange,
  onNotesChange,
  onRestTimer,
}) => {
  const setsCount = clampInt(exercise?.sets ?? 3, 1, 12);

  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(exercise?.userNotes || "");
  const [videoLink, setVideoLink] = useState("");
  const [sets, setSets] = useState(() => normalizeSets(exercise?.setsData, setsCount));

  // assisted if any saved weight is negative
  const [mode, setMode] = useState(() =>
    (exercise?.setsData || []).some((s) => Number(s.weight) < 0) ? "assisted" : "weighted"
  );

  const hydrateKey = useRef("");

  // ✅ PR / Max data (display only — never used to fill inputs)
  const pr = useMemo(() => {
    const prs = getPersonalRecords?.() || {};
    return prs[exercise?.id] || null;
  }, [exercise?.id]);

  // ✅ derive best from this workout’s saved sets (for the label line)
  const bestFromWorkout = useMemo(() => {
    const nums = (sets || [])
      .map((s) => (s.weight === "" ? null : Number(s.weight)))
      .filter((n) => Number.isFinite(n));

    if (nums.length === 0) return null;

    const absMax = Math.max(...nums.map((n) => Math.abs(n)));
    return absMax;
  }, [sets]);

  // hydrate when parent provides updated exercise object
  useEffect(() => {
    const key = `${exercise?.id || ""}__${setsCount}__${JSON.stringify(exercise?.setsData || [])}`;
    if (key === hydrateKey.current) return;
    hydrateKey.current = key;

    setSets(normalizeSets(exercise?.setsData, setsCount));
    setNotes(exercise?.userNotes || "");

    const links = getVideoLinks();
    setVideoLink(links?.[exercise?.id] || "");

    setMode((exercise?.setsData || []).some((s) => Number(s.weight) < 0) ? "assisted" : "weighted");
  }, [exercise, setsCount]);

  const pushUp = (nextSets) => {
    setSets(nextSets);

    // ✅ IMPORTANT: keep blanks as blanks, don’t coerce everything to 0
    onWeightChange?.(
      exercise,
      nextSets.map((s) => ({
        weight: s.weight === "" ? "" : Number(s.weight),
        reps: s.reps === "" ? "" : Number(s.reps),
        completed: !!s.completed,
      }))
    );
  };

  const toggleMode = (nextMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);

    // Convert existing weights while preserving blanks
    const converted = sets.map((s) => {
      if (s.weight === "") return s;
      const v = Math.abs(Number(s.weight));
      return { ...s, weight: nextMode === "assisted" ? -v : v };
    });

    pushUp(converted);
  };

  const completedCount = useMemo(() => sets.filter((s) => s.completed).length, [sets]);

  const maxLabel = useMemo(() => {
    // Prefer PR if present, else best in this workout
    const best = pr?.weight != null ? Math.abs(Number(pr.weight)) : bestFromWorkout;
    if (!Number.isFinite(best) || best === 0) return null;

    const label = mode === "assisted" ? "Assist max" : "Max";
    return `${label}: ${best}`;
  }, [pr, bestFromWorkout, mode]);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        className="w-full text-left p-4"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold truncate text-foreground">
              {exercise?.name || "Exercise"}
            </h3>

            {/* ✅ Row 2: compact stats */}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>
                {completedCount}/{setsCount} sets
              </span>

              {exercise?.repScheme ? (
                <Badge variant="secondary" className="text-[10px]">
                  {exercise.repScheme}
                </Badge>
              ) : null}

              {/* ✅ PR shown here (display only) */}
              {pr?.weight != null && (
                <span className="text-foreground font-semibold">
                  PR: {pr.weight} × {pr.reps}
                </span>
              )}
            </div>

            {/* ✅ Row 3: toggle ALWAYS on its own line so it never jumps around */}
            <div
              className="mt-2 inline-flex border border-border rounded-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className={`px-2 py-1 text-[11px] ${
                  mode === "weighted"
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:bg-muted/40"
                }`}
                onClick={() => toggleMode("weighted")}
              >
                Weighted
              </button>
              <button
                type="button"
                className={`px-2 py-1 text-[11px] ${
                  mode === "assisted"
                    ? "bg-orange-500/20 text-orange-600"
                    : "text-muted-foreground hover:bg-muted/40"
                }`}
                onClick={() => toggleMode("assisted")}
              >
                Assisted
              </button>
            </div>
          </div>

          {/* Right-side icons */}
          <div className="flex items-center gap-1 shrink-0">
            {videoLink ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(videoLink, "_blank", "noopener,noreferrer");
                }}
                title="Open form video"
              >
                <Video className="w-4 h-4" />
              </Button>
            ) : null}

            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* ✅ label ABOVE sets (not in input) */}
          {maxLabel && (
            <div className="text-xs text-muted-foreground">
              <span className={mode === "assisted" ? "text-orange-600 font-semibold" : "text-foreground font-semibold"}>
                {maxLabel}
              </span>
            </div>
          )}

          {/* Sets */}
          <div className="space-y-2">
            {sets.map((s, i) => (
              <div
                key={i}
                className="grid grid-cols-[60px_1fr_1fr_40px] gap-2 items-center"
              >
                <span className="text-xs text-muted-foreground">Set {i + 1}</span>

                <Input
                  type="number"
                  // ✅ show blank if blank (never inject max/pr here)
                  value={s.weight === "" ? "" : Math.abs(Number(s.weight))}
                  placeholder={mode === "assisted" ? "Assist" : "Weight"}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const next = [...sets];

                    if (raw === "") {
                      next[i] = { ...s, weight: "" };
                      pushUp(next);
                      return;
                    }

                    const n = Number(raw);
                    if (!Number.isFinite(n)) return;

                    next[i] = { ...s, weight: mode === "assisted" ? -n : n };
                    pushUp(next);
                  }}
                />

                <Input
                  type="number"
                  value={s.reps}
                  placeholder="Reps"
                  onChange={(e) => {
                    const raw = e.target.value;
                    const next = [...sets];
                    next[i] = { ...s, reps: raw === "" ? "" : toNumberOrBlank(raw) };
                    pushUp(next);
                  }}
                />

                <Button
                  size="sm"
                  variant={s.completed ? "default" : "outline"}
                  onClick={() => {
                    const next = [...sets];
                    next[i] = { ...s, completed: !s.completed };
                    pushUp(next);
                    onSetComplete?.(exercise, next[i], false);
                  }}
                  title={s.completed ? "Completed" : "Mark completed"}
                >
                  ✓
                </Button>
              </div>
            ))}
          </div>

          {/* Notes */}
          <Textarea
            value={notes}
            placeholder="Notes…"
            className="min-h-[70px]"
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => onNotesChange?.(exercise, notes)}
          />

          {/* Actions */}
          <div className="flex gap-2">
            {onRestTimer ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRestTimer?.(exercise?.restTime ?? 120)}
              >
                <Timer className="w-4 h-4 mr-1" />
                Rest
              </Button>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const p = getProgressionSettings();
                const inc = p.exerciseSpecific?.[exercise.id];
                toast.message("Progression", {
                  description: inc ? `Exercise increment: ${inc}` : "Global progression applies",
                });
              }}
            >
              <Award className="w-4 h-4 mr-1" />
              Progression
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExerciseCard;