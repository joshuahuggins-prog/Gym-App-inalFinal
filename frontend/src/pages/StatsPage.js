import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Dumbbell, Calendar as CalendarIcon, Weight, Plus, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { getWorkouts, getPersonalRecords, getBodyWeights, addBodyWeight, deleteBodyWeight } from '../utils/storage';
import { useSettings } from '../contexts/SettingsContext';
import { toast } from 'sonner';

const StatsPage = () => {
  const { weightUnit } = useSettings();
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    streak: 0,
    totalVolume: 0,
    monthWorkouts: 0
  });
  const [prs, setPrs] = useState([]);
  const [bodyWeights, setBodyWeights] = useState([]);
  const [showBodyWeightDialog, setShowBodyWeightDialog] = useState(false);
  const [newBodyWeight, setNewBodyWeight] = useState('');
  const [bodyWeightNote, setBodyWeightNote] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = () => {
    const workouts = getWorkouts();
    const prData = getPersonalRecords();
    const weights = getBodyWeights();

    // Total workouts
    const totalWorkouts = workouts.length;

    // Streak
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

    // Total volume
    let totalVolume = 0;
    workouts.forEach(workout => {
      workout.exercises.forEach(exercise => {
        exercise.sets.forEach(set => {
          totalVolume += (set.weight || 0) * (set.reps || 0);
        });
      });
    });

    // This month's workouts
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const monthWorkouts = workouts.filter(w => {
      const date = new Date(w.date);
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    }).length;

    setStats({ totalWorkouts, streak, totalVolume, monthWorkouts });

    // Personal Records
    const prArray = Object.values(prData).sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
    setPrs(prArray.slice(0, 10));

    // Body weights
    setBodyWeights(weights);
  };

  const handleAddBodyWeight = () => {
    const weight = parseFloat(newBodyWeight);
    if (!weight || weight <= 0) {
      toast.error('Please enter a valid weight');
      return;
    }

    addBodyWeight(weight, bodyWeightNote);
    setNewBodyWeight('');
    setBodyWeightNote('');
    setShowBodyWeightDialog(false);
    loadStats();
    toast.success('Body weight logged!');
  };

  const handleDeleteBodyWeight = (id) => {
    deleteBodyWeight(id);
    loadStats();
    toast.success('Entry deleted');
  };

  const handleExport = () => {
    const csv = exportToCSV();
    if (!csv) {
      toast.error('No workout data to export');
      return;
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gym-strength-programme-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Workout data exported!');
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Please select a file');
      return;
    }

    try {
      const text = await importFile.text();
      const result = importFromCSV(text);

      if (result.success) {
        toast.success(`Imported ${result.imported} workouts!`);
        if (result.errors && result.errors.length > 0) {
          setImportErrors(result.errors);
        } else {
          setShowImportDialog(false);
          setImportFile(null);
          loadStats();
        }
      } else {
        toast.error(result.error);
        setImportErrors([result.error]);
      }
    } catch (error) {
      toast.error('Failed to read file');
    }
  };

  // Calendar Heatmap (12 weeks)
  const getCalendarData = () => {
    const workouts = getWorkouts();
    const weeks = [];
    const today = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (i * 7) - today.getDay());
      
      const week = [];
      for (let j = 0; j < 7; j++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + j);
        date.setHours(0, 0, 0, 0);
        
        const count = workouts.filter(w => {
          const wDate = new Date(w.date);
          wDate.setHours(0, 0, 0, 0);
          return wDate.getTime() === date.getTime();
        }).length;
        
        week.push({ date, count });
      }
      weeks.push(week);
    }
    
    return weeks;
  };

  const calendarData = getCalendarData();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-card to-background border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gradient-primary mb-2">
            Stats & Records
          </h1>
          <p className="text-sm text-muted-foreground">
            Track your progress and achievements
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Dumbbell className="w-5 h-5" />}
            label="Total Workouts"
            value={stats.totalWorkouts}
            color="primary"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Current Streak"
            value={`${stats.streak} days`}
            color="primary"
          />
          <StatCard
            icon={<Trophy className="w-5 h-5" />}
            label="Total Volume"
            value={`${Math.round(stats.totalVolume).toLocaleString()} ${weightUnit}`}
            color="gold"
          />
          <StatCard
            icon={<CalendarIcon className="w-5 h-5" />}
            label="This Month"
            value={`${stats.monthWorkouts} workouts`}
            color="success"
          />
        </div>

        {/* Calendar Heatmap */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-lg font-bold text-foreground mb-4">Training Frequency (12 weeks)</h2>
          <div className="space-y-1">
            {calendarData.map((week, weekIndex) => (
              <div key={weekIndex} className="flex gap-1">
                {week.map((day, dayIndex) => {
                  const intensity = day.count === 0 ? 'bg-muted' : 
                    day.count === 1 ? 'bg-primary/30' :
                    day.count === 2 ? 'bg-primary/60' :
                    'bg-primary';
                  
                  return (
                    <div
                      key={dayIndex}
                      className={`w-6 h-6 rounded ${intensity} border border-border transition-all hover:scale-110`}
                      title={`${day.date.toLocaleDateString()}: ${day.count} workout${day.count !== 1 ? 's' : ''}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
            <span>Less</span>
            <div className="w-4 h-4 rounded bg-muted border border-border" />
            <div className="w-4 h-4 rounded bg-primary/30 border border-border" />
            <div className="w-4 h-4 rounded bg-primary/60 border border-border" />
            <div className="w-4 h-4 rounded bg-primary border border-border" />
            <span>More</span>
          </div>
        </div>

        {/* Recent PRs */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-5 h-5 text-gold" />
              Recent Personal Records
            </h2>
          </div>
          
          {prs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No PRs yet. Keep training!
            </p>
          ) : (
            <div className="space-y-2">
              {prs.map((pr, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                >
                  <div>
                    <div className="font-semibold text-foreground">{pr.exerciseName}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(pr.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gold">
                      {pr.weight} {weightUnit}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {pr.reps} reps
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Body Weight Tracking */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Weight className="w-5 h-5 text-primary" />
              Body Weight
            </h2>
            <Button
              size="sm"
              onClick={() => setShowBodyWeightDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>

          {bodyWeights.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No body weight entries yet
            </p>
          ) : (
            <div className="space-y-2">
              {bodyWeights.slice(0, 5).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                >
                  <div>
                    <div className="font-semibold text-foreground">
                      {entry.weight} {weightUnit}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(entry.date).toLocaleDateString()}
                    </div>
                    {entry.note && (
                      <div className="text-xs text-muted-foreground mt-1">{entry.note}</div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteBodyWeight(entry.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Export/Import */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h2 className="text-lg font-bold text-foreground">Data Management</h2>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleExport}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowImportDialog(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Body Weight Dialog */}
      <Dialog open={showBodyWeightDialog} onOpenChange={setShowBodyWeightDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Body Weight</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Weight ({weightUnit})
              </label>
              <Input
                type="number"
                value={newBodyWeight}
                onChange={(e) => setNewBodyWeight(e.target.value)}
                placeholder="0"
                step="0.1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Note (optional)
              </label>
              <Textarea
                value={bodyWeightNote}
                onChange={(e) => setBodyWeightNote(e.target.value)}
                placeholder="Morning weight, post-workout, etc."
                className="resize-none"
                rows={3}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowBodyWeightDialog(false)}
            >
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleAddBodyWeight}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Workout Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Select CSV file
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files[0])}
                className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
              />
            </div>
            
            {importErrors && (
              <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-lg">
                <div className="text-sm font-semibold text-destructive mb-2">Import Errors:</div>
                <div className="text-xs text-destructive space-y-1 max-h-32 overflow-y-auto">
                  {importErrors.map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg border border-border">
              <div className="font-semibold mb-1">CSV Format:</div>
              <div>Date, Workout, Exercise, Set, Weight, Reps, Notes</div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowImportDialog(false);
                setImportFile(null);
                setImportErrors(null);
              }}
            >
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleImport}>
              Import
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }) => {
  const colorClasses = {
    primary: 'text-primary',
    gold: 'text-gold',
    success: 'text-success'
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className={`flex items-center gap-2 mb-2 ${colorClasses[color]}`}>
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
};

export default StatsPage;