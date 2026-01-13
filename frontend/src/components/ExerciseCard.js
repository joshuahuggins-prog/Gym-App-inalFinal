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

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const clampInt = (n, min, max) =>
  Math.max(min, Math.min(max, Math.trunc(n)));

const normalizeSets = (setsData, count) => {
  const base = Array.isArray(setsData) ? setsData : [];
  const out = [];

  for (let i = 0; i < count; i++) {
    const s = base[i] || {};
    out.push({
      weight: s.weight ?? "",
      reps: s.reps ?? "",
      completed: !!s.completed,
    });
  }
  return out;
};

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
  const [sets, setSets] = useState(() =>
    normalizeSets(exercise?.setsData, setsCount)
  );

  const [mode, setMode] = useState(() =>
    (exercise?.setsData || []).some(s => Number(s.weight) < 0)
      ? "assisted"
      : "weighted"
  );

  const hydrateKey = useRef("");

  /* ---------- hydrate ---------- */
  useEffect(() => {
    const key = JSON.stringify(exercise?.setsData);
    if (key === hydrateKey.current) return;
    hydrateKey.current = key;

    setSets(normalizeSets(exercise?.setsData, setsCount));
    setNotes(exercise?.userNotes || "");

    const links = getVideoLinks();
    setVideoLink(links?.[exercise?.id] || "");
  }, [exercise, setsCount]);

  /* ---------- PR ---------- */
  const pr = useMemo(() => {
    const prs = getPersonalRecords?.() || {};
    return prs[exercise?.id] || null;
  }, [exercise?.id]);

  /* ---------- propagate upward WITHOUT coercing ---------- */
  const pushUp = (nextSets) => {
    setSets(nextSets);

    onWeightChange?.(
      exercise,
      nextSets.map(s => ({
        weight: s.weight === "" ? "" : Number(s.weight),
        reps: s.reps === "" ? "" : Number(s.reps),
        completed: s.completed,
      }))
    );
  };

  const toggleMode = (next) => {
    if (next === mode) return;
    setMode(next);

    const converted = sets.map(s => {
      if (s.weight === "") return s;
      const v = Math.abs(Number(s.weight));
      return { ...s, weight: next === "assisted" ? -v : v };
    });

    pushUp(converted);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        className="w-full text-left p-4"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold truncate">{exercise?.name}</h3>
            <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
              <span>
                {sets.filter(s => s.completed).length}/{setsCount} sets
              </span>

              {pr && (
                <span className="font-semibold text-foreground">
                  PR {pr.weight} × {pr.reps}
                </span>
              )}

              {/* Mode toggle */}
              <div
                className="inline-flex border rounded-md overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <button
                  className={`px-2 py-0.5 text-[11px] ${
                    mode === "weighted"
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => toggleMode("weighted")}
                >
                  Weighted
                </button>
                <button
                  className={`px-2 py-0.5 text-[11px] ${
                    mode === "assisted"
                      ? "bg-orange-500/20 text-orange-600"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => toggleMode("assisted")}
                >
                  Assisted
                </button>
              </div>
            </div>
          </div>

          {videoLink && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                window.open(videoLink, "_blank");
              }}
            >
              <Video className="w-4 h-4" />
            </Button>
          )}

          {expanded ? <ChevronUp /> : <ChevronDown />}
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {sets.map((s, i) => (
            <div
              key={i}
              className="grid grid-cols-[70px_1fr_1fr_40px] gap-2 items-center"
            >
              <span className="text-xs">Set {i + 1}</span>

              <Input
                type="number"
                value={s.weight === "" ? "" : Math.abs(s.weight)}
                placeholder={mode === "assisted" ? "Assist" : "Weight"}
                onChange={e => {
                  const v = e.target.value;
                  const next = [...sets];
                  next[i] = {
                    ...s,
                    weight:
                      v === ""
                        ? ""
                        : mode === "assisted"
                        ? -Number(v)
                        : Number(v),
                  };
                  pushUp(next);
                }}
              />

              <Input
                type="number"
                value={s.reps}
                placeholder="Reps"
                onChange={e => {
                  const next = [...sets];
                  next[i] = { ...s, reps: e.target.value };
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
              >
                ✓
              </Button>
            </div>
          ))}

          <Textarea
            value={notes}
            placeholder="Notes…"
            onChange={e => setNotes(e.target.value)}
            onBlur={() => onNotesChange?.(exercise, notes)}
          />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRestTimer?.(exercise?.restTime ?? 120)}
            >
              <Timer className="w-4 h-4 mr-1" />
              Rest
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const p = getProgressionSettings();
                toast.message("Progression", {
                  description:
                    p.exerciseSpecific?.[exercise.id] ??
                    "Global progression applies",
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