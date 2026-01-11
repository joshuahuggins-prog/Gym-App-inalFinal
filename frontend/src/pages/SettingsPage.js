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
  const { weightUnit, toggleWeightUnit, statsMetric, setStatsMetric } = useSettings();

  const [progressionSettings, setProgressionSettingsState] = useState(null);
  const [workoutPattern, setWorkoutPatternState] = useState("");

  useEffect(() => {
    setProgressionSettingsState(getProgressionSettings());
    setWorkoutPatternState(getWorkoutPattern());
  }, []);

  const statsMetricLabel = useMemo(
    () => (statsMetric === "e1rm" ? "Weight + Reps (e1RM)" : "Max Weight"),
    [statsMetric]
  );

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

  const handleResetWithBackup = async () => {
    const ok = window.confirm(
      "This will back up your data, reset the app storage, then restore the backup.\n\nUse this only if something looks broken after an update.\n\nPlease also export your data manually first in the Data tab.\n\nContinue?"
    );
    if (!ok) return;

    const res = await resetWithBackup({ merge: false });
    if (!res?.success) {
      alert(res?.error || "Reset failed");
      return;
    }

    toast.success("Force Update complete ✅");
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
        <Button onClick={toggleWeightUnit}>
          Switch to {weightUnit === "kg" ? "lbs" : "kg"}
        </Button>
      </div>

      {/* Stats Metric */}
      <div className="space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Stats metric
        </h2>

        <div className="rounded-xl border border-border p-4 space-y-3 bg-card">
          <div className="text-sm text-muted-foreground">
            Choose how charts show progress.
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStatsMetric("maxWeight")}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                statsMetric === "maxWeight"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-muted/50"
              }`}
            >
              Max Weight
            </button>

            <button
              type="button"
              onClick={() => setStatsMetric("e1rm")}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                statsMetric === "e1rm"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-muted/50"
              }`}
            >
              Weight + Reps (e1RM)
            </button>
          </div>

          <div className="text-xs text-muted-foreground">
            Current: <span className="font-semibold">{statsMetricLabel}</span>
            <br />
            e1RM uses Epley: <span className="font-mono">weight × (1 + reps/30)</span>
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
      <div className="rounded-xl border border-red-500/40 p-4 space-y-3">
        <div className="flex items-center gap-2 text-red-500">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="font-semibold">Force Update</h2>
        </div>

        <p className="text-sm opacity-80">
          Back up your data, reset local storage, then restore the backup.
          Use this if something looks stuck after an update.
        </p>

        <Button variant="destructive" onClick={handleResetWithBackup}>
          Reset app (keep data)
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;    setWorkoutPatternState(getWorkoutPattern());
  }, []);

  const statsMetricLabel = useMemo(() => {
    return statsMetric === "e1rm" ? "Weight + Reps (e1RM)" : "Max Weight";
  }, [statsMetric]);

  const handleSaveProgression = () => {
    updateProgressionSettings(progressionSettings);
    toast.success("Progression settings saved");
  };

  const handleSavePattern = () => {
    const parsed = parseWorkoutPattern(workoutPattern);
    const usableTypes = getUsableProgrammes().map((p) => String(p.type).toUpperCase());

    const valid = parsed.every((p) => usableTypes.includes(String(p).toUpperCase()));
    if (!valid) {
      toast.error("Workout pattern contains invalid workout letters");
      return;
    }

    setWorkoutPattern(workoutPattern);
    setWorkoutPatternIndex(0);
    toast.success("Workout pattern saved");
  };

  const handleResetWithBackup = async () => {
    const ok = window.confirm(
      "This will back up your data, reset the app storage, then restore the backup.\n\nUse this only if something looks broken after an update.\n\nPlease also export your data manually first in the Data tab.\n\nContinue?"
    );
    if (!ok) return;

    const res = await resetWithBackup({ merge: false });
    if (!res?.success) {
      alert(res?.error || "Reset failed");
      return;
    }

    toast.success("Force Update complete ✅");
    // Optional: reload the page so UI re-hydrates cleanly
    // window.location.reload();
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
        <Button onClick={toggleWeightUnit}>
          Switch to {weightUnit === "kg" ? "lbs" : "kg"}
        </Button>
      </div>

      {/* Stats Metric */}
      <div className="space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Stats metric
        </h2>

        <div className="rounded-xl border border-border p-4 space-y-3 bg-card">
          <div className="text-sm text-muted-foreground">
            Choose how charts show progress.
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setStatsMetric("maxWeight");
                toast.success("Stats metric set: Max Weight");
              }}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                statsMetric === "maxWeight"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-muted/50"
              }`}
            >
              Max Weight
            </button>

            <button
              type="button"
              onClick={() => {
                setStatsMetric("e1rm");
                toast.success("Stats metric set: Weight + Reps (e1RM)");
              }}
              className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                statsMetric === "e1rm"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-muted/50"
              }`}
            >
              Weight + Reps (e1RM)
            </button>
          </div>

          <div className="text-xs text-muted-foreground">
            Current: <span className="font-semibold">{statsMetricLabel}</span>
            <br />
            e1RM uses Epley: <span className="font-mono">weight × (1 + reps/30)</span>
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
      <div className="rounded-xl border border-red-500/40 p-4 space-y-3">
        <div className="flex items-center gap-2 text-red-500">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="font-semibold">Force Update</h2>
        </div>

        <p className="text-sm opacity-80">
          Back up your data, reset local storage, then restore the backup.
          Use this if something looks stuck after an update.
        </p>

        <Button variant="destructive" onClick={handleResetWithBackup}>
          Reset app (keep data)
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
