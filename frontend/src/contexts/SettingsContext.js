import React, { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../utils/storage';

const SettingsContext = React.createContext();

export const useSettings = () => {
  const context = React.useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(getSettings());

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    updateSettings(newSettings);
  };

  const toggleWeightUnit = () => {
    const newUnit = settings.weightUnit === 'lbs' ? 'kg' : 'lbs';
    updateSetting('weightUnit', newUnit);
  };

  const convertWeight = (weight, fromUnit, toUnit) => {
    if (fromUnit === toUnit) return weight;
    if (fromUnit === 'lbs' && toUnit === 'kg') {
      return Math.round((weight / 2.20462) * 10) / 10;
    }
    if (fromUnit === 'kg' && toUnit === 'lbs') {
      return Math.round((weight * 2.20462) * 10) / 10;
    }
    return weight;
  };

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