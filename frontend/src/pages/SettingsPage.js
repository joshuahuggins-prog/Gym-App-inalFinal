import React, { useState, useEffect } from 'react';
import { Save, TrendingUp, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { getProgressionSettings, updateProgressionSettings, getExercises } from '../utils/storage';
import { useSettings } from '../contexts/SettingsContext';
import { toast } from 'sonner';

const SettingsPage = () => {
  const { weightUnit, toggleWeightUnit } = useSettings();
  const [progressionSettings, setProgressionSettings] = useState(null);
  const [exercises, setExercises] = useState([]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    setProgressionSettings(getProgressionSettings());
    setExercises(getExercises());
  };

  const handleSaveSettings = () => {
    updateProgressionSettings(progressionSettings);
    toast.success('Settings saved!');
  };

  const handleUpdateExerciseProgression = (exerciseId, value) => {
    setProgressionSettings({
      ...progressionSettings,
      exerciseSpecific: {
        ...progressionSettings.exerciseSpecific,
        [exerciseId]: parseFloat(value) || 0
      }
    });
  };

  if (!progressionSettings) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-card to-background border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gradient-primary mb-2">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure progression and app preferences
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* General Settings */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-primary" />
            General Settings
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-foreground">Weight Unit</div>
                <div className="text-sm text-muted-foreground">
                  Toggle between lbs and kg
                </div>
              </div>
              <Button
                variant="outline"
                onClick={toggleWeightUnit}
                className="font-semibold"
              >
                {weightUnit}
              </Button>
            </div>
          </div>
        </div>

        {/* Global Progression Settings */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Global Progression Settings
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Default Weight Increase (lbs)
              </label>
              <Input
                type="number"
                value={progressionSettings.globalIncrementLbs}
                onChange={(e) => setProgressionSettings({
                  ...progressionSettings,
                  globalIncrementLbs: parseFloat(e.target.value) || 5
                })}
                step="0.5"
                min="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                When you hit your goal reps on the first set, this amount will be suggested for next workout
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Default Weight Increase (kg)
              </label>
              <Input
                type="number"
                value={progressionSettings.globalIncrementKg}
                onChange={(e) => setProgressionSettings({
                  ...progressionSettings,
                  globalIncrementKg: parseFloat(e.target.value) || 2.5
                })}
                step="0.25"
                min="0"
              />
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="font-semibold text-foreground mb-3">RPT Percentages</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Set 2 Weight (% of Set 1)
                  </label>
                  <Input
                    type="number"
                    value={progressionSettings.rptSet2Percentage}
                    onChange={(e) => setProgressionSettings({
                      ...progressionSettings,
                      rptSet2Percentage: parseInt(e.target.value) || 90
                    })}
                    min="50"
                    max="100"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Current: {progressionSettings.rptSet2Percentage}% (default: 90%)
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Set 3 Weight (% of Set 1)
                  </label>
                  <Input
                    type="number"
                    value={progressionSettings.rptSet3Percentage}
                    onChange={(e) => setProgressionSettings({
                      ...progressionSettings,
                      rptSet3Percentage: parseInt(e.target.value) || 80
                    })}
                    min="50"
                    max="100"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Current: {progressionSettings.rptSet3Percentage}% (default: 80%)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Exercise-Specific Progression */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">
            Exercise-Specific Progression
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Override the default progression for specific exercises. Leave at 0 to use global default.
          </p>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {exercises.map(exercise => {
              const currentValue = progressionSettings.exerciseSpecific[exercise.id] || 0;
              const defaultValue = weightUnit === 'lbs' 
                ? progressionSettings.globalIncrementLbs
                : progressionSettings.globalIncrementKg;

              return (
                <div
                  key={exercise.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">{exercise.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Using: {currentValue > 0 ? `${currentValue} ${weightUnit}` : `Global (${defaultValue} ${weightUnit})`}
                    </div>
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      value={currentValue}
                      onChange={(e) => handleUpdateExerciseProgression(exercise.id, e.target.value)}
                      placeholder={defaultValue.toString()}
                      step="0.5"
                      min="0"
                      className="text-center"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
          <div className="text-sm text-foreground">
            <div className="font-semibold mb-2">💡 How Progression Works:</div>
            <ul className="space-y-1 text-muted-foreground">
              <li>• When you complete your goal reps on the <strong>first set</strong>, the app suggests adding weight</li>
              <li>• RPT exercises auto-calculate Set 2 and Set 3 weights based on the percentages you set</li>
              <li>• You can customize progression per exercise for precise control</li>
              <li>• Settings are applied when you start your next workout</li>
            </ul>
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSaveSettings}
          size="lg"
          className="w-full"
        >
          <Save className="w-5 h-5 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;