// src/pages/SetupPage.js
import React, { useMemo } from "react";
import AppHeader from "../components/AppHeader";
import { FileText, Dumbbell, Settings as SettingsIcon, Download, ChevronRight } from "lucide-react";

const Row = ({ icon, title, desc, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-4 text-left hover:bg-muted/30 active:scale-[0.99] transition"
  >
    <div className="flex items-start gap-3 min-w-0">
      <div className="mt-0.5 text-primary">{icon}</div>
      <div className="min-w-0">
        <div className="font-semibold text-foreground">{title}</div>
        {desc ? (
          <div className="text-sm text-muted-foreground italic mt-0.5 truncate">
            {desc}
          </div>
        ) : null}
      </div>
    </div>
    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
  </button>
);

const Section = ({ title, children }) => (
  <div className="space-y-3">
    <div className="px-1">
      <div className="text-sm font-semibold text-foreground">{title}</div>
    </div>
    <div className="space-y-2">{children}</div>
  </div>
);

export default function SetupPage({ onNavigate }) {
  // Small safety so it doesn't crash if prop missing
  const go = useMemo(() => {
    return typeof onNavigate === "function" ? onNavigate : () => {};
  }, [onNavigate]);

  return (
    <AppHeader
      title="Setup"
      subtitle="Plan, preferences and data"
      rightIconSrc={`${process.env.PUBLIC_URL}/icons/icon-overlay-white-32-v1.png`}
      rightIconAlt="Gym App"
    >
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-6">
        {/* PLAN */}
        <Section title="Plan">
          <Row
            icon={<FileText className="w-5 h-5" />}
            title="Programmes"
            desc="Build and edit your workout A/B plan and exercise order."
            onClick={() => go("programmes")}
          />
          <Row
            icon={<Dumbbell className="w-5 h-5" />}
            title="Exercises"
            desc="Manage your exercise list, videos, and alternatives."
            onClick={() => go("exercises")}
          />
        </Section>

        {/* APP SETTINGS */}
        <Section title="App settings">
          <Row
            icon={<SettingsIcon className="w-5 h-5" />}
            title="Settings"
            desc="Theme, units, progression style and app behaviour."
            onClick={() => go("settings")}
          />
        </Section>

        {/* DATA MANAGEMENT */}
        <Section title="Data management">
          <Row
            icon={<Download className="w-5 h-5" />}
            title="Data"
            desc="Backup/restore your app data or export workouts to CSV."
            onClick={() => go("import-export")}
          />
        </Section>
      </div>
    </AppHeader>
  );
}