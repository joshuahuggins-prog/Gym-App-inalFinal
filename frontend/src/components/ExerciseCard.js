import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Video, Dumbbell, RefreshCw, Edit2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { calculateRPTWeights, shouldLevelUp, EXERCISE_ALTERNATIVES } from '../data/workoutData';
import { useSettings } from '../contexts/SettingsContext';
import { getVideoLinks, updateVideoLink, getProgressionSettings } from '../utils/storage';
import WarmupCalculator from './WarmupCalculator';
import PlateCalculator from './PlateCalculator';

const ExerciseCard = ({ exercise, onSetComplete, onWeightChange, onNotesChange, onRestTimer, isFirst, lastWorkoutData }) => {
  const { weightUnit } = useSettings();
  const [expanded, setExpanded] = useState(true);
  const [sets, setSets] = useState(
    Array(exercise.sets).fill(null).map((_, index) => ({
      setNumber: index + 1,
      weight: 0,
      reps: 0,
      completed: false,
      goalReps: exercise.goalReps[index] || exercise.goalReps[0]
    }))
  );
  const [notes, setNotes] = useState(exercise.notes || '');
  const [showWarmup, setShowWarmup] = useState(false);
  const [showPlates, setShowPlates] = useState(false);
  const [selectedWeight, setSelectedWeight] = useState(0);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showVideoEdit, setShowVideoEdit] = useState(false);
  const [videoLink, setVideoLink] = useState('');
  
  // Get suggested weights from last workout
  const getSuggestedWeight = (setIndex) => {
    if (!lastWorkoutData || !lastWorkoutData.sets || !lastWorkoutData.sets[setIndex]) {
      return null;
    }
    return lastWorkoutData.sets[setIndex].weight;
  };

  useEffect(() => {
    const links = getVideoLinks();
    const key = exercise.id;
    setVideoLink(links[key] || '');
  }, [exercise.id]);

  const handleSetComplete = (setIndex) => {
    const newSets = [...sets];
    const currentSet = newSets[setIndex];
    
    if (!currentSet.completed) {
      currentSet.completed = true;
      
      // Check for level up on first set
      if (setIndex === 0 && shouldLevelUp(currentSet.reps, currentSet.goalReps)) {
        onSetComplete?.(exercise, currentSet, true);
      } else {
        onSetComplete?.(exercise, currentSet, false);
      }
      
      // Start rest timer
      if (setIndex < sets.length - 1) {
        onRestTimer?.(exercise.restTime);
      }
    } else {
      currentSet.completed = false;
    }
    
    setSets(newSets);
  };

  const handleWeightChange = (setIndex, value) => {
    const newSets = [...sets];
    newSets[setIndex].weight = parseFloat(value) || 0;
    
    // Auto-calculate RPT weights for subsequent sets
    if (exercise.repScheme === 'RPT' && setIndex === 0) {
      const progressionSettings = getProgressionSettings();
      for (let i = 1; i < newSets.length; i++) {
        newSets[i].weight = calculateRPTWeights(newSets[0].weight, i + 1, progressionSettings);
      }
    }
    
    setSets(newSets);
    onWeightChange?.(exercise, newSets);
  };

  const handleRepsChange = (setIndex, value) => {
    const newSets = [...sets];
    newSets[setIndex].reps = parseInt(value) || 0;
    setSets(newSets);
  };

  const handleNotesBlur = () => {
    onNotesChange?.(exercise, notes);
  };

  const handleVideoUpdate = () => {
    updateVideoLink(exercise.id, videoLink);
    setShowVideoEdit(false);
  };

  const completedSets = sets.filter(s => s.completed).length;
  const levelUp = sets[0]?.completed && shouldLevelUp(sets[0].reps, sets[0].goalReps);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      {/* Header */}
      <div
        className="p-4 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-foreground">{exercise.name}</h3>
              {levelUp && (
                <Badge className="bg-gold text-gold-foreground font-semibold animate-bounce-slow">
                  Level Up! +5{weightUnit}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline" className="text-primary border-primary/50">
                {exercise.repScheme}
              </Badge>
              <span className="text-muted-foreground">
                {completedSets}/{exercise.sets} sets
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                {exercise.restTime}s rest
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {videoLink && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(videoLink, '_blank');
                }}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <Video className="w-5 h-5 text-primary" />
              </button>
            )}
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 animate-fadeIn">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {isFirst && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowWarmup(true)}
                disabled={!sets[0]?.weight}
              >
                <Dumbbell className="w-4 h-4 mr-2" />
                Warmup
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedWeight(sets[0]?.weight || 0);
                setShowPlates(true);
              }}
              disabled={!sets[0]?.weight}
            >
              Plates
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAlternatives(!showAlternatives)}
            >
              Alternatives
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVideoEdit(!showVideoEdit)}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Video
            </Button>
          </div>

          {/* Video Edit */}
          {showVideoEdit && (
            <div className="p-3 bg-muted/50 rounded-lg border border-border space-y-2">
              <label className="text-sm font-medium text-foreground">Form Check Video URL</label>
              <div className="flex gap-2">
                <Input
                  value={videoLink}
                  onChange={(e) => setVideoLink(e.target.value)}
                  placeholder="https://youtube.com/..."
                  className="flex-1"
                />
                <Button size="sm" onClick={handleVideoUpdate}>
                  Save
                </Button>
              </div>
            </div>
          )}

          {/* Alternatives */}
          {showAlternatives && EXERCISE_ALTERNATIVES[exercise.id] && (
            <div className="p-3 bg-muted/50 rounded-lg border border-border">
              <div className="text-sm font-medium text-foreground mb-2">Alternative Exercises:</div>
              <div className="flex flex-wrap gap-2">
                {EXERCISE_ALTERNATIVES[exercise.id].map((alt, index) => (
                  <Badge key={index} variant="secondary">
                    {alt}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Sets - Simple Box Layout */}
          <div className="grid grid-cols-1 gap-3">
            {sets.map((set, index) => {
              const suggestedWeight = getSuggestedWeight(index);
              
              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg border transition-all duration-200 ${
                    set.completed
                      ? 'bg-primary/10 border-primary/50'
                      : 'bg-muted/30 border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Set Number */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">{index + 1}</span>
                    </div>

                    {/* Weight Input */}
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground block mb-1">
                        Weight ({weightUnit})
                      </label>
                      <Input
                        type="number"
                        value={set.weight || ''}
                        onChange={(e) => handleWeightChange(index, e.target.value)}
                        placeholder={suggestedWeight ? suggestedWeight.toString() : '0'}
                        className="h-12 text-center text-lg font-semibold"
                        disabled={set.completed}
                        step="2.5"
                      />
                      {suggestedWeight && !set.weight && (
                        <div className="text-xs text-muted-foreground mt-1 text-center">
                          Last: {suggestedWeight}{weightUnit}
                        </div>
                      )}
                    </div>

                    {/* Reps Input */}
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground block mb-1">
                        Reps
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={set.reps || ''}
                          onChange={(e) => handleRepsChange(index, e.target.value)}
                          placeholder={set.goalReps.toString()}
                          className="h-12 text-center text-lg font-semibold flex-1"
                          disabled={set.completed}
                        />
                        <span className="text-muted-foreground">/ {set.goalReps}</span>
                      </div>
                    </div>

                    {/* Complete Button */}
                    <button
                      onClick={() => handleSetComplete(index)}
                      className="flex-shrink-0 transition-transform hover:scale-110"
                      disabled={!set.weight || !set.reps}
                    >
                      {set.completed ? (
                        <CheckCircle2 className="w-10 h-10 text-primary" />
                      ) : (
                        <Circle className="w-10 h-10 text-muted-foreground" />
                      )}
                    </button>
                  </div>

                  {exercise.repScheme === 'RPT' && index === 0 && set.weight > 0 && (() => {
                    const progressionSettings = getProgressionSettings();
                    const set2Weight = calculateRPTWeights(set.weight, 2, progressionSettings);
                    const set3Weight = calculateRPTWeights(set.weight, 3, progressionSettings);
                    return (
                      <div className="mt-2 text-xs text-muted-foreground text-center">
                        Auto: Set 2 = {set2Weight}{weightUnit}, Set 3 = {set3Weight}{weightUnit}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Notes
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="How did it feel? Any form notes?"
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Exercise Description */}
          <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg border border-border">
            {exercise.notes}
          </div>
        </div>
      )}

      {/* Modals */}
      {showWarmup && (
        <WarmupCalculator
          exercise={exercise.name}
          topSetWeight={sets[0]?.weight || 0}
          open={showWarmup}
          onClose={() => setShowWarmup(false)}
        />
      )}

      {showPlates && (
        <PlateCalculator
          weight={selectedWeight}
          open={showPlates}
          onClose={() => setShowPlates(false)}
        />
      )}
    </div>
  );
};

export default ExerciseCard;