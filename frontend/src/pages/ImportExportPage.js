import React, { useState } from 'react';
import { Download, Upload, FileText, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { exportToCSV, importFromCSV, getWorkouts } from '../utils/storage';
import { toast } from 'sonner';

const ImportExportPage = () => {
  const [importFile, setImportFile] = useState(null);
  const [importErrors, setImportErrors] = useState(null);
  const [importSuccess, setImportSuccess] = useState(null);

  const handleExport = () => {
    const csv = exportToCSV();
    if (!csv) {
      toast.error('No workout data to export');
      return;
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `gym-strength-programme-${new Date().toISOString().split('T')[0]}.csv`;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Workout data exported!', {
      description: `File saved to your Downloads folder as ${filename}`
    });
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Please select a file');
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
      toast.error('Failed to read file');
      setImportErrors([`Failed to read file: ${error.message}`]);
      setImportSuccess(null);
    }
  };

  const workouts = getWorkouts();
  const totalWorkouts = workouts.length;
  const totalSets = workouts.reduce((sum, w) => 
    sum + w.exercises.reduce((eSum, e) => eSum + (e.sets?.length || 0), 0), 0
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-card to-background border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gradient-primary mb-2">
            Import / Export
          </h1>
          <p className="text-sm text-muted-foreground">
            Backup and restore your workout data
          </p>
        </div>
      </div>

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
              <div className="flex items-center gap-2">
                <span>📅</span>
                <span>
                  First workout: {new Date(workouts[workouts.length - 1].date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span>📅</span>
                <span>
                  Latest workout: {new Date(workouts[0].date).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Export Section */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Export Data
          </h2>
          
          <p className="text-sm text-muted-foreground mb-4">
            Download all your workout history as a CSV file. Use this to backup your data or analyze it in spreadsheet software.
          </p>

          <div className="bg-muted/30 rounded-lg p-4 border border-border mb-4">
            <div className="text-sm font-semibold text-foreground mb-2">CSV Format:</div>
            <div className="text-xs text-muted-foreground font-mono">
              Date, Workout, Exercise, Set, Weight, Reps, Notes
            </div>
          </div>

          <Button
            onClick={handleExport}
            size="lg"
            className="w-full"
            disabled={totalWorkouts === 0}
          >
            <Download className="w-5 h-5 mr-2" />
            Export to CSV
          </Button>
        </div>

        {/* Import Section */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Import Data
          </h2>
          
          <p className="text-sm text-muted-foreground mb-4">
            Import historical workout data from a CSV file. The file must match the export format.
          </p>

          {/* File Input */}
          <div className="mb-4">
            <label className="text-sm font-medium text-foreground block mb-2">
              Select CSV file
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                setImportFile(e.target.files[0]);
                setImportErrors(null);
                setImportSuccess(null);
              }}
              className="block w-full text-sm text-foreground file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer border border-border rounded-lg bg-muted/30"
            />
          </div>

          {/* Import Success */}
          {importSuccess && (
            <div className="mb-4 p-4 bg-success/10 border border-success/50 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-success text-xl">✓</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-success mb-1">Import Successful!</div>
                  <div className="text-xs text-success/80">{importSuccess}</div>
                </div>
              </div>
            </div>
          )}

          {/* Import Errors */}
          {importErrors && (
            <div className="mb-4 p-4 bg-destructive/10 border border-destructive/50 rounded-lg">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-destructive mb-2">Import Errors:</div>
                  <div className="text-xs text-destructive space-y-1 max-h-48 overflow-y-auto">
                    {importErrors.map((error, index) => (
                      <div key={index}>• {error}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Format Info */}
          <div className="bg-muted/30 rounded-lg p-4 border border-border mb-4">
            <div className="text-sm font-semibold text-foreground mb-2">Required CSV Format:</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>• Headers: Date, Workout, Exercise, Set, Weight, Reps, Notes</div>
              <div>• Date format: MM/DD/YYYY or any standard date format</div>
              <div>• Workout: A, B, C, etc.</div>
              <div>• Weight and Reps must be numeric</div>
            </div>
          </div>

          <Button
            onClick={handleImport}
            size="lg"
            className="w-full"
            disabled={!importFile}
          >
            <Upload className="w-5 h-5 mr-2" />
            Import from CSV
          </Button>
        </div>

        {/* Warning */}
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
          <div className="text-sm text-foreground">
            <div className="font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Important Notes:
            </div>
            <ul className="space-y-1 text-muted-foreground text-xs">
              <li>• Imported data will be <strong>added</strong> to your existing workouts (not replaced)</li>
              <li>• Make sure to export your data regularly as a backup</li>
              <li>• CSV files can be edited in Excel, Google Sheets, or any text editor</li>
              <li>• Invalid rows will be skipped with error messages</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportExportPage;