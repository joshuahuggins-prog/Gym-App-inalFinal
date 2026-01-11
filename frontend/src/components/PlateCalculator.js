import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { calculatePlates } from '../data/workoutData';
import { useSettings } from '../contexts/SettingsContext';

const PlateCalculator = ({ weight, open, onClose }) => {
  const { weightUnit } = useSettings();
  const plates = calculatePlates(weight, weightUnit);
  const barWeight = weightUnit === 'lbs' ? 45 : 20;

  const plateCounts = plates.reduce((acc, plate) => {
    acc[plate] = (acc[plate] || 0) + 1;
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Plate Loading Calculator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Target Weight</div>
            <div className="text-4xl font-bold text-gradient-primary mt-1">
              {weight} {weightUnit}
            </div>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg border border-border">
            <div className="text-sm text-muted-foreground mb-2">Bar Weight</div>
            <div className="text-2xl font-bold text-foreground">
              {barWeight} {weightUnit}
            </div>
          </div>

          {plates.length > 0 ? (
            <>
              <div className="space-y-2">
                <div className="text-sm font-semibold text-foreground mb-3">
                  Per Side (load these plates):
                </div>
                {Object.entries(plateCounts)
                  .sort(([a], [b]) => parseFloat(b) - parseFloat(a))
                  .map(([plate, count]) => (
                    <div
                      key={plate}
                      className="flex items-center justify-between p-3 bg-card border border-primary/20 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg"
                          style={{
                            background: 'linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.1))',
                            border: '2px solid hsl(var(--primary) / 0.3)'
                          }}
                        >
                          {plate}
                        </div>
                        <span className="text-sm text-muted-foreground">{weightUnit}</span>
                      </div>
                      <div className="text-2xl font-bold text-primary">
                        ×{count}
                      </div>
                    </div>
                  ))}
              </div>

              <div className="text-xs text-muted-foreground p-3 bg-card border border-border rounded-lg">
                💡 Load these plates on <span className="font-semibold">each side</span> of the bar
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Bar only - no plates needed!
            </div>
          )}
        </div>

        <Button onClick={onClose} className="w-full">
          Got it!
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default PlateCalculator;