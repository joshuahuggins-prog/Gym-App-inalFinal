import React, { useEffect, useState } from 'react';
import { Trophy, Sparkles, X } from 'lucide-react';
import { Button } from '../components/ui/button';

const PRCelebration = ({ exercise, newWeight, oldWeight, onClose }) => {
  const [confetti, setConfetti] = useState([]);

  useEffect(() => {
    // Generate confetti particles
    const particles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 1,
      color: ['hsl(var(--primary))', 'hsl(var(--gold))', 'hsl(var(--success))'][Math.floor(Math.random() * 3)]
    }));
    setConfetti(particles);

    // Auto close after 5 seconds
    const timer = setTimeout(() => {
      onClose?.();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm animate-fadeIn">
      {/* Confetti */}
      {confetti.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 rounded-full animate-confetti"
          style={{
            left: `${particle.left}%`,
            top: '-20px',
            backgroundColor: particle.color,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`
          }}
        />
      ))}

      {/* Content */}
      <div className="relative bg-card border-2 border-gold rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 text-center space-y-6 glow-gold">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="inline-block p-4 bg-gold/10 rounded-full animate-bounce-slow">
          <Trophy className="w-16 h-16 text-gold" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-gold" />
            <h2 className="text-2xl font-bold text-gradient-gold">
              New Personal Record!
            </h2>
            <Sparkles className="w-5 h-5 text-gold" />
          </div>
          <p className="text-lg text-foreground font-semibold">
            {exercise}
          </p>
        </div>

        <div className="space-y-3 py-4">
          {oldWeight && (
            <div className="text-sm text-muted-foreground">
              Previous Best:
              <span className="block text-lg font-semibold text-foreground mt-1">
                {oldWeight} lbs
              </span>
            </div>
          )}
          
          <div className="text-3xl font-bold text-gradient-gold">
            {newWeight} lbs
          </div>
          
          {oldWeight && (
            <div className="text-success font-semibold">
              +{(newWeight - oldWeight).toFixed(1)} lbs increase! 💪
            </div>
          )}
        </div>

        <div className="text-sm text-muted-foreground p-4 bg-gold/5 rounded-lg border border-gold/20">
          Keep crushing it! Consistency is the key to greatness.
        </div>

        <Button onClick={onClose} className="w-full bg-gold hover:bg-gold/90 text-gold-foreground font-semibold">
          Awesome! Let's go! 🔥
        </Button>
      </div>
    </div>
  );
};

export default PRCelebration;