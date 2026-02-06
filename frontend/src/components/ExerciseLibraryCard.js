import React from "react";
import { RotateCcw, RefreshCcw, X, Check } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";

export default function ExerciseLibraryCard({
  exercise,
  usedBy = [],
  userMade,
  canReset,

  resetOpen,
  resetChallenge,
  resetAnswer,
  onChangeResetAnswer,
  onToggleReset,
  onNewChallenge,
  onConfirmReset,
  onCancelReset,

  onEdit,
  onDelete,
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex justify-between items-start gap-3">
        <div>
          <h3 className="font-semibold text-foreground leading-tight">
            {exercise.name}
          </h3>

          {usedBy.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {usedBy.map((p) => (
                <Badge key={p.type} variant="secondary" className="text-[10px]">
                  {p.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={onEdit}>
            ✏️
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete}>
            🗑️
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={!canReset}
            onClick={onToggleReset}
            title={
              userMade
                ? "Custom exercises can’t be reset"
                : "Reset to app default"
            }
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Details */}
      <div className="text-sm text-muted-foreground space-y-1">
        <div className="flex justify-between">
          <span>Sets</span>
          <span className="text-foreground font-medium">
            {exercise.sets}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Reps</span>
          <span className="text-foreground font-medium">
            {(exercise.goalReps || []).join(", ")}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Rest</span>
          <span className="text-foreground font-medium">
            {exercise.restTime}s
          </span>
        </div>
      </div>

      {/* RESET PANEL */}
      {resetOpen && canReset && (
        <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <div className="text-xs text-muted-foreground">
            Solve to confirm reset
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-sm">
              {resetChallenge.text} =
            </span>

            <Input
              type="number"
              value={resetAnswer}
              onChange={(e) => onChangeResetAnswer(e.target.value)}
              className="w-20 h-8"
            />

            <Button
              size="icon"
              variant="ghost"
              onClick={onNewChallenge}
              title="New challenge"
            >
              <RefreshCcw className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={onConfirmReset} className="gap-1">
              <Check className="w-4 h-4" />
              Confirm
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onCancelReset}
              className="gap-1"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
