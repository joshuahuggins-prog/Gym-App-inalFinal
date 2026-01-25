// src/pages/HistoryPage.js  
import React, { useEffect, useMemo, useState } from "react";  
import { ChevronDown, ChevronUp, Trash2, Calendar, Pencil } from "lucide-react";  
import { Button } from "../components/ui/button";  
import { Badge } from "../components/ui/badge";  
import { getWorkouts, deleteWorkout } from "../utils/storage";  
import { useSettings } from "../contexts/SettingsContext";  
import { toast } from "sonner";  
  
const ensureArray = (v) => (Array.isArray(v) ? v : []);  
  
const HistoryPage = ({ onEditWorkout }) => {  
  const { weightUnit } = useSettings();  
  
  // ✅ Read workouts synchronously on first render to avoid "No workouts yet" flicker  
  const [workouts, setWorkouts] = useState(() => ensureArray(getWorkouts()));  
  const [expandedWorkouts, setExpandedWorkouts] = useState(new Set());  
  
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
    }  
  };  
  
  const toggleExpand = (id) => {  
    setExpandedWorkouts((prev) => {  
      const next = new Set(prev);  
      next.has(id) ? next.delete(id) : next.add(id);  
      return next;  
    });  
  };  
  
  const groupedWorkouts = useMemo(() => {  
    const grouped = {};  
    ensureArray(workouts).forEach((workout) => {  
      const d = new Date(workout?.date);  
      if (Number.isNaN(d.getTime())) return;  
  
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;  
      if (!grouped[key]) grouped[key] = [];  
      grouped[key].push(workout);  
    });  
    return grouped;  
  }, [workouts]);  
  
  const totalCount = ensureArray(workouts).length;  
  
  return (  
    <div className="min-h-screen bg-background">  
      {/* Header */}  
      <div className="bg-gradient-to-b from-card to-background border-b border-border">  
        <div className="max-w-2xl mx-auto px-4 py-6">  
          <h1 className="text-3xl font-bold text-primary">Workout History</h1>  
          <p className="text-sm text-muted-foreground">{totalCount} total workouts logged</p>  
        </div>  
      </div>  
  
      {/* History List */}  
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">  
        {totalCount === 0 ? (  
          <div className="text-center py-12">  
            <div className="text-6xl mb-4">💪</div>  
            <p className="text-lg text-muted-foreground mb-2">No workouts yet</p>  
          </div>  
        ) : (  
          Object.entries(groupedWorkouts).map(([monthKey, monthWorkouts]) => {  
            const [year, month] = monthKey.split("-");  
            const monthName = new Date(Number(year), Number(month) - 1).toLocaleDateString(  
              "en-US",  
              { month: "long", year: "numeric" }  
            );  
  
            return (  
              <div key={monthKey} className="space-y-3">  
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">  
                  <Calendar className="w-5 h-5 text-primary" />  
                  {monthName}  
                </h2>  
  
                {ensureArray(monthWorkouts).map((workout) => {  
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
                        onClick={() => toggleExpand(workout.id)}  
                      >  
                        <div className="flex items-start justify-between mb-2">  
                          <div className="flex-1">  
                            <h3 className="text-lg font-bold text-foreground mb-1">  
                              {workout?.name || "Workout"}  
                            </h3>  
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">  
                              <span>  
                                {workout?.date  
                                  ? new Date(workout.date).toLocaleDateString("en-US", {  
                                      weekday: "short",  
                                      month: "short",  
                                      day: "numeric",  
                                    })  
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
                                    <div key={setIndex} className="flex justify-between text-sm">  
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
            );  
          })  
        )}  
      </div>  
    </div>  
  );  
};  

export default HistoryPage;