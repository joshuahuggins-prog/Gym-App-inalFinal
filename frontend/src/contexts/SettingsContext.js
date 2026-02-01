// src/contexts/SettingsContext.js
import React, { useEffect, useState } from "react";
import { getSettings, updateSettings } from "../utils/storage";

const SettingsContext = React.createContext();

export const useSettings = () => {
  const ctx = React.useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
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

const isCustomValue = (v) => typeof v === "string" && v.startsWith("custom:");
const customIdFromValue = (v) => (isCustomValue(v) ? v.slice("custom:".length) : "");

const normalizeThemeToDataset = (themeKey) => {
  // theme.css defines: dark | green | yellow | greyRed | custom
  // settings UI uses: blue | green | yellow | red (and custom:...)
  if (!themeKey) return "dark";
  if (themeKey === "blue") return "dark";
  if (themeKey === "red") return "greyRed";
  if (themeKey === "greyRed") return "greyRed";
  if (themeKey === "green") return "green";
  if (themeKey === "yellow") return "yellow";
  if (themeKey === "dark") return "dark";
  if (themeKey === "custom") return "custom";
  return "dark";
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

const applyThemeToDom = (settings) => {
  const root = document.documentElement;

  // Tailwind dark mode class
  if (settings.colorMode === "dark") root.classList.add("dark");
  else root.classList.remove("dark");

  const themeKey = settings.colorTheme || "blue";

  // Custom theme: write vars + set data-theme="custom"
  if (isCustomValue(themeKey)) {
    const id = customIdFromValue(themeKey);
    const themes = getCustomThemes();
    const t = themes.find((x) => String(x?.id) === String(id));

    if (t?.vars?.light && t?.vars?.dark) {
      root.setAttribute("data-theme", "custom");
      applyVars(settings.colorMode === "dark" ? t.vars.dark : t.vars.light);
      return;
    }

    // Missing custom theme (deleted/corrupt): fall back safely
    clearCustomVars();
    root.setAttribute("data-theme", "dark");
    return;
  }

  // Built-in themes: clear any custom vars and set the dataset theme
  clearCustomVars();
  root.setAttribute("data-theme", normalizeThemeToDataset(themeKey));
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(getSettings());

  // Apply theme to DOM whenever these values change
  useEffect(() => {
    applyThemeToDom(settings);
  }, [settings.colorMode, settings.colorTheme]); // ✅ no eslint-disable needed

  const patch = (updates) => {
    const next = { ...settings, ...updates };
    setSettings(next);
    updateSettings(updates); // storage merges safely via storage.js
  };

  const toggleWeightUnit = () => {
    patch({ weightUnit: settings.weightUnit === "lbs" ? "kg" : "lbs" });
  };

  const setColorMode = (mode) => patch({ colorMode: mode });
  const setColorTheme = (theme) => patch({ colorTheme: theme });
  const setProgressMetric = (metric) => patch({ progressMetric: metric });

  return (
    <SettingsContext.Provider
      value={{
        // raw
        ...settings,

        // existing API
        weightUnit: settings.weightUnit,
        toggleWeightUnit,

        // API your pages are using
        colorMode: settings.colorMode,
        setColorMode,
        colorTheme: settings.colorTheme,
        setColorTheme,
        progressMetric: settings.progressMetric,
        setProgressMetric,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
