// src/pages/SettingsPage.js
import React, { useEffect, useMemo, useState } from "react";
import {
  Save,
  TrendingUp,
  Settings as SettingsIcon,
  AlertTriangle,
  ListOrdered,
  BarChart3,
} from "lucide-react";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";

import { useSettings } from "../contexts/SettingsContext";

import {
  getProgressionSettings,
  updateProgressionSettings,
  getWorkoutPattern,
  setWorkoutPattern,
  parseWorkoutPattern,
  getUsableProgrammes,
  setWorkoutPatternIndex,
  resetWithBackup,
} from "../utils/storage";

const SettingsPage = () => {
  const { settings, updateSetting, weightUnit, toggleWeightUnit, statsMetric, setStatsMetric } =
    useSettings();

  const themeValue = settings?.theme || "dark";

  const [progressionSettings, setProgressionSettingsState] = useState(null);
  const [workoutPattern, setWorkoutPatternState] = useState("");

  // Local UI draft so user can select then hit "Save"
  const [statsMetricDraft, setStatsMetricDraft] = useState(statsMetric || "maxWeight");

  useEffect(() => {
    setProgressionSettingsState(getProgressionSettings());
    setWorkoutPatternState(getWorkoutPattern());
    setStatsMetricDraft(statsMetric || "maxWeight");
  }, [statsMetric]);

  const statsMetricLabel = useMemo(() => {
    return statsMetricDraft === "e1rm" ? "Weight + Reps (e1RM)" : "Max Weight";
  }, [statsMetricDraft]);

  const handleSaveProgression = () => {
    updateProgressionSettings(progressionSettings);
    toast.success("Progression settings saved");
  };

  const handleSavePattern = () => {
    const parsed = parseWorkoutPattern(workoutPattern);
    const usable = getUsableProgrammes().map((p) => String(p.type).toUpperCase());

    const valid = parsed.every((p) => usable.includes(String(p).toUpperCase()));
    if (!valid) {
      toast.error("Workout pattern contains invalid workout letters");
      return;
    }

    setWorkoutPattern(workoutPattern);
    setWorkoutPatternIndex(0);
    toast.success("Workout pattern saved");
  };

  const handleSaveStatsMetric = () => {
    setStatsMetric(statsMetricDraft);
    toast.success(`Stats metric saved: ${statsMetricLabel}`);
  };

  const handleResetWithBackup = async () => {
    const ok = window.confirm(
      "This will back up your data, reset the app storage, then restore the backup.\n\nUse this only if something looks broken after an update.\n\nPlease also export your data manually first in the Data tab.\n\nContinue?"
    );
    if (!ok) return;

    const res = await resetWithBackup({ merge: false });
    if (!res?.success) {
      alert(res?.error || "Reset failed");
    }
  };

  if (!progressionSettings) return null;

  return (
    <div className="space-y-8 p-4 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-6 w-6" />
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      {/* Units */}
      <div className="space-y-2">
        <h2 className="font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Units
        </h2>
        <Button onClick={toggleWeightUnit}>Switch to {weightUnit === "kg" ? "lbs" : "kg"}</Button>
      </div>

      {/* Theme */}
      <div className="space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <SettingsIcon className="h-4 w-4" />
          Theme
        </h2>

        <div className="rounded-xl border border-border p-4 space-y-3 bg-card">
          <div className="text-sm text-muted-foreground">
            Pick a colour theme. This changes the whole app instantly.
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "dark", label: "Dark (default)" },
              { key: "green", label: "Green" },
              { key: "yellow", label: "Yellow" },
              { key: "greyRed", label: "Grey / Red" },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => updateSetting("theme", key)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  themeValue === key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:bg-muted/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-muted-foreground">
            Current: <span className="font-medium text-foreground">{themeValue}</span>
          </div>
        </div>
      </div>

      {/* Stats Metric */}
      <div className="space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Stats metric
        </h2>

        <div className="rounded-xl border border-border p-4 space-y-3 bg-card">
          <div className="text-sm text-muted-foreground">Choose how charts show progress.</div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStatsMetricDraft("maxWeight")}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                statsMetricDraft === "maxWeight"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-muted/50"
              }`}
            >
              Max Weight
            </button>

            <button
              type="button"
              onClick={() => setStatsMetricDraft("e1rm")}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                statsMetricDraft === "e1rm"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-muted/50"
              }`}
            >
              Weight + Reps (e1RM)
            </button>
          </div>

          <div className="text-xs text-muted-foreground">
            e1RM uses Epley: <span className="font-mono">weight × (1 + reps/30)</span>
          </div>

          <Button onClick={handleSaveStatsMetric} variant="outline">
            Save stats metric
          </Button>

          <div className="text-[11px] text-muted-foreground">
            Current:{" "}
            <span className="font-medium text-foreground">
              {statsMetric === "e1rm" ? "Weight + Reps (e1RM)" : "Max Weight"}
            </span>
          </div>
        </div>
      </div>

      {/* Progression */}
      <div className="space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Save className="h-4 w-4" />
          Progression
        </h2>

        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            value={progressionSettings.globalIncrementKg}
            onChange={(e) =>
              setProgressionSettingsState({
                ...progressionSettings,
                globalIncrementKg: Number(e.target.value),
              })
            }
            placeholder="Kg increment"
          />
          <Input
            type="number"
            value={progressionSettings.globalIncrementLbs}
            onChange={(e) =>
              setProgressionSettingsState({
                ...progressionSettings,
                globalIncrementLbs: Number(e.target.value),
              })
            }
            placeholder="Lb increment"
          />
        </div>

        <Button onClick={handleSaveProgression}>Save progression</Button>
      </div>

      {/* Workout Pattern */}
      <div className="space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <ListOrdered className="h-4 w-4" />
          Workout pattern
        </h2>

        <Input
          value={workoutPattern}
          onChange={(e) => setWorkoutPatternState(e.target.value)}
          placeholder="e.g. A,B,A,B"
        />

        <Button onClick={handleSavePattern}>Save pattern</Button>
      </div>

      {/* Force Update */}
      <div className="rounded-xl border border-destructive/40 p-4 space-y-3 bg-card">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="font-semibold">Force Update</h2>
        </div>

        <p className="text-sm opacity-80">
          Back up your data, reset local storage, then restore the backup. Use this if something
          looks stuck after an update.
        </p>

        <Button variant="destructive" onClick={handleResetWithBackup}>
          Reset app (keep data)
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
