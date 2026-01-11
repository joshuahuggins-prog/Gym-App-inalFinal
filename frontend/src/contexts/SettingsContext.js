// src/contexts/SettingsContext.js
import React, { useState, useEffect } from "react";
import { getSettings, updateSettings } from "../utils/storage";

const SettingsContext = React.createContext();

export const useSettings = () => {
  const context = React.useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => getSettings());

  // Keep in sync if localStorage changes (e.g. another tab)
  useEffect(() => {
    const onStorage = (e) => {
      // If any setting changes, just reload all settings
      // (storage event only fires across tabs, not same tab)
      if (!e || !e.key) return;
      // If you want to be more specific, you can check your SETTINGS key.
      setSettings(getSettings());
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const updateSetting = (key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      updateSettings(next);
      return next;
    });
  };

  const toggleWeightUnit = () => {
    const newUnit = settings.weightUnit === "lbs" ? "kg" : "lbs";
    updateSetting("weightUnit", newUnit);
  };

  // ✅ Stats metric setter (for charts later)
  const setStatsMetric = (metric) => {
    // allow only known values (safe guard)
    const safe = metric === "e1rm" ? "e1rm" : "maxWeight";
    updateSetting("statsMetric", safe);
  };

  const convertWeight = (weight, fromUnit, toUnit) => {
    if (fromUnit === toUnit) return weight;
    if (fromUnit === "lbs" && toUnit === "kg") {
      return Math.round((weight / 2.20462) * 10) / 10;
    }
    if (fromUnit === "kg" && toUnit === "lbs") {
      return Math.round(weight * 2.20462 * 10) / 10;
    }
    return weight;
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSetting,

        // existing
        toggleWeightUnit,
        convertWeight,
        weightUnit: settings.weightUnit,

        // ✅ new
        statsMetric: settings.statsMetric || "maxWeight",
        setStatsMetric,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};  };

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSetting,
      toggleWeightUnit,
      convertWeight,
      weightUnit: settings.weightUnit
    }}>
      {children}
    </SettingsContext.Provider>
  );
};
