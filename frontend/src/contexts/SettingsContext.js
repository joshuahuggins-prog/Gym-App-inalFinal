import React, { useEffect, useState } from "react";
import { getSettings, updateSettings } from "../utils/storage";

const SettingsContext = React.createContext();

export const useSettings = () => {
  const ctx = React.useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(getSettings());

  // Apply theme to DOM whenever these values change
  useEffect(() => {
    const root = document.documentElement;

    // Tailwind dark mode class
    if (settings.colorMode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");

    // Theme attribute for your CSS tokens
    root.setAttribute("data-theme", settings.colorTheme || "blue");
  }, [settings.colorMode, settings.colorTheme]);

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

        // NEW API your pages are using
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