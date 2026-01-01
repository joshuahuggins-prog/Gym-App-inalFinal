import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, TrendingDown, Award } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { getWorkouts, getExercises } from '../utils/storage';
import { useSettings } from '../contexts/SettingsContext';

const ProgressPage = () => {
  const { weightUnit } = useSettings();
  const [selectedExercise1, setSelectedExercise1] = useState('weighted_dips');
  const [selectedExercise2, setSelectedExercise2] = useState('weighted_chinups');
  const [exerciseData, setExerciseData] = useState({});
  const [exercises, setExercises] = useState([]);
  const [timeRange, setTimeRange] = useState('all');
  const [progressionStats, setProgressionStats] = useState({ most: null, least: null });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const workouts = getWorkouts();
    const availableExercises = getExercises();
    setExercises(availableExercises);
    
    // Extract data for all exercises
    const dataMap = {};
    
    workouts.reverse().forEach(workout => {
      const date = new Date(workout.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });

      workout.exercises.forEach(exercise => {
        const exerciseKey = exercise.id || exercise.name.toLowerCase().replace(/\s+/g, '_');
        
        if (!dataMap[exerciseKey]) {
          dataMap[exerciseKey] = [];
        }
        
        if (exercise.sets && exercise.sets.length > 0) {
          const maxWeight = Math.max(...exercise.sets.map(s => s.weight || 0));
          if (maxWeight > 0) {
            dataMap[exerciseKey].push({
              date,
              weight: maxWeight,
              fullDate: workout.date
            });
          }
        }
      });
    });
    
    setExerciseData(dataMap);
    calculateProgressionStats(dataMap);
  };

  const calculateProgressionStats = (dataMap) => {
    const progressions = [];
    
    Object.keys(dataMap).forEach(exerciseKey => {
      const data = dataMap[exerciseKey];
      if (data.length >= 2) {
        const first = data[0].weight;
        const last = data[data.length - 1].weight;
        const change = last - first;
        const percentChange = ((change / first) * 100);
        
        const exercise = exercises.find(ex => ex.id === exerciseKey) || 
                        { name: exerciseKey.replace(/_/g, ' ') };
        
        progressions.push({
          exerciseKey,
          name: exercise.name || exerciseKey,
          change,
          percentChange,
          dataPoints: data.length
        });
      }
    });
    
    progressions.sort((a, b) => b.percentChange - a.percentChange);
    
    setProgressionStats({
      most: progressions[0] || null,
      least: progressions[progressions.length - 1] || null
    });
  };

  const filterDataByTimeRange = (data) => {
    if (timeRange === 'all') return data;

    const now = new Date();
    const monthsMap = { '3m': 3, '6m': 6, '1y': 12 };
    const months = monthsMap[timeRange];
    const cutoffDate = new Date(now.setMonth(now.getMonth() - months));

    return data.filter(item => new Date(item.fullDate) >= cutoffDate);
  };

  const getExerciseData = (exerciseKey) => {
    return exerciseData[exerciseKey] || [];
  };

  const filteredData1 = filterDataByTimeRange(getExerciseData(selectedExercise1));
  const filteredData2 = filterDataByTimeRange(getExerciseData(selectedExercise2));

  const calculateProgress = (data) => {
    if (data.length < 2) return null;
    const first = data[0].weight;
    const last = data[data.length - 1].weight;
    const change = last - first;
    const percentChange = ((change / first) * 100).toFixed(1);
    return { change, percentChange };
  };

  const progress1 = calculateProgress(filteredData1);
  const progress2 = calculateProgress(filteredData2);

  const getExerciseName = (exerciseKey) => {
    const exercise = exercises.find(ex => ex.id === exerciseKey);
    return exercise?.name || exerciseKey.replace(/_/g, ' ');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-card to-background border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gradient-primary mb-2">
            Progress Tracking
          </h1>
          <p className="text-sm text-muted-foreground">
            Track your strength gains over time
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Time Range Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { value: 'all', label: 'All Time' },
            { value: '3m', label: '3 Months' },
            { value: '6m', label: '6 Months' },
            { value: '1y', label: '1 Year' }
          ].map(range => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                timeRange === range.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* Weighted Dips Chart */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Weighted Dips
              </h2>
              <p className="text-sm text-muted-foreground">
                Track your top set weight progression
              </p>
            </div>
            {dipsProgress && (
              <div className="text-right">
                <div className={`text-2xl font-bold ${
                  dipsProgress.change >= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {dipsProgress.change >= 0 ? '+' : ''}{dipsProgress.change} {weightUnit}
                </div>
                <div className="text-sm text-muted-foreground">
                  {dipsProgress.percentChange >= 0 ? '+' : ''}{dipsProgress.percentChange}%
                </div>
              </div>
            )}
          </div>

          {filteredDips.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-4xl mb-2">📊</div>
              <p>No data yet. Complete workouts to see your progress!</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredDips}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px' }}
                    label={{ 
                      value: `Weight (${weightUnit})`, 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { fill: 'hsl(var(--muted-foreground))' }
                    }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    formatter={(value) => [`${value} ${weightUnit}`, 'Weight']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {filteredDips.length > 0 && (
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>First: {filteredDips[0].weight} {weightUnit}</span>
              <span>Latest: {filteredDips[filteredDips.length - 1].weight} {weightUnit}</span>
            </div>
          )}
        </div>

        {/* Weighted Chinups Chart */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Weighted Chinups
              </h2>
              <p className="text-sm text-muted-foreground">
                Track your top set weight progression
              </p>
            </div>
            {chinupsProgress && (
              <div className="text-right">
                <div className={`text-2xl font-bold ${
                  chinupsProgress.change >= 0 ? 'text-success' : 'text-destructive'
                }`}>
                  {chinupsProgress.change >= 0 ? '+' : ''}{chinupsProgress.change} {weightUnit}
                </div>
                <div className="text-sm text-muted-foreground">
                  {chinupsProgress.percentChange >= 0 ? '+' : ''}{chinupsProgress.percentChange}%
                </div>
              </div>
            )}
          </div>

          {filteredChinups.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-4xl mb-2">📊</div>
              <p>No data yet. Complete workouts to see your progress!</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredChinups}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px' }}
                    label={{ 
                      value: `Weight (${weightUnit})`, 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { fill: 'hsl(var(--muted-foreground))' }
                    }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    formatter={(value) => [`${value} ${weightUnit}`, 'Weight']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--chart-2))', r: 4 }}
                    activeDot={{ r: 6, fill: 'hsl(var(--chart-2))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {filteredChinups.length > 0 && (
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>First: {filteredChinups[0].weight} {weightUnit}</span>
              <span>Latest: {filteredChinups[filteredChinups.length - 1].weight} {weightUnit}</span>
            </div>
          )}
        </div>

        {/* Progress Summary */}
        {(filteredDips.length > 0 || filteredChinups.length > 0) && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Progress Summary
            </h3>
            <div className="space-y-3">
              {filteredDips.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Weighted Dips Sessions:</span>
                  <Badge variant="outline" className="text-primary border-primary/50">
                    {filteredDips.length} workouts
                  </Badge>
                </div>
              )}
              {filteredChinups.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Weighted Chinups Sessions:</span>
                  <Badge variant="outline" className="text-primary border-primary/50">
                    {filteredChinups.length} workouts
                  </Badge>
                </div>
              )}
              <div className="pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  💡 <span className="font-semibold">Tip:</span> Consistent progressive overload is the key to gains. 
                  Aim to add weight or reps each week while maintaining proper form.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressPage;
