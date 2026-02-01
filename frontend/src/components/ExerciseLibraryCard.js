// frontend/src/components/ExerciseLibraryCard.js
import React, { useMemo, useState } from "react";
import { Edit2, Trash2, RotateCcw, Video, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

import { saveExercise, updateVideoLink } from "../utils/storage";

const MAX_SETS = 8;
const clampInt = (n, min, max) => Math.max(min, Math.min(max, n));
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export default function ExerciseLibraryCard({
  exercise,
  usedBy = [],
  userMade = false,
  canReset = false,
  defaultExists = false,
  videoUrl = "",
  onDelete,
  onResetToDefault,
  onOpenVideo,
  onChanged,
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const [draft, setDraft] = useState(() => ({
    id: exercise?.id,
    name: exercise?.name || "",
    sets: exercise?.sets ?? 3,
    repScheme: exercise?.repScheme ?? "RPT",
    goalReps: Array.isArray(exercise?.goalReps) ? [...exercise.goalReps] : [8, 10, 12],
    restTime: exercise?.restTime ?? 120,
    notes: exercise?.notes ?? "",
    videoUrl: videoUrl || "",
  }));

  const normalizedGoalReps = useMemo(() => {
    const sets = clampInt(toNum(draft.sets) ?? 3, 1, MAX_SETS);
    const base = Array.isArray(draft.goalReps) ? draft.goalReps : [];
    const out = [];
    for (let i = 0; i < sets; i++) out.push(base[i] ?? base[0] ?? 8);
    return out;
  }, [draft.goalReps, draft.sets]);

  const startEdit = () => {
    setDraft({
      id: exercise?.id,
      name: exercise?.name || "",
      sets: exercise?.sets ?? 3,
      repScheme: exercise?.repScheme ?? "RPT",
      goalReps: Array.isArray(exercise?.goalReps) ? [...exercise.goalReps] : [8, 10, 12],
      restTime: exercise?.restTime ?? 120,
      notes: exercise?.notes ?? "",
      videoUrl: videoUrl || "",
    });
    setEditing(true);
  };

  const save = () => {
    const name = String(draft.name || "").trim();
    if (!name) {
      toast.error("Please enter exercise name");
      return;
    }

    const sets = clampInt(toNum(draft.sets) ?? 3, 1, MAX_SETS);
    const restTime = Math.max(15, toNum(draft.restTime) ?? 120);

    const cleanedGoalReps = normalizedGoalReps.map((x) => {
      const n = toNum(x);
      if (!Number.isFinite(n) || n <= 0) return 8;
      return clampInt(n, 1, 200);
    });

    const { videoUrl: vUrl, ...rest } = draft;

    const ok = saveExercise({
      ...rest,
      id: exercise.id,
      name,
      sets,
      restTime,
      goalReps: cleanedGoalReps,
    });

    if (!ok) {
      toast.error("Failed to save exercise");
      return;
    }

    const trimmed = String(vUrl || "").trim();
    if (trimmed) updateVideoLink(exercise.id, trimmed);

    toast.success("Exercise saved");
    setEditing(false);
    onChanged?.();
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
      {/* Header (tap to expand) */}
      <button type="button" className="w-full text-left" onClick={() => setOpen((v) => !v)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-foreground mb-1 break-words whitespace-normal leading-snug">
              {exercise?.name || "Exercise"}
            </h3>

            <div className="flex flex-wrap gap-1 mb-2">
              {usedBy.length > 0 ? (
                usedBy.map((prog) => (
                  <Badge key={prog.type} variant="outline" className="text-xs">
                    {prog.name || prog.type}
                  </Badge>
                ))
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Not in any programme
                </Badge>
              )}

              {userMade && (
                <Badge variant="secondary" className="text-xs">
                  Custom
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!videoUrl) return;
                onOpenVideo?.();
              }}
              disabled={!videoUrl}
              title={videoUrl ? "Open video" : "No video link"}
            >
              <Video className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                startEdit();
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
                onDelete?.();
              }}
              className="text-destructive hover:text-destructive"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!canReset}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onResetToDefault?.();
              }}
              className={canReset ? "" : "opacity-40 cursor-not-allowed"}
              title={
                userMade
                  ? "Custom exercises can’t be reset."
                  : !defaultExists
                  ? "No default exists for this exercise."
                  : "Reset to app default"
              }
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
          <div className="flex justify-between gap-2">
            <span>Sets:</span>
            <span className="text-foreground font-semibold">{exercise?.sets}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>Reps:</span>
            <span className="text-foreground font-semibold text-right break-words whitespace-normal">
              {(exercise?.goalReps || []).join(", ")}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span>Rest:</span>
            <span className="text-foreground font-semibold">{exercise?.restTime}s</span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span>Scheme:</span>
            <Badge variant="secondary" className="text-xs">
              {exercise?.repScheme}
            </Badge>
          </div>

          {exercise?.notes ? (
            <div className="mt-3 text-xs text-muted-foreground p-2 bg-muted/30 rounded border border-border whitespace-pre-wrap break-words">
              {exercise.notes}
            </div>
          ) : null}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Exercise</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Exercise Name *
              </label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Number of Sets (max {MAX_SETS})
                </label>
                <Input
                  type="number"
                  min="1"
                  max={MAX_SETS}
                  value={draft.sets}
                  onChange={(e) => setDraft((p) => ({ ...p, sets: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Rep Scheme
                </label>
                <Select
                  value={draft.repScheme}
                  onValueChange={(value) => setDraft((p) => ({ ...p, repScheme: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RPT">RPT (Reverse Pyramid)</SelectItem>
                    <SelectItem value="Kino Reps">Kino Reps</SelectItem>
                    <SelectItem value="Rest-Pause">Rest-Pause</SelectItem>
                    <SelectItem value="Straight Sets">Straight Sets</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground block">
                Goal reps for each set
              </label>
              <div className="grid grid-cols-4 gap-2">
                {normalizedGoalReps.map((rep, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="text-[11px] text-muted-foreground">Set {idx + 1}</div>
                    <Input
                      type="number"
                      min="1"
                      value={rep}
                      onChange={(e) => {
                        const next = [...normalizedGoalReps];
                        next[idx] = e.target.value;
                        setDraft((p) => ({ ...p, goalReps: next }));
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Rest Time (seconds)
              </label>
              <Input
                type="number"
                min="15"
                max="600"
                value={draft.restTime}
                onChange={(e) => setDraft((p) => ({ ...p, restTime: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Form Check Video URL
              </label>
              <Input
                value={draft.videoUrl}
                onChange={(e) => setDraft((p) => ({ ...p, videoUrl: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Notes / Instructions
              </label>
              <Textarea
                value={draft.notes}
                onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))}
                className="min-h-[80px] resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={save}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}