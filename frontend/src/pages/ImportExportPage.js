import React, { useMemo, useState } from "react";
import { Download, Upload, FileText, AlertCircle, Database } from "lucide-react";
import { Button } from "../components/ui/button";
import AppHeader from "../components/AppHeader";
import {
  exportToCSV,
  importFromCSV,
  getWorkouts,
  exportAllDataToJSON,
  importAllDataFromJSON,
} from "../utils/storage";
import { toast } from "sonner";

const ImportExportPage = () => {
  const [importFile, setImportFile] = useState(null);
  const [importErrors, setImportErrors] = useState(null);
  const [importSuccess, setImportSuccess] = useState(null);

  const [fullImportFile, setFullImportFile] = useState(null);
  const [fullImportMode, setFullImportMode] = useState("overwrite"); // "overwrite" | "merge"

  // ----- Workout history CSV -----
  const handleExportCSV = () => {
    const csv = exportToCSV();
    if (!csv) {
      toast.error("No workout data to export");
      return;
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const filename = `gym-workouts-${new Date().toISOString().split("T")[0]}.csv`;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success("Workout history exported!", { description: `Saved as ${filename}` });
  };

  const handleImportCSV = async () => {
    if (!importFile) {
      toast.error("Please select a file");
      return;
    }

    try {
      const text = await importFile.text();
      const result = importFromCSV(text);

      if (result.success) {
        setImportSuccess(`Successfully imported ${result.imported} workouts!`);
        toast.success(`Imported ${result.imported} workouts!`);

        if (result.errors && result.errors.length > 0) {
          setImportErrors(result.errors);
        } else {
          setImportErrors(null);
          setImportFile(null);
        }
      } else {
        toast.error(result.error);
        setImportErrors([result.error]);
        setImportSuccess(null);
      }
    } catch (error) {
      toast.error("Failed to read file");
      setImportErrors([`Failed to read file: ${error.message}`]);
      setImportSuccess(null);
    }
  };

  // ----- Full backup JSON -----
  const handleExportBackup = () => {
    const json = exportAllDataToJSON();
    if (!json) {
      toast.error("Nothing to export (or export failed).");
      return;
    }

    const blob = new Blob([json], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    const filename = `gym-app-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success("Full backup exported!", { description: `Saved as ${filename}` });
  };

  const handleImportBackup = async () => {
    if (!fullImportFile) {
      toast.error("Please select a backup file (.json)");
      return;
    }

    const ok = window.confirm(
      fullImportMode === "overwrite"
        ? "Import full backup?\n\nThis will OVERWRITE all data on this device (workouts, programmes, exercises, settings)."
        : "Import full backup?\n\nThis will MERGE workouts and overwrite settings/programmes/exercises from the file."
    );
    if (!ok) return;

    try {
      const text = await fullImportFile.text();
      const result = importAllDataFromJSON(text, { merge: fullImportMode === "merge" });

      if (result.success) {
        toast.success("Backup imported! Reloading…");
        setTimeout(() => window.location.reload(), 600);
      } else {
        toast.error(result.error || "Import failed.");
      }
    } catch (e) {
      toast.error("Failed to read backup file");
      console.error(e);
    }
  };

  const workouts = useMemo(() => getWorkouts() || [], []);
  const totalWorkouts = workouts.length;

  const totalSets = useMemo(() => {
    return workouts.reduce(
      (sum, w) =>
        sum +
        (w?.exercises || []).reduce(
          (eSum, e) => eSum + (e?.sets?.length || 0),
          0
        ),
      0
    );
  }, [workouts]);

  const firstWorkoutDate = useMemo(() => {
    if (!workouts.length) return null;
    const d = workouts[workouts.length - 1]?.date;
    return d ? new Date(d) : null;
  }, [workouts]);

  const latestWorkoutDate = useMemo(() => {
    if (!workouts.length) return null;
    const d = workouts[0]?.date;
    return d ? new Date(d) : null;
  }, [workouts]);

  return (
    <AppHeader
      title="Import / Export"
      subtitle="Backup and restore your data"
      rightIconSrc="/icons/icon-overlay-white-32-v1.png"
      rightIconAlt="Gym App"
      actions={
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
          <Button
            type="button"
            onClick={handleExportBackup}
            className="w-full"
            size="lg"
          >
            <Download className="w-5 h-5 mr-2" />
            Export backup
          </Button>

          <Button
            type="button"
            onClick={handleExportCSV}
            className="w-full"
            size="lg"
            variant="secondary"
            disabled={totalWorkouts === 0}
          >
            <FileText className="w-5 h-5 mr-2" />
            Export CSV
          </Button>
        </div>
      }
    >
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Current Data Summary */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Current Data
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <div className="text-sm text-muted-foreground mb-1">Total Workouts</div>
              <div className="text-3xl font-bold text-foreground">{totalWorkouts}</div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <div className="text-sm text-muted-foreground mb-1">Total Sets Logged</div>
              <div className="text-3xl font-bold text-foreground">{totalSets}</div>
            </div>
          </div>

          {totalWorkouts > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              {firstWorkoutDate && (
                <div className="flex items-center gap-2">
                  <span>📅</span>
                  <span>First workout: {firstWorkoutDate.toLocaleDateString()}</span>
                </div>
              )}
              {latestWorkoutDate && (
                <div className="flex items-center gap-2 mt-1">
                  <span>📅</span>
                  <span>Latest workout: {latestWorkoutDate.toLocaleDateString()}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FULL BACKUP (JSON) */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Full Backup (Recommended)
          </h2>

          <p className="text-sm text-muted-foreground mb-4">
            Exports and imports <strong>everything</strong>: workouts, programmes,
            exercises, settings, PRs, bodyweight, video links, and your workout pattern.
          </p>

          <div className="grid grid-cols-1 gap-3">
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <label className="text-sm font-medium text-foreground block mb-2">
                Select backup file (.json)
              </label>
              <input
                type="file"
                accept=".json,application/json"
                onChange={(e) => setFullImportFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-foreground file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer border border-border rounded-lg bg-muted/30"
              />

              <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs text-muted-foreground">Import mode:</div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={fullImportMode === "overwrite" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFullImportMode("overwrite")}
                  >
                    Overwrite
                  </Button>
                  <Button
                    type="button"
                    variant={fullImportMode === "merge" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFullImportMode("merge")}
                  >
                    Merge Workouts
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleImportBackup}
                size="lg"
                className="w-full mt-4"
                disabled={!fullImportFile}
              >
                <Upload className="w-5 h-5 mr-2" />
                Import Full Backup
              </Button>

              <div className="mt-3 text-xs text-muted-foreground">
                <strong>Overwrite</strong> replaces everything on this device.{" "}
                <strong>Merge Workouts</strong> merges workout history by id, but still
                overwrites settings/programmes/exercises from the file.
              </div>
            </div>
          </div>
        </div>

        {/* Export Section (CSV workouts only) */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Export Workout History (CSV)
          </h2>

          <p className="text-sm text-muted-foreground mb-4">
            Download your workout history as a CSV file. Great for spreadsheets.
          </p>

          <div className="bg-muted/30 rounded-lg p-4 border border-border mb-4">
            <div className="text-sm font-semibold text-foreground mb-2">CSV Format:</div>
            <div className="text-xs text-muted-foreground font-mono">
              Date, Workout, Exercise, Set, Weight, Reps, Notes
            </div>
          </div>

          <Button
            onClick={handleExportCSV}
            size="lg"
            className="w-full"
            disabled={totalWorkouts === 0}
          >
            <Download className="w-5 h-5 mr-2" />
            Export Workout History (CSV)
          </Button>
        </div>

        {/* Import Section (CSV workouts only) */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Import Workout History (CSV)
          </h2>

          <p className="text-sm text-muted-foreground mb-4">
            Import historical workout data from a CSV file. It will be <strong>added</strong>{" "}
            to your existing workouts.
          </p>

          <div className="mb-4">
            <label className="text-sm font-medium text-foreground block mb-2">
              Select CSV file
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                setImportFile(e.target.files?.[0] || null);
                setImportErrors(null);
                setImportSuccess(null);
              }}
              className="block w-full text-sm text-foreground file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer border border-border rounded-lg bg-muted/30"
            />
          </div>

          {importSuccess && (
            <div className="mb-4 p-4 bg-success/10 border border-success/50 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-success text-xl">✓</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-success mb-1">
                    Import Successful!
                  </div>
                  <div className="text-xs text-success/80">{importSuccess}</div>
                </div>
              </div>
            </div>
          )}

          {importErrors && (
            <div className="mb-4 p-4 bg-destructive/10 border border-destructive/50 rounded-lg">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-destructive mb-2">
                    Import Errors:
                  </div>
                  <div className="text-xs text-destructive space-y-1 max-h-48 overflow-y-auto">
                    {importErrors.map((error, index) => (
                      <div key={index}>• {error}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleImportCSV}
            size="lg"
            className="w-full"
            disabled={!importFile}
          >
            <Upload className="w-5 h-5 mr-2" />
            Import Workout History (CSV)
          </Button>
        </div>

        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
          <div className="text-sm text-foreground">
            <div className="font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Important Notes:
            </div>
            <ul className="space-y-1 text-muted-foreground text-xs">
              <li>• CSV import will <strong>add</strong> workouts (not replace)</li>
              <li>• Full backup import can <strong>overwrite</strong> your data — export first!</li>
              <li>• Backups are saved to your browser’s Downloads folder</li>
            </ul>
          </div>
        </div>
      </div>
    </AppHeader>
  );
};

export default ImportExportPage;