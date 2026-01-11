import React from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { calculateWarmupWeights } from '../data/workoutData';
import { useSettings } from '../contexts/SettingsContext';

const WarmupCalculator = ({ exercise, topSetWeight, open, onClose }) => {
  const { weightUnit } = useSettings();
  const warmups = calculateWarmupWeights(topSetWeight);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Warmup Sets for {exercise}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            Top Set: <span className="text-foreground font-semibold">{topSetWeight} {weightUnit}</span>
          </div>

          <div className="space-y-3">
            {warmups.map((warmup, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      {warmup.percent}% of top set
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {warmup.weight} {weightUnit}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {warmup.reps}
                  </div>
                  <div className="text-xs text-muted-foreground">reps</div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-xs text-muted-foreground p-3 bg-card border border-border rounded-lg">
            💡 <span className="font-semibold">Tip:</span> Rest 60-90 seconds between warmup sets. These prepare your muscles and CNS for the heavy working sets.
          </div>
        </div>

        <Button onClick={onClose} className="w-full">
          Got it!
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default WarmupCalculator;