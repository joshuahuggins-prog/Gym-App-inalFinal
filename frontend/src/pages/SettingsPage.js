// src/pages/SettingsPage.js

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ListOrdered,
  Save,
  Settings as SettingsIcon,
  TrendingUp,
  Palette,
  Sun,
  Moon,
} from "lucide-react";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
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
  resetWithBackup,
} from "../utils/storage";

// ✅ App version display (CRA/CRACO supports importing package.json)
import pkg from "../../package.json";

const numberOrFallback = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const SettingsPage = () => {
  const { weightUnit, toggleWeightUnit, colorMode, colorTheme, setColorMode, setColorTheme } = useSettings();

  const [progressionSettings, setProgressionSettings] = useState(null);
  const [workoutPattern, setWorkoutPatternState] = useState("");

  const usableProgrammeTypes = useMemo(() => {
    return getUsableProgrammes().map((p) => String(p.type).toUpperCase());
  }, []);

  useEffect(() => {
    setProgressionSettings(getProgressionSettings());
    setWorkoutPatternState(getWorkoutPattern());
  }, []);

  const handleSaveProgression = () => {
    if (!progressionSettings) return;

    const cleaned = {
      ...progressionSettings,
      globalIncrementKg: numberOrFallback(progressionSettings.globalIncrementKg, 2.5),
      globalIncrementLbs: numberOrFallback(progressionSettings.globalIncrementLbs, 5),
      rptSet2Percentage: numberOrFallback(progressionSettings.rptSet2Percentage, 90),
      rptSet3Percentage: numberOrFallback(progressionSettings.rptSet3Percentage, 80),
      exerciseSpecific: progressionSettings.exerciseSpecific || {},
    };

    updateProgressionSettings(cleaned);
    setProgressionSettings(cleaned);
    toast.success("Progression settings saved");
  };

  const handleSavePattern = () => {
    const parsed = parseWorkoutPattern(workoutPattern);
    if (parsed.length === 0) {
      toast.error("Please enter a pattern like A,B,A,B");
      return;
    }

    const valid = parsed.every((p) => usableProgrammeTypes.includes(p));
    if (!valid) {
      toast.error(`Invalid letters. Allowed: ${usableProgrammeTypes.join(", ")}`);
      return;
    }

    setWorkoutPattern(workoutPattern);
    setWorkoutPatternIndex(0);
    toast.success("Workout pattern saved");
  };

  const handleForceUpdate = async () => {
    const ok = window.confirm(
      "Force Update will:\n\n1) Back up your data\n2) Reset local app storage\n3) Restore your backup\n\nThis is safe for history, but please export a manual backup first (Data tab), just in case.\n\nContinue?"
    );
    if (!ok) return;

    const res = await resetWithBackup({ merge: false });
    if (!res?.success) {
      alert(res?.error || "Force Update failed");
    }
  };

  if (!progressionSettings) return null;

  return (
    <div className="space-y-8 p-4 max-w-xl mx-auto">
      {/* ===== Header ===== */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" />
          <h1 className="text-xl font-bold">Settings</h1>
        </div>

        {/* ✅ Version */}
        <div className="text-xs text-muted-foreground">
          Version {pkg?.version || "unknown"}
        </div>
      </div>

      {/* ===== Units ===== */}
      <section className="space-y-2">
        <h2 className="font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Units
        </h2>
        <Button onClick={toggleWeightUnit}>
          Switch to {weightUnit === "kg" ? "lbs" : "kg"}
        </Button>
      </section>

      
      {/* ===== Appearance ===== */}
      <section className="space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Appearance
        </h2>

        <div className="rounded-xl border border-border bg-card/50 p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {colorMode === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                <div className="font-medium">Dark mode</div>
              </div>
              <div className="text-xs text-muted-foreground">
                Toggle between light and dark UI.
              </div>
            </div>

            <Switch
              checked={colorMode === "dark"}
              onCheckedChange={(checked) => setColorMode(checked ? "dark" : "light")}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Colour theme</Label>
            <Select value={colorTheme || "blue"} onValueChange={(v) => setColorTheme(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blue">Blue</SelectItem>
                <SelectItem value="yellow">Yellow</SelectItem>
                <SelectItem value="green">Green</SelectItem>
                <SelectItem value="red">Red</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-xs text-muted-foreground">
              The background, cards and accents tint to match your chosen colour.
            </div>
          </div>
        </div>
      </section>
{/* ===== Progression Settings ===== */}
      <section className="space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Save className="h-4 w-4" />
          Progression
        </h2>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Global increment (kg)</div>
            <Input
              type="number"
              inputMode="decimal"
              value={progressionSettings.globalIncrementKg ?? ""}
              onChange={(e) =>
                setProgressionSettings((prev) => ({
                  ...prev,
                  globalIncrementKg: e.target.value,
                }))
              }
              placeholder="2.5"
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Global increment (lbs)</div>
            <Input
              type="number"
              inputMode="decimal"
              value={progressionSettings.globalIncrementLbs ?? ""}
              onChange={(e) =>
                setProgressionSettings((prev) => ({
                  ...prev,
                  globalIncrementLbs: e.target.value,
                }))
              }
              placeholder="5"
            />
          </div>
        </div>

        <Button onClick={handleSaveProgression}>Save progression</Button>
      </section>

      {/* ===== Workout Pattern ===== */}
      <section className="space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <ListOrdered className="h-4 w-4" />
          Workout pattern
        </h2>

        <div className="text-xs text-muted-foreground">
          Allowed: {usableProgrammeTypes.join(", ")} (e.g. A,B,A,B)
        </div>

        <Input
          value={workoutPattern}
          onChange={(e) => setWorkoutPatternState(e.target.value)}
          placeholder="e.g. A,B,A,B"
          autoCapitalize="characters"
        />

        <Button onClick={handleSavePattern}>Save pattern</Button>
      </section>

      {/* ===== Force Update ===== */}
      <section className="rounded-xl border border-red-500/40 p-4 space-y-3">
        <div className="flex items-center gap-2 text-red-500">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="font-semibold">Force Update</h2>
        </div>

        <p className="text-sm opacity-80">
          Rebuilds local app data after an update by backing up, resetting storage,
          then restoring your backup. Use only if something looks stuck.
        </p>

        <Button variant="destructive" onClick={handleForceUpdate}>
          Force Update (keep data)
        </Button>
      </section>
    </div>
  );
};

export default SettingsPage;