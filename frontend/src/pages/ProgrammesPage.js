import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, Save, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { getProgrammes, saveProgramme, deleteProgramme, getExercises } from '../utils/storage';
import { toast } from 'sonner';

const ProgrammesPage = () => {
  const [programmes, setProgrammes] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [expandedProgramme, setExpandedProgramme] = useState(null);
  const [editingProgramme, setEditingProgramme] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setProgrammes(getProgrammes());
    setExercises(getExercises());
  };

  const handleCreateProgramme = () => {
    setEditingProgramme({
      type: '',
      name: '',
      focus: '',
      exercises: []
    });
    setShowAddDialog(true);
  };

  const handleEditProgramme = (programme) => {
    setEditingProgramme({ ...programme });
    setShowAddDialog(true);
  };

  const handleSaveProgramme = () => {
    if (!editingProgramme.type || !editingProgramme.name) {
      toast.error('Please fill in Type and Name');
      return;
    }

    saveProgramme(editingProgramme);
    loadData();
    setShowAddDialog(false);
    setEditingProgramme(null);
    toast.success('Programme saved!');
  };

  const handleDeleteProgramme = (type) => {
    if (window.confirm(`Delete ${type}? This cannot be undone.`)) {
      deleteProgramme(type);
      loadData();
      toast.success('Programme deleted');
    }
  };

  const handleAddExerciseToProgramme = (exerciseId) => {
    const exercise = exercises.find(e => e.id === exerciseId);
    if (!exercise) return;

    const newExercise = {
      ...exercise,
      assignedTo: undefined // Remove assignedTo from programme exercise
    };

    setEditingProgramme({
      ...editingProgramme,
      exercises: [...editingProgramme.exercises, newExercise]
    });
  };

  const handleRemoveExerciseFromProgramme = (index) => {
    const updated = [...editingProgramme.exercises];
    updated.splice(index, 1);
    setEditingProgramme({
      ...editingProgramme,
      exercises: updated
    });
  };

  const availableExercises = exercises.filter(
    ex => !editingProgramme?.exercises.find(e => e.id === ex.id)
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-card to-background border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">
                Programmes
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage your workout programmes
              </p>
            </div>
            <Button onClick={handleCreateProgramme}>
              <Plus className="w-4 h-4 mr-2" />
              New
            </Button>
          </div>
        </div>
      </div>

      {/* Programmes List */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {programmes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-lg text-muted-foreground mb-2">
              No programmes yet
            </p>
            <Button onClick={handleCreateProgramme}>
              Create your first programme
            </Button>
          </div>
        ) : (
          programmes.map((programme) => {
            const isExpanded = expandedProgramme === programme.type;

            return (
              <div
                key={programme.type}
                className="bg-card border border-border rounded-xl overflow-hidden shadow-lg"
              >
                {/* Programme Header */}
                <div
                  className="p-4 cursor-pointer select-none"
                  onClick={() => setExpandedProgramme(isExpanded ? null : programme.type)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-foreground mb-1">
                        {programme.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary/20 text-primary border-primary/50">
                          {programme.focus}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {programme.exercises.length} exercises
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditProgramme(programme);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProgramme(programme.type);
                        }}
                        className="text-destructive hover:text-destructive"
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
                </div>

                {/* Expanded Exercises */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2 animate-fadeIn">
                    {programme.exercises.map((exercise, index) => (
                      <div
                        key={index}
                        className="p-3 bg-muted/30 rounded-lg border border-border"
                      >
                        <div className="font-semibold text-foreground mb-1">
                          {exercise.name}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>Sets: {exercise.sets} • Reps: {exercise.goalReps.join(', ')}</div>
                          <div>Rest: {exercise.restTime}s • Scheme: {exercise.repScheme}</div>
                          {exercise.notes && (
                            <div className="text-xs mt-2 p-2 bg-card rounded border border-border">
                              {exercise.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Programme Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProgramme?.type && programmes.find(p => p.type === editingProgramme.type)
                ? 'Edit Programme'
                : 'Create New Programme'}
            </DialogTitle>
          </DialogHeader>

          {editingProgramme && (
            <div className="space-y-4 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Type (A, B, C, etc.)
                  </label>
                  <Input
                    value={editingProgramme.type}
                    onChange={(e) => setEditingProgramme({ ...editingProgramme, type: e.target.value })}
                    placeholder="A"
                    disabled={programmes.find(p => p.type === editingProgramme.type)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Name
                  </label>
                  <Input
                    value={editingProgramme.name}
                    onChange={(e) => setEditingProgramme({ ...editingProgramme, name: e.target.value })}
                    placeholder="Workout A"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Focus
                </label>
                <Input
                  value={editingProgramme.focus}
                  onChange={(e) => setEditingProgramme({ ...editingProgramme, focus: e.target.value })}
                  placeholder="Chest Emphasis"
                />
              </div>

              {/* Exercises in Programme */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Exercises ({editingProgramme.exercises.length})
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {editingProgramme.exercises.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No exercises added yet
                    </p>
                  ) : (
                    editingProgramme.exercises.map((exercise, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-foreground">{exercise.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {exercise.sets} sets • {exercise.repScheme}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveExerciseFromProgramme(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Add Exercise */}
              {availableExercises.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Add Exercise
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availableExercises.map((exercise) => (
                      <button
                        key={exercise.id}
                        onClick={() => handleAddExerciseToProgramme(exercise.id)}
                        className="w-full flex items-center justify-between p-3 bg-card rounded-lg border border-border hover:border-primary/50 transition-colors text-left"
                      >
                        <div>
                          <div className="font-semibold text-foreground">{exercise.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {exercise.sets} sets • {exercise.repScheme}
                          </div>
                        </div>
                        <Plus className="w-4 h-4 text-primary" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowAddDialog(false);
                setEditingProgramme(null);
              }}
            >
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSaveProgramme}>
              <Save className="w-4 h-4 mr-2" />
              Save Programme
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProgrammesPage;
