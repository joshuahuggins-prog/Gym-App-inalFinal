// src/pages/HistoryPage.js
import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Trash2, Calendar, Pencil } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { getWorkouts, deleteWorkout } from "../utils/storage";
import { useSettings } from "../contexts/SettingsContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const pad2 = (n) => String(n).padStart(2, "0");

const safeDate = (value) => {
  try {
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
};

const safeFormat = (dateValue, locale, options, fallback = "Unknown date") => {
  const d = safeDate(dateValue);
  if (!d) return fallback;
  try {
    return d.toLocaleDateString(locale, options);
  } catch {
    return fallback;
  }
};

const HistoryPage = () => {
  const { weightUnit } = useSettings();
  const [workouts, setWorkouts] = useState([]);
  const [expandedWorkouts, setExpandedWorkouts] = useState(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    setWorkouts(getWorkouts() || []);
  }, []);

  const handleDelete = (id) => {
    if (window.confirm("Delete this workout?")) {
      deleteWorkout(id);
      setWorkouts(getWorkouts() || []);
      toast.success("Workout deleted");
    }
  };

  const toggleExpand = (id) => {
    setExpandedWorkouts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const groupedWorkouts = useMemo(() => {
    const grouped = {};
    (workouts || []).forEach((workout) => {
      const d = safeDate(workout?.date);
      const year = d ? d.getFullYear() : 9999;
      const month = d ? d.getMonth() + 1 : 12;

      const monthKey = String(year) + "-" + pad2(month);
      if (!grouped[monthKey]) grouped[monthKey] = [];
      grouped[monthKey].push(workout);
    });

    // Sort months descending (latest first)
    const ordered = {};
    Object.keys(grouped)
      .sort((a, b) => (a < b ? 1 : -1))
      .forEach((k) => {
        ordered[k] = grouped[k];
      });

    return ordered;
  }, [workouts]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-b from-card to-background border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gradient-primary mb-2">
            Workout History
          </h1>
          <p className="text-sm text-muted-foreground">
            {workouts.length} total workouts logged
          </p>
        </div>
      </div>

      {/* History List */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {workouts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💪</div>
            <p className="text-lg text-muted-foreground mb-2">No workouts yet</p>
            <p className="text-sm text-muted-foreground">
              Complete your first workout to see it here!
            </p>
          </div>
        ) : (
          Object.entries(groupedWorkouts).map(([monthKey, monthWorkouts]) => {
            const parts = String(monthKey).split("-");
            const year = Number(parts[0]);
            const month = Number(parts[1]);

            const monthName =
              Number.isFinite(year) && Number.isFinite(month)
                ? safeFormat(
                    new Date(year, month - 1, 1).toISOString(),
                    "en-US",
                    { month: "long", year: "numeric" },
                    "Unknown month"
                  )
                : "Unknown month";

            return (
              <div key={monthKey} className="space-y-3">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  {monthName}
                </h2>

                {(monthWorkouts || []).map((workout) => {
                  const isExpanded = expandedWorkouts.has(workout?.id);

                  const exercises = Array.isArray(workout?.exercises)
                    ? workout.exercises
                    : [];

                  const completedSets = exercises.reduce((sum, ex) => {
                    const sets = Array.isArray(ex?.sets) ? ex.sets : [];
                    return sum + sets.filter((s) => !!s?.completed).length;
                  }, 0);

                  const totalSets = exercises.reduce((sum, ex) => {
                    const sets = Array.isArray(ex?.sets) ? ex.sets : [];
                    return sum + sets.length;
                  }, 0);

                  return (
                    <div
                      key={workout?.id || Math.random().toString(36)}
                      className="bg-card border border-border rounded-xl overflow-hidden shadow-lg"
                    >
                      {/* Workout Header */}
                      <div
                        className="p-4 cursor-pointer select-none"
                        onClick={() => workout?.id && toggleExpand(workout.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-foreground mb-1 truncate">
                              {workout?.name || "Workout"}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>
                                {safeFormat(workout?.date, "en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                              <span>•</span>
                              <span>
                                {completedSets}/{totalSets} sets
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Edit */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!workout?.id) return;
                                navigate("/edit-workout/" + workout.id);
                              }}
                              className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10"
                              title="Edit workout"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>

                            {/* Delete */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!workout?.id) return;
                                handleDelete(workout.id);
                              }}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Delete workout"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>

                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        <Badge className="bg-primary/20 text-primary border-primary/50">
                          {workout?.focus || "—"}
                        </Badge>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded ? (
                        <div className="px-4 pb-4 space-y-3 animate-fadeIn">
                          {exercises.map((exercise, exIndex) => {
                            const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];

                            return (
                              <div
                                key={exercise?.id || exIndex}
                                className="bg-muted/30 rounded-lg p-3 border border-border"
                              >
                                <div className="font-semibold text-foreground mb-2">
                                  {exercise?.name || "Exercise"}
                                </div>

                                <div className="space-y-2">
                                  {sets.map((set, setIndex) => (
                                    <div
                                      key={setIndex}
                                      className="flex items-center justify-between text-sm"
                                    >
                                      <span className="text-muted-foreground">
                                        Set {setIndex + 1}
                                      </span>
                                      <span className="font-semibold text-foreground">
                                        {Number(set?.weight ?? 0)} {weightUnit} ×{" "}
                                        {Number(set?.reps ?? 0)} reps
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                {exercise?.notes ? (
                                  <div className="mt-2 text-xs text-muted-foreground p-2 bg-card rounded border border-border">
                                    {exercise.notes}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default HistoryPage;