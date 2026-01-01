import React, { useState, useEffect } from 'react';
import { X, Play, Pause } from 'lucide-react';
import { Button } from '../components/ui/button';

const RestTimer = ({ duration, onComplete, onClose }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete?.();
      return;
    }

    if (isPaused) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isPaused, onComplete]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((duration - timeLeft) / duration) * 100;

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4 relative overflow-hidden">
        {/* Close button */}
        <button
          onClick={() => {
            onClose?.();
            setIsVisible(false);
          }}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-6">
          <h3 className="text-lg font-semibold text-foreground">Rest Timer</h3>

          {/* Circular Progress */}
          <div className="relative w-48 h-48 mx-auto">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 88}`}
                strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
                className="transition-all duration-1000 ease-linear"
                style={{ filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.5))' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl font-bold text-gradient-primary">
                  {formatTime(timeLeft)}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {timeLeft === 0 ? "Time's up!" : 'remaining'}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => setIsPaused(!isPaused)}
              variant="outline"
              size="lg"
              className="flex-1"
            >
              {isPaused ? (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              )}
            </Button>
            <Button
              onClick={() => setTimeLeft(duration)}
              variant="outline"
              size="lg"
            >
              Reset
            </Button>
          </div>

          {timeLeft === 0 && (
            <div className="animate-bounce">
              <span className="text-2xl">🎯</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestTimer;