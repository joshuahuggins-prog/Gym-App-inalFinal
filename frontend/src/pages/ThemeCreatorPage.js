React, { useEffect, useMemo, useState } from "react";
import { AimportrrowLeft, Check, MoonStar, Palette, Save, SunMedium, Trash2 } from "lucide-react";
import AppHeader from "../components/AppHeader";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useSettings } from "../contexts/SettingsContext";
import { toast } from "sonner";

const CUSTOM_THEMES_KEY = "gym_custom_themes";

const normalizeHex = (hex) => {
  const value = String(hex || "#2c7a6d").trim();
  const clean = value.startsWith("#") ? value.slice(1) : value;
  if (!/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(clean)) return "#2c7a6d";
  return `#${clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean}`;
};

const hexToRgb = (hex) => {
  const value = normalizeHex(hex);
  const raw = value.slice(1);
  const int = Number.parseInt(raw, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
};

const rgbToHsl = (r, g, b) => {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;

  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case rr:
        h = (gg - bb) / d + (gg < bb ? 6 : 0);
        break;
      case gg:
        h = (bb - rr) / d + 2;
        break;
      default:
        h = (rr - gg) / d + 4;
        break;
    }

    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};

const hslString = (hex) => {
  const { h, s, l } = rgbToHsl(...Object.values(hexToRgb(hex)));
  return `${h} ${s}% ${l}%`;
};

const getCustomThemes = () => {
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveCustomThemes = (themes) => {
  try {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes));
  } catch {
    // ignore
  }
};

const applyVars = (vars) => {
  const root = document.documentElement;
  Object.entries(vars || {}).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
};

const clearCustomVars = () => {
  const keys = [
    "--background",
    "--foreground",
    "--card",
    "--card-foreground",
    "--popover",
    "--popover-foreground",
    "--primary",
    "--primary-foreground",
    "--primary-glow",
    "--secondary",
    "--secondary-foreground",
    "--muted",
    "--muted-foreground",
    "--accent",
    "--accent-foreground",
    "--accent-strong",
    "--accent-strong-foreground",
    "--destructive",
    "--destructive-foreground",
    "--border",
    "--input",
    "--ring",
    "--success",
    "--success-foreground",
  ];

  const root = document.documentElement;
  keys.forEach((key) => root.style.removeProperty(key));
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const mixHex = (hexA, hexB, amount) => {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const t = clamp(amount, 0, 1);

  const mix = (x, y) => Math.round(x + (y - x) * t);

  return `rgb(${mix(a.r, b.r)} ${mix(a.g, b.g)} ${mix(a.b, b.b)})`;
};

const buildCustomThemeVars = (baseHex, accentHex, mode = "light") => {
  const base = rgbToHsl(...Object.values(hexToRgb(baseHex)));
  const accent = rgbToHsl(...Object.values(hexToRgb(accentHex)));

  const isDark = mode === "dark";

  if (isDark) {
    return {
      "--background": `${base.h} ${Math.max(18, base.s)}% 8%`,
      "--foreground": `210 40% 98%`,
      "--card": `${base.h} 24% 12%`,
      "--card-foreground": `210 40% 98%`,
      "--popover": `${base.h} 24% 12%`,
      "--popover-foreground": `210 40% 98%`,
      "--primary": `${base.h} ${Math.min(90, base.s + 15)}% ${Math.min(60, base.l + 10)}%`,
      "--primary-foreground": `${base.h} 22% 8%`,
      "--primary-glow": `${base.h} ${Math.min(92, base.s + 15)}% ${Math.min(70, base.l + 15)}%`,
      "--secondary": `${base.h} 12% 18%`,
      "--secondary-foreground": `210 40% 98%`,
      "--muted": `${base.h} 14% 18%`,
      "--muted-foreground": `215 20% 65%`,
      "--accent": `${accent.h} ${Math.min(85, accent.s + 12)}% ${Math.min(65, accent.l + 18)}%`,
      "--accent-foreground": `${accent.h} 25% 12%`,
      "--accent-strong": `${accent.h} ${Math.min(90, accent.s + 10)}% ${Math.min(68, accent.l + 12)}%`,
      "--accent-strong-foreground": `${accent.h} 25% 12%`,
      "--destructive": `0 84% 60%`,
      "--destructive-foreground": `210 40% 98%`,
      "--border": `${base.h} 12% 20%`,
      "--input": `${base.h} 12% 20%`,
      "--ring": `${base.h} ${Math.min(90, base.s + 10)}% ${Math.min(60, base.l + 10)}%`,
      "--success": `142 76% 38%`,
      "--success-foreground": `210 40% 98%`,
    };
  }

  return {
    "--background": `${base.h} ${Math.max(22, base.s)}% 96%`,
    "--foreground": `${base.h} 24% 12%`,
    "--card": `${base.h} 28% 94%`,
    "--card-foreground": `${base.h} 24% 12%`,
    "--popover": `${base.h} 28% 94%`,
    "--popover-foreground": `${base.h} 24% 12%`,
    "--primary": `${base.h} ${Math.min(88, base.s + 10)}% ${Math.min(44, base.l + 8)}%`,
    "--primary-foreground": `${base.h} 30% 96%`,
    "--primary-glow": `${base.h} ${Math.min(90, base.s + 8)}% ${Math.min(58, base.l + 12)}%`,
    "--secondary": `${base.h} 18% 88%`,
    "--secondary-foreground": `${base.h} 24% 12%`,
    "--muted": `${base.h} 18% 90%`,
    "--muted-foreground": `${base.h} 20% 30%`,
    "--accent": `${accent.h} ${Math.min(80, accent.s + 12)}% ${Math.min(48, accent.l + 8)}%`,
    "--accent-foreground": `${accent.h} 30% 96%`,
    "--accent-strong": `${accent.h} ${Math.min(82, accent.s + 15)}% ${Math.min(54, accent.l + 12)}%`,
    "--accent-strong-foreground": `${accent.h} 20% 12%`,
    "--destructive": `0 84% 58%`,
    "--destructive-foreground": `210 40% 98%`,
    "--border": `${base.h} 16% 82%`,
    "--input": `${base.h} 16% 82%`,
    "--ring": `${base.h} ${Math.min(90, base.s + 8)}% ${Math.min(46, base.l + 6)}%`,
    "--success": `142 76% 38%`,
    "--success-foreground": `210 40% 98%`,
  };
};

const isCustomValue = (v) => typeof v === "string" && v.startsWith("custom:");
const customIdFromValue = (v) => (isCustomValue(v) ? v.slice("custom:".length) : "");

const makeThemeId = () => {
  return `theme_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

export default function ThemeCreatorPage({ onBack, themeId = null }) {
  const { setColorTheme, setColorMode, colorMode } = useSettings();

  const [name, setName] = useState("My Theme");
  const [baseHex, setBaseHex] = useState("#2C7A6D");
  const [accentHex, setAccentHex] = useState("#8B5CF6");
  const [previewMode, setPreviewMode] = useState(colorMode === "dark" ? "dark" : "light");
  const [editingId, setEditingId] = useState(themeId || null);

  const previewVars = useMemo(
    () => buildCustomThemeVars(baseHex, accentHex, previewMode),
    [baseHex, accentHex, previewMode]
  );

  useEffect(() => {
    if (!themeId) return;

    const themes = getCustomThemes();
    const target = themes.find((item) => String(item?.id) === String(themeId));
    if (!target) return;

    setEditingId(String(target.id));
    setName(target.name || "My Theme");
    setBaseHex(target.baseHex || "#2C7A6D");
    setAccentHex(target.accentHex || "#8B5CF6");
  }, [themeId]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", previewMode === "dark");
    document.documentElement.dataset.theme = "custom";
    clearCustomVars();
    applyVars(previewVars);
  }, [previewVars, previewMode]);

  const saveTheme = () => {
    const safeName = (name || "My Theme").trim() || "My Theme";
    const nextId = editingId || makeThemeId();

    const themes = getCustomThemes();
    const existingIndex = themes.findIndex((item) => String(item?.id) === String(nextId));

    const nextTheme = {
      id: nextId,
      name: safeName,
      baseHex: normalizeHex(baseHex),
      accentHex: normalizeHex(accentHex),
      vars: {
        light: buildCustomThemeVars(normalizeHex(baseHex), normalizeHex(accentHex), "light"),
        dark: buildCustomThemeVars(normalizeHex(baseHex), normalizeHex(accentHex), "dark"),
      },
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      themes[existingIndex] = nextTheme;
    } else {
      themes.unshift(nextTheme);
    }

    saveCustomThemes(themes);
    setEditingId(nextId);
    setColorTheme(`custom:${nextId}`);
    setColorMode(previewMode === "dark" ? "dark" : "light");

    toast.success("Custom theme saved");
  };

  const applyOnly = () => {
    const id = editingId || makeThemeId();
    const root = document.documentElement;
    root.classList.toggle("dark", previewMode === "dark");
    root.setAttribute("data-theme", "custom");
    clearCustomVars();
    applyVars(previewVars);
    setColorMode(previewMode === "dark" ? "dark" : "light");
    setColorTheme(`custom:${id}`);
    toast.success("Theme applied");
  };

  const deleteCurrent = () => {
    if (!editingId) return;

    const themes = getCustomThemes();
    const next = themes.filter((item) => String(item?.id) !== String(editingId));

    saveCustomThemes(next);
    setEditingId(null);
    setName("My Theme");
    setBaseHex("#2C7A6D");
    setAccentHex("#8B5CF6");
    setColorTheme("blue");
    toast.success("Theme removed");
  };

  const handleBack = () => {
    if (typeof onBack === "function") {
      onBack();
      return;
    }
    window.history.back();
  };

  return (
    <AppHeader
      title="Theme creator"
      subtitle="Customise your app colours"
      rightIconSrc={`${process.env.PUBLIC_URL}/icons/icon-overlay-white-32-v1.png`}
      rightIconAlt="Gym App"
    >
      <div className="mx-auto max-w-xl space-y-6 p-4 pb-24">
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" className="gap-2" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="text-sm text-muted-foreground">
            {editingId ? "Editing saved theme" : "New custom theme"}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <Palette className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Theme details</h2>
          </div>

          <div className="space-y-2">
            <Label htmlFor="theme-name">Theme name</Label>
            <Input
              id="theme-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="My gym theme"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="base-colour">Base colour</Label>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-2 py-2">
                <input
                  id="base-colour"
                  type="color"
                  value={normalizeHex(baseHex)}
                  onChange={(event) => setBaseHex(event.target.value)}
                  className="h-10 w-12 border-0 bg-transparent p-0"
                />
                <Input value={normalizeHex(baseHex).toUpperCase()} onChange={(event) => setBaseHex(event.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accent-colour">Accent colour</Label>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-2 py-2">
                <input
                  id="accent-colour"
                  type="color"
                  value={normalizeHex(accentHex)}
                  onChange={(event) => setAccentHex(event.target.value)}
                  className="h-10 w-12 border-0 bg-transparent p-0"
                />
                <Input value={normalizeHex(accentHex).toUpperCase()} onChange={(event) => setAccentHex(event.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold">Preview</div>

            <div className="flex rounded-md border border-border bg-background p-1">
              <button
                type="button"
                onClick={() => setPreviewMode("light")}
                className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                  previewMode === "light" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                <SunMedium className="h-3.5 w-3.5" />
                Light
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("dark")}
                className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                  previewMode === "dark" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                <MoonStar className="h-3.5 w-3.5" />
                Dark
              </button>
            </div>
          </div>

          <div
            className="rounded-xl border border-border p-4"
            style={{
              background: `hsl(${previewVars["--background"]})`,
              color: `hsl(${previewVars["--foreground"]})`,
            }}
          >
            <div
              className="rounded-lg border p-3"
              style={{
                background: `hsl(${previewVars["--card"]})`,
                borderColor: `hsl(${previewVars["--border"]})`,
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium">Preview</div>
                <span
                  className="rounded-full px-2 py-1 text-xs font-semibold"
                  style={{
                    background: `hsl(${previewVars["--primary"]})`,
                    color: `hsl(${previewVars["--primary-foreground"]})`,
                  }}
                >
                  Primary
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div
                  className="rounded-md px-2 py-1"
                  style={{
                    background: `hsl(${previewVars["--secondary"]})`,
                    color: `hsl(${previewVars["--secondary-foreground"]})`,
                  }}
                >
                  Secondary panel
                </div>
                <div
                  className="rounded-md px-2 py-1"
                  style={{
                    background: `hsl(${previewVars["--accent"]})`,
                    color: `hsl(${previewVars["--accent-foreground"]})`,
                  }}
                >
                  Accent action
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="flex-1 gap-2" onClick={saveTheme}>
            <Save className="h-4 w-4" />
            Save theme
          </Button>

          <Button variant="secondary" className="flex-1 gap-2" onClick={applyOnly}>
            <Check className="h-4 w-4" />
            Apply
          </Button>

          {editingId ? (
            <Button variant="destructive" className="flex-1 gap-2" onClick={deleteCurrent}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          ) : null}
        </div>
      </div>
    </AppHeader>
  );
            }
