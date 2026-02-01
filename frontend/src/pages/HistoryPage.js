// src/pages/HistoryPage.js
import React, { useEffect, useMemo, useState } from "react";
import AppHeader from "../components/AppHeader";
import { ChevronDown, ChevronUp, Trash2, Calendar, Pencil } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { getWorkouts, deleteWorkout } from "../utils/storage";
import { useSettings } from "../contexts/SettingsContext";
import { toast } from "sonner";

const ensureArray = (v) => (Array.isArray(v) ? v : []);

const monthTitle = (year, monthIndex0) =>
  new Date(year, monthIndex0, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "2-digit",
  });

const monthKeyFromDate = (d) => {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`; // sortable
};

const sortMonthKeysDesc = (a, b) => (a === b ? 0 : a < b ? 1 : -1);

const HistoryPage = ({ onEditWorkout }) => {
  const { weightUnit } = useSettings();

  // ✅ Read workouts synchronously on first render to avoid "No workouts yet" flicker
  const [workouts, setWorkouts] = useState(() => ensureArray(getWorkouts()));

  // individual workout expand/collapse (existing behaviour)
  const [expandedWorkouts, setExpandedWorkouts] = useState(new Set());

  // month section expand/collapse
  const [expandedMonths, setExpandedMonths] = useState(() => new Set());

  // Keep in sync on mount (covers edge cases if storage changes between renders)
  useEffect(() => {
    setWorkouts(ensureArray(getWorkouts()));
  }, []);

  const reload = () => setWorkouts(ensureArray(getWorkouts()));

  const handleDelete = (id) => {
    if (window.confirm("Delete this workout?")) {
      deleteWorkout(id);
      reload();
      toast.success("Workout deleted");
      setExpandedWorkouts((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const toggleExpandWorkout = (id) => {
    setExpandedWorkouts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleExpandMonth = (monthKey) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      next.has(monthKey) ? next.delete(monthKey) : next.add(monthKey);
      return next;
    });
  };

  const groupedWorkouts = useMemo(() => {
    const grouped = {};
    ensureArray(workouts).forEach((workout) => {
      const d = new Date(workout?.date);
      if (Number.isNaN(d.getTime())) return;

      const key = monthKeyFromDate(d);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(workout);
    });

    // sort workouts within each month by date desc
    Object.keys(grouped).forEach((k) => {
      grouped[k].sort((a, b) => {
        const da = new Date(a?.date).getTime();
        const db = new Date(b?.date).getTime();
        return (Number.isFinite(db) ? db : 0) - (Number.isFinite(da) ? da : 0);
      });
    });

    return grouped;
  }, [workouts]);

  const totalCount = ensureArray(workouts).length;

  // Auto-expand the most recent month on first load
  useEffect(() => {
    if (totalCount === 0) return;

    const keys = Object.keys(groupedWorkouts).sort(sortMonthKeysDesc);
    if (keys.length === 0) return;

    setExpandedMonths((prev) => {
      if (prev.size > 0) return prev; // don't override user's choice
      const next = new Set(prev);
      next.add(keys[0]);
      return next;
    });
  }, [totalCount, groupedWorkouts]);

  const subtitle =
    totalCount === 1 ? "1 total workout logged" : `${totalCount} total workouts logged`;

  return (
    <AppHeader
      title="Workout History"
      subtitle={subtitle}
      rightIconSrc={`${process.env.PUBLIC_URL}/icons/icon-overlay-white-32-v2.png`}
    >
      {/* History List */}
      {totalCount === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">💪</div>
          <p className="text-lg text-muted-foreground mb-2">No workouts yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.keys(groupedWorkouts)
            .sort(sortMonthKeysDesc)
            .map((monthKey) => {
              const monthWorkouts = ensureArray(groupedWorkouts[monthKey]);

              const [yearStr, monthStr] = monthKey.split("-");
              const year = Number(yearStr);
              const monthIndex0 = Number(monthStr) - 1;

              const title = monthTitle(year, monthIndex0); // e.g. "January 26"
              const isMonthOpen = expandedMonths.has(monthKey);

              return (
                <div key={monthKey} className="space-y-3">
                  {/* Month header row */}
                  <button
                    type="button"
                    onClick={() => toggleExpandMonth(monthKey)}
                    className="w-full text-left select-none"
                  >
                    <div className="border-t border-border border-b border-border py-3 flex items-center justify-between">
                      <div>
                        <div className="text-lg md:text-xl font-semibold text-foreground flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-muted-foreground" />
                          {title}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Number of workouts: {monthWorkouts.length}
                        </div>
                      </div>

                      <div className="ml-3 flex items-center">
                        {isMonthOpen ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Month contents */}
                  {isMonthOpen ? (
                    <div className="space-y-3">
                      {monthWorkouts.map((workout) => {
                        const isExpanded = expandedWorkouts.has(workout?.id);
                        const exercises = ensureArray(workout?.exercises);

                        const completedSets = exercises.reduce((sum, ex) => {
                          const sets = ensureArray(ex?.sets);
                          return sum + sets.filter((s) => !!s?.completed).length;
                        }, 0);

                        const totalSets = exercises.reduce((sum, ex) => {
                          const sets = ensureArray(ex?.sets);
                          return sum + sets.length;
                        }, 0);

                        return (
                          <div
                            key={workout?.id}
                            className="bg-card border border-border rounded-xl overflow-hidden"
                          >
                            {/* Workout Header */}
                            <div
                              className="p-4 cursor-pointer select-none"
                              onClick={() => toggleExpandWorkout(workout.id)}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h3 className="text-lg font-bold text-foreground mb-1">
                                    {workout?.name || "Workout"}
                                  </h3>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>
                                      {workout?.date
                                        ? new Date(workout.date).toLocaleDateString(
                                            "en-US",
                                            {
                                              weekday: "short",
                                              month: "short",
                                              day: "numeric",
                                            }
                                          )
                                        : "—"}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {completedSets}/{totalSets} sets
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {/* ✏️ Edit */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEditWorkout?.(workout.id);
                                    }}
                                    title="Edit workout"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>

                                  {/* 🗑 Delete */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(workout.id);
                                    }}
                                    className="text-destructive hover:bg-destructive/10"
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
                                {workout?.focus || workout?.type || "—"}
                              </Badge>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                              <div className="px-4 pb-4 space-y-3 animate-fadeIn">
                                {exercises.map((exercise, exIndex) => {
                                  const sets = ensureArray(exercise?.sets);
                                  return (
                                    <div
                                      key={`${exercise?.id || exercise?.name || exIndex}`}
                                      className="bg-muted/30 rounded-lg p-3 border border-border"
                                    >
                                      <div className="font-semibold text-foreground mb-2">
                                        {exercise?.name || "Exercise"}
                                      </div>

                                      <div className="space-y-2">
                                        {sets.map((set, setIndex) => (
                                          <div
                                            key={setIndex}
                                            className="flex justify-between text-sm"
                                          >
                                            <span className="text-muted-foreground">
                                              Set {setIndex + 1}
                                            </span>
                                            <span className="font-semibold text-foreground">
                                              {Number(set?.weight ?? 0)} {weightUnit} ×{" "}
                                              {Number(set?.reps ?? 0)}
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
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
        </div>
      )}
    </AppHeader>
  );
};

export default HistoryPage;
