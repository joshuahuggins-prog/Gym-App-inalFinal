import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Trash2, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { getWorkouts, deleteWorkout } from '../utils/storage';
import { useSettings } from '../contexts/SettingsContext';
import { toast } from 'sonner';

const HistoryPage = () => {
  const { weightUnit } = useSettings();
  const [workouts, setWorkouts] = useState([]);
  const [expandedWorkouts, setExpandedWorkouts] = useState(new Set());

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = () => {
    setWorkouts(getWorkouts());
  };

  const handleDelete = (id) => {
    console.log('Delete button clicked for workout:', id);
    if (window.confirm('Delete this workout?')) {
      console.log('User confirmed deletion');
      const result = deleteWorkout(id);
      console.log('Delete result:', result);
      loadWorkouts();
      toast.success('Workout deleted');
    } else {
      console.log('User cancelled deletion');
    }
  };

  const toggleExpand = (id) => {
    const newExpanded = new Set(expandedWorkouts);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedWorkouts(newExpanded);
  };

  const groupByMonth = (workouts) => {
    const grouped = {};
    workouts.forEach(workout => {
      const date = new Date(workout.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(workout);
    });
    return grouped;
  };

  const groupedWorkouts = groupByMonth(workouts);

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
            <p className="text-lg text-muted-foreground mb-2">
              No workouts yet
            </p>
            <p className="text-sm text-muted-foreground">
              Complete your first workout to see it here!
            </p>
          </div>
        ) : (
          Object.entries(groupedWorkouts).map(([monthKey, monthWorkouts]) => {
            const [year, month] = monthKey.split('-');
            const monthName = new Date(year, parseInt(month) - 1).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric'
            });

            return (
              <div key={monthKey} className="space-y-3">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  {monthName}
                </h2>

                {monthWorkouts.map(workout => {
                  const isExpanded = expandedWorkouts.has(workout.id);
                  const completedSets = workout.exercises.reduce(
                    (sum, ex) => sum + ex.sets.filter(s => s.completed).length,
                    0
                  );
                  const totalSets = workout.exercises.reduce(
                    (sum, ex) => sum + ex.sets.length,
                    0
                  );

                  return (
                    <div
                      key={workout.id}
                      className="bg-card border border-border rounded-xl overflow-hidden shadow-lg"
                    >
                      {/* Workout Header */}
                      <div
                        className="p-4 cursor-pointer select-none"
                        onClick={() => toggleExpand(workout.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-foreground mb-1">
                              {workout.name}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>
                                {new Date(workout.date).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                              <span>•</span>
                              <span>{completedSets}/{totalSets} sets</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(workout.id);
                              }}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
                          {workout.focus}
                        </Badge>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-3 animate-fadeIn">
                          {workout.exercises.map((exercise, exIndex) => (
                            <div
                              key={exIndex}
                              className="bg-muted/30 rounded-lg p-3 border border-border"
                            >
                              <div className="font-semibold text-foreground mb-2">
                                {exercise.name}
                              </div>
                              <div className="space-y-2">
                                {exercise.sets.map((set, setIndex) => (
                                  <div
                                    key={setIndex}
                                    className="flex items-center justify-between text-sm"
                                  >
                                    <span className="text-muted-foreground">
                                      Set {setIndex + 1}
                                    </span>
                                    <span className="font-semibold text-foreground">
                                      {set.weight} {weightUnit} × {set.reps} reps
                                    </span>
                                  </div>
                                ))}
                              </div>
                              {exercise.notes && (
                                <div className="mt-2 text-xs text-muted-foreground p-2 bg-card rounded border border-border">
                                  {exercise.notes}
                                </div>
                              )}
                            </div>
                          ))}
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