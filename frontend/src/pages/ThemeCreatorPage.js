// src/pages/ThemeCreatorPage.js
import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save, Palette } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";

const STORAGE_KEY = "gym_custom_themes";

const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

const hexToRgb = (hex) => {
  const raw = String(hex || "").trim().replace("#", "");
  if (raw.length !== 6) return null;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  if (![r, g, b].every((v) => Number.isFinite(v))) return null;
  return { r, g, b };
};

const rgbToHsl = ({ r, g, b }) => {
  // r,g,b in 0..255
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;

  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rr:
        h = ((gg - bb) / d) % 6;
        break;
      case gg:
        h = (bb - rr) / d + 2;
        break;
      default:
        h = (rr - gg) / d + 4;
        break;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  return {
    h: clamp(Math.round(h), 0, 360),
    s: clamp(Math.round(s * 100), 0, 100),
    l: clamp(Math.round(l * 100), 0, 100),
  };
};

const hslStr = (h, s, l) => `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;

const luminance01 = ({ r, g, b }) => {
  // relative luminance-ish, good enough for choosing black/white text
  const toLin = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const R = toLin(r);
  const G = toLin(g);
  const B = toLin(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
};

const pickBWForeground = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#ffffff";
  const lum = luminance01(rgb);
  // threshold tuned for typical UI
  return lum > 0.45 ? "#111111" : "#ffffff";
};

const getCustomThemes = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveCustomThemes = (themes) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
  } catch {
    // ignore
  }
};

const applyVars = (vars) => {
  const root = document.documentElement;
  Object.entries(vars || {}).forEach(([k, v]) => {
    root.style.setProperty(k, v);
  });
};

const isDarkModeNow = () => {
  // Tailwind/shadcn often use .dark on html. If you use something else, we can adjust later.
  return document.documentElement.classList.contains("dark");
};

const buildPalette = ({ baseHex, accentHex, intensity01 }) => {
  // intensity01: 0..1 where 0 = lighter overall, 1 = darker overall
  const baseRgb = hexToRgb(baseHex) || { r: 11, g: 31, b: 58 };
  const baseHsl = rgbToHsl(baseRgb);

  const accentRgb = hexToRgb(accentHex) || { r: 244, g: 196, b: 48 };
  const accentHsl = rgbToHsl(accentRgb);

  // Light palette targets
  // As intensity increases, light mode gets slightly less bright (to stay cohesive)
  const lightBgL = clamp(97 - Math.round(intensity01 * 10), 82, 97);
  const lightCardL = clamp(lightBgL - 4, 75, 95);
  const lightTextL = 12;

  // Dark palette targets
  // As intensity increases, dark mode gets darker and higher contrast
  const darkBgL = clamp(12 - Math.round(intensity01 * 4), 6, 14);
  const darkCardL = clamp(darkBgL + 6, 10, 22);
  const darkTextL = 92;

  // Use base hue/sat for surfaces (keeps theme cohesive)
  const baseHue = baseHsl.h;
  const baseSat = clamp(baseHsl.s, 8, 35);

  const accentHue = accentHsl.h;
  const accentSat = clamp(accentHsl.s, 55, 95);
  const accentLight = clamp(accentHsl.l, 38, 58);

  // Strong accent = opposite hue
  const strongHue = (accentHue + 180) % 360;

  // Borders + muted derived from surfaces
  const mkVars = (mode) => {
    const isDark = mode === "dark";
    const bgL = isDark ? darkBgL : lightBgL;
    const cardL = isDark ? darkCardL : lightCardL;
    const fgL = isDark ? darkTextL : lightTextL;

    const mutedL = isDark ? clamp(cardL + 6, 16, 35) : clamp(cardL - 2, 70, 92);
    const mutedFgL = isDark ? clamp(fgL - 40, 40, 65) : 35;

    const borderL = isDark ? clamp(cardL + 10, 18, 38) : clamp(cardL - 10, 55, 85);

    // Foreground for accent chosen via simple luminance check on accentHex
    const accentFgHex = pickBWForeground(accentHex);
    const accentFgHsl = rgbToHsl(hexToRgb(accentFgHex) || { r: 255, g: 255, b: 255 });

    // For "gold" and success, keep stable defaults but themed slightly
    const goldH = 45;
    const goldS = 85;
    const goldL = isDark ? 52 : 48;

    const successH = 142;
    const successS = 55;
    const successL = isDark ? 42 : 38;

    const destructiveH = 0;
    const destructiveS = 72;
    const destructiveL = isDark ? 50 : 45;

    const primary = hslStr(accentHue, accentSat, clamp(accentLight + (isDark ? 4 : 0), 35, 62));
    const primaryGlow = hslStr(accentHue, clamp(accentSat + 5, 55, 100), clamp(accentLight + 10, 40, 70));
    const background = hslStr(baseHue, baseSat, bgL);
    const foreground = hslStr(baseHue, clamp(baseSat, 10, 30), fgL);
    const card = hslStr(baseHue, baseSat, cardL);
    const cardFg = foreground;

    const popover = card;
    const popoverFg = foreground;

    const secondary = hslStr(baseHue, clamp(baseSat - 5, 6, 25), mutedL);
    const secondaryFg = foreground;

    const muted = hslStr(baseHue, clamp(baseSat - 6, 5, 22), mutedL);
    const mutedFg = hslStr(baseHue, 10, mutedFgL);

    const accent = primary;
    const accentFg = hslStr(accentFgHsl.h, accentFgHsl.s, accentFgHsl.l);

    const accentStrong = hslStr(strongHue, 70, isDark ? 55 : 45);
    const accentStrongFg = isDark ? "0 0% 10%" : "0 0% 100%";

    const border = hslStr(baseHue, clamp(baseSat - 10, 5, 20), borderL);
    const input = border;
    const ring = primary;

    const gold = hslStr(goldH, goldS, goldL);
    const goldFg = foreground;

    const success = hslStr(successH, successS, successL);
    const successFg = "0 0% 100%";

    const destructive = hslStr(destructiveH, destructiveS, destructiveL);
    const destructiveFg = "0 0% 100%";

    // Charts follow main accents
    const chart1 = primary;
    const chart2 = gold;
    const chart3 = success;
    const chart4 = hslStr(262, 60, 52);
    const chart5 = destructive;

    // Gradients and shadows (optional, but keeps parity with your current themes)
    const gradientPrimary = `linear-gradient(135deg, hsl(${primary}), hsl(${primaryGlow}))`;
    const gradientGold = `linear-gradient(135deg, hsl(${gold}), hsl(35 80% ${isDark ? 52 : 46}%))`;
    const gradientHero = `linear-gradient(180deg, hsl(${background}), hsl(${card}))`;

    const shadowElegant = `0 10px 30px -10px hsl(${primary} / ${isDark ? 0.18 : 0.2})`;
    const shadowGlow = `0 0 40px hsl(${primaryGlow} / ${isDark ? 0.18 : 0.22})`;
    const shadowGold = `0 10px 30px -10px hsl(${gold} / ${isDark ? 0.16 : 0.18})`;

    return {
      "--background": background,
      "--foreground": foreground,
      "--card": card,
      "--card-foreground": cardFg,
      "--popover": popover,
      "--popover-foreground": popoverFg,

      "--primary": primary,
      "--primary-foreground": accentFg,
      "--primary-glow": primaryGlow,

      "--gold": gold,
      "--gold-foreground": goldFg,

      "--secondary": secondary,
      "--secondary-foreground": secondaryFg,

      "--muted": muted,
      "--muted-foreground": mutedFg,

      "--accent": accent,
      "--accent-foreground": accentFg,

      "--accent-strong": accentStrong,
      "--accent-strong-foreground": accentStrongFg,

      "--destructive": destructive,
      "--destructive-foreground": destructiveFg,

      "--border": border,
      "--input": input,
      "--ring": ring,

      "--success": success,
      "--success-foreground": successFg,

      "--chart-1": chart1,
      "--chart-2": chart2,
      "--chart-3": chart3,
      "--chart-4": chart4,
      "--chart-5": chart5,

      "--gradient-primary": gradientPrimary,
      "--gradient-gold": gradientGold,
      "--gradient-hero": gradientHero,

      "--shadow-elegant": shadowElegant,
      "--shadow-glow": shadowGlow,
      "--shadow-gold": shadowGold,
    };
  };

  return {
    light: mkVars("light"),
    dark: mkVars("dark"),
  };
};

export default function ThemeCreatorPage({ onBack }) {
  const [name, setName] = useState("");
  const [accentHex, setAccentHex] = useState("#F4C430"); // mustard-ish default
  const [baseHex, setBaseHex] = useState("#0B1F3A"); // your dark-blue vibe
  const [intensity, setIntensity] = useState(65); // 0..100 (higher = darker overall)
  const intensity01 = clamp(intensity / 100, 0, 1);

  const palette = useMemo(() => {
    return buildPalette({ baseHex, accentHex, intensity01 });
  }, [baseHex, accentHex, intensity01]);

  const previewVars = useMemo(() => {
    return isDarkModeNow() ? palette.dark : palette.light;
  }, [palette]);

  // Apply preview immediately while editing (but only for custom mode)
  useEffect(() => {
    // Mark custom theme as active and apply preview vars
    document.documentElement.dataset.theme = "custom";
    applyVars(previewVars);
  }, [previewVars]);

  const handleSave = () => {
    const themeName = String(name || "").trim();
    if (!themeName) {
      toast.error("Please name your theme.");
      return;
    }

    const id = `custom_${Date.now()}`;
    const theme = {
      id,
      name: themeName,
      baseHex,
      accentHex,
      intensity,
      vars: palette, // { light: {--token: value}, dark: {...} }
      createdAt: new Date().toISOString(),
    };

    const all = getCustomThemes();
    all.push(theme);
    saveCustomThemes(all);

    // Apply immediately
    document.documentElement.dataset.theme = "custom";
    applyVars(isDarkModeNow() ? theme.vars.dark : theme.vars.light);

    toast.success("Custom theme saved.");
  };

  return (
    <div className="p-4 pb-28" style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft size={18} /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Palette size={18} />
          <h1 className="text-lg font-semibold">Theme Creator</h1>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border p-4" style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="font-medium">Theme details</div>
            <Badge variant="secondary">Custom</Badge>
          </div>

          <label className="text-sm opacity-80">Theme name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Midnight Mustard"
            className="mt-1"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-sm opacity-80">Accent colour</label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="color"
                  value={accentHex}
                  onChange={(e) => setAccentHex(e.target.value)}
                  className="h-10 w-14 rounded-md border"
                  style={{ borderColor: "hsl(var(--border))", background: "transparent" }}
                />
                <Input value={accentHex} onChange={(e) => setAccentHex(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="text-sm opacity-80">Base colour</label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="color"
                  value={baseHex}
                  onChange={(e) => setBaseHex(e.target.value)}
                  className="h-10 w-14 rounded-md border"
                  style={{ borderColor: "hsl(var(--border))", background: "transparent" }}
                />
                <Input value={baseHex} onChange={(e) => setBaseHex(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm opacity-80">Dark ↔ Light</label>
              <span className="text-sm opacity-80">{intensity}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs opacity-70 mt-1">
              <span>lighter</span>
              <span>darker</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border p-4" style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}>
          <div className="font-medium mb-3">Preview</div>

          <div className="rounded-xl p-4 space-y-3" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-elegant)" }}>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ background: "hsl(var(--primary))" }} />
              <div className="text-sm font-semibold">Primary</div>
              <div className="text-xs opacity-70">hsl(var(--primary))</div>
            </div>

            <div className="rounded-xl border p-3" style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}>
              <div className="text-sm font-medium">Card</div>
              <div className="text-xs opacity-70">
                This uses your generated tokens for background, foreground, border and card.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => toast("Primary action")}
                style={{
                  background: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                }}
              >
                Primary
              </Button>

              <Button
                variant="secondary"
                onClick={() => toast("Secondary action")}
                style={{
                  background: "hsl(var(--secondary))",
                  color: "hsl(var(--secondary-foreground))",
                }}
              >
                Secondary
              </Button>

              <Button
                onClick={() => toast("Strong accent")}
                style={{
                  background: "hsl(var(--accent-strong))",
                  color: "hsl(var(--accent-strong-foreground))",
                }}
              >
                Strong
              </Button>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button className="gap-2" onClick={handleSave}>
            <Save size={18} /> Save theme
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setName("");
              setAccentHex("#F4C430");
              setBaseHex("#0B1F3A");
              setIntensity(65);
              toast("Reset theme creator.");
            }}
          >
            Reset
          </Button>
        </div>

        <div className="text-xs opacity-70">
          Saved themes are stored locally on this device in localStorage. You’ll wire the “Create Theme” button in Settings to
          open this page, and the Settings list can load themes from <code>gym_custom_themes</code>.
        </div>
      </div>
    </div>
  );
}
