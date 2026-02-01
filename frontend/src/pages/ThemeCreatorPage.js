// src/pages/ThemeCreatorPage.js
import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save, Palette, Wand2 } from "lucide-react";
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

const hslToken = (h, s, l) => `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;

const luminance01 = ({ r, g, b }) => {
  const toLin = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const R = toLin(r);
  const G = toLin(g);
  const B = toLin(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
};

const pickBWForegroundHex = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#ffffff";
  const lum = luminance01(rgb);
  return lum > 0.45 ? "#111111" : "#ffffff";
};

const hexToHslToken = (hex, fallbackToken) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return fallbackToken;
  const hsl = rgbToHsl(rgb);
  return hslToken(hsl.h, hsl.s, hsl.l);
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

const isDarkModeNow = () => document.documentElement.classList.contains("dark");

/**
 * Build a token palette from:
 * - baseHex controls the surface hue (bg/card/border/etc.)
 * - primaryHex controls primary/accent
 * - secondaryHex controls secondary/muted tint
 * - strongHex controls accent-strong
 * - glowHex controls primary-glow
 * - slider intensity controls overall lightness targets
 */
const buildPalette = ({
  baseHex,
  primaryHex,
  secondaryHex,
  strongHex,
  glowHex,
  intensity01,
}) => {
  const baseRgb = hexToRgb(baseHex) || { r: 11, g: 31, b: 58 };
  const baseHsl = rgbToHsl(baseRgb);

  const baseHue = baseHsl.h;
  const baseSat = clamp(baseHsl.s, 8, 35);

  // Surface targets
  const lightBgL = clamp(97 - Math.round(intensity01 * 10), 82, 97);
  const lightCardL = clamp(lightBgL - 4, 75, 95);
  const lightTextL = 12;

  const darkBgL = clamp(12 - Math.round(intensity01 * 4), 6, 14);
  const darkCardL = clamp(darkBgL + 6, 10, 22);
  const darkTextL = 92;

  // Convert chosen colours to HSL tokens
  const primary = hexToHslToken(primaryHex, "45 90% 45%");
  const secondary = hexToHslToken(secondaryHex, "50 35% 86%");
  const strong = hexToHslToken(strongHex, "215 70% 45%");
  const glow = hexToHslToken(glowHex || primaryHex, primary);

  // Foregrounds based on black/white contrast
  const primaryFgHex = pickBWForegroundHex(primaryHex);
  const secondaryFgHex = pickBWForegroundHex(secondaryHex);
  const strongFgHex = pickBWForegroundHex(strongHex);

  const primaryFg = hexToHslToken(primaryFgHex, "0 0% 100%");
  const secondaryFg = hexToHslToken(secondaryFgHex, "40 25% 12%");
  const strongFg = hexToHslToken(strongFgHex, "0 0% 100%");

  const mkVars = (mode) => {
    const isDark = mode === "dark";
    const bgL = isDark ? darkBgL : lightBgL;
    const cardL = isDark ? darkCardL : lightCardL;
    const fgL = isDark ? darkTextL : lightTextL;

    const mutedL = isDark ? clamp(cardL + 6, 16, 35) : clamp(cardL - 2, 70, 92);
    const mutedFgL = isDark ? clamp(fgL - 40, 40, 65) : 35;
    const borderL = isDark ? clamp(cardL + 10, 18, 38) : clamp(cardL - 10, 55, 85);

    const background = hslToken(baseHue, baseSat, bgL);
    const foreground = hslToken(baseHue, clamp(baseSat, 10, 30), fgL);

    const card = hslToken(baseHue, baseSat, cardL);
    const cardFg = foreground;

    const popover = card;
    const popoverFg = foreground;

    // Muted + muted-foreground derived from surfaces
    const muted = hslToken(baseHue, clamp(baseSat - 6, 5, 22), mutedL);
    const mutedFg = hslToken(baseHue, 10, mutedFgL);

    // Borders/inputs follow surfaces
    const border = hslToken(baseHue, clamp(baseSat - 10, 5, 20), borderL);
    const input = border;

    // Gold/success/destructive can be kept stable
    const gold = isDark ? "45 85% 52%" : "45 85% 48%";
    const goldFg = foreground;

    const success = isDark ? "142 55% 42%" : "142 55% 38%";
    const successFg = "0 0% 100%";

    const destructive = isDark ? "0 72% 50%" : "0 72% 45%";
    const destructiveFg = "0 0% 100%";

    // Ring uses primary
    const ring = primary;

    // Gradients/shadows based on chosen colours
    const gradientPrimary = `linear-gradient(135deg, hsl(${primary}), hsl(${glow}))`;
    const gradientGold = `linear-gradient(135deg, hsl(${gold}), hsl(35 80% ${isDark ? 52 : 46}%))`;
    const gradientHero = `linear-gradient(180deg, hsl(${background}), hsl(${card}))`;

    const shadowElegant = `0 10px 30px -10px hsl(${primary} / ${isDark ? 0.18 : 0.2})`;
    const shadowGlow = `0 0 40px hsl(${glow} / ${isDark ? 0.18 : 0.22})`;
    const shadowGold = `0 10px 30px -10px hsl(${gold} / ${isDark ? 0.16 : 0.18})`;

    return {
      "--background": background,
      "--foreground": foreground,

      "--card": card,
      "--card-foreground": cardFg,

      "--popover": popover,
      "--popover-foreground": popoverFg,

      "--primary": primary,
      "--primary-foreground": primaryFg,
      "--primary-glow": glow,

      "--gold": gold,
      "--gold-foreground": goldFg,

      "--secondary": secondary,
      "--secondary-foreground": secondaryFg,

      "--muted": muted,
      "--muted-foreground": mutedFg,

      // Accent follows primary
      "--accent": primary,
      "--accent-foreground": primaryFg,

      "--accent-strong": strong,
      "--accent-strong-foreground": strongFg,

      "--destructive": destructive,
      "--destructive-foreground": destructiveFg,

      "--border": border,
      "--input": input,
      "--ring": ring,

      "--success": success,
      "--success-foreground": successFg,

      "--chart-1": primary,
      "--chart-2": gold,
      "--chart-3": success,
      "--chart-4": "262 60% 52%",
      "--chart-5": destructive,

      "--gradient-primary": gradientPrimary,
      "--gradient-gold": gradientGold,
      "--gradient-hero": gradientHero,

      "--shadow-elegant": shadowElegant,
      "--shadow-glow": shadowGlow,
      "--shadow-gold": shadowGold,
    };
  };

  return { light: mkVars("light"), dark: mkVars("dark") };
};

const ColorRow = ({ label, hex, onHexChange, helper }) => (
  <div>
    <div className="flex items-center justify-between">
      <label className="text-sm opacity-80">{label}</label>
      {helper ? <span className="text-xs opacity-60">{helper}</span> : null}
    </div>
    <div className="flex items-center gap-3 mt-1">
      <input
        type="color"
        value={hex}
        onChange={(e) => onHexChange(e.target.value)}
        className="h-10 w-14 rounded-md border"
        style={{ borderColor: "hsl(var(--border))", background: "transparent" }}
      />
      <Input value={hex} onChange={(e) => onHexChange(e.target.value)} />
    </div>
  </div>
);

export default function ThemeCreatorPage({ onBack }) {
  const [name, setName] = useState("");

  // Surfaces
  const [baseHex, setBaseHex] = useState("#0B1F3A");

  // Core brand colours (fully customizable)
  const [primaryHex, setPrimaryHex] = useState("#F4C430");   // primary + accent
  const [glowHex, setGlowHex] = useState("#FFD86B");         // primary glow
  const [secondaryHex, setSecondaryHex] = useState("#2A3A55"); // secondary tint
  const [strongHex, setStrongHex] = useState("#2E7CF6");     // accent-strong

  // 0..100: higher = darker overall
  const [intensity, setIntensity] = useState(65);
  const intensity01 = clamp(intensity / 100, 0, 1);

  const palette = useMemo(() => {
    return buildPalette({
      baseHex,
      primaryHex,
      secondaryHex,
      strongHex,
      glowHex,
      intensity01,
    });
  }, [baseHex, primaryHex, secondaryHex, strongHex, glowHex, intensity01]);

  const previewVars = useMemo(() => {
    return isDarkModeNow() ? palette.dark : palette.light;
  }, [palette]);

  // Apply preview while editing
  useEffect(() => {
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

      // store inputs too (so you can edit later if you add that screen)
      baseHex,
      primaryHex,
      glowHex,
      secondaryHex,
      strongHex,
      intensity,

      vars: palette,
      createdAt: new Date().toISOString(),
    };

    const all = getCustomThemes();
    all.push(theme);
    saveCustomThemes(all);

    document.documentElement.dataset.theme = "custom";
    applyVars(isDarkModeNow() ? theme.vars.dark : theme.vars.light);

    toast.success("Custom theme saved.");
  };

  const setNiceDefaults = () => {
    setName("");
    setBaseHex("#0B1F3A");
    setPrimaryHex("#F4C430");
    setGlowHex("#FFD86B");
    setSecondaryHex("#2A3A55");
    setStrongHex("#2E7CF6");
    setIntensity(65);
    toast("Reset theme creator.");
  };

  const autoGlow = () => {
    // simple helper: if you pick a primary, glow can follow primary
    setGlowHex(primaryHex);
    toast("Primary glow set to match Primary.");
  };

  return (
    <div
      className="p-4 pb-28"
      style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
    >
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
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}
        >
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
            <ColorRow label="Base (surfaces)" hex={baseHex} onHexChange={setBaseHex} />
            <div className="space-y-2">
              <ColorRow label="Primary" hex={primaryHex} onHexChange={setPrimaryHex} />
              <div className="flex justify-end">
                <Button variant="outline" className="h-8 px-3 gap-2" onClick={autoGlow}>
                  <Wand2 className="h-4 w-4" />
                  Glow = Primary
                </Button>
              </div>
            </div>

            <ColorRow label="Primary glow" hex={glowHex} onHexChange={setGlowHex} helper="(used for gradients)" />
            <ColorRow label="Secondary" hex={secondaryHex} onHexChange={setSecondaryHex} helper="(buttons / surfaces)" />
            <ColorRow label="Strong accent" hex={strongHex} onHexChange={setStrongHex} helper="(opposite / highlight)" />
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

        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}
        >
          <div className="font-medium mb-3">Preview</div>

          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-elegant)" }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ background: "hsl(var(--primary))" }} />
              <div className="text-sm font-semibold">Primary</div>
              <div className="h-3 w-3 rounded-full ml-3" style={{ background: "hsl(var(--secondary))" }} />
              <div className="text-sm font-semibold">Secondary</div>
              <div className="h-3 w-3 rounded-full ml-3" style={{ background: "hsl(var(--accent-strong))" }} />
              <div className="text-sm font-semibold">Strong</div>
            </div>

            <div
              className="rounded-xl border p-3"
              style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}
            >
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
                onClick={() => toast("Secondary action")}
                style={{
                  background: "hsl(var(--secondary))",
                  color: "hsl(var(--secondary-foreground))",
                }}
              >
                Secondary
              </Button>

              <Button
                onClick={() => toast("Strong action")}
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
          <Button variant="outline" onClick={setNiceDefaults}>
            Reset
          </Button>
        </div>

        <div className="text-xs opacity-70">
          Saved themes are stored locally on this device in localStorage (<code>gym_custom_themes</code>).
        </div>
      </div>
    </div>
  );
  }
