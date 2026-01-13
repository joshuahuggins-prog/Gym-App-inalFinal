// frontend/src/components/ExerciseCard.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Timer, Award, Edit2, Video } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { getProgressionSettings, getVideoLinks, updateVideoLink } from "../utils/storage";

const toNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const clampInt = (n, min, max) => Math.max(min, Math.min(max, Math.trunc(n)));

const normalizeGoalReps = (goalReps, setsCount) => {
  const arr = Array.isArray(goalReps) ? goalReps.map((x) => toNum(x, 8)) : [];
  const safe = arr.length ? arr : [8];
  if (safe.length < setsCount)
    return [...safe, ...Array.from({ length: setsCount - safe.length }, () => 8)];
  if (safe.length > setsCount) return safe.slice(0, setsCount);
  return safe;
};

const normalizeSetsData = (setsData, setsCount) => {
  const arr = Array.isArray(setsData) ? setsData : [];
  const base = arr.map((s) => ({
    weight: s?.weight === "" ? "" : toNum(s?.weight, 0),
    reps: s?.reps === "" ? "" : toNum(s?.reps, 0),
    completed: !!s?.completed,
  }));

  if (base.length < setsCount) {
    return [
      ...base,
      ...Array.from({ length: setsCount - base.length }, () => ({
        weight: 0,
        reps: 0,
        completed: false,
      })),
    ];
  }

  if (base.length > setsCount) return base.slice(0, setsCount);
  return base;
};

const abs1 = (n) => {
  const x = toNum(n, 0);
  return Math.abs(x);
};

const normalize = (s) => String(s || "").trim().toLowerCase();

const ExerciseCard = ({
  exercise,
  lastWorkoutData,
  onSetComplete,
  onWeightChange,
  onNotesChange,
  onRestTimer,
  isFirst = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [videoLink, setVideoLink] = useState("");
  const [notes, setNotes] = useState("");

  const setsCount = clampInt(toNum(exercise?.sets, 3), 1, 12);

  const goalReps = useMemo(
    () => normalizeGoalReps(exercise?.goalReps, setsCount),
    [exercise?.goalReps, setsCount]
  );

  // ✅ hydrate from exercise.setsData
  const [sets, setSets] = useState(() => {
    const base = normalizeSetsData(exercise?.setsData, setsCount);
    return base.map((s, idx) => ({
      ...s,
      goalReps: goalReps[idx] ?? 8,
    }));
  });

  // ✅ Weighted/Assisted mode
  // - assisted => store weights as NEGATIVE, display as absolute
  const inferModeFromSets = (setsArr) => {
    const anyNeg = (setsArr || []).some((s) => toNum(s?.weight, 0) < 0);
    return anyNeg ? "assisted" : "weighted";
  };

  const [weightMode, setWeightMode] = useState(() => inferModeFromSets(exercise?.setsData));

  const lastHydratedKeyRef = useRef("");

  // hydrate video + notes + sets when exercise changes OR when parent updates setsData
  useEffect(() => {
    const links = getVideoLinks();
    setVideoLink(links?.[exercise?.id] || "");
    setNotes(exercise?.userNotes || "");

    const key = `${exercise?.id || ""}__${setsCount}__${JSON.stringify(
      exercise?.setsData || []
    )}__${JSON.stringify(goalReps)}`;

    if (key === lastHydratedKeyRef.current) return;
    lastHydratedKeyRef.current = key;

    const base = normalizeSetsData(exercise?.setsData, setsCount);

    setSets(
      base.map((s, idx) => ({
        ...s,
        goalReps: goalReps[idx] ?? 8,
      }))
    );

    // ✅ also re-infer mode if incoming data changed sign pattern
    setWeightMode(inferModeFromSets(base));
  }, [exercise?.id, setsCount, exercise?.setsData, goalReps]);

  // handy: top set abs weight
  const topSetAbs = useMemo(() => {
    const first = sets?.[0]?.weight ?? 0;
    return abs1(first);
  }, [sets]);

  const completedCount = useMemo(
    () => (sets || []).filter((s) => s.completed).length,
    [sets]
  );

  const handleNotesBlur = () => {
    onNotesChange?.(exercise, notes);
  };

  const pushSetsUp = (nextSets) => {
    setSets(nextSets);

    // remove goalReps before sending upward (parent stores setsData only)
    const setsData = nextSets.map((s) => ({
      weight: s.weight === "" ? 0 : toNum(s.weight, 0),
      reps: s.reps === "" ? 0 : toNum(s.reps, 0),
      completed: !!s.completed,
    }));

    onWeightChange?.(exercise, setsData);
  };

  const toSignedWeight = (value, mode) => {
    if (value === "") return "";
    const n = toNum(value, 0);
    const a = Math.abs(n);
    return mode === "assisted" ? -a : a;
  };

  const displayWeight = (storedWeight, mode) => {
    if (storedWeight === "") return "";
    const n = toNum(storedWeight, 0);
    return mode === "assisted" ? Math.abs(n) : n;
  };

  const toggleComplete = (idx) => {
    const next = sets.map((s, i) =>
      i === idx ? { ...s, completed: !s.completed } : s
    );
    pushSetsUp(next);

    const set = next[idx];
    const levelUp = false;
    onSetComplete?.(exercise, set, levelUp);
  };

  const updateField = (idx, field, value) => {
    const next = sets.map((s, i) => {
      if (i !== idx) return s;

      if (field === "weight") {
        // store signed depending on mode
        if (value === "") return { ...s, weight: "" };
        return { ...s, weight: toSignedWeight(value, weightMode) };
      }

      // reps (keep as user input; pushSetsUp converts to number)
      if (value === "") return { ...s, [field]: "" };
      return { ...s, [field]: value };
    });

    pushSetsUp(next);
  };

  const openVideo = (e) => {
    e.stopPropagation();
    if (!videoLink) return;
    window.open(videoLink, "_blank", "noopener,noreferrer");
  };

  const handleSaveVideo = () => {
    if (!exercise?.id) return;
    if (!videoLink?.trim()) {
      toast.error("Please enter a video URL");
      return;
    }
    updateVideoLink(exercise.id, videoLink.trim());
    toast.success("Video link saved");
  };

  const handleSuggestIncrement = () => {
    const p = getProgressionSettings();
    const inc = p.exerciseSpecific?.[exercise.id];
    toast.message("Progression", {
      description: inc ? `Exercise increment: ${inc}` : `Global increment settings apply`,
    });
  };

  const handleToggleMode = (nextMode) => {
    if (nextMode === weightMode) return;

    setWeightMode(nextMode);

    // convert all current weights to match chosen mode sign
    const converted = sets.map((s) => {
      if (s.weight === "") return s;
      const n = toNum(s.weight, 0);
      const a = Math.abs(n);
      return { ...s, weight: nextMode === "assisted" ? -a : a };
    });

    pushSetsUp(converted);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-4 cursor-pointer select-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-foreground truncate">
              {exercise?.name || "Exercise"}
            </h3>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>
                {completedCount}/{setsCount} sets
              </span>
              <span>•</span>
              <span>Top: {topSetAbs}</span>

              {/* ✅ Weighted / Assisted toggle */}
              <span>•</span>
              <div
                className="inline-flex rounded-lg border border-border bg-muted/30 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => handleToggleMode("weighted")}
                  className={`px-2 py-1 text-[11px] font-semibold transition ${
                    weightMode === "weighted"
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Weighted (store positive weight)"
                >
                  Weighted
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleMode("assisted")}
                  className={`px-2 py-1 text-[11px] font-semibold transition ${
                    weightMode === "assisted"
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Assisted (stores negative weight)"
                >
                  Assisted
                </button>
              </div>

              {exercise?.repScheme ? (
                <>
                  <span>•</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {exercise.repScheme}
                  </Badge>
                </>
              ) : null}
            </div>
          </div>

          {/* Right-side icons */}
          <div className="flex items-center gap-1 shrink-0">
            {videoLink ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={openVideo}
                title="Open form video"
                className="hover:bg-muted/50"
              >
                <Video className="w-4 h-4" />
              </Button>
            ) : null}

            {expanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 animate-fadeIn">
          {/* Sets */}
          <div className="space-y-2">
            {sets.map((set, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[80px_1fr_1fr_44px] gap-2 items-center bg-muted/30 rounded-lg p-2 border border-border"
              >
                <div className="text-xs text-muted-foreground">Set {idx + 1}</div>

                <Input
                  type="number"
                  value={displayWeight(set.weight, weightMode)}
                  onChange={(e) =>
                    updateField(
                      idx,
                      "weight",
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  placeholder={weightMode === "assisted" ? "Assist" : "Weight"}
                />

                <Input
                  type="number"
                  value={set.reps ?? ""}
                  onChange={(e) =>
                    updateField(
                      idx,
                      "reps",
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  placeholder={`Reps (goal ${goalReps[idx] ?? 8})`}
                />

                <Button
                  variant={set.completed ? "default" : "outline"}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleComplete(idx);
                  }}
                  title={set.completed ? "Completed" : "Mark completed"}
                >
                  ✓
                </Button>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div>
            <div className="text-sm font-medium text-foreground mb-2">Notes</div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Add notes..."
              className="min-h-[70px]"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {onRestTimer ? (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRestTimer?.(toNum(exercise?.restTime, 120));
                }}
              >
                <Timer className="w-4 h-4 mr-2" />
                Rest Timer
              </Button>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleSuggestIncrement();
              }}
            >
              <Award className="w-4 h-4 mr-2" />
              Progression
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleSaveVideo();
              }}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Save Video Link
            </Button>
          </div>

          {/* Video URL editor */}
          <div>
            <div className="text-sm font-medium text-foreground mb-2">Form Video URL</div>
            <Input
              value={videoLink || ""}
              onChange={(e) => setVideoLink(e.target.value)}
              placeholder="https://youtube.com/..."
            />
            <div className="text-xs text-muted-foreground mt-1">
              Tip: Once saved, the Video icon shows in the header even when collapsed.
            </div>
          </div>

          {/* Last workout */}
          {lastWorkoutData ? (
            <div className="text-xs text-muted-foreground border border-border rounded-lg p-3 bg-muted/20">
              <div className="font-semibold text-foreground mb-1">Last time</div>
              {(lastWorkoutData.sets || []).map((s, i) => (
                <div key={i}>
                  Set {i + 1}: {s.weight} × {s.reps}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default ExerciseCard;