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
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
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

  // ✅ reset helpers (from storage.js)
  resetSettingsToDefaults,
  resetProgrammesToDefaults,
  resetExercisesToDefaults,
  resetAppToBlank,
} from "../utils/storage";

import pkg from "../../package.json";

const numberOrFallback = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

// =====================
// Custom Themes storage
// =====================
const CUSTOM_THEMES_KEY = "gym_custom_themes";

const getCustomThemes = () => {
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveCustomThemes = (themes) => {
  try {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes));
  } catch {
    // ignore
  }
};

const applyVars = (vars) => {
  const root = document.documentElement;
  Object.entries(vars || {}).forEach(([k, v]) => {
    root.style.setProperty(k, v);
  });
};

const clearCustomVars = () => {
  // Remove ONLY the vars that a custom theme sets (so we fall back to CSS again)
  const keys = [
    "--background",
    "--foreground",
    "--card",
    "--card-foreground",
    "--popover",
    "--popover-foreground",
    "--primary",
    "--primary-foreground",
    "--primary-glow",
    "--gold",
    "--gold-foreground",
    "--secondary",
    "--secondary-foreground",
    "--muted",
    "--muted-foreground",
    "--accent",
    "--accent-foreground",
    "--accent-strong",
    "--accent-strong-foreground",
    "--destructive",
    "--destructive-foreground",
    "--border",
    "--input",
    "--ring",
    "--success",
    "--success-foreground",
    "--chart-1",
    "--chart-2",
    "--chart-3",
    "--chart-4",
    "--chart-5",
    "--gradient-primary",
    "--gradient-gold",
    "--gradient-hero",
    "--shadow-elegant",
    "--shadow-glow",
    "--shadow-gold",
  ];

  const root = document.documentElement;
  keys.forEach((k) => root.style.removeProperty(k));
};

const isDarkModeNow = () => {
  // Your app likely toggles this on <html> via SettingsContext
  return document.documentElement.classList.contains("dark");
};

const normalizeThemeToDataset = (themeKey) => {
  // Your CSS defines: dark | green | yellow | greyRed | custom
  // Your UI historically used: blue | green | yellow | red
  if (!themeKey) return "dark";
  if (themeKey === "blue") return "dark";
  if (themeKey === "red") return "greyRed";
  if (themeKey === "greyRed") return "greyRed";
  if (themeKey === "green") return "green";
  if (themeKey === "yellow") return "yellow";
  return themeKey;
};

const isCustomValue = (v) => typeof v === "string" && v.startsWith("custom:");
const customIdFromValue = (v) => (isCustomValue(v) ? v.slice("custom:".length) : "");

// =====================
// Math challenge generator
// =====================
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const makeChallenge = () => {
  const ops = ["+", "-", "*"];
  const op = ops[randInt(0, ops.length - 1)];

  let a = randInt(1, 99);
  let b = randInt(1, 99);

  if (op === "*") {
    a = randInt(1, 12);
    b = randInt(1, 12);
  }

  if (op === "-" && b > a) [a, b] = [b, a];

  let result = 0;
  if (op === "+") result = a + b;
  if (op === "-") result = a - b;
  if (op === "*") result = a * b;

  return { text: `${a} ${op} ${b}`, result };
};

export default function SettingsPage({ onCreateTheme }) {
  const {
    weightUnit,
    toggleWeightUnit,
    colorMode,
    colorTheme,
    setColorMode,
    setColorTheme,
    progressMetric,
    setProgressMetric,
  } = useSettings();

  const [progressionSettings, setProgressionSettings] = useState(null);
  const [workoutPattern, setWorkoutPatternState] = useState("");

  // Custom themes list (local)
  const [customThemes, setCustomThemes] = useState(() => getCustomThemes());

  const usableProgrammeTypes = useMemo(() => {
    return getUsableProgrammes().map((p) => String(p.type).toUpperCase());
  }, []);

  // ✅ Hydrate from storage on mount
  useEffect(() => {
    setProgressionSettings(getProgressionSettings());
    setWorkoutPatternState(getWorkoutPattern());
    setCustomThemes(getCustomThemes());
  }, []);

  // Keep custom theme applied when:
  // - user switches light/dark
  // - user selects a custom theme again
  useEffect(() => {
    if (!isCustomValue(colorTheme)) {
      // Not custom: clear any custom vars and rely on CSS theme selectors
      clearCustomVars();
      const ds = normalizeThemeToDataset(colorTheme);
      document.documentElement.dataset.theme = ds;
      return;
    }

    const id = customIdFromValue(colorTheme);
    const themes = getCustomThemes();
    const t = themes.find((x) => String(x?.id) === String(id));
    if (!t?.vars) {
      toast.error("Custom theme not found (it may have been deleted).");
      clearCustomVars();
      document.documentElement.dataset.theme = "dark";
      setColorTheme("blue");
      return;
    }

    document.documentElement.dataset.theme = "custom";
    applyVars(isDarkModeNow() ? t.vars.dark : t.vars.light);
  }, [colorTheme, colorMode, setColorTheme]);

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
      "Update app data (keep data) will:\n\n1) Back up your data\n2) Rebuild local storage\n3) Restore your backup\n\nThis normally keeps all history.\nWe still recommend exporting a manual backup first (Data tab), just in case.\n\nContinue?"
    );
    if (!ok) return;

    const res = await resetWithBackup({ merge: false });
    if (!res?.success) {
      alert(res?.error || "Update failed");
      return;
    }

    toast.success("App data rebuilt");
    setTimeout(() => {
      window.location.href = window.location.href;
    }, 650);
  };

  // ==========================
  // Reset App UI state
  // ==========================
  const [resetOpen, setResetOpen] = useState(false);
  const [resetMode, setResetMode] = useState(""); // "settings" | "programmes" | "exercises" | "full"
  const [challenge, setChallenge] = useState(() => makeChallenge());
  const [answer, setAnswer] = useState("");

  const resetLabel = useMemo(() => {
    if (resetMode === "settings") return "Reset settings to default";
    if (resetMode === "programmes") return "Reset programmes to default";
    if (resetMode === "exercises") return "Reset exercises to default";
    if (resetMode === "full") return "Full app reset (blank)";
    return "";
  }, [resetMode]);

  const closeResetBox = () => {
    setResetOpen(false);
    setResetMode("");
    setAnswer("");
    setChallenge(makeChallenge());
  };

  const handlePickResetMode = (v) => {
    setResetMode(v);
    setAnswer("");
    setChallenge(makeChallenge());
  };

  const toastAndReload = (message) => {
    toast.success(message, { duration: 1200 });
    setTimeout(() => {
      window.location.href = window.location.href;
    }, 650);
  };

  const runSelectedReset = async () => {
    if (!resetMode) {
      toast.error("Choose a reset option first.");
      return;
    }

    const userAnswer = Number(String(answer).trim());
    if (!Number.isFinite(userAnswer) || userAnswer !== challenge.result) {
      toast.error("Wrong answer.");
      closeResetBox();
      return;
    }

    if (resetMode === "full") {
      const ok = window.confirm(
        "Full app reset will clear your history and restore the app to a fresh default state.\n\nIf you want to keep history, export a backup first.\n\nContinue?"
      );
      if (!ok) {
        closeResetBox();
        return;
      }
    }

    try {
      if (resetMode === "settings") {
        resetSettingsToDefaults();
        closeResetBox();
        toastAndReload("Settings reset to default");
        return;
      }

      if (resetMode === "programmes") {
        resetProgrammesToDefaults();
        closeResetBox();
        toastAndReload("Programmes reset to default");
        return;
      }

      if (resetMode === "exercises") {
        resetExercisesToDefaults();
        closeResetBox();
        toastAndReload("Exercises reset to default");
        return;
      }

      if (resetMode === "full") {
        const res = await resetAppToBlank();
        if (!res?.success) throw new Error(res?.error || "Reset failed");
        closeResetBox();
        toastAndReload("App reset complete");
        return;
      }
    } catch (e) {
      toast.error(e?.message || "Reset failed");
      closeResetBox();
    }
  };

  // ==========================
  // Custom theme actions
  // ==========================
  const refreshCustomThemes = () => {
    setCustomThemes(getCustomThemes());
  };

  const deleteCustomTheme = (id) => {
    const t = customThemes.find((x) => String(x?.id) === String(id));
    const ok = window.confirm(`Delete custom theme "${t?.name || "Unnamed"}"?`);
    if (!ok) return;

    const next = customThemes.filter((x) => String(x?.id) !== String(id));
    saveCustomThemes(next);
    setCustomThemes(next);

    // If currently selected, bounce back to blue (dark)
    if (isCustomValue(colorTheme) && customIdFromValue(colorTheme) === String(id)) {
      clearCustomVars();
      document.documentElement.dataset.theme = "dark";
      setColorTheme("blue");
      toast.success("Theme deleted. Switched back to Blue.");
      return;
    }

    toast.success("Theme deleted.");
  };

  if (!progressionSettings) return null;

  const themeSelectValue = colorTheme || "blue";

  return (
    <div className="space-y-8 p-4 max-w-xl mx-auto">
      {/* ===== Header ===== */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" />
          <h1 className="text-xl font-bold">Settings</h1>
        </div>

        <div className="text-xs text-muted-foreground">
          Version {pkg?.version || "unknown"}
        </div>
      </div>

      {/* ===== Progress metric ===== */}
      <section className="space-y-2">
        <h2 className="font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Progress metric
        </h2>

        <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="font-medium">Chart display</div>
              <div className="text-xs text-muted-foreground">
                Choose what Progress charts show.
              </div>
            </div>

            <Badge className="bg-primary/15 text-primary border border-primary/30">
              {progressMetric === "e1rm" ? "E1RM" : "Max"}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={progressMetric === "max" ? "default" : "secondary"}
              onClick={() => setProgressMetric("max")}
            >
              Max weight
            </Button>
            <Button
              variant={progressMetric === "e1rm" ? "default" : "secondary"}
              onClick={() => setProgressMetric("e1rm")}
            >
              E1RM (estimated 1RM)
            </Button>
          </div>
        </div>
      </section>

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
                {colorMode === "dark" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
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
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm">Colour theme</Label>

              <Button
                variant="secondary"
                className="gap-2"
                onClick={() => {
                  if (typeof onCreateTheme === "function") {
                    onCreateTheme();
                    return;
                  }
                  toast("Hook not wired yet: pass onCreateTheme from App.js");
                }}
              >
                <Plus className="h-4 w-4" />
                Create theme
              </Button>
            </div>

            <Select
              value={themeSelectValue}
              onValueChange={(v) => {
                setColorTheme(v);

                // Apply dataset theme immediately for non-custom (custom is handled in effect)
                if (!isCustomValue(v)) {
                  clearCustomVars();
                  document.documentElement.dataset.theme = normalizeThemeToDataset(v);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a theme" />
              </SelectTrigger>

              <SelectContent>
                {/* Built-ins (kept as your original names) */}
                <SelectItem value="blue">Blue</SelectItem>
                <SelectItem value="yellow">Yellow</SelectItem>
                <SelectItem value="green">Green</SelectItem>
                <SelectItem value="red">Red</SelectItem>

                {/* Custom */}
                {customThemes.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs text-muted-foreground">
                      Custom themes
                    </div>
                    {customThemes.map((t) => (
                      <SelectItem key={t.id} value={`custom:${t.id}`}>
                        {t.name || "Unnamed theme"}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>

            <div className="text-xs text-muted-foreground">
              Built-in themes use <code>theme.css</code>. Custom themes are stored on this device.
            </div>

            {customThemes.length > 0 && (
              <div className="rounded-lg border border-border bg-background/40 p-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="text-sm font-medium">Manage custom themes</div>
                  <Button
                    variant="outline"
                    onClick={refreshCustomThemes}
                    className="h-8 px-3"
                  >
                    Refresh
                  </Button>
                </div>

                <div className="space-y-2">
                  {customThemes.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-border bg-card/40 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {t.name || "Unnamed theme"}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {t.accentHex || ""} {t.baseHex ? `• ${t.baseHex}` : ""}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          className="h-8 px-3"
                          onClick={() => setColorTheme(`custom:${t.id}`)}
                        >
                          Use
                        </Button>
                        <Button
                          variant="outline"
                          className="h-8 px-3"
                          onClick={() => deleteCustomTheme(t.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

      {/* ===== Reset App ===== */}
      <section className="rounded-xl border border-border p-4 space-y-3 bg-card/30">
        <button
          type="button"
          className="w-full flex items-center justify-between text-left"
          onClick={() => setResetOpen((v) => !v)}
        >
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            <h2 className="font-semibold">Reset app</h2>
          </div>
          {resetOpen ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </button>

        <p className="text-sm text-muted-foreground">
          Restore parts of the app back to the default version from the app code.
        </p>

        {resetOpen && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm">Choose reset type</Label>
              <Select value={resetMode} onValueChange={handlePickResetMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick one..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="settings">Settings reset (defaults)</SelectItem>
                  <SelectItem value="programmes">Programme reset (defaults)</SelectItem>
                  <SelectItem value="exercises">Exercise reset (defaults)</SelectItem>
                  <SelectItem value="full">Full app reset (blank)</SelectItem>
                </SelectContent>
              </Select>

              {resetMode === "full" && (
                <div className="text-xs text-muted-foreground">
                  Full reset clears history and restores a fresh default app.
                </div>
              )}
            </div>

            {resetMode && (
              <div className="rounded-lg border border-border bg-background/40 p-3 space-y-3">
                <div className="text-sm font-medium">{resetLabel}</div>

                <div className="text-xs text-muted-foreground">
                  Solve to confirm:{" "}
                  <span className="font-semibold text-foreground">
                    {challenge.text}
                  </span>
                </div>

                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Answer"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setChallenge(makeChallenge());
                      setAnswer("");
                    }}
                  >
                    New
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button onClick={runSelectedReset}>Reset</Button>
                  <Button variant="outline" onClick={closeResetBox}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ===== Update app data (keep data) ===== */}
      <section className="rounded-xl border border-yellow-500/40 p-4 space-y-3">
        <div className="flex items-center gap-2 text-yellow-500">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="font-semibold">Update app data (keep data)</h2>
        </div>

        <p className="text-sm opacity-80">
          Rebuilds local app data after an update by backing up, rebuilding storage,
          then restoring your backup. This normally keeps your history. We recommend
          exporting a manual backup first.
        </p>

        <Button variant="secondary" onClick={handleForceUpdate}>
          Update app data (keep data)
        </Button>
      </section>
    </div>
  );
}
