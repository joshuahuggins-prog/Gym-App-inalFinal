import React, { useState, useRef } from "react";

const numberKeys = [
  "1","2","3",
  "4","5","6",
  "7","8","9",
  ".","0","del"
];

const quickWeights = ["+2.5","+5","+10"];

const GymNumberPad = ({ value, setValue }) => {

  const [mode, setMode] = useState("number");
  const holdTimer = useRef(null);
  const holdInterval = useRef(null);

  const press = (k) => {
    if (k === "del") {
      setValue((v) => v.slice(0, -1));
      return;
    }

    setValue((v) => v + k);
  };

  const addWeight = (amount) => {
    const num = parseFloat(value || "0");
    const add = parseFloat(amount.replace("+",""));
    setValue((num + add).toString());
  };

  const startHold = (amount) => {

    addWeight(amount);

    holdTimer.current = setTimeout(() => {

      holdInterval.current = setInterval(() => {
        addWeight(amount);
      }, 150);

    }, 400);
  };

  const stopHold = () => {

    clearTimeout(holdTimer.current);
    clearInterval(holdInterval.current);

  };

  if (mode === "text") {
    return (
      <div className="bg-card border-t border-border p-3 space-y-2">

        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full p-3 rounded-lg border border-border bg-background text-foreground text-lg"
        />

        <button
          onClick={() => setMode("number")}
          className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold active:scale-95"
        >
          123 Number Pad
        </button>

      </div>
    );
  }

  return (
    <div className="bg-card border-t border-border p-3 space-y-3">

      {/* Quick weight buttons */}
      <div className="grid grid-cols-3 gap-2">
        {quickWeights.map((w) => (
          <button
            key={w}
            onMouseDown={() => startHold(w)}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            onTouchStart={() => startHold(w)}
            onTouchEnd={stopHold}
            className="py-3 rounded-lg bg-primary/10 text-primary font-semibold active:scale-95 transition"
          >
            {w}
          </button>
        ))}
      </div>

      {/* Number keypad */}
      <div className="grid grid-cols-3 gap-2">
        {numberKeys.map((k) => (
          <button
            key={k}
            onClick={() => press(k)}
            className={`py-4 rounded-lg font-semibold text-lg active:scale-95 transition
              ${
                k === "del"
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-muted text-foreground"
              }
            `}
          >
            {k === "del" ? "⌫" : k}
          </button>
        ))}
      </div>

      {/* Keyboard mode toggle */}
      <button
        onClick={() => setMode("text")}
        className="w-full py-3 rounded-lg bg-secondary text-secondary-foreground font-semibold active:scale-95"
      >
        ABC Text Keyboard
      </button>

    </div>
  );
};

export default GymNumberPad;
