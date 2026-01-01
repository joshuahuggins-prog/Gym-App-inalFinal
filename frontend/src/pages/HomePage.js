import React, { useState, useEffect } from 'react';
import { Calendar, Flame, TrendingUp, Save, RotateCcw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import ExerciseCard from '../components/ExerciseCard';
import RestTimer from '../components/RestTimer';
import PRCelebration from '../components/PRCelebration';
import { getWorkoutByType, getNextWorkoutType } from '../data/workoutData';
import { getWorkouts, saveWorkout, getSettings, updatePersonalRecord, getPersonalRecords } from '../utils/storage';
import { useSettings } from '../contexts/SettingsContext';
import { toast } from 'sonner';

const HomePage = () => {
  const { weightUnit, toggleWeightUnit } = useSettings();
  const [currentWorkout, setCurrentWorkout] = useState(null);
  const [workoutData, setWorkoutData] = useState([]);
  const [restTimer, setRestTimer] = useState(null);
  const [prCelebration, setPrCelebration] = useState(null);

  useEffect(() => {
    loadTodaysWorkout();
  }, []);

  const loadTodaysWorkout = () => {
    const workouts = getWorkouts();
    const lastWorkout = workouts[0];
    const nextType = lastWorkout ? getNextWorkoutType(lastWorkout.type) : 'A';
    const workout = getWorkoutByType(nextType);
    
    setCurrentWorkout(workout);
    setWorkoutData(workout.exercises.map(ex => ({
      ...ex,
      userNotes: '',
      sets: []
    })));
  };

  const handleSetComplete = (exercise, set, levelUp) => {
    if (levelUp) {
      const suggestedWeight = set.weight + (weightUnit === 'lbs' ? 5 : 2.5);
      toast.success(`Level Up! Try ${suggestedWeight}${weightUnit} next time!`, {
        duration: 5000
      });
    }

    // Check for PR
    const prs = getPersonalRecords();
    const exerciseKey = exercise.id;
    const currentPR = prs[exerciseKey];

    if (!currentPR || set.weight > currentPR.weight) {
      const wasNew = updatePersonalRecord(exercise.name, set.weight, set.reps);
      if (wasNew) {
        setPrCelebration({
          exercise: exercise.name,
          newWeight: set.weight,
          oldWeight: currentPR?.weight
        });
      }
    }
  };

  const handleWeightChange = (exercise, sets) => {
    // Update workout data
    const updated = workoutData.map(ex => 
      ex.id === exercise.id ? { ...ex, sets } : ex
    );
    setWorkoutData(updated);
  };

  const handleNotesChange = (exercise, notes) => {
    const updated = workoutData.map(ex => 
      ex.id === exercise.id ? { ...ex, userNotes: notes } : ex
    );
    setWorkoutData(updated);
  };

  const handleSaveWorkout = () => {
    const workout = {
      type: currentWorkout.type,
      name: currentWorkout.name,
      focus: currentWorkout.focus,
      date: new Date().toISOString(),
      exercises: workoutData.map(ex => ({
        id: ex.id,
        name: ex.name,
        repScheme: ex.repScheme,
        sets: ex.sets || [],
        notes: ex.userNotes || ''
      }))
    };

    saveWorkout(workout);
    toast.success('Workout saved! Great job! 💪', {
      description: `${currentWorkout.name} completed`
    });

    // Reset for next workout
    loadTodaysWorkout();
  };

  const getStreak = () => {
    const workouts = getWorkouts();
    if (workouts.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < workouts.length; i++) {
      const workoutDate = new Date(workouts[i].date);
      workoutDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today - workoutDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 1 + i) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const getDaysSinceLastWorkout = () => {
    const workouts = getWorkouts();
    if (workouts.length === 0) return null;

    const lastWorkout = new Date(workouts[0].date);
    const today = new Date();
    const daysDiff = Math.floor((today - lastWorkout) / (1000 * 60 * 60 * 24));
    
    return daysDiff;
  };

  const streak = getStreak();
  const daysSince = getDaysSinceLastWorkout();

  if (!currentWorkout) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-b from-card to-background border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gradient-primary">
                Gym Strength Programme
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleWeightUnit}
              className="font-semibold"
            >
              {weightUnit}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Streak</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{streak} days</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Last Trained</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {daysSince === null ? 'Never' : daysSince === 0 ? 'Today' : `${daysSince}d ago`}
              </div>
            </div>
          </div>

          {/* Rest Day Alert */}
          {daysSince !== null && daysSince >= 2 && (
            <div className={`p-4 rounded-lg border ${
              daysSince >= 4 
                ? 'bg-destructive/10 border-destructive/50 text-destructive'
                : 'bg-primary/10 border-primary/50 text-primary'
            }`}>
              <div className="font-semibold">
                {daysSince >= 4 ? '⚠️ Time to get back!' : '💪 Rest day over soon'}
              </div>
              <div className="text-sm opacity-90 mt-1">
                {daysSince >= 4 
                  ? `It's been ${daysSince} days. Let's crush this workout!`
                  : 'Muscles recovered. Ready for the next session!'}
              </div>
            </div>
          )}

          {/* Workout Info */}
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">
                  {currentWorkout.name}
                </h2>
                <Badge className="bg-primary/20 text-primary border-primary/50">
                  {currentWorkout.focus}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadTodaysWorkout}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Exercises */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {workoutData.map((exercise, index) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            onSetComplete={handleSetComplete}
            onWeightChange={handleWeightChange}
            onNotesChange={handleNotesChange}
            onRestTimer={(duration) => setRestTimer(duration)}
            isFirst={index === 0}
          />
        ))}

        {/* Save Workout Button */}
        <Button
          onClick={handleSaveWorkout}
          size="lg"
          className="w-full h-14 text-lg font-semibold glow-primary"
        >
          <Save className="w-5 h-5 mr-2" />
          Save Workout
        </Button>
      </div>

      {/* Rest Timer */}
      {restTimer && (
        <RestTimer
          duration={restTimer}
          onComplete={() => {
            setRestTimer(null);
            toast.success('Rest period complete! Ready for next set!');
          }}
          onClose={() => setRestTimer(null)}
        />
      )}

      {/* PR Celebration */}
      {prCelebration && (
        <PRCelebration
          {...prCelebration}
          onClose={() => setPrCelebration(null)}
        />
      )}
    </div>
  );
};

export default HomePage;