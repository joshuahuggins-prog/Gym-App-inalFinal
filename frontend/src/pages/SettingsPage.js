import React, { useState, useEffect } from "react";
import {
  Save,
  TrendingUp,
  Settings as SettingsIcon,
  AlertTriangle,
  ListOrdered,
} from "lucide-react";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useSettings } from "../contexts/SettingsContext";
import { toast } from "sonner";

import {
  getProgressionSettings,
  updateProgressionSettings,
  getWorkoutPattern,
  setWorkoutPattern,
  parseWorkoutPattern,
  getUsableProgrammes,
  setWorkoutPatternIndex,
  resetWithBackup, // ✅ Force Update
} from "../utils/storage";

const SettingsPage = () => {
  const { weightUnit, toggleWeightUnit } = useSettings();

  const [progressionSettings, setProgressionSettings] = useState(null);
  const [workoutPattern, setWorkoutPatternState] = useState("");

  // Load settings on mount
  useEffect(() => {
    setProgressionSettings(getProgressionSettings());
    setWorkoutPatternState(getWorkoutPattern());
  }, []);

  // Save progression settings
  const handleSaveProgression = () => {
    updateProgressionSettings(progressionSettings);
    toast.success("Progression settings saved");
  };

  // Save workout pattern
  const handleSavePattern = () => {
    const parsed = parseWorkoutPattern(workoutPattern);
    const usable = getUsableProgrammes().map((p) => p.type);

    const valid = parsed.every((p) => usable.includes(p));
    if (!valid) {
      toast.error("Workout pattern contains invalid workout letters");
      return;
    }

    setWorkoutPattern(workoutPattern);
    setWorkoutPatternIndex(0);
    toast.success("Workout pattern saved");
  };

  // 🔥 Force Update (keep data)
  const handleResetWithBackup = async () => {
    const ok = window.confirm(
      "This will back up your data, reset the app storage, then restore the backup.\n\nUse this only if something looks broken after an update.Please backup data manually first using the export button in the data tab. \n\nContinue?"
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
      {/* ===== Header ===== */}
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-6 w-6" />
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      {/* ===== Units ===== */}
      <div className="space-y-2">
        <h2 className="font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Units
        </h2>
        <Button onClick={toggleWeightUnit}>
          Switch to {weightUnit === "kg" ? "lbs" : "kg"}
        </Button>
      </div>

      {/* ===== Progression Settings ===== */}
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
              setProgressionSettings({
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
              setProgressionSettings({
                ...progressionSettings,
                globalIncrementLbs: Number(e.target.value),
              })
            }
            placeholder="Lb increment"
          />
        </div>

        <Button onClick={handleSaveProgression}>Save progression</Button>
      </div>

      {/* ===== Workout Pattern ===== */}
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

      {/* ===== Force Update ===== */}
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