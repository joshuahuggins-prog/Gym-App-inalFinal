import React, { useState } from "react";

const numberKeys = [
  "1","2","3",
  "4","5","6",
  "7","8","9",
  ".","0","del"
];

const quickWeights = ["+2.5","+5","+10"];

const GymNumberPad = ({ value, setValue }) => {

  const [mode, setMode] = useState("number"); // number | text

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

  if (mode === "text") {
    return (
      <div className="bg-card border-t border-border p-3 space-y-2">

        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full p-3 rounded-lg border border-border bg-background text-foreground"
        />

        <button
          onClick={() => setMode("number")}
          className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold"
        >
          123 Number Pad
        </button>

      </div>
    );
  }

  return (
    <div className="bg-card border-t border-border p-3 space-y-3">

      {/* quick weights */}
      <div className="grid grid-cols-3 gap-2">
        {quickWeights.map((w) => (
          <button
            key={w}
            onClick={() => addWeight(w)}
            className="py-3 rounded-lg bg-primary/10 text-primary font-semibold active:scale-95"
          >
            {w}
          </button>
        ))}
      </div>

      {/* keypad */}
      <div className="grid grid-cols-3 gap-2">
        {numberKeys.map((k) => (
          <button
            key={k}
            onClick={() => press(k)}
            className={`py-4 rounded-lg font-semibold text-lg active:scale-95
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

      {/* keyboard toggle */}
      <button
        onClick={() => setMode("text")}
        className="w-full py-3 rounded-lg bg-secondary text-secondary-foreground font-semibold"
      >
        ABC Text Keyboard
      </button>

    </div>
  );
};

export default GymNumberPad;
