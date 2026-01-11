// src/contexts/SettingsContext.js
import React, { useEffect, useMemo, useState } from "react";
import { getSettings, updateSettings } from "../utils/storage";

const SettingsContext = React.createContext(null);

export const useSettings = () => {
  const context = React.useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
};

const convertWeight = (weight, fromUnit, toUnit) => {
  const w = Number(weight);
  if (!Number.isFinite(w)) return weight;

  if (fromUnit === toUnit) return w;

  // lbs <-> kg
  if (fromUnit === "lbs" && toUnit === "kg") {
    return Math.round((w / 2.20462) * 10) / 10;
  }
  if (fromUnit === "kg" && toUnit === "lbs") {
    return Math.round(w * 2.20462 * 10) / 10;
  }
  return w;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => getSettings());

  // In case storage gets migrated / reset and you re-open app
  useEffect(() => {
    setSettings(getSettings());
  }, []);

  const updateSetting = (key, value) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    updateSettings({ [key]: value });
  };

  const toggleWeightUnit = () => {
    updateSetting("weightUnit", settings.weightUnit === "lbs" ? "kg" : "lbs");
  };

  const setStatsMetric = (metric) => {
    // "maxWeight" | "e1rm"
    updateSetting("statsMetric", metric);
  };

  const value = useMemo(
    () => ({
      settings,
      updateSetting,

      weightUnit: settings.weightUnit || "kg",
      toggleWeightUnit,

      statsMetric: settings.statsMetric || "maxWeight",
      setStatsMetric,

      convertWeight,
    }),
    [settings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};
