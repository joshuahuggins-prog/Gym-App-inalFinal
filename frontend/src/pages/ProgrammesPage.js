// src/pages/ProgrammesPage.js
import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  X,
} from "lucide-react";

import AppHeader from "../components/AppHeader";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";

import {
  getProgrammes,
  saveProgramme,
  deleteProgramme,
  getExercises,
} from "../utils/storage";

import { toast } from "sonner";

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
    setProgrammes(getProgrammes() || []);
    setExercises(getExercises() || []);
  };

  const handleCreateProgramme = () => {
    setEditingProgramme({
      type: "",
      name: "",
      focus: "",
      exercises: [],
    });
    setShowAddDialog(true);
  };

  const handleEditProgramme = (programme) => {
    setEditingProgramme({ ...programme });
    setShowAddDialog(true);
  };

  const handleSaveProgramme = () => {
    if (!editingProgramme?.type || !editingProgramme?.name) {
      toast.error("Please fill in Type and Name");
      return;
    }

    saveProgramme(editingProgramme);
    loadData();
    setShowAddDialog(false);
    setEditingProgramme(null);
    toast.success("Programme saved!");
  };

  const handleDeleteProgramme = (type) => {
    if (window.confirm(`Delete ${type}? This cannot be undone.`)) {
      deleteProgramme(type);
      loadData();
      toast.success("Programme deleted");
    }
  };

  const handleAddExerciseToProgramme = (exerciseId) => {
    const exercise = (exercises || []).find((e) => e.id === exerciseId);
    if (!exercise) return;

    const newExercise = {
      ...exercise,
      assignedTo: undefined, // Remove assignedTo from programme exercise
    };

    setEditingProgramme({
      ...editingProgramme,
      exercises: [...(editingProgramme.exercises || []), newExercise],
    });
  };

  const handleRemoveExerciseFromProgramme = (index) => {
    const updated = [...(editingProgramme.exercises || [])];
    updated.splice(index, 1);
    setEditingProgramme({
      ...editingProgramme,
      exercises: updated,
    });
  };

  const availableExercises = useMemo(() => {
    const currentIds = new Set(
      (editingProgramme?.exercises || []).map((e) => e?.id).filter(Boolean)
    );

    return (exercises || []).filter((ex) => !currentIds.has(ex?.id));
  }, [exercises, editingProgramme]);

  // ✅ icon path consistent with your other pages (you can change later if needed)
  const appLogoSrc = `${process.env.PUBLIC_URL}/icons/icon-overlay-white-32-v1.png`;

  return (
    <AppHeader
      title="Programmes"
      subtitle="Manage your workout programmes"
      rightIconSrc={appLogoSrc}
      rightIconAlt="App"
      actions={
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {programmes.length} programme{programmes.length === 1 ? "" : "s"}
          </div>

          <Button onClick={handleCreateProgramme} className="shrink-0 gap-2">
            <Plus className="w-4 h-4" />
            New Programme
          </Button>
        </div>
      }
    >
      {/* Body */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-4">
        {programmes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-lg text-muted-foreground mb-2">No programmes yet</p>
            <Button onClick={handleCreateProgramme}>Create your first programme</Button>
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
                  onClick={() =>
                    setExpandedProgramme(isExpanded ? null : programme.type)
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-foreground mb-1 truncate">
                        {programme.name}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-primary/20 text-primary border-primary/50">
                          {programme.focus}
                        </Badge>

                        <span className="text-sm text-muted-foreground">
                          {(programme.exercises || []).length} exercises
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditProgramme(programme);
                        }}
                        title="Edit programme"
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
                        title="Delete programme"
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
                    {(programme.exercises || []).map((exercise, index) => (
                      <div
                        key={index}
                        className="p-3 bg-muted/30 rounded-lg border border-border"
                      >
                        <div className="font-semibold text-foreground mb-1">
                          {exercise.name}
                        </div>

                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>
                            Sets: {exercise.sets} • Reps:{" "}
                            {(exercise.goalReps || []).join(", ")}
                          </div>
                          <div>
                            Rest: {exercise.restTime}s • Scheme: {exercise.repScheme}
                          </div>

                          {exercise.notes ? (
                            <div className="text-xs mt-2 p-2 bg-card rounded border border-border">
                              {exercise.notes}
                            </div>
                          ) : null}
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
      <Dialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) setEditingProgramme(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProgramme?.type &&
              programmes.find((p) => p.type === editingProgramme.type)
                ? "Edit Programme"
                : "Create New Programme"}
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
                    onChange={(e) =>
                      setEditingProgramme({
                        ...editingProgramme,
                        type: e.target.value,
                      })
                    }
                    placeholder="A"
                    disabled={!!programmes.find((p) => p.type === editingProgramme.type)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Name
                  </label>
                  <Input
                    value={editingProgramme.name}
                    onChange={(e) =>
                      setEditingProgramme({
                        ...editingProgramme,
                        name: e.target.value,
                      })
                    }
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
                  onChange={(e) =>
                    setEditingProgramme({
                      ...editingProgramme,
                      focus: e.target.value,
                    })
                  }
                  placeholder="Chest Emphasis"
                />
              </div>

              {/* Exercises in Programme */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Exercises ({(editingProgramme.exercises || []).length})
                </label>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(editingProgramme.exercises || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No exercises added yet
                    </p>
                  ) : (
                    (editingProgramme.exercises || []).map((exercise, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg border border-border"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground truncate">
                            {exercise.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {exercise.sets} sets • {exercise.repScheme}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveExerciseFromProgramme(index)}
                          className="text-destructive hover:text-destructive"
                          title="Remove exercise"
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
                        className="w-full flex items-center justify-between gap-3 p-3 bg-card rounded-lg border border-border hover:border-primary/50 transition-colors text-left"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground truncate">
                            {exercise.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {exercise.sets} sets • {exercise.repScheme}
                          </div>
                        </div>

                        <Plus className="w-4 h-4 text-primary shrink-0" />
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
    </AppHeader>
  );
};

export default ProgrammesPage;