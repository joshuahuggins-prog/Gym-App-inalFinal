// src/contexts/SettingsContext.js
import React, { useEffect, useMemo, useState } from "react";
import { getSettings, updateSettings } from "../utils/storage";

const SettingsContext = React.createContext(null);

export const useSettings = () => {
  const ctx = React.useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
};

const DEFAULTS = {
  weightUnit: "kg",          // "kg" | "lbs"
  theme: "dark",
  statsMetric: "maxWeight",  // "maxWeight" | "e1rm"
};

export const SettingsProvider = ({ children }) => {
  // Load once (merge defaults for backwards compatibility)
  const [settings, setSettings] = useState(() => {
    const stored = getSettings() || {};
    return { ...DEFAULTS, ...stored };
  });

  // If storage changes structure later, keep defaults applied
  useEffect(() => {
    setSettings((prev) => ({ ...DEFAULTS, ...prev }));
  }, []);

  const persist = (next) => {
    setSettings(next);
    updateSettings(next);
  };

  const updateSetting = (key, value) => {
    const next = { ...settings, [key]: value };
    persist(next);
  };

  const toggleWeightUnit = () => {
    updateSetting("weightUnit", settings.weightUnit === "lbs" ? "kg" : "lbs");
  };

  const setStatsMetric = (metric) => {
    // guard against invalid values
    const nextMetric = metric === "e1rm" ? "e1rm" : "maxWeight";
    updateSetting("statsMetric", nextMetric);
  };

  const convertWeight = (weight, fromUnit, toUnit) => {
    const w = Number(weight);
    if (!Number.isFinite(w)) return 0;
    if (fromUnit === toUnit) return w;

    if (fromUnit === "lbs" && toUnit === "kg") {
      return Math.round((w / 2.20462) * 10) / 10;
    }
    if (fromUnit === "kg" && toUnit === "lbs") {
      return Math.round(w * 2.20462 * 10) / 10;
    }
    return w;
  };

  const value = useMemo(
    () => ({
      settings,
      updateSetting,
      toggleWeightUnit,
      convertWeight,

      // common shortcuts
      weightUnit: settings.weightUnit,
      statsMetric: settings.statsMetric,
      setStatsMetric,
    }),
    [settings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};
