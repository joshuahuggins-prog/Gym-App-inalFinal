import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Save, X, Video } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { getExercises, saveExercise, deleteExercise, getProgrammes, getVideoLinks, updateVideoLink } from '../utils/storage';
import { EXERCISE_ALTERNATIVES } from '../data/workoutData';
import { toast } from 'sonner';

const ExercisesPage = () => {
  const [exercises, setExercises] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProgramme, setFilterProgramme] = useState('all');
  const [editingExercise, setEditingExercise] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setExercises(getExercises());
    setProgrammes(getProgrammes());
  };

  const handleCreateExercise = () => {
    setEditingExercise({
      id: `exercise_${Date.now()}`,
      name: '',
      sets: 3,
      repScheme: 'RPT',
      goalReps: [8, 10, 12],
      restTime: 120,
      notes: '',
      assignedTo: [],
      videoUrl: ''
    });
    setShowEditDialog(true);
  };

  const handleEditExercise = (exercise) => {
    const videoLinks = getVideoLinks();
    const videoUrl = videoLinks[exercise.id] || '';
    setEditingExercise({ ...exercise, videoUrl });
    setShowEditDialog(true);
  };

  const handleSaveExercise = () => {
    if (!editingExercise.name) {
      toast.error('Please enter exercise name');
      return;
    }

    const { videoUrl, ...exerciseData } = editingExercise;
    saveExercise(exerciseData);
    
    if (videoUrl) {
      updateVideoLink(exerciseData.id, videoUrl);
    }

    loadData();
    setShowEditDialog(false);
    setEditingExercise(null);
    toast.success('Exercise saved!');
  };

  const handleDeleteExercise = (id, name) => {
    if (window.confirm(`Delete "${name}"? This will remove it from all programmes.`)) {
      deleteExercise(id);
      loadData();
      toast.success('Exercise deleted');
    }
  };

  const handleToggleProgramme = (programmeType) => {
    const assignedTo = editingExercise.assignedTo || [];
    const isAssigned = assignedTo.includes(programmeType);

    setEditingExercise({
      ...editingExercise,
      assignedTo: isAssigned
        ? assignedTo.filter(p => p !== programmeType)
        : [...assignedTo, programmeType]
    });
  };

  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProgramme = filterProgramme === 'all' || 
      (ex.assignedTo && ex.assignedTo.includes(filterProgramme));
    return matchesSearch && matchesProgramme;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-card to-background border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gradient-primary mb-2">
                Exercise Library
              </h1>
              <p className="text-sm text-muted-foreground">
                {exercises.length} total exercises
              </p>
            </div>
            <Button onClick={handleCreateExercise}>
              <Plus className="w-4 h-4 mr-2" />
              New Exercise
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search exercises..."
                className="pl-10"
              />
            </div>
            <Select value={filterProgramme} onValueChange={setFilterProgramme}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by programme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programmes</SelectItem>
                {programmes.map(prog => (
                  <SelectItem key={prog.type} value={prog.type}>
                    {prog.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Exercises Grid */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {filteredExercises.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-2">🏋️</div>
            <p className="text-lg text-muted-foreground mb-2">
              {searchTerm || filterProgramme !== 'all' ? 'No exercises found' : 'No exercises yet'}
            </p>
            {!searchTerm && filterProgramme === 'all' && (
              <Button onClick={handleCreateExercise}>
                Create your first exercise
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredExercises.map((exercise) => (
              <div
                key={exercise.id}
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {exercise.name}
                    </h3>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {exercise.assignedTo && exercise.assignedTo.length > 0 ? (
                        exercise.assignedTo.map(prog => (
                          <Badge key={prog} variant="outline" className="text-xs">
                            {programmes.find(p => p.type === prog)?.name || prog}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Unassigned
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditExercise(exercise)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteExercise(exercise.id, exercise.name)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Sets:</span>
                    <span className="text-foreground font-semibold">{exercise.sets}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reps:</span>
                    <span className="text-foreground font-semibold">{exercise.goalReps.join(', ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rest:</span>
                    <span className="text-foreground font-semibold">{exercise.restTime}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Scheme:</span>
                    <Badge variant="secondary" className="text-xs">{exercise.repScheme}</Badge>
                  </div>
                </div>

                {exercise.notes && (
                  <div className="mt-3 text-xs text-muted-foreground p-2 bg-muted/30 rounded border border-border">
                    {exercise.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Exercise Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {exercises.find(e => e.id === editingExercise?.id)
                ? 'Edit Exercise'
                : 'Create New Exercise'}
            </DialogTitle>
          </DialogHeader>

          {editingExercise && (
            <div className="space-y-4 py-4">
              {/* Name */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Exercise Name *
                </label>
                <Input
                  value={editingExercise.name}
                  onChange={(e) => setEditingExercise({ ...editingExercise, name: e.target.value })}
                  placeholder="Weighted Dips"
                />
              </div>

              {/* Sets & Rep Scheme */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Number of Sets
                  </label>
                  <Input
                    type="number"
                    value={editingExercise.sets}
                    onChange={(e) => setEditingExercise({ ...editingExercise, sets: parseInt(e.target.value) || 3 })}
                    min="1"
                    max="10"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Rep Scheme
                  </label>
                  <Select
                    value={editingExercise.repScheme}
                    onValueChange={(value) => setEditingExercise({ ...editingExercise, repScheme: value })}
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

              {/* Goal Reps */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Goal Reps (comma separated)
                </label>
                <Input
                  value={editingExercise.goalReps.join(', ')}
                  onChange={(e) => {
                    const reps = e.target.value.split(',').map(r => parseInt(r.trim()) || 0).filter(r => r > 0);
                    setEditingExercise({ ...editingExercise, goalReps: reps.length > 0 ? reps : [8] });
                  }}
                  placeholder="8, 10, 12"
                />
              </div>

              {/* Rest Time */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Rest Time (seconds)
                </label>
                <Input
                  type="number"
                  value={editingExercise.restTime}
                  onChange={(e) => setEditingExercise({ ...editingExercise, restTime: parseInt(e.target.value) || 120 })}
                  min="15"
                  max="600"
                />
              </div>

              {/* Video URL */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Form Check Video URL
                </label>
                <div className="flex gap-2">
                  <Input
                    value={editingExercise.videoUrl || ''}
                    onChange={(e) => setEditingExercise({ ...editingExercise, videoUrl: e.target.value })}
                    placeholder="https://youtube.com/..."
                  />
                  {editingExercise.videoUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(editingExercise.videoUrl, '_blank')}
                    >
                      <Video className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Notes / Instructions
                </label>
                <Textarea
                  value={editingExercise.notes}
                  onChange={(e) => setEditingExercise({ ...editingExercise, notes: e.target.value })}
                  placeholder="Exercise cues, form tips, etc."
                  className="min-h-[80px] resize-none"
                />
              </div>

              {/* Assign to Programmes */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Assigned to Programmes
                </label>
                <div className="flex flex-wrap gap-2">
                  {programmes.map(prog => {
                    const isAssigned = editingExercise.assignedTo && editingExercise.assignedTo.includes(prog.type);
                    return (
                      <button
                        key={prog.type}
                        onClick={() => handleToggleProgramme(prog.type)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          isAssigned
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {prog.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowEditDialog(false);
                setEditingExercise(null);
              }}
            >
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSaveExercise}>
              <Save className="w-4 h-4 mr-2" />
              Save Exercise
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExercisesPage;